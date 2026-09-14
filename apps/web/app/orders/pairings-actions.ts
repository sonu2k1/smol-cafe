"use server";

import { getTableSessionCookie, isValidUuid } from "@/lib/session";
import { createAdminClient } from "@/lib/supabase/admin";

export interface SuggestedMenuItem {
  id: string;
  name: string;
  description: string;
  pricePaise: number;
  dietaryClassification?: string;
  pairingReason: string;
}

export interface AnotherRoundResult {
  success: boolean;
  isKitchenBusy: boolean;
  hasConversationBoard: boolean;
  boardTopic?: string;
  suggestions: SuggestedMenuItem[];
}

/**
 * Server Action: Fetches 'Another Round' pairing suggestions based on items in accepted orders.
 * Automatically suppresses suggestions if the kitchen ticket load is high (> 5 active tickets).
 */
export async function fetchAnotherRoundSuggestionsAction(): Promise<AnotherRoundResult> {
  const session = await getTableSessionCookie();
  if (!session || !session.sessionId || !session.locationId || !isValidUuid(session.sessionId)) {
    return {
      success: false,
      isKitchenBusy: false,
      hasConversationBoard: false,
      suggestions: [],
    };
  }

  const supabase = createAdminClient();

  try {
    // 1. Check Kitchen Load (Open tickets across kitchen)
    const { count: activeKitchenTickets, error: loadErr } = await supabase
      .from("orders")
      .select("*", { count: "exact", head: true })
      .eq("location_id", session.locationId)
      .in("status", ["SUBMITTED", "ACCEPTED", "PREPARING"]);

    if (loadErr) {
      console.error("Error checking kitchen load:", loadErr);
    }

    const isKitchenBusy = (activeKitchenTickets || 0) > 5;

    // 2. Fetch all ordered items in this table session
    const { data: sessionOrders } = await supabase
      .from("orders")
      .select("id, status, order_items(name_snapshot, menu_item_id, menu_item_version_id)")
      .eq("table_session_id", session.sessionId);

    const orderedItemNames: string[] = [];
    const orderedMenuItemIds = new Set<string>();

    for (const order of sessionOrders || []) {
      for (const item of (order.order_items as { name_snapshot: string; menu_item_id: string }[]) ||
        []) {
        orderedItemNames.push(item.name_snapshot.toLowerCase());
        if (item.menu_item_id) orderedMenuItemIds.add(item.menu_item_id);
      }
    }

    // Check for Conversation Board
    const hasConversationBoard = orderedItemNames.some(
      (name) =>
        name.includes("conversation") ||
        name.includes("board") ||
        name.includes("game") ||
        name.includes("deck")
    );

    // If kitchen is busy or no orders placed yet, suppress suggestions
    if (isKitchenBusy || sessionOrders?.length === 0) {
      return {
        success: true,
        isKitchenBusy,
        hasConversationBoard,
        suggestions: [],
      };
    }

    // 3. Find Pairing Items
    const nowIso = new Date().toISOString();
    const { data: availableItems } = await supabase
      .from("menu_items")
      .select(
        `
        id,
        name,
        description,
        menu_prices!inner(amount_paise, effective_from, effective_to),
        menu_item_versions!inner(metadata)
      `
      )
      .eq("location_id", session.locationId)
      .eq("status", "AVAILABLE")
      .lte("menu_prices.effective_from", nowIso)
      .or(`effective_to.is.null,effective_to.gt.${nowIso}`, { foreignTable: "menu_prices" })
      .limit(20);

    const candidateSuggestions: SuggestedMenuItem[] = [];

    for (const rawItem of availableItems || []) {
      // Exclude items already ordered in this round
      if (orderedMenuItemIds.has(rawItem.id)) continue;

      const prices = rawItem.menu_prices as unknown as { amount_paise: number }[];
      const versions = rawItem.menu_item_versions as unknown as {
        metadata?: { dietary_classification?: string; pairing_item_ids?: string[] };
      }[];

      const pricePaise = prices?.[0]?.amount_paise || 0;
      const metadata = versions?.[0]?.metadata;

      // Smart pairing reason heuristic
      let pairingReason = "Popular Café Favorite";
      const lowerName = rawItem.name.toLowerCase();

      if (lowerName.includes("chai") || lowerName.includes("tea")) {
        pairingReason = "Warm sip for another round";
      } else if (
        lowerName.includes("maska") ||
        lowerName.includes("toast") ||
        lowerName.includes("croissant")
      ) {
        pairingReason = "Fresh bakery companion";
      } else if (lowerName.includes("coffee") || lowerName.includes("espresso")) {
        pairingReason = "Barista specialty brew";
      }

      candidateSuggestions.push({
        id: rawItem.id,
        name: rawItem.name,
        description: rawItem.description || "Freshly prepared at smol café.",
        pricePaise,
        dietaryClassification: metadata?.dietary_classification,
        pairingReason,
      });

      if (candidateSuggestions.length >= 3) break;
    }

    return {
      success: true,
      isKitchenBusy: false,
      hasConversationBoard,
      suggestions: candidateSuggestions,
    };
  } catch (err) {
    console.error("Error in fetchAnotherRoundSuggestionsAction:", err);
    return {
      success: false,
      isKitchenBusy: false,
      hasConversationBoard: false,
      suggestions: [],
    };
  }
}
