"use server";

import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getTableSessionCookie } from "@/lib/session";
import type { LoyaltyAccount, LoyaltyLedgerEntry } from "@smol-cafe/db";

export interface LoyaltyAccountDetails {
  account: LoyaltyAccount | null;
  ledger: LoyaltyLedgerEntry[];
}

export interface LoyaltyActionResult {
  success: boolean;
  newBalance?: number;
  message?: string;
  error?: string;
}

/**
 * Server Action: Fetches customer's loyalty balance and append-only ledger history
 */
export async function getLoyaltyAccountAction(): Promise<LoyaltyAccountDetails> {
  const supabase = await createClient();
  const session = await getTableSessionCookie();
  const { data: authUser } = await supabase.auth.getUser();

  let profileId = authUser?.user?.id;

  if (!profileId && session?.guestPhone) {
    const cleanPhone = session.guestPhone.replace(/\D/g, "");
    profileId = `prof_${cleanPhone}`;
  }

  if (!profileId) {
    return { account: null, ledger: [] };
  }

  const admin = createAdminClient();

  try {
    // 1. Fetch loyalty account
    let { data: account } = await admin
      .from("loyalty_accounts")
      .select("*")
      .eq("profile_id", profileId)
      .maybeSingle();

    if (!account && session?.guestPhone) {
      // Initialize loyalty account for this phone number with welcome bonus
      const initialAccount: LoyaltyAccount = {
        id: `la_${profileId}`,
        profile_id: profileId,
        current_balance_cached: 140, // 50 welcome points + 90 visit points
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };
      const initialLedger: LoyaltyLedgerEntry[] = [
        {
          id: `ll_welcome_${Date.now()}`,
          loyalty_account_id: initialAccount.id,
          type: "EARN",
          points: 50,
          notes: "Smol Welcome Bonus",
          related_order_id: null,
          related_bill_id: null,
          created_at: new Date(Date.now() - 3600000).toISOString(),
        },
        {
          id: `ll_visit_${Date.now()}`,
          loyalty_account_id: initialAccount.id,
          type: "EARN",
          points: 90,
          notes: "Points from Table Dining Visit",
          related_order_id: null,
          related_bill_id: null,
          created_at: new Date().toISOString(),
        },
      ];
      return {
        account: initialAccount,
        ledger: initialLedger,
      };
    }

    if (!account) {
      return { account: null, ledger: [] };
    }

    // 2. Fetch ledger history
    const { data: ledger } = await admin
      .from("loyalty_ledger")
      .select("*")
      .eq("loyalty_account_id", account.id)
      .order("created_at", { ascending: false })
      .limit(30);

    return {
      account: account as LoyaltyAccount,
      ledger: (ledger as LoyaltyLedgerEntry[]) || [],
    };
  } catch (err) {
    console.error("Error fetching loyalty account:", err);
    return { account: null, ledger: [] };
  }
}

/**
 * Server Action: Redeems loyalty points with atomic ledger balance recomputation
 */
export async function redeemLoyaltyPointsAction(
  points: number,
  notes?: string
): Promise<LoyaltyActionResult> {
  const supabase = await createClient();
  const { data: authUser } = await supabase.auth.getUser();

  if (!authUser?.user) {
    return { success: false, message: "Please sign in to redeem loyalty points." };
  }

  if (points <= 0) {
    return { success: false, message: "Points must be greater than zero." };
  }

  const admin = createAdminClient();

  try {
    const { data: rpcRes, error } = await admin.rpc("record_loyalty_movement", {
      p_profile_id: authUser.user.id,
      p_type: "REDEEM",
      p_points: points,
      p_notes: notes || "Redeemed for order discount",
    });

    if (error) {
      console.error("Error in record_loyalty_movement RPC:", error);
      return { success: false, message: "Failed to process points redemption." };
    }

    const res = rpcRes as {
      success: boolean;
      new_balance?: number;
      error?: string;
      message?: string;
    };

    if (!res.success) {
      return {
        success: false,
        error: res.error,
        message: res.message || "Insufficient points balance.",
      };
    }

    return {
      success: true,
      newBalance: res.new_balance,
      message: `Redeemed ${points} points! New balance: ${res.new_balance} points.`,
    };
  } catch (err) {
    console.error("Error in redeemLoyaltyPointsAction:", err);
    return { success: false, message: "An unexpected error occurred." };
  }
}

/**
 * Server Action: Redeems a specific catalog loyalty reward (e.g. Free Pour Over, ₹100 Off)
 */
export async function redeemLoyaltyRewardAction(
  rewardId: string
): Promise<LoyaltyActionResult & { rewardId?: string; discountPaise?: number }> {
  const supabase = await createClient();
  const { data: authUser } = await supabase.auth.getUser();
  const profileId = authUser?.user?.id || "usr_guest_demo";

  const admin = createAdminClient();

  try {
    const { data: rpcRes, error } = await admin.rpc("redeem_loyalty_reward", {
      p_profile_id: profileId,
      p_reward_id: rewardId,
    });

    if (error) {
      return { success: false, message: "Failed to redeem reward." };
    }

    const res = rpcRes as {
      success: boolean;
      reward_id?: string;
      title?: string;
      discount_paise?: number;
      new_balance?: number;
      error?: string;
      message?: string;
    };

    if (!res.success) {
      return {
        success: false,
        error: res.error,
        message: res.message || "Failed to redeem reward.",
      };
    }

    return {
      success: true,
      rewardId: res.reward_id,
      discountPaise: res.discount_paise,
      newBalance: res.new_balance,
      message: res.message || "Reward redeemed successfully!",
    };
  } catch (err) {
    console.error("Error in redeemLoyaltyRewardAction:", err);
    return { success: false, message: "An unexpected error occurred." };
  }
}

/**
 * Server Action: Fetches completed and past orders for customer history persistence
 */
export async function fetchCustomerPastOrdersAction() {
  const admin = createAdminClient();

  try {
    const { data: orders } = await admin
      .from("orders")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(10);

    return orders || [];
  } catch {
    return [];
  }
}

