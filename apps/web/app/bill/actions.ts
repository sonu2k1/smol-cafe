"use server";

import { getTableSessionCookie } from "@/lib/session";
import { resolveQrToken } from "@/app/t/actions";
import { createAdminClient } from "@/lib/supabase/admin";
import type { TableSessionStatus, OrderStatus } from "@smol-cafe/db";

export interface BillOrderRoundItem {
  id: string;
  name: string;
  qty: number;
  unitPricePaise: number;
  lineSubtotal: number;
}

export interface BillOrderRound {
  orderId: string;
  orderNo: number;
  status: OrderStatus;
  submittedAt: string | null;
  roundTotalPaise: number;
  items: BillOrderRoundItem[];
}

export interface RunningBillDetails {
  sessionId: string;
  sessionStatus: TableSessionStatus;
  tableLabel: string;
  locationName: string;
  openedAt: string;
  subtotalPaise: number;
  taxPaise: number;
  totalPaise: number;
  paidAmountPaise: number;
  balanceDuePaise: number;
  rounds: BillOrderRound[];
  guestName?: string;
  guestPhone?: string;
}

export interface FetchBillResult {
  success: boolean;
  hasSession: boolean;
  bill?: RunningBillDetails;
  message?: string;
}

export interface RecordCashPaymentResult {
  success: boolean;
  error?: string;
  message?: string;
  billId?: string;
  totalPaise?: number;
  tenderedPaise?: number;
  changePaise?: number;
}

/**
 * Server Action: Fetches the running bill breakdown for the current customer session
 */
