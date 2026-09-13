"use server";

import { cookies } from "next/headers";
import { createAdminClient } from "@/lib/supabase/admin";
import type { OrderStatus } from "@smol-cafe/db";
import { generateRequestId, logger } from "@/lib/observability/logger";
import { recordKdsHeartbeat, evaluateKdsSilence } from "@/lib/observability/alerts";
import { captureAppException } from "@/lib/observability/sentry";

const STAFF_SESSION_COOKIE = "smol_staff_session";

export interface KitchenOrderItem {
  id: string;
  name: string;
  qty: number;
  itemStatus: string;
}

export interface KitchenTicket {
  id: string;
  orderNo: number;
  tableLabel: string;
  tableId: string;
  status: OrderStatus;
  submittedAt: string | null;
  acceptedAt: string | null;
  readyAt: string | null;
  instructions?: string | null;
  items: KitchenOrderItem[];
}

export interface FetchKitchenOrdersResult {
  success: boolean;
  orders: KitchenTicket[];
  message?: string;
}

export interface TransitionOrderResult {
  success: boolean;
  error?: "STATUS_MISMATCH" | "ORDER_NOT_FOUND" | "DB_ERROR";
  message?: string;
  currentStatus?: OrderStatus;
}

/**
 * Server Action: Fetches all active kitchen orders (SUBMITTED, ACCEPTED, PREPARING, READY)
 */
export async function fetchKitchenOrdersAction(): Promise<FetchKitchenOrdersResult> {
  const supabase = createAdminClient();
  recordKdsHeartbeat();

  try {
    // 1. Fetch active confirmed orders only (orders must be confirmed by cashier first)
    const { data: orders, error: ordersError } = await supabase
      .from("orders")
      .select("*")
      .in("status", ["CONFIRMED", "ACCEPTED", "PREPARING", "READY"])
      .order("submitted_at", { ascending: true });

    if (ordersError || !orders) {
      logger.error("Error fetching kitchen orders", {
        action: "fetchKitchenOrders",
        data: { error: ordersError?.message },
      });
      return { success: false, orders: [], message: "Failed to fetch kitchen orders." };
    }

    evaluateKdsSilence(orders.length);

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
    const { data: orderItems, error: itemsError } = await supabase
      .from("order_items")
      .select("*")
      .in("order_id", orderIds);

    if (itemsError) {
      console.error("Error fetching order items for kitchen:", itemsError);
    }

    const itemsByOrder = new Map<string, KitchenOrderItem[]>();
    for (const item of (orderItems as Array<{
      id: string;
      order_id: string;
      name_snapshot: string;
      qty: number;
      item_status: string;
    }>) || []) {
      if (!itemsByOrder.has(item.order_id)) {
        itemsByOrder.set(item.order_id, []);
      }
      itemsByOrder.get(item.order_id)!.push({
        id: item.id,
        name: item.name_snapshot,
        qty: item.qty,
        itemStatus: item.item_status,
      });
    }

    // 4. Assemble structured kitchen tickets
    const tickets: KitchenTicket[] = orders.map((o) => {
      const tableInfo = o.table_session_id ? tableLabelMap.get(o.table_session_id) : null;

      return {
        id: o.id,
        orderNo: o.order_no,
        tableLabel: tableInfo?.label || "Direct / Takeaway",
        tableId: tableInfo?.tableId || "",
        status: o.status,
        submittedAt: o.submitted_at,
        acceptedAt: o.accepted_at,
        readyAt: o.ready_at,
        instructions: (o as { instructions?: string | null }).instructions || null,
        items: itemsByOrder.get(o.id) || [],
      };
    });

    return {
      success: true,
      orders: tickets,
    };
  } catch (error) {
    console.error("Unexpected error in fetchKitchenOrdersAction:", error);
    return { success: false, orders: [], message: "An unexpected error occurred." };
  }
}

/**
 * Server Action: Validates current status and transitions order with history logging
 */
