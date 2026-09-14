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
 * Server Action: Fetches all orders waiting in Cashier / Front-Desk Verification Queue (PENDING_CONFIRMATION).
 */
export async function fetchPendingCashierOrdersAction(): Promise<FetchPendingOrdersResult> {
  const supabase = createAdminClient();

  try {
    // 1. Fetch pending orders waiting for cashier review
    const pendingStatuses = isMockDatabase()
      ? ["PENDING_CONFIRMATION", "SUBMITTED"]
      : ["SUBMITTED"];

    const { data: orders, error: ordersError } = await supabase
      .from("orders")
      .select("*")
      .in("status", pendingStatuses)
      .order("submitted_at", { ascending: true });

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
        submittedAt: o.submitted_at,
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
