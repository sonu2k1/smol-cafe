import { createAdminClient } from "@/lib/supabase/admin";
import type { MenuCategory, MenuItem, MenuItemVersion, MenuPrice } from "@smol-cafe/db";
import {
  MOCK_CATEGORIES,
  MOCK_MENU_ITEMS,
  MOCK_MENU_VERSIONS,
  MOCK_MENU_PRICES,
} from "@/lib/mock-db/seedData";

export interface MenuItemWithDetails {
  id: string;
  categoryId: string;
  name: string;
  status: string;
  description: string;
  pricePaise: number;
  imageUrl: string | null;
  metadata: {
    dietary?: string;
    protein_focus?: string;
    spice?: string;
    best_pairing?: string;
    chai_ke_saathi?: boolean;
    subcategory?: string;
    availability?: string;
    core_ingredients?: string;
    primary_equipment?: string;
    serving_ware?: string;
    notes?: string;
  };
}

export interface CategoryWithItems {
  id: string;
  name: string;
  description?: string;
  sortOrder: number;
  items: MenuItemWithDetails[];
}

/**
 * Fallback menu catalog builder from master seed data (59 artisanal items).
 */
function getFallbackCatalog(): CategoryWithItems[] {
  const categoryMap = new Map<string, CategoryWithItems>();

  for (const cat of MOCK_CATEGORIES) {
    categoryMap.set(cat.id, {
      id: cat.id,
      name: cat.name,
      sortOrder: cat.sort_order,
      items: [],
    });
  }

  const priceMap = new Map<string, number>();
  for (const p of MOCK_MENU_PRICES) {
    if (!priceMap.has(p.menu_item_id)) {
      priceMap.set(p.menu_item_id, p.amount_paise);
    }
  }

  const versionMap = new Map<string, (typeof MOCK_MENU_VERSIONS)[0]>();
  for (const v of MOCK_MENU_VERSIONS) {
    if (!versionMap.has(v.menu_item_id)) {
      versionMap.set(v.menu_item_id, v);
    }
  }

  for (const item of MOCK_MENU_ITEMS) {
    const cat = categoryMap.get(item.category_id);
    if (!cat) continue;

    const ver = versionMap.get(item.id);
    const pricePaise = priceMap.get(item.id) || 18000;
    const metadata = (ver?.metadata || item.metadata || {}) as MenuItemWithDetails["metadata"];

    cat.items.push({
      id: item.id,
      categoryId: item.category_id,
      name: item.name,
      status: item.status,
      description: ver?.description || "",
      pricePaise,
      imageUrl: ver?.image_url || null,
      metadata,
    });
  }

  return Array.from(categoryMap.values())
    .filter((cat) => cat.items.length > 0)
    .sort((a, b) => a.sortOrder - b.sortOrder);
}

import { unstable_cache } from "next/cache";

async function fetchMenuCatalogDirectly(): Promise<CategoryWithItems[]> {
  try {
    const supabase = createAdminClient();
    const nowIso = new Date().toISOString();

    // Run all 4 queries in parallel rather than serial waterfalls
    const [categoriesRes, itemsRes, pricesRes, versionsRes] = await Promise.all([
      supabase
        .from("menu_categories")
        .select("*")
        .order("sort_order", { ascending: true }),
      supabase
        .from("menu_items")
        .select("*")
        .in("status", ["ACTIVE", "AVAILABLE", "SCHEDULED"]),
      supabase
        .from("menu_prices")
        .select("*")
        .lte("effective_from", nowIso)
        .or(`effective_to.is.null,effective_to.gt.${nowIso}`)
        .order("effective_from", { ascending: false }),
      supabase
        .from("menu_item_versions")
        .select("*")
        .order("created_at", { ascending: false }),
    ]);

    const categories = categoriesRes.data;
    const items = itemsRes.data;

    if (!categories || categories.length === 0 || !items || items.length === 0) {
      return getFallbackCatalog();
    }

    const prices = pricesRes.data;
    const versions = versionsRes.data;

    const priceMap = new Map<string, number>();
    for (const p of (prices as unknown as MenuPrice[]) || []) {
      if (!priceMap.has(p.menu_item_id)) {
        priceMap.set(p.menu_item_id, p.amount_paise);
      }
    }

    const versionMap = new Map<string, MenuItemVersion>();
    for (const v of (versions as unknown as MenuItemVersion[]) || []) {
      if (!versionMap.has(v.menu_item_id)) {
        versionMap.set(v.menu_item_id, v);
      }
    }

    // Combine into CategoryWithItems
    const categoryMap = new Map<string, CategoryWithItems>();

    for (const cat of categories as MenuCategory[]) {
      categoryMap.set(cat.id, {
        id: cat.id,
        name: cat.name,
        sortOrder: cat.sort_order,
        items: [],
      });
    }

    for (const item of items as MenuItem[]) {
      const cat = categoryMap.get(item.category_id);
      if (!cat) continue;

      const ver = versionMap.get(item.id);
      const pricePaise = priceMap.get(item.id) || 0;
      const metadata = (ver?.metadata || item.metadata || {}) as MenuItemWithDetails["metadata"];

      cat.items.push({
        id: item.id,
        categoryId: item.category_id,
        name: item.name,
        status: item.status,
        description: ver?.description || "",
        pricePaise,
        imageUrl: ver?.image_url || null,
        metadata,
      });
    }

    const result = Array.from(categoryMap.values())
      .filter((cat) => cat.items.length > 0)
      .sort((a, b) => a.sortOrder - b.sortOrder);

    return result.length > 0 ? result : getFallbackCatalog();
  } catch (error) {
    console.warn("Using fallback menu catalog due to error:", error);
    return getFallbackCatalog();
  }
}

/**
 * Cached getter for menu catalog.
 * Caches for 60 seconds and supports on-demand tag revalidation ("menu-catalog").
 */
export const getMenuCatalog = unstable_cache(
  async (): Promise<CategoryWithItems[]> => {
    return fetchMenuCatalogDirectly();
  },
  ["smol_menu_catalog_v2"],
  {
    revalidate: 60,
    tags: ["menu-catalog"],
  }
);