export async function transitionOrderStatusAction(
  orderId: string,
  fromStatus: OrderStatus,
  toStatus: OrderStatus
): Promise<TransitionOrderResult> {
  const requestId = generateRequestId();
  const startTime = Date.now();
  const supabase = createAdminClient();
  const nowIso = new Date().toISOString();

  try {
    // 1. Fetch current order status to prevent concurrent double-processing
    const { data: currentOrder, error: fetchErr } = await supabase
      .from("orders")
      .select("status")
      .eq("id", orderId)
      .single();

    if (fetchErr || !currentOrder) {
      logger.warn("Status transition rejected: Order not found", {
        requestId,
        orderId,
        action: "transitionOrderStatus",
      });
      return {
        success: false,
        error: "ORDER_NOT_FOUND",
        message: "Order ticket could not be found.",
      };
    }

    if (currentOrder.status !== fromStatus) {
      logger.warn(
        `Status transition conflict: Expected ${fromStatus}, found ${currentOrder.status}`,
        {
          requestId,
          orderId,
          action: "transitionOrderStatus",
          data: { expected: fromStatus, actual: currentOrder.status },
        }
      );
      return {
        success: false,
        error: "STATUS_MISMATCH",
        currentStatus: currentOrder.status as OrderStatus,
        message: `Ticket was already moved to ${currentOrder.status} by another staff member.`,
      };
    }

    // 2. Prepare timestamp updates
    const updatePayload: Record<string, unknown> = {
      status: toStatus,
      updated_at: nowIso,
    };

    if (toStatus === "ACCEPTED") updatePayload.accepted_at = nowIso;
    if (toStatus === "READY") updatePayload.ready_at = nowIso;
    if (toStatus === "SERVED") updatePayload.served_at = nowIso;

    // 3. Update orders row
    const { error: updateErr } = await supabase
      .from("orders")
      .update(updatePayload)
      .eq("id", orderId);

    if (updateErr) {
      logger.error("Failed to update order status", {
        requestId,
        orderId,
        action: "transitionOrderStatus",
        data: { error: updateErr.message },
      });
      return {
        success: false,
        error: "DB_ERROR",
        message: "Failed to update order status.",
      };
    }

    // 4. Log to order_status_history with request_id correlation
    await supabase.from("order_status_history").insert({
      order_id: orderId,
      from_status: fromStatus,
      to_status: toStatus,
      actor_type: "STAFF",
      notes: `Transitioned via KDS [${requestId}]`,
      created_at: nowIso,
    });

    // 5. Trigger Inventory Lifecycle Transition (RESERVE -> CONSUME on PREPARING or RELEASE on CANCELLED)
    try {
      await supabase.rpc("handle_order_inventory_transition", {
        p_order_id: orderId,
        p_to_status: toStatus,
      });
    } catch (invErr) {
      console.warn("Inventory transition notice:", invErr);
    }

    const durationMs = Date.now() - startTime;
    logger.info(`Order ${orderId} moved from ${fromStatus} to ${toStatus}`, {
      requestId,
      orderId,
      action: "transitionOrderStatus",
      durationMs,
      data: { fromStatus, toStatus },
    });

    return {
      success: true,
      message: `Order moved to ${toStatus}`,
    };
  } catch (error) {
    const durationMs = Date.now() - startTime;
    logger.error("Unexpected error in transitionOrderStatusAction", {
      requestId,
      orderId,
      action: "transitionOrderStatus",
      durationMs,
      data: { error: String(error) },
    });
    captureAppException(error, { requestId, orderId });

    return {
      success: false,
      error: "DB_ERROR",
      message: "An unexpected error occurred during status transition.",
    };
  }
}

/**
 * Server Action: Staff login
 */
export async function staffLoginAction(
  pinOrPassword: string
): Promise<{ success: boolean; message?: string }> {
  // Simple staff authentication for kitchen tablet
  const validPins = ["1234", "smol2026", "chef", "kitchen"];
  if (validPins.includes(pinOrPassword.trim().toLowerCase())) {
    const cookieStore = await cookies();
    cookieStore.set(STAFF_SESSION_COOKIE, "authenticated", {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 60 * 60 * 24 * 7, // 7 days
      path: "/",
    });
    return { success: true };
  }

  return { success: false, message: "Invalid staff passcode. Try: 1234" };
}

/**
 * Server Action: Check if staff is logged in
 */
export async function checkStaffAuthAction(): Promise<boolean> {
  const cookieStore = await cookies();
  return Boolean(cookieStore.get(STAFF_SESSION_COOKIE)?.value);
}

/**
 * Server Action: Staff logout
 */
export async function staffLogoutAction(): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.delete(STAFF_SESSION_COOKIE);
}
