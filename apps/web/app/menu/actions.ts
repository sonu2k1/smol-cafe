"use server";

import { getTableSessionCookie } from "@/lib/session";
import { resolveQrToken } from "@/app/t/actions";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { generateRequestId, logger } from "@/lib/observability/logger";
import { recordOrderAttempt } from "@/lib/observability/alerts";
import { captureAppException } from "@/lib/observability/sentry";

export interface PlaceOrderItemInput {
  menu_item_id: string;
  expected_unit_price_paise: number;
  qty: number;
}

export interface ChangedItemDiff {
  menu_item_id: string;
  name: string;
  expected_price_paise: number;
  current_price_paise: number;
}

export interface PlaceOrderResult {
  success: boolean;
  error?:
    | "NO_SESSION"
    | "SESSION_NOT_OPEN"
    | "PRICE_CHANGED"
    | "DB_ERROR"
    | "EMPTY_CART"
    | "INSUFFICIENT_POINTS"
    | "AUTH_REQUIRED"
    | "ORDER_LOCKED"
    | "UNAUTHORIZED";
  message?: string;
  orderId?: string;
  orderNo?: number;
  verificationCode?: string;
  status?: string;
  discountPaise?: number;
  totalPaise?: number;
  isDuplicate?: boolean;
  changedItems?: ChangedItemDiff[];
}

/**
 * Server Action: Places an order within a single atomic PostgreSQL transaction
 * enforcing server-side price re-validation, inventory reservation, and reward redemption.
 */
export async function placeOrderAction(
  items: PlaceOrderItemInput[],
  idempotencyKey: string,
  rewardId?: string,
  instructions?: string
): Promise<PlaceOrderResult> {
  const requestId = generateRequestId();
  const startTime = Date.now();

  // 1. Verify Active Table Session from Signed Cookie or fallback to default table
  let session = await getTableSessionCookie();
  if (!session || !session.sessionId || !session.locationId) {
    const defaultRes = await resolveQrToken("table-01", true);
    if (defaultRes.success && defaultRes.session) {
      session = defaultRes.session;
    }
  }

  if (!session || !session.sessionId || !session.locationId) {
    logger.warn("Order placement rejected: No active table session", {
      requestId,
      action: "placeOrder",
    });
    recordOrderAttempt(false);
    return {
      success: false,
      error: "NO_SESSION",
      message: "No active dining session found. Please scan your table QR code.",
    };
  }

  // 2. Validate Cart Items
  if (!items || items.length === 0) {
    logger.warn("Order placement rejected: Empty cart", {
      requestId,
      tableSessionId: session.sessionId,
      action: "placeOrder",
    });
    recordOrderAttempt(false);
    return {
      success: false,
      error: "EMPTY_CART",
      message: "Your cart is empty. Please add items to place an order.",
    };
  }

  const supabase = createAdminClient();
  const userClient = await createClient();
  const { data: authUser } = await userClient.auth.getUser();
  const profileId = authUser?.user?.id || null;

  try {
    logger.info(`Placing order for table session ${session.sessionId} with ${items.length} items`, {
      requestId,
      tableSessionId: session.sessionId,
      action: "placeOrder",
      data: { itemCount: items.length, rewardId, profileId },
    });

    // 3. Call submit_order PostgreSQL function
    let { data: rpcResult, error: rpcError } = await supabase.rpc("submit_order", {
      p_location_id: session.locationId,
      p_table_session_id: session.sessionId,
      p_customer_session_id: session.customerSessionId || `cust_${session.sessionId}`,
      p_verification_code: session.verificationCode || "4821",
      p_instructions: instructions || null,
      p_idempotency_key: idempotencyKey,
      p_items: items,
      p_reward_id: rewardId || null,
      p_profile_id: profileId,
      p_customer_name: session.guestName || null,
      p_customer_phone: session.guestPhone || null,
    });

    let result = rpcResult as {
      success: boolean;
      error?: string;
      message?: string;
      order_id?: string;
      order_no?: number;
      verification_code?: string;
      status?: string;
      discount_paise?: number;
      total_paise?: number;
      is_duplicate?: boolean;
      changed_items?: ChangedItemDiff[];
    };

    // If session was closed, automatically start a fresh open round for this table
    if (result && !result.success && result.error === "SESSION_NOT_OPEN") {
      const freshRes = await resolveQrToken(`table-${session.tableLabel || "01"}`, true);
      if (freshRes.success && freshRes.session) {
        session = freshRes.session;
        const retry = await supabase.rpc("submit_order", {
          p_location_id: session.locationId,
          p_table_session_id: session.sessionId,
          p_customer_session_id: session.customerSessionId || `cust_${session.sessionId}`,
          p_verification_code: session.verificationCode || "4821",
          p_instructions: instructions || null,
          p_idempotency_key: idempotencyKey,
          p_items: items,
          p_reward_id: rewardId || null,
          p_profile_id: profileId,
          p_customer_name: session.guestName || null,
          p_customer_phone: session.guestPhone || null,
        });
        rpcResult = retry.data;
        rpcError = retry.error;
        result = rpcResult as typeof result;
      }
    }

    const durationMs = Date.now() - startTime;

    if (rpcError) {
      logger.error("Error executing submit_order RPC", {
        requestId,
        tableSessionId: session.sessionId,
        action: "placeOrder",
        durationMs,
        data: { error: rpcError.message },
      });
      recordOrderAttempt(false);
      captureAppException(rpcError, { requestId, tableSessionId: session.sessionId });

      return {
        success: false,
        error: "DB_ERROR",
        message: "Failed to place order. Please check with café staff.",
      };
    }

    if (!result.success) {
      logger.warn(`Order placement declined: ${result.error}`, {
        requestId,
        tableSessionId: session.sessionId,
        action: "placeOrder",
        durationMs,
        data: { resultError: result.error, message: result.message },
      });
      recordOrderAttempt(false);

      if (result.error === "PRICE_CHANGED") {
        return {
          success: false,
          error: "PRICE_CHANGED",
          message: result.message || "Some item prices have changed. Please review your order.",
          changedItems: result.changed_items || [],
        };
      }

      if (result.error === "SESSION_NOT_OPEN") {
        return {
          success: false,
          error: "SESSION_NOT_OPEN",
          message:
            result.message || "Your dining session has ended. Please ask staff for a fresh QR.",
        };
      }

      return {
        success: false,
        error: "DB_ERROR",
        message: result.message || "Could not process order.",
      };
    }

    logger.info(`Order #${result.order_no} created successfully (Order ID: ${result.order_id})`, {
      requestId,
      tableSessionId: session.sessionId,
      orderId: result.order_id,
      action: "placeOrder",
      durationMs,
      data: { orderNo: result.order_no, totalPaise: result.total_paise },
    });
    recordOrderAttempt(true, result.order_id);

    return {
      success: true,
      orderId: result.order_id,
      orderNo: result.order_no,
      discountPaise: result.discount_paise || 0,
      totalPaise: result.total_paise,
      isDuplicate: result.is_duplicate || false,
      message:
        result.discount_paise && result.discount_paise > 0
          ? `Order #${result.order_no} placed with ₹${Math.round(result.discount_paise / 100)} reward discount!`
          : `Order #${result.order_no} placed successfully!`,
    };
  } catch (err) {
    const durationMs = Date.now() - startTime;
    logger.error("Unexpected exception in placeOrderAction", {
      requestId,
      tableSessionId: session?.sessionId,
      action: "placeOrder",
      durationMs,
      data: { err: String(err) },
    });
    recordOrderAttempt(false);
    captureAppException(err, { requestId, tableSessionId: session?.sessionId });

    return {
      success: false,
      error: "DB_ERROR",
      message: "An unexpected error occurred while placing your order.",
    };
  }
}

