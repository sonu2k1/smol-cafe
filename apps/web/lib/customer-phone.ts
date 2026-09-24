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
 * Returns:
 * - true if order is verified to belong to this phone,
 * - false if order belongs to a DIFFERENT phone number,
 * - fallback true if order has no phone attached AND customer has no phone (anonymous table session).
 */
export function doesOrderMatchCustomerPhone(
  order: { id: string; customer_id?: string | null; notes?: string | null },
  customerPhone?: string | null
): boolean {
  const customerClean = normalizePhoneNumber(customerPhone);
  const recorded = getOrderPhoneRecord(order.id);

  // 1. If order is tagged in memory phone map
  if (recorded) {
    if (!customerClean) return false;
    return recorded.cleanDigits === customerClean;
  }

  // 2. If customer has a phone number
  if (customerClean) {
    const expectedUuid = getPhoneUuid(customerClean);
    if (order.customer_id) {
      return order.customer_id === expectedUuid;
    }
    // Check if phone digits appear in notes
    if (order.notes && order.notes.includes(customerClean)) {
      return true;
    }
    // If order has no phone record and no customer_id, check if notes belong to another phone
    if (order.notes && /\b\d{10}\b/.test(order.notes)) {
      return false; // Belongs to a different phone
    }
    return true;
  }

  // 3. Anonymous fallback: order with no customer_id and no phone record
  return !order.customer_id;
}
