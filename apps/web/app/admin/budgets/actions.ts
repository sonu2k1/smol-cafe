"use server";

import { createAdminClient } from "@/lib/supabase/admin";
import type { ProcurementCategory } from "@smol-cafe/db";

export interface DrilldownLineItem {
  id: string;
  grnNumber: string;
  receivedAt: string;
  vendorName: string;
  ingredientName: string;
  category: string;
  receivedQty: number;
  unitCostPaise: number;
  totalPaise: number;
}

export interface CategoryBudgetVsActual {
  category: ProcurementCategory | string;
  displayName: string;
  budgetedPaise: number;
  actualSpendPaise: number;
  variancePaise: number;
  percentageUsed: number;
  lineItemsCount: number;
  lineItems: DrilldownLineItem[];
}

export interface VendorSpendSummary {
  vendorId: string;
  vendorName: string;
  totalSpendPaise: number;
  grnCount: number;
  lastDeliveryAt: string;
}

export interface TopIngredientSpend {
  ingredientId: string;
  ingredientName: string;
  category: string;
  totalSpendPaise: number;
  totalQty: number;
}

export interface PriceTrendPoint {
  date: string;
  grnNumber: string;
  vendorName: string;
  unitCostPaise: number;
}

export interface IngredientPriceTrend {
  ingredientId: string;
  ingredientName: string;
  category: string;
  latestCostPaise: number;
  previousCostPaise: number | null;
  percentageChange: number | null;
  history: PriceTrendPoint[];
}

export interface BudgetAnalyticsOverview {
  success: boolean;
  selectedMonth: string;
  totalBudgetedPaise: number;
  totalActualSpendPaise: number;
  totalVariancePaise: number;
  overallPercentageUsed: number;
  categories: CategoryBudgetVsActual[];
  vendorSpend: VendorSpendSummary[];
  topIngredients: TopIngredientSpend[];
  priceTrends: IngredientPriceTrend[];
  message?: string;
}

const CATEGORY_NAMES: Record<string, string> = {
  DAIRY: "Dairy (Milk, Butter, Cream)",
  COFFEE_BEANS: "Coffee Beans & Roasts",
  BAKERY_RAW: "Bakery Raw (Flour, Yeast, Cocoa)",
  SPICES_TEA: "Spices & Chai Blends",
  PACKAGING: "Packaging & Takeaway",
  MISC: "Operational & Misc",
};

/**
 * Server Action: Fetches comprehensive budget vs actual, vendor spend, and price trends for a month
 */
