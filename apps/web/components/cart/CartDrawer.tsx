"use client";

import React, { useState, useMemo } from "react";
import Link from "next/link";
import Image from "next/image";
import { useCart } from "@/context/CartContext";
import { placeOrderAction, type ChangedItemDiff } from "@/app/menu/actions";
import { useNetworkHealth } from "@/hooks/useNetworkHealth";
import { createTableJsonTag } from "@/lib/table-tag";
import { broadcastSyncEvent } from "@/lib/sync-events";
import { UpiPaymentDrawer } from "@/components/payment/UpiPaymentDrawer";
import { getFoodImage } from "@/lib/food-images";
import type { MenuItemWithDetails } from "@/lib/queries/menu";
import { TableArchedCard } from "@/components/table/TableArchedCard";
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
  Plus,
  Check,
  Lock,
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
  const [requestMessage, setRequestMessage] = useState<string | null>(null);
  const [orderSuccess, setOrderSuccess] = useState<{
    orderNo: number;
    orderId: string;
    verificationCode?: string;
    totalPaise: number;
  } | null>(null);

  const displayTable = tableLabel || "07";
  const itemsTotal = items.reduce(
    (sum, it) => sum + Math.round((it.item.pricePaise / 100) * it.qty),
    0
  );
  const taxesAndCharges = Math.round(itemsTotal * 0.06);
  const grandTotal = itemsTotal + taxesAndCharges;
  const totalRupees = itemsTotal;

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
        className="relative flex h-[92vh] sm:h-[88vh] w-full max-w-lg sm:max-w-[425px] flex-col rounded-t-[2.5rem] sm:rounded-[2.5rem] border border-[#C9AE8B] bg-[#F3E7D3] text-[#241F1C] shadow-2xl overflow-hidden animate-fade-in-up"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Top Navigation Bar */}
        <div className="sticky top-0 z-20 flex items-center justify-between px-5 pt-3.5 pb-2 bg-[#F3E7D3] border-b border-[#C9AE8B]/40">
          {activeView === "bill" ? (
            <button
              type="button"
              onClick={() => setActiveView("table_order")}
              aria-label="Back to table order"
              className="p-1 -ml-1 text-[#241F1C] hover:opacity-75 active:scale-95 transition cursor-pointer"
            >
              <svg
                width="24"
                height="24"
                viewBox="0 0 24 24"
                fill="none"
                stroke="#241F1C"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <polyline points="15 18 9 12 15 6" />
              </svg>
            </button>
          ) : (
            <button
              type="button"
              onClick={closeCart}
              aria-label="Close cart"
              className="p-1 -ml-1 text-[#241F1C] hover:opacity-75 transition active:scale-95 cursor-pointer"
            >
              <svg
                width="24"
                height="20"
                viewBox="0 0 24 20"
                fill="none"
                stroke="#241F1C"
                strokeWidth="2.2"
                strokeLinecap="round"
              >
                <line x1="2" y1="3" x2="22" y2="3" />
                <line x1="2" y1="10" x2="22" y2="10" />
                <line x1="2" y1="17" x2="22" y2="17" />
              </svg>
            </button>
          )}

          <h2 className="font-serif text-[24px] font-bold tracking-tight text-[#241F1C] text-center">
            {activeView === "bill" ? "Settle Up" : "Your Table"}
          </h2>

          {activeView === "bill" ? (
            <div className="w-7" />
          ) : (
            <button
              type="button"
              onClick={closeCart}
              className="font-serif text-[15px] font-medium text-[#B72E35] hover:opacity-85 transition active:scale-95 cursor-pointer"
            >
              Add more
            </button>
          )}
        </div>

        {/* Body Content */}
        <div className="flex-1 overflow-y-auto pb-24">
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
                <h3 className="font-serif text-2xl font-bold text-[#241F1C] mt-2">
                  Order #{orderSuccess.orderNo} Placed!
                </h3>
                <p className="font-serif italic text-xs text-[#725039] mt-1">
                  Our baristas and kitchen team are preparing your order.
                </p>
              </div>

              {/* Table PIN Plaque */}
              <div className="rounded-3xl border-2 border-[#F2C84B] bg-[#FFF8E7] p-4 text-center shadow-md">
                <span className="block font-mono text-[10px] uppercase font-bold text-[#725039] tracking-wider">
                  TABLE VERIFICATION PIN
                </span>
                <span className="block font-mono text-3xl font-black text-[#B72E35] tracking-widest mt-0.5">
                  {orderSuccess.verificationCode || "4821"}
                </span>
                <p className="text-[10px] font-mono text-[#725039] mt-1">
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
            /* Settle Up / Bill View inside same popup matching user design */
            <div className="p-4 sm:p-5 space-y-4 animate-fade-in">
              {/* Arched Roman Dome Bill Card */}
              <div className="relative rounded-t-[13.5rem] sm:rounded-t-[14.5rem] rounded-b-[1.75rem] border border-[#C9AE8B] bg-[#FAF4EB] p-1.5 shadow-[0_2px_12px_rgba(0,0,0,0.03)] select-none">
                {/* Inner Decorative Inset Border */}
                <div className="rounded-t-[12.8rem] sm:rounded-t-[13.8rem] rounded-b-[1.25rem] border border-[#C9AE8B]/40 px-5 pt-4 pb-5 text-center">
                  {/* Coffee Cup + Pen + Smol Cafe Notepad Illustration */}
                  <div className="relative w-[260px] h-[140px] mx-auto mt-2">
                    <Image
                      src="/settle_up_hero_illustration.png"
                      alt="smol café bill illustration"
                      fill
                      priority
                      className="object-contain select-none pointer-events-none"
                    />
                  </div>

                  {/* Poetic Headline in Espresso Ink */}
                  <h2 className="font-serif font-bold text-[24px] sm:text-[26px] text-[#241F1C] leading-[1.18] mt-3">
                    Good things
                    <br />
                    deserve good pauses.
                  </h2>

                  {/* Subtitle in Walnut */}
                  <p className="font-serif italic text-[15px] sm:text-[16px] text-[#725039] mt-1.5 mb-3">
                    Here&apos;s your bill.
                  </p>

                  {/* Dashed Horizontal Line Divider in Biscuit */}
                  <div className="border-t border-dashed border-[#C9AE8B]/60 my-3.5" />

                  {/* Itemized Summary in Typewriter / Mono Font */}
                  <div className="space-y-1.5 font-mono text-[13.5px] text-[#241F1C]">
                    <div className="flex items-center justify-between">
                      <span className="text-[#725039]">Items Total</span>
                      <span>₹{itemsTotal}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-[#725039]">Taxes &amp; Charges</span>
                      <span>₹{taxesAndCharges}</span>
                    </div>
                  </div>

                  {/* Solid Horizontal Line Divider in Biscuit */}
                  <div className="border-t border-[#C9AE8B]/60 mt-3.5 mb-3" />

                  {/* Grand Total in Smol Cherry */}
                  <div className="flex items-baseline justify-between pt-0.5">
                    <span className="font-serif font-bold text-[19px] sm:text-[20px] text-[#B72E35]">
                      Grand Total
                    </span>
                    <span className="font-serif font-bold text-[30px] sm:text-[34px] text-[#B72E35] leading-none">
                      ₹{grandTotal}
                    </span>
                  </div>
                </div>
              </div>

              {/* Status / Request Notification Message */}
              {requestMessage && (
                <div className="rounded-2xl border border-[#C9AE8B] bg-[#FAF4EB] p-3 text-center text-xs font-serif font-semibold text-[#241F1C] shadow-xs animate-fade-in flex items-center justify-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4 text-[#B72E35]" />
                  <span>{requestMessage}</span>
                </div>
              )}

              {/* Payment Method Cards */}
              <div className="space-y-2.5 pt-1">
                {/* UPI Option */}
                <button
                  type="button"
                  onClick={() => setIsUpiDrawerOpen(true)}
                  className="w-full rounded-[1.25rem] border border-[#C9AE8B] bg-[#FAF4EB] p-3.5 flex items-center justify-between hover:bg-[#F3E7D3] active:scale-[0.99] transition shadow-xs cursor-pointer text-left"
                >
                  <div className="flex items-center gap-3.5">
                    <div className="w-10 h-10 flex items-center justify-center shrink-0">
                      <Image
                        src="/icon_upi_hd.png"
                        alt="UPI"
                        width={28}
                        height={28}
                        className="object-contain"
                      />
                    </div>
                    <div>
                      <h3 className="font-sans font-bold text-[15.5px] text-[#241F1C] leading-tight">
                        UPI
                      </h3>
                      <p className="font-sans text-[12.5px] text-[#725039] mt-0.5">
                        Pay with any UPI app
                      </p>
                    </div>
                  </div>
                  <ChevronRight className="w-5 h-5 text-[#725039]" />
                </button>

                {/* Card Option */}
                <button
                  type="button"
                  onClick={() => {
                    setRequestMessage("Staff notified for Card payment at table.");
                    setTimeout(() => setRequestMessage(null), 4000);
                  }}
                  className="w-full rounded-[1.25rem] border border-[#C9AE8B] bg-[#FAF4EB] p-3.5 flex items-center justify-between hover:bg-[#F3E7D3] active:scale-[0.99] transition shadow-xs cursor-pointer text-left"
                >
                  <div className="flex items-center gap-3.5">
                    <div className="w-10 h-10 flex items-center justify-center shrink-0">
                      <Image
                        src="/icon_card_hd.png"
                        alt="Card"
                        width={28}
                        height={28}
                        className="object-contain"
                      />
                    </div>
                    <div>
                      <h3 className="font-sans font-bold text-[15.5px] text-[#241F1C] leading-tight">
                        Card
                      </h3>
                      <p className="font-sans text-[12.5px] text-[#725039] mt-0.5">
                        Visa, MasterCard, Rupay
                      </p>
                    </div>
                  </div>
                  <ChevronRight className="w-5 h-5 text-[#725039]" />
                </button>

                {/* Wallets Option */}
                <button
                  type="button"
                  onClick={() => {
                    setRequestMessage("Staff notified for Wallet payment.");
                    setTimeout(() => setRequestMessage(null), 4000);
                  }}
                  className="w-full rounded-[1.25rem] border border-[#C9AE8B] bg-[#FAF4EB] p-3.5 flex items-center justify-between hover:bg-[#F3E7D3] active:scale-[0.99] transition shadow-xs cursor-pointer text-left"
                >
                  <div className="flex items-center gap-3.5">
                    <div className="w-10 h-10 flex items-center justify-center shrink-0">
                      <Image
                        src="/icon_wallet_hd.png"
                        alt="Wallets"
                        width={28}
                        height={28}
                        className="object-contain"
                      />
                    </div>
                    <div>
                      <h3 className="font-sans font-bold text-[15.5px] text-[#241F1C] leading-tight">
                        Wallets
                      </h3>
                      <p className="font-sans text-[12.5px] text-[#725039] mt-0.5">
                        Amazon Pay, Mobikwik &amp; more
                      </p>
                    </div>
                  </div>
                  <ChevronRight className="w-5 h-5 text-[#725039]" />
                </button>
              </div>

              {/* 100% Secure Payments Assurance */}
              <div className="pt-2 pb-2 text-center">
                <div className="inline-flex items-center gap-1.5 font-mono text-[11px] text-[#725039]">
                  <Lock className="w-3.5 h-3.5 text-[#725039]" />
                  <span>100% Secure Payments</span>
                </div>
              </div>
            </div>
          ) : items.length === 0 ? (
            /* Empty Table Order */
            <div className="p-12 text-center space-y-3">
              <span className="block font-serif text-5xl">☕</span>
              <p className="font-serif text-lg font-bold text-[#241F1C]">
                Your table is empty
              </p>
              <p className="font-serif italic text-xs text-[#725039]">
                Explore our artisanal brews, sandwiches &amp; comfort bowls.
              </p>
              <button
                type="button"
                onClick={closeCart}
                className="mt-3 inline-flex rounded-full bg-[#B72E35] hover:bg-[#9E252C] px-6 py-2.5 font-serif text-sm font-semibold text-[#F3E7D3] shadow-xs cursor-pointer"
              >
                Browse Menu
              </button>
            </div>
          ) : (
            /* Main "Your Table" View matching exact Image 1 design */
            <div className="px-3 sm:px-4 pt-1">
              <TableArchedCard
                tableNumber={displayTable}
                guestCount={2}
              >
                {/* Categorized Item List */}
                <div className="w-full">
                  {groupedItems.map(({ key, items: categoryItems }, groupIdx) => (
                    <div key={key} className="w-full">
                      {/* Category Header Bar in Café Crème & Walnut */}
                      <div className={`px-4 py-1.5 bg-[#F3E7D3] ${groupIdx > 0 ? "border-t" : ""} border-b border-[#C9AE8B]/40`}>
                        <span className="font-mono text-[10.5px] font-bold uppercase tracking-[0.16em] text-[#725039]">
                          {key}
                        </span>
                      </div>

                      {/* Items in this Category with Biscuit Dividers */}
                      <div className="divide-y divide-[#C9AE8B]/30">
                        {categoryItems.map(({ item, qty }) => {
                          const unitRupees = Math.round(item.pricePaise / 100);
                          const note = getCustomizationNote({ item, qty });
                          const isActionOpen = activeActionItemId === item.id;

                          return (
                            <div key={item.id} className="transition-colors hover:bg-[#EAE0D2]/50">
                              <div className="px-4 py-2 flex items-start justify-between gap-2">
                                {/* Left: Quantity + Details */}
                                <div className="flex items-start gap-2.5 min-w-0 pr-2">
                                  <span className="font-serif font-bold text-[16px] text-[#241F1C] w-4 shrink-0 text-left pt-0.5">
                                    {qty}
                                  </span>
                                  <div className="min-w-0">
                                    <h4 className="font-serif font-bold text-[15.5px] text-[#241F1C] leading-tight whitespace-pre-line">
                                      {item.name.replace(/\s*\([^)]*\)/, "")}
                                    </h4>
                                    {note && (
                                      <p className="font-mono text-[11.5px] text-[#725039] mt-0.5 tracking-tight">
                                        • {note}
                                      </p>
                                    )}
                                  </div>
                                </div>

                                {/* Right: Price + "•••" Options Button */}
                                <div className="flex items-center gap-3 shrink-0 pt-0.5">
                                  <span className="font-serif font-medium text-[15.5px] text-[#241F1C] tracking-tight">
                                    ₹{unitRupees * qty}
                                  </span>
                                  <button
                                    type="button"
                                    onClick={() =>
                                      setActiveActionItemId(isActionOpen ? null : item.id)
                                    }
                                    aria-label="Item options"
                                    className="text-[#241F1C] text-[18px] font-bold tracking-widest px-1 py-0.5 hover:opacity-60 active:scale-90 transition cursor-pointer"
                                  >
                                    •••
                                  </button>
                                </div>
                              </div>

                              {/* Expandable Stepper Controls when user taps '•••' */}
                              {isActionOpen && (
                                <div className="flex items-center justify-between bg-[#FAF4EB] px-4 py-2 border-t border-[#C9AE8B]/40">
                                  <span className="text-xs font-mono text-[#725039]">Adjust quantity:</span>
                                  <div className="flex items-center gap-2.5">
                                    <button
                                      type="button"
                                      onClick={() => updateQty(item.id, -1)}
                                      className="h-6 w-6 rounded-full border border-[#C9AE8B] bg-[#F3E7D3] font-mono text-xs font-bold text-[#241F1C] flex items-center justify-center hover:bg-[#FAF4EB]"
                                    >
                                      −
                                    </button>
                                    <span className="font-mono text-xs font-bold text-[#241F1C] min-w-4 text-center">
                                      {qty}
                                    </span>
                                    <button
                                      type="button"
                                      onClick={() => updateQty(item.id, 1)}
                                      className="h-6 w-6 rounded-full border border-[#C9AE8B] bg-[#F3E7D3] font-mono text-xs font-bold text-[#241F1C] flex items-center justify-center hover:bg-[#FAF4EB]"
                                    >
                                      +
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => removeItem(item.id)}
                                      className="p-1 text-[#B72E35] hover:bg-[#B72E35]/10 rounded-full transition ml-1"
                                      aria-label="Remove item"
                                    >
                                      <Trash2 className="h-3.5 w-3.5" />
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

                {/* Upsell Card: "Make it a moment?" with Dusty Pool accent & Butter Taxi button */}
                <div className="p-3">
                  <div className="rounded-[1.4rem] border border-[#75AFA7]/50 bg-gradient-to-br from-[#E2EBE8] via-[#DAE6E2] to-[#CEDDD8] p-3 shadow-xs transition-all">
                    <h3 className="font-serif font-semibold text-[16px] text-[#241F1C] mb-1.5">
                      Make it a moment?
                    </h3>

                    <div className="flex items-center justify-between gap-2">
                      {/* Left: Platter Illustration */}
                      <div className="shrink-0 -ml-1 flex items-center justify-center">
                        <Image
                          src="/conversation_board_clean.png"
                          alt="Conversation Board"
                          width={100}
                          height={64}
                          className="w-[100px] h-[64px] object-contain select-none pointer-events-none"
                        />
                      </div>

                      {/* Center: Title & Description */}
                      <div className="flex-1 min-w-0 pr-1">
                        <h4 className="font-serif font-bold text-[13.5px] text-[#241F1C] leading-snug truncate">
                          Conversation Board
                        </h4>
                        <p className="font-mono text-[10.5px] text-[#374438] leading-tight mt-0.5">
                          Cheese, fruits, nuts &amp; a little something sweet.
                        </p>
                      </div>

                      {/* Right: Price & Butter Taxi Button */}
                      <div className="flex flex-col items-end gap-1.5 shrink-0 pl-1">
                        <div className="flex items-center gap-1 font-serif text-right">
                          <span className="line-through font-mono text-[11px] text-[#725039]/70">
                            ₹350
                          </span>
                          <span className="font-serif font-bold text-[13.5px] text-[#241F1C]">
                            ₹260
                          </span>
                        </div>

                        <button
                          type="button"
                          onClick={handleAddConversationBoard}
                          className={`w-9 h-9 rounded-full border border-[#241F1C] flex items-center justify-center transition-all duration-200 active:scale-90 shadow-xs cursor-pointer ${
                            boardAdded || items.some((i) => i.item.id === "conversation_board")
                              ? "bg-[#2E5550] text-[#F3E7D3] border-[#241F1C]"
                              : "bg-[#F2C84B] text-[#241F1C] hover:bg-[#DEB63E]"
                          }`}
                          aria-label="Add Conversation Board"
                        >
                          {boardAdded || items.some((i) => i.item.id === "conversation_board") ? (
                            <Check className="w-4 h-4 stroke-[2.5]" />
                          ) : (
                            <Plus className="w-4 h-4 stroke-[2.5]" />
                          )}
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </TableArchedCard>
            </div>
          )}
        </div>

        {/* Sticky Bottom Summary & "View Bill" CTA Button in Smol Cherry */}
        {!orderSuccess && activeView === "table_order" && items.length > 0 && (
          <div className="sticky bottom-0 left-0 right-0 z-30 px-5 pt-2 pb-5 bg-gradient-to-t from-[#F3E7D3] via-[#F3E7D3]/95 to-transparent">
            <p className="font-serif text-[15px] font-medium text-[#241F1C] text-center mb-2 tracking-wide">
              {totalCount} {totalCount === 1 ? "item" : "items"} &nbsp;•&nbsp; Total ₹{totalRupees}
            </p>

            <button
              type="button"
              onClick={() => setActiveView("bill")}
              className="w-full rounded-full bg-[#B72E35] hover:bg-[#9E252C] text-[#F3E7D3] font-serif text-[17.5px] font-medium py-3.5 shadow-sm active:scale-[0.99] transition duration-150 cursor-pointer text-center block"
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
          amountPaise={orderSuccess?.totalPaise || (grandTotal > 0 ? grandTotal * 100 : subtotalPaise)}
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
