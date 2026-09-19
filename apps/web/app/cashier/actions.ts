"use server";

import { createAdminClient, isMockDatabase } from "@/lib/supabase/admin";
import type { OrderStatus } from "@smol-cafe/db";

export interface PendingOrderItem {
  id: string;
  name: string;
  qty: number;
  unitPricePaise: number;
  lineSubtotal: number;
}

export interface PendingOrderVerification {
  id: string;
  orderNo: number;
  tableLabel: string;
  tableId: string;
  tableSessionId: string;
  verificationCode: string;
  status: OrderStatus;
  paymentStatus?: string;
  submittedAt: string | null;
  totalPaise: number;
  instructions: string | null;
  items: PendingOrderItem[];
}

export interface FetchPendingOrdersResult {
  success: boolean;
  orders: PendingOrderVerification[];
  message?: string;
}

export interface ConfirmOrderResult {
  success: boolean;
  orderId?: string;
  message?: string;
}

/**
 * Server Action: Fetches all active incoming orders for Cashier Review & Billing Queue.
 */
export async function fetchPendingCashierOrdersAction(): Promise<FetchPendingOrdersResult> {
  const supabase = createAdminClient();

  try {
    // 1. Fetch incoming submitted/confirmed/preparing orders
    const pendingStatuses = [
      "SUBMITTED",
      "PENDING_CONFIRMATION",
      "CONFIRMED",
      "ACCEPTED",
      "PREPARING",
      "READY",
    ];

    const { data: orders, error: ordersError } = await supabase
      .from("orders")
      .select("*")
      .in("status", pendingStatuses)
      .order("created_at", { ascending: false });

    if (ordersError || !orders) {
      return { success: false, orders: [], message: "Failed to fetch pending queue." };
    }

    if (orders.length === 0) {
      return { success: true, orders: [] };
    }

    const orderIds = orders.map((o) => o.id);
    const sessionIds = orders
      .map((o) => o.table_session_id)
      .filter((id): id is string => Boolean(id));

    // 2. Fetch Dining Table Labels via Table Sessions
    const tableLabelMap = new Map<string, { label: string; tableId: string }>();

    if (sessionIds.length > 0) {
      const { data: sessions } = await supabase
        .from("table_sessions")
        .select("id, table_id")
        .in("id", sessionIds);

      const tableIds = (sessions || [])
        .map((s) => s.table_id)
        .filter((id): id is string => Boolean(id));

      if (tableIds.length > 0) {
        const { data: tables } = await supabase
          .from("dining_tables")
          .select("id, label")
          .in("id", tableIds);

        const tableMap = new Map<string, string>();
        for (const t of tables || []) {
          tableMap.set(t.id, t.label);
        }

        for (const s of sessions || []) {
          const label = tableMap.get(s.table_id) || "Counter";
          tableLabelMap.set(s.id, { label, tableId: s.table_id });
        }
      }
    }

    // 3. Fetch Order Items
    const { data: orderItems } = await supabase
      .from("order_items")
      .select("*")
      .in("order_id", orderIds);

    const itemsByOrder = new Map<string, PendingOrderItem[]>();
    for (const item of (orderItems as Array<{
      id: string;
      order_id: string;
      name_snapshot: string;
      unit_price_snapshot: number;
      qty: number;
      line_subtotal: number;
    }>) || []) {
      if (!itemsByOrder.has(item.order_id)) {
        itemsByOrder.set(item.order_id, []);
      }
      itemsByOrder.get(item.order_id)!.push({
        id: item.id,
        name: item.name_snapshot,
        qty: item.qty,
        unitPricePaise: item.unit_price_snapshot,
        lineSubtotal: item.line_subtotal,
      });
    }

    const verificationQueue: PendingOrderVerification[] = orders.map((o) => {
      const tableInfo = o.table_session_id ? tableLabelMap.get(o.table_session_id) : null;
      return {
        id: o.id,
        orderNo: o.order_no,
        tableLabel: tableInfo?.label || "Direct",
        tableId: tableInfo?.tableId || "",
        tableSessionId: o.table_session_id || "",
        verificationCode: o.verification_code || "4821",
        status: o.status,
        paymentStatus: (o as unknown as { payment_status?: string }).payment_status || "PAID",
        submittedAt: o.submitted_at || o.created_at,
        totalPaise: o.total_snapshot || 0,
        instructions: o.instructions || null,
        items: itemsByOrder.get(o.id) || [],
      };
    });

    return {
      success: true,
      orders: verificationQueue,
    };
  } catch (err) {
    console.error("Error in fetchPendingCashierOrdersAction:", err);
    return { success: false, orders: [], message: "Unexpected error fetching pending queue." };
  }
}