export async function fetchRunningBillAction(): Promise<FetchBillResult> {
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
      message: "No active dining session found.",
    };
  }

  const supabase = createAdminClient();

  try {
    // 1. Fetch current session status
    const { data: currentSession, error: sessionErr } = await supabase
      .from("table_sessions")
      .select("*")
      .eq("id", session.sessionId)
      .single();

    if (sessionErr || !currentSession) {
      return {
        success: false,
        hasSession: false,
        message: "Table session not found in database.",
      };
    }

    // 2. Fetch all orders for this table session
    const { data: orders, error: ordersErr } = await supabase
      .from("orders")
      .select("*")
      .eq("table_session_id", session.sessionId)
      .order("order_no", { ascending: true });

    if (ordersErr) {
      console.error("Error fetching orders for bill:", ordersErr);
    }

    const orderIds = (orders || []).map((o) => o.id);

    // 3. Fetch order items
    const itemsByOrder = new Map<string, BillOrderRoundItem[]>();

    if (orderIds.length > 0) {
      const { data: orderItems } = await supabase
        .from("order_items")
        .select("*")
        .in("order_id", orderIds);

      for (const item of (orderItems as Array<{
        id: string;
        order_id: string;
        name_snapshot: string;
        qty: number;
        unit_price_snapshot: number;
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
    }

    // 4. Calculate rounds and financial sums
    let subtotalPaise = 0;
    let taxPaise = 0;
    let totalPaise = 0;

    const rounds: BillOrderRound[] = (orders || [])
      .filter((o) => o.status !== "CANCELLED" && o.status !== "REJECTED")
      .map((o) => {
        subtotalPaise += o.subtotal_snapshot || 0;
        taxPaise += o.tax_snapshot || 0;
        totalPaise += o.total_snapshot || 0;

        return {
          orderId: o.id,
          orderNo: o.order_no,
          status: o.status,
          submittedAt: o.submitted_at,
          roundTotalPaise: o.total_snapshot || 0,
          items: itemsByOrder.get(o.id) || [],
        };
      });

    const paidAmountPaise = currentSession.status === "CLOSED" ? totalPaise : 0;
    const balanceDuePaise = totalPaise - paidAmountPaise;

    return {
      success: true,
      hasSession: true,
      bill: {
        sessionId: currentSession.id,
        sessionStatus: currentSession.status,
        tableLabel: session.tableLabel,
        locationName: session.locationName,
        openedAt: currentSession.opened_at,
        subtotalPaise,
        taxPaise,
        totalPaise,
        paidAmountPaise,
        balanceDuePaise,
        rounds,
        guestName: session.guestName,
        guestPhone: session.guestPhone,
      },
    };
  } catch (err) {
    console.error("Error in fetchRunningBillAction:", err);
    return {
      success: false,
      hasSession: true,
      message: "An unexpected error occurred while loading your bill.",
    };
  }
}

/**
 * Server Action: Customer requests bill, setting table_session status to PAYMENT_PENDING
 */
export async function requestBillAction(): Promise<{ success: boolean; message?: string }> {
  const session = await getTableSessionCookie();
  if (!session || !session.sessionId) {
    return { success: false, message: "No active session found." };
  }

  const supabase = createAdminClient();

  try {
    const { error } = await supabase
      .from("table_sessions")
      .update({
        status: "PAYMENT_PENDING",
        last_activity_at: new Date().toISOString(),
      })
      .eq("id", session.sessionId)
      .eq("status", "OPEN");

    if (error) {
      console.error("Failed to request bill:", error);
      return { success: false, message: "Could not notify staff. Please call a server." };
    }

    return { success: true, message: "Bill requested! Staff is on the way." };
  } catch (err) {
    console.error("Error in requestBillAction:", err);
    return { success: false, message: "Unexpected error requesting bill." };
  }
}

/**
 * Server Action: Staff records cash payment and settles table session
 */
export async function recordCashPaymentAction(
  tableSessionId: string,
  amountTenderedPaise: number,
  staffIdentifier = "Staff",
  idempotencyKey?: string
): Promise<RecordCashPaymentResult> {
  const supabase = createAdminClient();

  try {
    const { data: rpcResult, error: rpcError } = await supabase.rpc("record_cash_payment", {
      p_table_session_id: tableSessionId,
      p_amount_tendered_paise: amountTenderedPaise,
      p_staff_identifier: staffIdentifier,
      p_idempotency_key: idempotencyKey || crypto.randomUUID(),
    });

    if (rpcError) {
      console.error("Error executing record_cash_payment RPC:", rpcError);
      return {
        success: false,
        error: "DB_ERROR",
        message: "Failed to record cash payment in database.",
      };
    }

    const result = rpcResult as {
      success: boolean;
      error?: string;
      message?: string;
      bill_id?: string;
      total_paise?: number;
      tendered_paise?: number;
      change_paise?: number;
    };

    if (!result.success) {
      return {
        success: false,
        error: result.error,
        message: result.message || "Failed to settle payment.",
      };
    }

    return {
      success: true,
      billId: result.bill_id,
      totalPaise: result.total_paise,
      tenderedPaise: result.tendered_paise,
      changePaise: result.change_paise,
      message: result.message,
    };
  } catch (err) {
    console.error("Unexpected error in recordCashPaymentAction:", err);
    return {
      success: false,
      error: "DB_ERROR",
      message: "An unexpected error occurred during cash settlement.",
    };
  }
}

export interface ActiveCashierTable {
  sessionId: string;
  tableId: string;
  tableLabel: string;
  sessionStatus: TableSessionStatus;
  openedAt: string;
  orderCount: number;
  totalPaise: number;
}

/**
 * Server Action: Fetches all active tables and their bill status for the cashier dashboard
 */
export async function fetchActiveCashierTablesAction(): Promise<ActiveCashierTable[]> {
  const supabase = createAdminClient();

  try {
    // Fetch all OPEN or PAYMENT_PENDING sessions
    const { data: sessions, error: sessionErr } = await supabase
      .from("table_sessions")
      .select("*")
      .in("status", ["OPEN", "PAYMENT_PENDING"])
      .order("opened_at", { ascending: false });

    if (sessionErr || !sessions || sessions.length === 0) {
      return [];
    }

    const sessionIds = sessions.map((s) => s.id);
    const tableIds = sessions.map((s) => s.table_id);

    // Fetch table labels
    const { data: tables } = await supabase
      .from("dining_tables")
      .select("id, label")
      .in("id", tableIds);

    const tableLabelMap = new Map<string, string>();
    for (const t of tables || []) {
      tableLabelMap.set(t.id, t.label);
    }

    // Fetch orders to compute totals
    const { data: orders } = await supabase
      .from("orders")
      .select("table_session_id, total_snapshot, status")
      .in("table_session_id", sessionIds);

    const sessionTotals = new Map<string, { count: number; totalPaise: number }>();

    for (const o of orders || []) {
      if (o.status !== "CANCELLED" && o.status !== "REJECTED" && o.table_session_id) {
        if (!sessionTotals.has(o.table_session_id)) {
          sessionTotals.set(o.table_session_id, { count: 0, totalPaise: 0 });
        }
        const st = sessionTotals.get(o.table_session_id)!;
        st.count += 1;
        st.totalPaise += o.total_snapshot || 0;
      }
    }

    return sessions.map((s) => {
      const stats = sessionTotals.get(s.id) || { count: 0, totalPaise: 0 };
      return {
        sessionId: s.id,
        tableId: s.table_id,
        tableLabel: tableLabelMap.get(s.table_id) || "Counter",
        sessionStatus: s.status,
        openedAt: s.opened_at,
        orderCount: stats.count,
        totalPaise: stats.totalPaise,
      };
    });
  } catch (err) {
    console.error("Error in fetchActiveCashierTablesAction:", err);
    return [];
  }
}

/**
 * Server Action: Allows Cashier to open/activate a table session for walk-in guests
 */
export async function openTableSessionAction(
  tableLabel: string
): Promise<{ success: boolean; message?: string }> {
  const token = `table-${tableLabel.toString().padStart(2, "0")}`;
  const res = await resolveQrToken(token, false);
  return {
    success: res.success,
    message: res.success ? `Table ${tableLabel} is now open.` : res.message,
  };
}
