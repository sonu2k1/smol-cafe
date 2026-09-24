import crypto from "crypto";

declare global {
  var __SMOL_ORDER_PHONE_MAP__: Record<string, { phone: string; cleanDigits: string; guestName?: string; createdAt: string }> | undefined;
}

function getOrderPhoneMap(): Record<string, { phone: string; cleanDigits: string; guestName?: string; createdAt: string }> {
  if (!globalThis.__SMOL_ORDER_PHONE_MAP__) {
    globalThis.__SMOL_ORDER_PHONE_MAP__ = {};
  }
  return globalThis.__SMOL_ORDER_PHONE_MAP__;
}

/**
 * Normalizes phone numbers to 10-digit clean format (e.g., "9876543210")
 */
export function normalizePhoneNumber(rawPhone?: string | null): string {
  if (!rawPhone) return "";
  return rawPhone.replace(/\D/g, "").slice(-10);
}

/**
 * Deterministically generates a valid RFC4122 UUID v4-formatted string from a 10-digit phone number.
 * This guarantees that every customer phone number maps to the exact same customer UUID in PostgreSQL.
 */
export function getPhoneUuid(rawPhone: string): string {
  const clean = normalizePhoneNumber(rawPhone);
  if (!clean || clean.length < 10) {
    // Fallback deterministic UUID if empty
    return "00000000-0000-4000-a000-000000000000";
  }
  const hash = crypto.createHash("sha256").update(`smol-customer-phone:${clean}`).digest("hex");
  return `${hash.slice(0, 8)}-${hash.slice(8, 12)}-4${hash.slice(13, 16)}-a${hash.slice(17, 20)}-${hash.slice(20, 32)}`;
}

/**
 * Records an order to a customer's phone number in memory index for guaranteed fast & strictly isolated lookups.
 */
export function recordOrderForPhone(orderId: string, phone: string, guestName?: string): void {
  const cleanDigits = normalizePhoneNumber(phone);
  if (!orderId || !cleanDigits) return;
  const map = getOrderPhoneMap();
  map[orderId] = {
    phone,
    cleanDigits,
    guestName,
    createdAt: new Date().toISOString(),
  };
}

/**
 * Returns the recorded phone number and clean digits for a given order ID.
 */
export function getOrderPhoneRecord(orderId: string): { phone: string; cleanDigits: string; guestName?: string } | null {
  const map = getOrderPhoneMap();
  return map[orderId] || null;
}

/**
 * Checks if an order belongs to a specific customer's phone number.
 * Strict Isolation Rules:
 * 1. If customer has an identified phone number (>= 10 digits):
 *    - MUST match in-memory phone registry, OR
 *    - MUST match order.idempotency_key containing the 10-digit phone number.
 *    - If no match, strictly return false (hides other customers' orders and legacy unassigned orders like #5585).
 * 2. If customer is anonymous (no phone):
 *    - Only show orders that have no phone attached in memory or idempotency_key.
 */
export function doesOrderMatchCustomerPhone(
  order: { id: string; customer_id?: string | null; idempotency_key?: string | null; notes?: string | null; table_session_id?: string | null },
  customerPhone?: string | null,
  currentSessionId?: string | null
): boolean {
  const customerClean = normalizePhoneNumber(customerPhone);
  const recorded = getOrderPhoneRecord(order.id);

  // 1. If this customer has a specific phone number
  if (customerClean && customerClean.length >= 10) {
    // A. Check in-memory phone record
    if (recorded && recorded.cleanDigits) {
      return recorded.cleanDigits === customerClean;
    }

    // B. Check idempotency_key for exact phone number (e.g., "smol_ord_9876543210_...")
    if (order.idempotency_key && order.idempotency_key.includes(customerClean)) {
      return true;
    }

    // Strictly return false: do NOT show order belonging to other or legacy phone numbers
    return false;
  }

  // 2. If customer has no phone (anonymous guest on table session)
  if (currentSessionId && order.table_session_id === currentSessionId) {
    // If order is explicitly tagged to an identified phone, don't show to anonymous
    if (recorded || (order.idempotency_key && /smol_ord_\d{10}/.test(order.idempotency_key))) {
      return false;
    }
    return true;
  }

  return false;
}