/**
 * Server Action: Cashier confirms a verified order, pushing it to the kitchen queue.
 */
export async function confirmCashierOrderAction(
  orderId: string,
  staffName = "Cashier"
): Promise<ConfirmOrderResult> {
  const supabase = createAdminClient();
  const nowIso = new Date().toISOString();

  try {
    const { data: rpcResult, error: rpcError } = await supabase.rpc("confirm_order_by_cashier", {
      p_order_id: orderId,
      p_staff_name: staffName,
    });

    if (!rpcError && rpcResult) {
      const result = rpcResult as { success: boolean; order_id?: string; message?: string };
      return {
        success: result.success,
        orderId: result.order_id || orderId,
        message: result.message || "Order confirmed and sent to kitchen!",
      };
    }

    // Direct database fallback if RPC not available
    const { error: updateErr } = await supabase
      .from("orders")
      .update({
        status: "CONFIRMED",
        accepted_at: nowIso,
        updated_at: nowIso,
      })
      .eq("id", orderId);

    if (updateErr) {
      console.error("Failed to confirm order directly:", updateErr);
      return { success: false, message: "Failed to confirm order in database." };
    }

    await supabase.from("order_status_history").insert({
      order_id: orderId,
      from_status: "PENDING_CONFIRMATION",
      to_status: "CONFIRMED",
      actor_type: "STAFF",
      notes: `Confirmed by Cashier (${staffName})`,
      created_at: nowIso,
    });

    return {
      success: true,
      orderId,
      message: "Order confirmed and sent to kitchen!",
    };
  } catch (err) {
    console.error("Error in confirmCashierOrderAction:", err);
    return { success: false, message: "Unexpected error confirming order." };
  }
}

/**
 * Server Action: Cashier rejects/cancels an order with a reason.
 */
export async function rejectCashierOrderAction(
  orderId: string,
  reason: string,
  staffName = "Cashier"
): Promise<ConfirmOrderResult> {
  const supabase = createAdminClient();
  const nowIso = new Date().toISOString();

  try {
    const { data: rpcResult, error: rpcError } = await supabase.rpc("reject_order_by_cashier", {
      p_order_id: orderId,
      p_reason: reason,
      p_staff_name: staffName,
    });

    if (!rpcError && rpcResult) {
      const result = rpcResult as { success: boolean; order_id?: string; message?: string };
      return {
        success: result.success,
        orderId: result.order_id || orderId,
        message: result.message || "Order rejected.",
      };
    }

    // Direct database fallback
    const { error: updateErr } = await supabase
      .from("orders")
      .update({
        status: "CANCELLED",
        updated_at: nowIso,
      })
      .eq("id", orderId);

    if (updateErr) {
      return { success: false, message: "Failed to reject order in database." };
    }

    await supabase.from("order_status_history").insert({
      order_id: orderId,
      from_status: "PENDING_CONFIRMATION",
      to_status: "CANCELLED",
      actor_type: "STAFF",
      notes: `Rejected by Cashier (${staffName}): ${reason}`,
      created_at: nowIso,
    });

    return {
      success: true,
      orderId,
      message: "Order cancelled by cashier.",
    };
  } catch (err) {
    console.error("Error in rejectCashierOrderAction:", err);
    return { success: false, message: "Unexpected error rejecting order." };
  }
}

export interface PaidHistoryItem {
  name: string;
  qty: number;
  priceRupees: number;
  subtotalRupees: number;
}

export interface PaidHistoryRecord {
  id: string;
  tableLabel: string;
  totalRupees: number;
  paymentMethod: "UPI" | "CASH" | "CARD";
  paidAt: string;
  itemsCount: number;
  items?: PaidHistoryItem[];
}

export interface FetchPaidHistoryResult {
  success: boolean;
  records: PaidHistoryRecord[];
  totalRevenueRupees: number;
  message?: string;
}

/**
 * Server Action: Fetches all paid orders & settlements for Cashier Audit & Paid Orders tab.
 */
