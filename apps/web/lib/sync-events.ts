/**
 * Smol Café — Cross-Interface Real-Time Sync Utility
 * Enables zero-latency communication across Customer, Kitchen, Cashier,
 * and Admin views using BroadcastChannel and localStorage events.
 */

export type SyncEventType =
  | "ORDER_PLACED"
  | "ORDER_CONFIRMED"
  | "ORDER_REJECTED"
  | "STATUS_CHANGED"
  | "PAYMENT_COMPLETED"
  | "TABLE_SETTLED"
  | "SETTINGS_UPDATED";

export interface SyncPayload {
  type: SyncEventType;
  orderId?: string;
  orderNo?: number;
  tableLabel?: string;
  status?: string;
  timestamp: number;
  metadata?: Record<string, unknown>;
}

const CHANNEL_NAME = "smol_orders_channel";
const STORAGE_KEY = "smol_sync_event";

/**
 * Broadcasts an event across all open tabs and windows.
 */
export function broadcastSyncEvent(event: SyncPayload): void {
  if (typeof window === "undefined") return;

  const payload: SyncPayload = {
    ...event,
    timestamp: Date.now(),
  };

  // 1. BroadcastChannel for active tabs
  try {
    if ("BroadcastChannel" in window) {
      const bc = new BroadcastChannel(CHANNEL_NAME);
      bc.postMessage(payload);
      bc.close();
    }
  } catch {
    // BroadcastChannel error ignored
  }

  // 2. LocalStorage trigger for cross-window / background tabs
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
  } catch {
    // LocalStorage error ignored
  }

  // 3. CustomEvent for current window listeners
  try {
    window.dispatchEvent(new CustomEvent("smol_sync", { detail: payload }));
  } catch {
    // CustomEvent error ignored
  }
}

/**
 * Subscribes to real-time sync events across tabs and windows.
 */
export function subscribeToSyncEvents(
  callback: (event: SyncPayload) => void
): () => void {
  if (typeof window === "undefined") {
    return () => {};
  }

  let bc: BroadcastChannel | null = null;
  try {
    if ("BroadcastChannel" in window) {
      bc = new BroadcastChannel(CHANNEL_NAME);
      bc.onmessage = (e) => {
        if (e.data && e.data.type) {
          callback(e.data as SyncPayload);
        }
      };
    }
  } catch {
    bc = null;
  }

  const storageHandler = (e: StorageEvent) => {
    if (e.key === STORAGE_KEY && e.newValue) {
      try {
        const parsed = JSON.parse(e.newValue);
        callback(parsed as SyncPayload);
      } catch {
        // parse error ignored
      }
    }
  };

  const customEventHandler = (e: Event) => {
    const customEvent = e as CustomEvent<SyncPayload>;
    if (customEvent.detail) {
      callback(customEvent.detail);
    }
  };

  window.addEventListener("storage", storageHandler);
  window.addEventListener("smol_sync", customEventHandler);

  return () => {
    if (bc) {
      bc.close();
    }
    window.removeEventListener("storage", storageHandler);
    window.removeEventListener("smol_sync", customEventHandler);
  };
}