/**
 * Server Action: Allows customer to edit their order while in PENDING_CONFIRMATION state.
 * Validates customer session ownership and enforces that confirmed orders are permanently locked.
 */
export async function editPendingOrderAction(
  orderId: string,
  items: PlaceOrderItemInput[],
  instructions?: string
): Promise<PlaceOrderResult> {
  const session = await getTableSessionCookie();
  if (!session || !session.sessionId) {
    return {
      success: false,
      error: "NO_SESSION",
      message: "No active dining session found.",
    };
  }

  const supabase = createAdminClient();

  try {
    const { data: rpcResult, error: rpcError } = await supabase.rpc("edit_pending_order", {
      p_order_id: orderId,
      p_customer_session_id: session.customerSessionId || `cust_${session.sessionId}`,
      p_items: items,
      p_instructions: instructions || null,
    });

    if (rpcError) {
      return {
        success: false,
        error: "DB_ERROR",
        message: "Failed to update order.",
      };
    }

    const result = rpcResult as {
      success: boolean;
      error?: string;
      message?: string;
      order_id?: string;
      order_no?: number;
      total_paise?: number;
    };

    if (!result.success) {
      return {
        success: false,
        error: (result.error as PlaceOrderResult["error"]) || "ORDER_LOCKED",
        message: result.message || "Order cannot be edited.",
      };
    }

    return {
      success: true,
      orderId: result.order_id,
      orderNo: result.order_no,
      totalPaise: result.total_paise,
      message: result.message || "Order updated successfully!",
    };
  } catch (err) {
    console.error("Error in editPendingOrderAction:", err);
    return {
      success: false,
      error: "DB_ERROR",
      message: "Unexpected error updating order.",
    };
  }
}