export async function fetchPaidCashierHistoryAction(): Promise<FetchPaidHistoryResult> {
  const supabase = createAdminClient();

  try {
    // 1. Fetch paid orders (all placed/submitted/cooking/delivered/closed orders)
    const { data: orders, error: ordersErr } = await supabase
      .from("orders")
      .select("*")
      .not("status", "in", '("CANCELLED","REJECTED","DRAFT")')
      .order("created_at", { ascending: false });

    if (ordersErr) {
      console.error("Error fetching paid orders:", ordersErr);
    }

    // 2. Fetch dining table labels
    const sessionIds = (orders || [])
      .map((o) => o.table_session_id)
      .filter((id): id is string => Boolean(id));

    const tableLabelMap = new Map<string, string>();
    if (sessionIds.length > 0) {
      const { data: sessions } = await supabase
        .from("table_sessions")
        .select("id, table_id")
        .in("id", sessionIds);

      const tableIds = (sessions || [])
        .map((s) => s.table_id)
        .filter((id): id is string => Boolean(id));

      if (tableIds.length > 0) {
        const { data: tables } = await supabase
          .from("dining_tables")
          .select("id, label")
          .in("id", tableIds);

        const tableMap = new Map<string, string>();
        for (const t of tables || []) {
          tableMap.set(t.id, t.label);
        }

        for (const s of sessions || []) {
          tableLabelMap.set(s.id, tableMap.get(s.table_id) || "01");
        }
      }
    }

    // 3. Fetch order items
    const orderIds = (orders || []).map((o) => o.id);
    const itemsByOrder = new Map<string, PaidHistoryItem[]>();

    if (orderIds.length > 0) {
      const { data: orderItems } = await supabase
        .from("order_items")
        .select("*")
        .in("order_id", orderIds);

      for (const item of (orderItems as Array<{
        id: string;
        order_id: string;
        name_snapshot: string;
        unit_price_snapshot: number;
        qty: number;
        line_subtotal: number;
      }>) || []) {
        if (!itemsByOrder.has(item.order_id)) {
          itemsByOrder.set(item.order_id, []);
        }
        itemsByOrder.get(item.order_id)!.push({
          name: item.name_snapshot,
          qty: item.qty,
          priceRupees: Math.round(item.unit_price_snapshot / 100),
          subtotalRupees: Math.round(item.line_subtotal / 100),
        });
      }
    }

    // 4. Map to PaidHistoryRecord
    const records: PaidHistoryRecord[] = (orders || [])
      .filter((o) => o.status !== "CANCELLED" && o.status !== "REJECTED")
      .map((o) => {
        const orderItemsList = itemsByOrder.get(o.id) || [];
        const totalItemsCount = orderItemsList.reduce((acc, i) => acc + i.qty, 0) || 1;
        const rawMethod = (o as unknown as { payment_method?: string }).payment_method;
        let method: "UPI" | "CASH" | "CARD" = "UPI";
        if (rawMethod?.toUpperCase() === "CASH") {
          method = "CASH";
        } else if (rawMethod?.toUpperCase() === "CARD") {
          method = "CARD";
        } else {
          method = "UPI";
        }

        let tableLabel = "01";
        if (o.table_session_id) {
          const mapped = tableLabelMap.get(o.table_session_id);
          if (mapped) {
            tableLabel = mapped;
          } else {
            const match = o.table_session_id.match(/tbl[_-]?(\d+)|table[_-]?(\d+)/i);
            if (match) {
              tableLabel = (match[1] || match[2]).padStart(2, "0");
            }
          }
        }

        return {
          id: `ORD-${o.order_no || o.id.slice(-4)}`,
          tableLabel,
          totalRupees: Math.round((o.total_snapshot || 0) / 100),
          paymentMethod: method,
          paidAt: o.confirmed_at || o.submitted_at || o.created_at,
          itemsCount: totalItemsCount,
          items: orderItemsList.length > 0 ? orderItemsList : [
            {
              name: `Order #${o.order_no} Items`,
              qty: 1,
              priceRupees: Math.round((o.total_snapshot || 0) / 100),
              subtotalRupees: Math.round((o.total_snapshot || 0) / 100),
            },
          ],
        };
      });

    const totalRevenueRupees = records.reduce((acc, r) => acc + r.totalRupees, 0);

    return {
      success: true,
      records,
      totalRevenueRupees,
    };
  } catch (err) {
    console.error("Error in fetchPaidCashierHistoryAction:", err);
    return {
      success: false,
      records: [],
      totalRevenueRupees: 0,
      message: "Failed to fetch paid history.",
    };
  }
}

