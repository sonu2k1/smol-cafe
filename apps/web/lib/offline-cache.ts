/**
 * Smol Café — Offline Catalog & State Cache
 * Caches menu items, categories, and dining tables locally
 * for instantaneous rendering and offline browsing.
 */

import type { MenuItemWithDetails } from "@/lib/queries/menu";
import type { ClientTableInfo } from "@/app/t/actions";

const MENU_CACHE_KEY = "smol_offline_menu_cache";
const TABLES_CACHE_KEY = "smol_offline_tables_cache";
const CACHE_TTL_MS = 24 * 60 * 60 * 1000; // 24 hours

interface CacheEnvelope<T> {
  timestamp: number;
  data: T;
}

/**
 * Saves menu items / category snapshot to localStorage
 */
export function cacheMenuCatalog<T = any>(data: T): void {
  if (typeof window === "undefined") return;
  try {
    const envelope: CacheEnvelope<T> = {
      timestamp: Date.now(),
      data,
    };
    localStorage.setItem(MENU_CACHE_KEY, JSON.stringify(envelope));
  } catch (err) {
    console.warn("Could not cache menu catalog:", err);
  }
}

/**
 * Retrieves cached menu items / categories if available
 */
export function getCachedMenuCatalog<T = any>(): T | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(MENU_CACHE_KEY);
    if (!raw) return null;
    const envelope = JSON.parse(raw) as CacheEnvelope<T>;
    if (Date.now() - envelope.timestamp > CACHE_TTL_MS) {
      return envelope.data; // still return data as fallback even if stale
    }
    return envelope.data;
  } catch {
    return null;
  }
}

/**
 * Saves active tables snapshot to localStorage
 */
export function cacheActiveTables(tables: ClientTableInfo[]): void {
  if (typeof window === "undefined") return;
  try {
    const envelope: CacheEnvelope<ClientTableInfo[]> = {
      timestamp: Date.now(),
      data: tables,
    };
    localStorage.setItem(TABLES_CACHE_KEY, JSON.stringify(envelope));
  } catch (err) {
    console.warn("Could not cache tables:", err);
  }
}

/**
 * Retrieves cached tables if available
 */
export function getCachedActiveTables(): ClientTableInfo[] | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(TABLES_CACHE_KEY);
    if (!raw) return null;
    const envelope = JSON.parse(raw) as CacheEnvelope<ClientTableInfo[]>;
    return envelope.data;
  } catch {
    return null;
  }
}
