"use server";

import { getTableSessionCookie } from "@/lib/session";
import { resolveQrToken } from "@/app/t/actions";
import { createAdminClient } from "@/lib/supabase/admin";
import type { OrderStatus } from "@smol-cafe/db";

export interface OrderItemSnapshot {
  id: string;
  name: string;
  unitPricePaise: number;
  qty: number;
  lineSubtotal: number;
  itemStatus: string;
}

export interface CustomerOrderDetails {
  id: string;
  orderNo: number;
  status: OrderStatus;
  subtotalPaise: number;
  taxPaise: number;
  totalPaise: number;
  submittedAt: string | null;
  acceptedAt: string | null;
  readyAt: string | null;
  servedAt: string | null;
  predictedReadyAt?: string | null;
  etaMinMinutes?: number | null;
  etaMaxMinutes?: number | null;
  items: OrderItemSnapshot[];
}

export interface FetchOrdersResult {
  success: boolean;
  hasSession: boolean;
  orders: CustomerOrderDetails[];
  tableLabel?: string;
  locationName?: string;
  guestName?: string;
  guestPhone?: string;
  message?: string;
}

/**
 * Server Action: Fetches active orders for the current table session.
 */
export async function fetchActiveOrdersAction(): Promise<FetchOrdersResult> {
  let session = await getTableSessionCookie();

  if (!session || !session.sessionId) {
    const defaultRes = await resolveQrToken("table-01", true);
    if (defaultRes.success && defaultRes.session) {
      session = defaultRes.session;
    }
  }

  if (!session || !session.sessionId) {
    return {
      success: false,
      hasSession: false,
      orders: [],
      message: "No active table session found. Please scan your table QR.",
    };
  }

  const supabase = createAdminClient();

  try {
    // 1. Fetch Orders for this table session
    const { data: orders, error: ordersError } = await supabase
      .from("orders")
      .select("*")
      .eq("table_session_id", session.sessionId)
      .order("order_no", { ascending: false });

    if (ordersError || !orders) {
      console.error("Error fetching orders:", ordersError);
      return {
        success: false,
        hasSession: true,
        orders: [],
        tableLabel: session.tableLabel,
        locationName: session.locationName,
        message: "Could not fetch orders from the database.",
      };
    }

    if (orders.length === 0) {
      return {
        success: true,
        hasSession: true,
        orders: [],
        tableLabel: session.tableLabel,
        locationName: session.locationName,
      };
    }

    const orderIds = orders.map((o) => o.id);

    // 2. Fetch Order Items for these orders
    const { data: orderItems, error: itemsError } = await supabase
      .from("order_items")
      .select("*")
      .in("order_id", orderIds);

    if (itemsError) {
      console.error("Error fetching order items:", itemsError);
    }

    const itemsByOrder = new Map<string, OrderItemSnapshot[]>();
    for (const item of (orderItems as Array<{
      id: string;
      order_id: string;
      name_snapshot: string;
      unit_price_snapshot: number;
      qty: number;
      line_subtotal: number;
      item_status: string;
    }>) || []) {
      if (!itemsByOrder.has(item.order_id)) {
        itemsByOrder.set(item.order_id, []);
      }
      itemsByOrder.get(item.order_id)!.push({
        id: item.id,
        name: item.name_snapshot,
        unitPricePaise: item.unit_price_snapshot,
        qty: item.qty,
        lineSubtotal: item.line_subtotal,
        itemStatus: item.item_status,
      });
    }

    // 3. Assemble structured orders
    const structuredOrders: CustomerOrderDetails[] = (
      orders as Array<{
        id: string;
        order_no: number;
        status: OrderStatus;
        subtotal_snapshot: number;
        tax_snapshot: number;
        total_snapshot: number;
        submitted_at: string | null;
        accepted_at: string | null;
        ready_at: string | null;
        served_at: string | null;
        predicted_ready_at?: string | null;
        eta_min_minutes?: number | null;
        eta_max_minutes?: number | null;
      }>
    ).map((o) => ({
      id: o.id,
      orderNo: o.order_no,
      status: o.status,
      subtotalPaise: o.subtotal_snapshot,
      taxPaise: o.tax_snapshot,
      totalPaise: o.total_snapshot,
      submittedAt: o.submitted_at,
      acceptedAt: o.accepted_at,
      readyAt: o.ready_at,
      servedAt: o.served_at,
      predictedReadyAt: o.predicted_ready_at,
      etaMinMinutes: o.eta_min_minutes || 8,
      etaMaxMinutes: o.eta_max_minutes || 12,
      items: itemsByOrder.get(o.id) || [],
    }));

    return {
      success: true,
      hasSession: true,
      orders: structuredOrders,
      tableLabel: session.tableLabel,
      locationName: session.locationName,
      guestName: session.guestName,
      guestPhone: session.guestPhone,
    };
  } catch (error) {
    console.error("Unexpected error in fetchActiveOrdersAction:", error);
    return {
      success: false,
      hasSession: true,
      orders: [],
      tableLabel: session.tableLabel,
      locationName: session.locationName,
      message: "An unexpected error occurred.",
    };
  }
}
