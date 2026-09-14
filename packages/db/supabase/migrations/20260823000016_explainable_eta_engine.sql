-- ==============================================================================
-- Smol Café — Explainable Kitchen Station ETA Engine & Accuracy Logging
-- ==============================================================================

-- 1. Kitchen Stations Table
CREATE TABLE IF NOT EXISTS kitchen_stations (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  parallel_capacity INTEGER NOT NULL DEFAULT 2,
  expo_buffer_seconds INTEGER NOT NULL DEFAULT 120,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Seed Default Kitchen Stations
INSERT INTO kitchen_stations (id, name, parallel_capacity, expo_buffer_seconds)
VALUES
  ('ESPRESSO_BAR', 'Espresso Bar', 2, 120),
  ('CHAI_BAR', 'Chai & Traditional Brews', 2, 120),
  ('BAKERY_OVEN', 'Bakery & Warming Oven', 2, 120),
  ('HOT_KITCHEN', 'Hot Food & Grills', 1, 120),
  ('COLD_BAR', 'Cold Drinks & Desserts', 2, 120)
ON CONFLICT (id) DO UPDATE
SET name = EXCLUDED.name,
    parallel_capacity = EXCLUDED.parallel_capacity,
    expo_buffer_seconds = EXCLUDED.expo_buffer_seconds;

-- 2. Add Base Prep Time and Station Assignment to Menu Items
ALTER TABLE menu_items
ADD COLUMN IF NOT EXISTS base_prep_seconds INTEGER NOT NULL DEFAULT 300,
ADD COLUMN IF NOT EXISTS station_id TEXT REFERENCES kitchen_stations(id) DEFAULT 'HOT_KITCHEN';

CREATE INDEX IF NOT EXISTS idx_menu_items_station ON menu_items(station_id);

-- Update stations and prep times based on item names
UPDATE menu_items SET station_id = 'CHAI_BAR', base_prep_seconds = 240 WHERE LOWER(name) LIKE '%chai%' OR LOWER(name) LIKE '%tea%';
UPDATE menu_items SET station_id = 'ESPRESSO_BAR', base_prep_seconds = 300 WHERE LOWER(name) LIKE '%coffee%' OR LOWER(name) LIKE '%espresso%' OR LOWER(name) LIKE '%cappuccino%' OR LOWER(name) LIKE '%latte%' OR LOWER(name) LIKE '%americano%';
UPDATE menu_items SET station_id = 'BAKERY_OVEN', base_prep_seconds = 360 WHERE LOWER(name) LIKE '%maska%' OR LOWER(name) LIKE '%croissant%' OR LOWER(name) LIKE '%toast%' OR LOWER(name) LIKE '%cake%' OR LOWER(name) LIKE '%cookie%';
UPDATE menu_items SET station_id = 'COLD_BAR', base_prep_seconds = 240 WHERE LOWER(name) LIKE '%cold%' OR LOWER(name) LIKE '%iced%' OR LOWER(name) LIKE '%shake%' OR LOWER(name) LIKE '%lemonade%' OR LOWER(name) LIKE '%soda%';
UPDATE menu_items SET station_id = 'HOT_KITCHEN', base_prep_seconds = 480 WHERE station_id = 'HOT_KITCHEN' OR LOWER(name) LIKE '%maggi%' OR LOWER(name) LIKE '%sandwich%' OR LOWER(name) LIKE '%platter%' OR LOWER(name) LIKE '%pasta%' OR LOWER(name) LIKE '%roll%';

-- 3. Add Prediction and Error Logging Columns to Orders Table
ALTER TABLE orders
ADD COLUMN IF NOT EXISTS predicted_prep_seconds INTEGER DEFAULT 600,
ADD COLUMN IF NOT EXISTS predicted_ready_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS eta_min_minutes INTEGER DEFAULT 8,
ADD COLUMN IF NOT EXISTS eta_max_minutes INTEGER DEFAULT 12,
ADD COLUMN IF NOT EXISTS served_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS actual_prep_seconds INTEGER,
ADD COLUMN IF NOT EXISTS prediction_error_seconds INTEGER;

-- 4. Stored Procedure: compute_order_eta
-- Evaluates station backlog and returns deterministic ETA range
CREATE OR REPLACE FUNCTION compute_order_eta(
  p_items JSONB, -- Array of { menu_item_id, qty }
  p_location_id UUID
) RETURNS JSONB AS $$
DECLARE
  v_station RECORD;
  v_item JSONB;
  v_menu_item_id UUID;
  v_item_qty INTEGER;
  v_item_prep INTEGER;
  v_item_station TEXT;
  v_max_station_seconds INTEGER := 0;
  v_bottleneck_station TEXT := 'HOT_KITCHEN';
  v_station_backlog INTEGER;
  v_station_new_work INTEGER;
  v_station_total_time INTEGER;
  v_expo_buffer INTEGER := 120;
  v_total_predicted_seconds INTEGER;
  v_eta_min INTEGER;
  v_eta_max INTEGER;
BEGIN
  -- Iterate through each defined station
  FOR v_station IN SELECT id, parallel_capacity, expo_buffer_seconds FROM kitchen_stations
  LOOP
    v_expo_buffer := v_station.expo_buffer_seconds;
    v_station_backlog := 0;
    v_station_new_work := 0;

    -- 1. Calculate active backlog for this station across active orders (SUBMITTED, ACCEPTED, PREPARING)
    SELECT COALESCE(SUM(mi.base_prep_seconds * oi.quantity), 0)
    INTO v_station_backlog
    FROM order_items oi
    JOIN orders o ON o.id = oi.order_id
    JOIN menu_items mi ON mi.id = oi.menu_item_id
    WHERE o.location_id = p_location_id
      AND o.status IN ('SUBMITTED', 'ACCEPTED', 'PREPARING')
      AND mi.station_id = v_station.id;

    -- 2. Calculate work for this station in the new order
    FOR v_item IN SELECT * FROM jsonb_array_elements(p_items)
    LOOP
      v_menu_item_id := (v_item->>'menu_item_id')::UUID;
      v_item_qty := (v_item->>'qty')::INTEGER;

      SELECT base_prep_seconds, station_id
      INTO v_item_prep, v_item_station
      FROM menu_items
      WHERE id = v_menu_item_id;

      IF v_item_station = v_station.id THEN
        v_station_new_work := v_station_new_work + (COALESCE(v_item_prep, 300) * v_item_qty);
      END IF;
    END LOOP;

    -- 3. Station wait time considering parallel capacity
    v_station_total_time := CEIL((v_station_backlog + v_station_new_work)::NUMERIC / GREATEST(v_station.parallel_capacity, 1)::NUMERIC);

    IF v_station_total_time > v_max_station_seconds THEN
      v_max_station_seconds := v_station_total_time;
      v_bottleneck_station := v_station.id;
    END IF;
  END LOOP;

  -- Add fixed expo buffer (e.g. 120s for plating & delivery)
  v_total_predicted_seconds := GREATEST(300, v_max_station_seconds + v_expo_buffer);

  -- Convert to honest range
  v_eta_min := GREATEST(3, FLOOR((v_total_predicted_seconds - 60)::NUMERIC / 60)::INTEGER);
  v_eta_max := GREATEST(v_eta_min + 3, CEIL((v_total_predicted_seconds + 120)::NUMERIC / 60)::INTEGER);

  RETURN jsonb_build_object(
    'predicted_prep_seconds', v_total_predicted_seconds,
    'eta_min_minutes', v_eta_min,
    'eta_max_minutes', v_eta_max,
    'bottleneck_station', v_bottleneck_station
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 5. Trigger Function: Log actual served time and prediction error on status = SERVED or COMPLETED
CREATE OR REPLACE FUNCTION log_order_served_accuracy()
RETURNS TRIGGER AS $$
DECLARE
  v_actual_prep INTEGER;
BEGIN
  IF NEW.status = 'SERVED' AND (OLD.status IS NULL OR OLD.status != 'SERVED') THEN
    NEW.served_at := COALESCE(NEW.served_at, now());
    v_actual_prep := EXTRACT(EPOCH FROM (NEW.served_at - NEW.created_at))::INTEGER;
    NEW.actual_prep_seconds := v_actual_prep;
    NEW.prediction_error_seconds := v_actual_prep - COALESCE(NEW.predicted_prep_seconds, 600);
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_order_served_accuracy ON orders;
CREATE TRIGGER trg_order_served_accuracy
BEFORE UPDATE ON orders
FOR EACH ROW
EXECUTE FUNCTION log_order_served_accuracy();
