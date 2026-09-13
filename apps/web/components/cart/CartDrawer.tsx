"use client";

import React, { useState, useMemo } from "react";
import Link from "next/link";
import { useCart } from "@/context/CartContext";
import { placeOrderAction, type ChangedItemDiff } from "@/app/menu/actions";
import { useNetworkHealth } from "@/hooks/useNetworkHealth";
import { createTableJsonTag } from "@/lib/table-tag";
import { broadcastSyncEvent } from "@/lib/sync-events";
import { UpiPaymentDrawer } from "@/components/payment/UpiPaymentDrawer";
import { getFoodImage } from "@/lib/food-images";
import type { MenuItemWithDetails } from "@/lib/queries/menu";
import {
  Menu as MenuIcon,
  Users,
  CheckCircle2,
  AlertTriangle,
  Sparkles,
  CreditCard,
  Trash2,
  ArrowLeft,
  ChevronRight,
} from "lucide-react";

interface CartDrawerProps {
  tableLabel?: string;
}

export const CartDrawer: React.FC<CartDrawerProps> = ({ tableLabel = "07" }) => {
  const {
    items,
    updateQty,
    removeItem,
    clearCart,
    isCartOpen,
    closeCart,
    subtotalPaise,
    totalCount,
    addItem,
  } = useCart();
  const { isDegraded } = useNetworkHealth();

  const [activeView, setActiveView] = useState<"table_order" | "bill">("table_order");
  const [activeActionItemId, setActiveActionItemId] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [instructions, setInstructions] = useState("");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [priceConflicts, setPriceConflicts] = useState<ChangedItemDiff[] | null>(null);
  const [isUpiDrawerOpen, setIsUpiDrawerOpen] = useState(false);
  const [boardAdded, setBoardAdded] = useState(false);
  const [orderSuccess, setOrderSuccess] = useState<{
    orderNo: number;
    orderId: string;
    verificationCode?: string;
    totalPaise: number;
  } | null>(null);

  const displayTable = tableLabel || "07";
  const totalRupees = Math.round(subtotalPaise / 100);

  // Group items by category: COFFEE, CHAI, FOOD
  const groupedItems = useMemo(() => {
    const groups: { [key: string]: typeof items } = {};

    items.forEach((cartItem) => {
      const name = cartItem.item.name.toLowerCase();
      const sub = (cartItem.item.metadata?.subcategory || "").toLowerCase();

      let groupKey = "FOOD";
      if (
        name.includes("coffee") ||
        name.includes("pour over") ||
        name.includes("latte") ||
        name.includes("cappuccino") ||
        name.includes("espresso") ||
        name.includes("flat white") ||
        name.includes("americano") ||
        sub.includes("coffee")
      ) {
        groupKey = "COFFEE";
      } else if (
        name.includes("chai") ||
        name.includes("tea") ||
        sub.includes("chai") ||
        sub.includes("tea")
      ) {
        groupKey = "CHAI";
      }

      if (!groups[groupKey]) {
        groups[groupKey] = [];
      }
      groups[groupKey].push(cartItem);
    });

    // Ensure order: COFFEE, CHAI, FOOD
    const ordered: { key: string; items: typeof items }[] = [];
    if (groups["COFFEE"]) ordered.push({ key: "COFFEE", items: groups["COFFEE"] });
    if (groups["CHAI"]) ordered.push({ key: "CHAI", items: groups["CHAI"] });
    if (groups["FOOD"]) ordered.push({ key: "FOOD", items: groups["FOOD"] });

    // Any other groups
    Object.keys(groups).forEach((k) => {
      if (k !== "COFFEE" && k !== "CHAI" && k !== "FOOD") {
        ordered.push({ key: k, items: groups[k] });
      }
    });

    return ordered;
  }, [items]);

  // Extract customization note from item name or metadata
  const getCustomizationNote = (cartItem: typeof items[0]) => {
    const name = cartItem.item.name;
    if (name.includes("(Oat)")) return "Oat milk";
    if (name.includes("(Almond)")) return "Almond milk";
    if (name.includes("(Dairy)")) return "Dairy milk";
    if (name.includes("(Sourdough)")) return "Sourdough bread";
    if (name.includes("(Extra")) return "Extra Cheese";
    if (name.includes("(Spicy")) return "Spicy Dip";
    if (cartItem.item.metadata?.notes) return cartItem.item.metadata.notes;

    // Realistic defaults matching mockups if no options selected
    if (name.toLowerCase().includes("pour over")) return "No milk";
    if (name.toLowerCase().includes("flat white")) return "Oat milk";
    if (name.toLowerCase().includes("decker") || name.toLowerCase().includes("sandwich"))
      return "Add jalapeños";
    return null;
  };

  const handleAddConversationBoard = () => {
    const boardItem: MenuItemWithDetails = {
      id: "conversation_board",
      categoryId: "cat_06",
      name: "Conversation Board",
      status: "ACTIVE",
      description: "Cheese, fruits, nuts & a little something sweet.",
      pricePaise: 26000,
      imageUrl: getFoodImage("conversation board", null),
      metadata: { dietary: "Vegetarian" },
    };
    addItem(boardItem, 1);
    setBoardAdded(true);
    setTimeout(() => setBoardAdded(false), 2000);
  };

  const handlePlaceOrder = async () => {
    if (items.length === 0 || isSubmitting) return;

    setIsSubmitting(true);
    setErrorMessage(null);
    setPriceConflicts(null);

    const idempotencyKey = crypto.randomUUID();
    const orderPayload = items.map((cartItem) => ({
      menu_item_id: cartItem.item.id,
      expected_unit_price_paise: cartItem.item.pricePaise,
      qty: cartItem.qty,
    }));

    try {
      const result = await placeOrderAction(orderPayload, idempotencyKey, undefined, instructions);

      if (result.success && result.orderNo && result.orderId) {
        setOrderSuccess({
          orderNo: result.orderNo,
          orderId: result.orderId,
          verificationCode: result.verificationCode || "4821",
          totalPaise: result.totalPaise || subtotalPaise,
        });
        clearCart();

        broadcastSyncEvent({
          type: "ORDER_PLACED",
          orderId: result.orderId,
          orderNo: result.orderNo,
          tableLabel: displayTable,
          timestamp: Date.now(),
        });
      } else if (result.error === "PRICE_CHANGED" && result.changedItems) {
        setPriceConflicts(result.changedItems);
      } else {
        setErrorMessage(result.message || "Failed to place order. Please try again.");
      }
    } catch (err) {
      console.error("Order submission error:", err);
      setErrorMessage("An unexpected error occurred. Please ask staff.");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isCartOpen) return null;

  return (
    <div
      className="fixed inset-0 z-[70] flex items-end sm:items-center justify-center bg-[#241F1C]/70 sm:p-4 backdrop-blur-xs transition-opacity duration-200"
      onClick={closeCart}
    >
      {/* Mobile-first Phone Modal / Drawer Frame matching user mockup */}
      <div
        className="relative flex h-[92vh] sm:h-[88vh] w-full max-w-lg sm:max-w-[425px] flex-col rounded-t-[2.5rem] sm:rounded-[2.5rem] border border-[#C9AE8B]/60 bg-[#F3E7D3] dark:bg-[#241F1C] text-[#241F1C] dark:text-[#F3E7D3] shadow-2xl overflow-hidden animate-fade-in-up"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Top Navigation Bar */}
        <div className="sticky top-0 z-20 flex items-center justify-between px-6 pt-5 pb-3 bg-[#F3E7D3]/95 dark:bg-[#241F1C]/95 backdrop-blur-xs border-b border-[#C9AE8B]/20">
          <button
            type="button"
            onClick={closeCart}
            aria-label="Open navigation menu"
            className="flex h-8 w-8 items-center justify-center text-[#241F1C] dark:text-[#F3E7D3] hover:opacity-75 transition active:scale-95"
          >
            <MenuIcon className="h-6 w-6 stroke-[2]" />
          </button>

          <h2 className="font-serif text-2xl font-bold tracking-tight text-[#241F1C] dark:text-[#F3E7D3]">
            Your Table
          </h2>

          <button
            type="button"
            onClick={closeCart}
            className="font-serif text-base font-semibold text-[#B72E35] hover:opacity-85 transition active:scale-95"
          >
            Add more
          </button>
        </div>

        {/* Body Content */}
        <div className="flex-1 overflow-y-auto pb-28">
          {orderSuccess ? (
            /* Order Success View */
            <div className="p-6 text-center space-y-4 animate-fade-in">
              <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-emerald-100 text-emerald-800 shadow-inner">
                <CheckCircle2 className="h-8 w-8" />
              </div>
              <div>
                <span className="inline-block rounded-md bg-amber-100 px-2.5 py-0.5 font-mono text-[10px] font-bold text-amber-900 uppercase">
                  CONFIRMED WITH KITCHEN
                </span>
                <h3 className="font-serif text-2xl font-bold tracking-tight text-[#241F1C] dark:text-[#F3E7D3] mt-1">
                  Order #{orderSuccess.orderNo} Placed!
                </h3>
                <p className="font-serif italic text-xs text-[#725039] dark:text-[#C9AE8B] max-w-xs mx-auto mt-1">
                  Your table order is actively being prepared.
                </p>
              </div>

              {/* Table PIN Plaque */}
              <div className="rounded-3xl border-2 border-[#F2C84B] bg-[#FFF8E7] dark:bg-[#2A231E] p-4 text-center shadow-md">
                <span className="block font-mono text-[10px] uppercase font-bold text-[#725039] tracking-wider">
                  TABLE VERIFICATION PIN
                </span>
                <span className="block font-mono text-3xl font-black text-[#B72E35] tracking-widest mt-0.5">
                  {orderSuccess.verificationCode || "4821"}
                </span>
                <p className="text-[10px] font-mono text-[#725039] dark:text-[#C9AE8B] mt-1">
                  Table {displayTable} • Instant Verification
                </p>
              </div>

              <div className="pt-3 space-y-2.5">
                <button
                  type="button"
                  onClick={() => setIsUpiDrawerOpen(true)}
                  className="inline-flex w-full items-center justify-center gap-2 rounded-full bg-[#B72E35] py-3.5 font-serif text-base font-bold text-[#F3E7D3] shadow-md transition hover:bg-[#9E252C] active:scale-[0.98]"
                >
                  <CreditCard className="h-4 w-4" />
                  Pay Now via UPI Gateway →
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setOrderSuccess(null);
                    closeCart();
                  }}
                  className="w-full rounded-full border border-[#C9AE8B]/60 bg-[#FAF4EB] py-3 font-serif text-sm font-semibold text-[#241F1C] transition hover:bg-[#EAE0D2]"
                >
                  Back to Menu
                </button>
              </div>
            </div>
          ) : activeView === "bill" ? (
            /* Bill Breakdown View */
            <div className="p-6 space-y-4 animate-fade-in">
              <div className="flex items-center justify-between pb-3 border-b border-[#C9AE8B]/30">
                <button
                  type="button"
                  onClick={() => setActiveView("table_order")}
                  className="inline-flex items-center gap-1.5 font-serif text-sm text-[#725039] hover:text-[#B72E35]"
                >
                  <ArrowLeft className="h-4 w-4" /> Back to Table
                </button>
                <span className="font-mono text-xs text-[#725039]">TABLE {displayTable}</span>
              </div>

              {/* Receipt Breakdown */}
              <div className="rounded-2xl border border-[#C9AE8B]/50 bg-[#FAF4EB] dark:bg-[#2A231E] p-4 shadow-xs space-y-3">
                <h4 className="font-serif text-lg font-bold text-[#241F1C] dark:text-[#F3E7D3] border-b border-[#C9AE8B]/30 pb-2">
                  Bill Summary
                </h4>
                <div className="space-y-2 text-sm">
                  {items.map(({ item, qty }) => (
                    <div key={item.id} className="flex justify-between font-serif">
                      <span>
                        {qty} × {item.name}
                      </span>
                      <span className="font-mono">
                        ₹{Math.round((item.pricePaise / 100) * qty)}
                      </span>
                    </div>
                  ))}
                </div>

                <div className="border-t border-[#C9AE8B]/30 pt-3 space-y-1.5 text-xs text-[#725039] dark:text-[#C9AE8B]">
                  <div className="flex justify-between">
                    <span>Subtotal</span>
                    <span className="font-mono">₹{totalRupees}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>GST (5% included)</span>
                    <span className="font-mono">₹{Math.round(totalRupees * 0.05)}</span>
                  </div>
                  <div className="flex justify-between border-t border-[#C9AE8B]/30 pt-2 font-serif text-base font-bold text-[#241F1C] dark:text-[#F3E7D3]">
                    <span>Total Payable</span>
                    <span className="font-mono">₹{totalRupees}</span>
                  </div>
                </div>
              </div>

              {/* Special Instructions Note */}
              <div>
                <label className="block text-[11px] font-mono text-[#725039] mb-1">
                  Notes for barista / kitchen:
                </label>
                <input
                  type="text"
                  value={instructions}
                  onChange={(e) => setInstructions(e.target.value)}
                  placeholder="e.g. Less sweet, extra hot, no onions..."
                  className="w-full rounded-xl border border-[#C9AE8B]/60 bg-[#FAF4EB] px-3 py-2 text-xs font-serif text-[#241F1C] focus:border-[#B72E35] focus:outline-hidden"
                />
              </div>

              {errorMessage && (
                <div className="rounded-xl border border-rose-300 bg-rose-50 p-2.5 text-xs text-rose-800">
                  {errorMessage}
                </div>
              )}

              {/* Primary Action Button */}
              <button
                type="button"
                disabled={isSubmitting}
                onClick={handlePlaceOrder}
                className="w-full h-14 rounded-full bg-[#B72E35] hover:bg-[#9E252C] text-[#F3E7D3] font-serif text-lg tracking-wide flex items-center justify-center gap-2 shadow-lg active:scale-[0.98] transition hover-lift disabled:opacity-50"
              >
                {isSubmitting ? "Sending to Kitchen..." : "Confirm & Send to Kitchen"}
              </button>
            </div>
          ) : items.length === 0 ? (
            /* Empty Table Order */
            <div className="p-12 text-center space-y-3">
              <span className="block font-serif text-5xl">☕</span>
              <p className="font-serif text-lg font-bold text-[#241F1C] dark:text-[#F3E7D3]">
                Your table is empty
              </p>
              <p className="font-serif italic text-xs text-[#725039] dark:text-[#C9AE8B]">
                Explore our artisanal brews, sandwiches &amp; comfort bowls.
              </p>
              <button
                type="button"
                onClick={closeCart}
                className="mt-3 inline-flex rounded-full bg-[#B72E35] px-6 py-2.5 font-serif text-sm font-semibold text-[#F3E7D3] shadow-xs"
              >
                Browse Menu
              </button>
            </div>
          ) : (
            /* Main "Your Table" View matching mockup 1:1 */
            <div>
              {/* Arched Table Header Plaque */}
              <div className="relative mx-5 mt-3 pt-6 pb-4 text-center rounded-t-[3.5rem] border-t border-x border-[#C9AE8B]/40 bg-[#FAF4EB]/60 dark:bg-[#2A231E]/60 shadow-2xs">
                <span className="block font-mono text-[11px] uppercase tracking-[0.25em] font-semibold text-[#725039] dark:text-[#C9AE8B]">
                  TABLE
                </span>
                <span className="block font-serif text-5xl font-bold text-[#241F1C] dark:text-[#F3E7D3] mt-0.5 tracking-tight">
                  {displayTable}
                </span>
                <div className="mt-2 inline-flex items-center gap-1.5 rounded-full bg-[#3A6059] px-3.5 py-0.5 text-xs text-white shadow-xs font-sans">
                  <Users className="h-3 w-3" />
                  <span>2 Guests</span>
                </div>
              </div>

              {/* Grouped Category Sections */}
              <div className="border-t border-[#C9AE8B]/40">
                {groupedItems.map(({ key, items: categoryItems }) => (
                  <div key={key}>
                    {/* Category Header Row */}
                    <div className="bg-[#EBE0CF]/50 dark:bg-[#2A231E] border-t border-b border-[#C9AE8B]/30 px-6 py-1.5 font-mono text-[11px] uppercase tracking-widest font-semibold text-[#725039] dark:text-[#C9AE8B]">
                      {key}
                    </div>

                    {/* Category Items */}
                    <div className="divide-y divide-[#C9AE8B]/20">
                      {categoryItems.map(({ item, qty }) => {
                        const unitRupees = Math.round(item.pricePaise / 100);
                        const note = getCustomizationNote({ item, qty });
                        const isActionOpen = activeActionItemId === item.id;

                        return (
                          <div key={item.id} className="transition-colors hover:bg-[#FAF4EB]/40">
                            <div className="flex items-start justify-between px-6 py-3.5">
                              {/* Left: Quantity + Title + Customization */}
                              <div className="flex items-start gap-3.5 flex-1 min-w-0 pr-2">
                                <span className="font-serif text-lg font-bold text-[#241F1C] dark:text-[#F3E7D3] w-5 shrink-0 pt-0.5">
                                  {qty}
                                </span>
                                <div className="flex-1 min-w-0">
                                  <h4 className="font-serif text-[15.5px] font-bold text-[#241F1C] dark:text-[#F3E7D3] leading-snug">
                                    {item.name.replace(/\s*\([^)]*\)/, "")}
                                  </h4>
                                  {note && (
                                    <p className="font-mono text-xs text-[#725039] dark:text-[#C9AE8B] mt-0.5">
                                      • {note}
                                    </p>
                                  )}
                                </div>
                              </div>

                              {/* Right: Price + Three Dots Action */}
                              <div className="flex items-center gap-3 shrink-0 pt-0.5">
                                <span className="font-serif text-base font-semibold text-[#241F1C] dark:text-[#F3E7D3]">
                                  ₹{unitRupees * qty}
                                </span>
                                <button
                                  type="button"
                                  onClick={() =>
                                    setActiveActionItemId(isActionOpen ? null : item.id)
                                  }
                                  aria-label="Item options"
                                  className="text-[#241F1C] dark:text-[#F3E7D3] hover:text-[#B72E35] px-1 py-0.5 text-base tracking-widest font-bold transition active:scale-90"
                                >
                                  •••
                                </button>
                              </div>
                            </div>

                            {/* Expandable Mini Stepper Controls when user taps '•••' */}
                            {isActionOpen && (
                              <div className="flex items-center justify-between bg-[#EFE4D2]/60 dark:bg-[#1E1916] px-6 py-2 border-t border-[#C9AE8B]/20 animate-fade-in">
                                <span className="font-mono text-xs text-[#725039]">
                                  Adjust quantity:
                                </span>
                                <div className="flex items-center gap-3">
                                  <div className="flex items-center rounded-xl border border-[#C9AE8B]/60 bg-[#FAF4EB] px-2 py-0.5 shadow-2xs">
                                    <button
                                      type="button"
                                      onClick={() => updateQty(item.id, -1)}
                                      className="h-6 w-6 text-sm font-bold text-[#725039] active:scale-90"
                                    >
                                      −
                                    </button>
                                    <span className="w-6 text-center font-mono text-xs font-bold text-[#241F1C]">
                                      {qty}
                                    </span>
                                    <button
                                      type="button"
                                      onClick={() => updateQty(item.id, 1)}
                                      className="h-6 w-6 text-sm font-bold text-[#725039] active:scale-90"
                                    >
                                      +
                                    </button>
                                  </div>

                                  <button
                                    type="button"
                                    onClick={() => removeItem(item.id)}
                                    aria-label="Remove item"
                                    className="p-1.5 text-[#B72E35] hover:bg-red-50 rounded-full transition"
                                  >
                                    <Trash2 className="h-4 w-4" />
                                  </button>
                                </div>
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>

              {/* Upsell Card: "Make it a moment?" */}
              <div className="px-5 my-4">
                <div className="rounded-2xl border border-[#75AFA7]/60 bg-[#E0E9E5] dark:bg-[#1E2623] p-3.5 shadow-xs">
                  <h3 className="font-serif text-base font-bold text-[#241F1C] dark:text-[#F3E7D3] mb-2">
                    Make it a moment?
                  </h3>
                  <div className="flex items-center justify-between gap-3">
                    {/* Platter Thumbnail */}
                    <div className="h-14 w-18 shrink-0 overflow-hidden rounded-xl border border-[#75AFA7]/40 bg-[#D4DFDC]">
                      <img
                        src={getFoodImage("conversation board", null)}
                        alt="Conversation Board"
                        className="h-full w-full object-cover"
                      />
                    </div>

                    {/* Titles */}
                    <div className="flex-1 min-w-0 pr-1">
                      <h4 className="font-serif text-sm font-bold text-[#241F1C] dark:text-[#F3E7D3] truncate">
                        Conversation Board
                      </h4>
                      <p className="text-[11px] leading-snug text-[#5A4F46] dark:text-[#A7BAAF] font-sans mt-0.5">
                        Cheese, fruits, nuts &amp; a little something sweet.
                      </p>
                    </div>

                    {/* Price & Butter Taxi Yellow (+) Button */}
                    <div className="flex items-center gap-2.5 shrink-0">
                      <div className="text-right">
                        <span className="line-through text-xs font-serif text-[#725039]/60 dark:text-[#A7BAAF]/60 mr-1">
                          ₹350
                        </span>
                        <span className="font-serif text-sm font-bold text-[#241F1C] dark:text-[#F3E7D3]">
                          ₹260
                        </span>
                      </div>
                      <button
                        type="button"
                        onClick={handleAddConversationBoard}
                        aria-label="Add Conversation Board to table"
                        className="h-8 w-8 rounded-full bg-[#F2C84B] hover:bg-[#E5BB3E] text-[#241F1C] flex items-center justify-center font-bold text-lg shadow-xs active:scale-90 transition cursor-pointer"
                      >
                        {boardAdded ? "✓" : "+"}
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Sticky Bottom Summary & "View Bill" CTA Button */}
        {!orderSuccess && activeView === "table_order" && items.length > 0 && (
          <div className="absolute bottom-0 left-0 right-0 z-30 px-6 pt-3 pb-6 bg-gradient-to-t from-[#F3E7D3] via-[#F3E7D3]/95 to-transparent dark:from-[#241F1C] dark:via-[#241F1C]/95">
            <p className="font-mono text-sm text-[#241F1C] dark:text-[#F3E7D3] text-center mb-2.5 tracking-wide">
              {totalCount} {totalCount === 1 ? "item" : "items"} &nbsp;•&nbsp; Total ₹{totalRupees}
            </p>

            <button
              type="button"
              onClick={() => setActiveView("bill")}
              className="w-full h-14 rounded-full bg-[#B72E35] hover:bg-[#9E252C] text-[#F3E7D3] font-serif text-xl tracking-wide flex items-center justify-center shadow-lg active:scale-[0.98] transition hover-lift cursor-pointer"
            >
              View Bill
            </button>
          </div>
        )}
      </div>

      {/* Optional UPI Drawer Modal if opened */}
      {isUpiDrawerOpen && (
        <UpiPaymentDrawer
          tableLabel={displayTable}
          orderId={orderSuccess?.orderId || "smol_preview"}
          amountPaise={orderSuccess?.totalPaise || subtotalPaise}
          onPaymentSuccess={() => {
            setIsUpiDrawerOpen(false);
            closeCart();
          }}
          onClose={() => setIsUpiDrawerOpen(false)}
        />
      )}
    </div>
  );
};
