-- ========================================================
-- Migration: 20260823000018_performance_indexes.sql
-- High-Frequency Performance Indexes for 10,000+ User Scale
-- ========================================================

-- Table Sessions Indexes
CREATE INDEX IF NOT EXISTS idx_table_sessions_status ON table_sessions(status);
CREATE INDEX IF NOT EXISTS idx_table_sessions_table_id ON table_sessions(table_id);

-- Orders Indexes
CREATE INDEX IF NOT EXISTS idx_orders_table_session_id ON orders(table_session_id);
CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(status);
CREATE INDEX IF NOT EXISTS idx_orders_created_at ON orders(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_orders_idempotency_key ON orders(idempotency_key);

-- Order Items Indexes
CREATE INDEX IF NOT EXISTS idx_order_items_order_id ON order_items(order_id);
CREATE INDEX IF NOT EXISTS idx_order_items_menu_item_id ON order_items(menu_item_id);
CREATE INDEX IF NOT EXISTS idx_order_items_item_status ON order_items(item_status);

-- Payment Attempts Indexes
CREATE INDEX IF NOT EXISTS idx_payment_attempts_bill_id ON payment_attempts(bill_id);
CREATE INDEX IF NOT EXISTS idx_payment_attempts_status ON payment_attempts(status);

-- Menu Items & Categories Indexes
CREATE INDEX IF NOT EXISTS idx_menu_items_category_id ON menu_items(category_id);
CREATE INDEX IF NOT EXISTS idx_menu_items_status ON menu_items(status);

-- Inventory & Movements Indexes
CREATE INDEX IF NOT EXISTS idx_inventory_movements_ingredient_id ON inventory_movements(ingredient_id);
CREATE INDEX IF NOT EXISTS idx_inventory_movements_created_at ON inventory_movements(created_at DESC);

-- Loyalty Accounts & Ledger Indexes
CREATE INDEX IF NOT EXISTS idx_loyalty_ledger_account_id ON loyalty_ledger(loyalty_account_id);

-- Music & Jukebox Indexes
CREATE INDEX IF NOT EXISTS idx_song_requests_session_id ON song_requests(session_id);
CREATE INDEX IF NOT EXISTS idx_song_requests_status ON song_requests(status);