export async function fetchBudgetVsActualAction(
  month = "2026-08"
): Promise<BudgetAnalyticsOverview> {
  const supabase = createAdminClient();

  try {
    // 1. Month Date Range Boundaries
    const [yearStr, monthStr] = month.split("-");
    const year = parseInt(yearStr, 10);
    const monthNum = parseInt(monthStr, 10);
    const startOfMonth = new Date(Date.UTC(year, monthNum - 1, 1, 0, 0, 0)).toISOString();
    const endOfMonth = new Date(Date.UTC(year, monthNum, 0, 23, 59, 59, 999)).toISOString();

    // 2. Fetch Budgets for this month
    const { data: budgets } = await supabase.from("budgets").select("*").eq("month", month);

    const budgetMap = new Map<string, number>();
    for (const b of budgets || []) {
      budgetMap.set(b.category, b.budgeted_amount_paise);
    }

    // 3. Fetch Goods Receipts & lines in this month
    const { data: grns } = await supabase
      .from("goods_receipts")
      .select(
        `
        id,
        grn_number,
        vendor_id,
        received_at,
        vendors(name),
        goods_receipt_lines(
          id,
          ingredient_id,
          received_qty,
          unit_cost_paise,
          ingredients(name, category)
        )
      `
      )
      .gte("received_at", startOfMonth)
      .lte("received_at", endOfMonth)
      .order("received_at", { ascending: false });

    // 4. Also fetch all Historical GRNs for Price History Trends across time
    const { data: historicalGrns } = await supabase
      .from("goods_receipts")
      .select(
        `
        grn_number,
        received_at,
        vendors(name),
        goods_receipt_lines(
          ingredient_id,
          received_qty,
          unit_cost_paise,
          ingredients(name, category)
        )
      `
      )
      .order("received_at", { ascending: true })
      .limit(100);

    // Map Category Accumulators
    const categoryActuals: Record<string, { spend: number; items: DrilldownLineItem[] }> = {
      DAIRY: { spend: 0, items: [] },
      COFFEE_BEANS: { spend: 0, items: [] },
      BAKERY_RAW: { spend: 0, items: [] },
      SPICES_TEA: { spend: 0, items: [] },
      PACKAGING: { spend: 0, items: [] },
      MISC: { spend: 0, items: [] },
    };

    // Vendor Accumulators
    const vendorMap = new Map<
      string,
      { vendorName: string; totalSpendPaise: number; grnCount: number; lastDeliveryAt: string }
    >();

    // Ingredient Accumulators
    const ingredientSpendMap = new Map<
      string,
      { ingredientName: string; category: string; totalSpendPaise: number; totalQty: number }
    >();

    // Process current month deliveries
    for (const rawGrn of (grns as unknown[]) || []) {
      const g = rawGrn as Record<string, unknown>;
      const grnId = String(g.id);
      const grnNumber = String(g.grn_number);
      const vendorId = String(g.vendor_id);
      const receivedAt = String(g.received_at);
      const vendorObj = g.vendors as { name?: string } | undefined;
      const vendorName = vendorObj?.name || "Unknown Vendor";
      const rawLines = (g.goods_receipt_lines as Record<string, unknown>[]) || [];

      // Update Vendor Accumulator
      const currentVendor = vendorMap.get(vendorId) || {
        vendorName,
        totalSpendPaise: 0,
        grnCount: 0,
        lastDeliveryAt: receivedAt,
      };
      currentVendor.grnCount += 1;

      for (const rawLine of rawLines) {
        const lineId = String(rawLine.id);
        const ingredientId = String(rawLine.ingredient_id);
        const receivedQty = Number(rawLine.received_qty);
        const unitCostPaise = Number(rawLine.unit_cost_paise);
        const totalPaise = Math.round(receivedQty * unitCostPaise);

        const ingObj = rawLine.ingredients as { name?: string; category?: string } | undefined;
        const ingredientName = ingObj?.name || "Ingredient";
        const category = ingObj?.category || "MISC";

        // Category Drill-down item
        const drillItem: DrilldownLineItem = {
          id: `${grnId}-${lineId}`,
          grnNumber,
          receivedAt,
          vendorName,
          ingredientName,
          category,
          receivedQty,
          unitCostPaise,
          totalPaise,
        };

        if (!categoryActuals[category]) {
          categoryActuals[category] = { spend: 0, items: [] };
        }
        categoryActuals[category].spend += totalPaise;
        categoryActuals[category].items.push(drillItem);

        // Vendor Spend Accumulator
        currentVendor.totalSpendPaise += totalPaise;

        // Top Ingredient Accumulator
        const ingSpend = ingredientSpendMap.get(ingredientId) || {
          ingredientName,
          category,
          totalSpendPaise: 0,
          totalQty: 0,
        };
        ingSpend.totalSpendPaise += totalPaise;
        ingSpend.totalQty += receivedQty;
        ingredientSpendMap.set(ingredientId, ingSpend);
      }

      vendorMap.set(vendorId, currentVendor);
    }

    // Compute Budget vs Actual per category
    const categoryResults: CategoryBudgetVsActual[] = Object.keys(categoryActuals).map((cat) => {
      const budgetedPaise = budgetMap.get(cat) || 0;
      const actualSpendPaise = categoryActuals[cat].spend;
      const variancePaise = budgetedPaise - actualSpendPaise;
      const percentageUsed = budgetedPaise > 0 ? (actualSpendPaise / budgetedPaise) * 100 : 0;

      return {
        category: cat,
        displayName: CATEGORY_NAMES[cat] || cat,
        budgetedPaise,
        actualSpendPaise,
        variancePaise,
        percentageUsed: Math.round(percentageUsed * 10) / 10,
        lineItemsCount: categoryActuals[cat].items.length,
        lineItems: categoryActuals[cat].items,
      };
    });

    let totalBudgetedPaise = 0;
    let totalActualSpendPaise = 0;

    for (const c of categoryResults) {
      totalBudgetedPaise += c.budgetedPaise;
      totalActualSpendPaise += c.actualSpendPaise;
    }

    const totalVariancePaise = totalBudgetedPaise - totalActualSpendPaise;
    const overallPercentageUsed =
      totalBudgetedPaise > 0
        ? Math.round((totalActualSpendPaise / totalBudgetedPaise) * 1000) / 10
        : 0;

    // Vendor Spend Array (Ranked by spend)
    const vendorSpendList: VendorSpendSummary[] = Array.from(vendorMap.entries())
      .map(([vendorId, data]) => ({
        vendorId,
        vendorName: data.vendorName,
        totalSpendPaise: data.totalSpendPaise,
        grnCount: data.grnCount,
        lastDeliveryAt: data.lastDeliveryAt,
      }))
      .sort((a, b) => b.totalSpendPaise - a.totalSpendPaise);

    // Top Ingredients Array (Ranked by spend)
    const topIngredientsList: TopIngredientSpend[] = Array.from(ingredientSpendMap.entries())
      .map(([ingredientId, data]) => ({
        ingredientId,
        ingredientName: data.ingredientName,
        category: data.category,
        totalSpendPaise: data.totalSpendPaise,
        totalQty: data.totalQty,
      }))
      .sort((a, b) => b.totalSpendPaise - a.totalSpendPaise)
      .slice(0, 8);

    // Ingredient Price History Trends
    const priceHistMap = new Map<
      string,
      { ingredientName: string; category: string; history: PriceTrendPoint[] }
    >();

    for (const rawGrn of (historicalGrns as unknown[]) || []) {
      const g = rawGrn as Record<string, unknown>;
      const grnNumber = String(g.grn_number);
      const receivedAt = String(g.received_at);
      const vendorObj = g.vendors as { name?: string } | undefined;
      const vendorName = vendorObj?.name || "Vendor";
      const rawLines = (g.goods_receipt_lines as Record<string, unknown>[]) || [];

      for (const rawLine of rawLines) {
        const ingredientId = String(rawLine.ingredient_id);
        const unitCostPaise = Number(rawLine.unit_cost_paise);
        const ingObj = rawLine.ingredients as { name?: string; category?: string } | undefined;
        const ingredientName = ingObj?.name || "Ingredient";
        const category = ingObj?.category || "MISC";

        const currentHist = priceHistMap.get(ingredientId) || {
          ingredientName,
          category,
          history: [],
        };
        currentHist.history.push({
          date: receivedAt,
          grnNumber,
          vendorName,
          unitCostPaise,
        });
        priceHistMap.set(ingredientId, currentHist);
      }
    }

    const priceTrendsList: IngredientPriceTrend[] = Array.from(priceHistMap.entries()).map(
      ([ingredientId, data]) => {
        const history = data.history;
        const latest = history[history.length - 1];
        const previous = history.length > 1 ? history[history.length - 2] : null;

        let percentageChange: number | null = null;
        if (previous && previous.unitCostPaise > 0) {
          percentageChange =
            Math.round(
              ((latest.unitCostPaise - previous.unitCostPaise) / previous.unitCostPaise) * 1000
            ) / 10;
        }

        return {
          ingredientId,
          ingredientName: data.ingredientName,
          category: data.category,
          latestCostPaise: latest.unitCostPaise,
          previousCostPaise: previous?.unitCostPaise || null,
          percentageChange,
          history,
        };
      }
    );

    return {
      success: true,
      selectedMonth: month,
      totalBudgetedPaise,
      totalActualSpendPaise,
      totalVariancePaise,
      overallPercentageUsed,
      categories: categoryResults,
      vendorSpend: vendorSpendList,
      topIngredients: topIngredientsList,
      priceTrends: priceTrendsList,
    };
  } catch (err) {
    console.error("Error in fetchBudgetVsActualAction:", err);
    return {
      success: false,
      selectedMonth: month,
      totalBudgetedPaise: 0,
      totalActualSpendPaise: 0,
      totalVariancePaise: 0,
      overallPercentageUsed: 0,
      categories: [],
      vendorSpend: [],
      topIngredients: [],
      priceTrends: [],
      message: "Failed to load budget analytics.",
    };
  }
}

import { requireStaffAuth } from "@/lib/auth/rbac";

/**
 * Server Action: Upserts a monthly budget for a category
 */
export async function upsertBudgetAction(
  category: string,
  month: string,
  budgetedAmountPaise: number,
  notes?: string
): Promise<{ success: boolean; message?: string }> {
  const auth = await requireStaffAuth(["admin", "super_admin"]);
  if (!auth.authorized) {
    return { success: false, message: auth.message || "Unauthorized." };
  }

  const supabase = createAdminClient();

  try {
    const { error } = await supabase.from("budgets").upsert(
      {
        category,
        month,
        budgeted_amount_paise: budgetedAmountPaise,
        notes: notes?.trim() || null,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "category,month" }
    );

    if (error) {
      console.error("Error upserting budget:", error);
      return { success: false, message: "Failed to update category budget." };
    }

    return { success: true, message: `Budget for ${category} updated successfully.` };
  } catch {
    return { success: false, message: "An unexpected error occurred." };
  }
}
