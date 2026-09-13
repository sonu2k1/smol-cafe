/**
 * Smol Café — JSON Tagging for Tables
 * Encapsulates table metadata, zone assignment, seating capacity,
 * and session tagging for cross-interface synchronization.
 */

export type TableZone = "Indoor Cozy" | "Courtyard Verandah" | "Garden Terrace" | "Brew Bar";

export interface TableJsonTag {
  table_id: string;
  table_number: string;
  zone: TableZone;
  capacity: number;
  guest_count: number;
  qr_hash: string;
  service_mode: "DINE_IN" | "TAKEAWAY";
  session_id: string;
  created_at: string;
  device_fingerprint?: string;
  notes?: string;
}

export const TABLE_ZONES_CONFIG: Record<string, { zone: TableZone; capacity: number }> = {
  "01": { zone: "Indoor Cozy", capacity: 2 },
  "02": { zone: "Indoor Cozy", capacity: 4 },
  "03": { zone: "Courtyard Verandah", capacity: 2 },
  "04": { zone: "Courtyard Verandah", capacity: 4 },
  "05": { zone: "Brew Bar", capacity: 2 },
  "06": { zone: "Brew Bar", capacity: 2 },
  "07": { zone: "Garden Terrace", capacity: 6 },
  "08": { zone: "Garden Terrace", capacity: 4 },
  "09": { zone: "Indoor Cozy", capacity: 4 },
  "10": { zone: "Indoor Cozy", capacity: 2 },
  "11": { zone: "Garden Terrace", capacity: 4 },
  "12": { zone: "Courtyard Verandah", capacity: 4 },
};

/**
 * Generates a standard TableJsonTag for a given table label and session ID.
 */
export function createTableJsonTag(
  tableLabel: string,
  sessionId?: string,
  guestCount: number = 2
): TableJsonTag {
  const cleanLabel = tableLabel.padStart(2, "0");
  const config = TABLE_ZONES_CONFIG[cleanLabel] || {
    zone: "Indoor Cozy" as TableZone,
    capacity: 2,
  };

  return {
    table_id: `tbl_${cleanLabel}`,
    table_number: cleanLabel,
    zone: config.zone,
    capacity: config.capacity,
    guest_count: guestCount,
    qr_hash: `smol-qr-t${cleanLabel}-${Math.random().toString(36).substring(2, 8)}`,
    service_mode: "DINE_IN",
    session_id: sessionId || `sess_${cleanLabel}_${Date.now()}`,
    created_at: new Date().toISOString(),
    device_fingerprint: "mobile-web-client",
  };
}
