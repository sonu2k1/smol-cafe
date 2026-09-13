"use client";

import React, { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import {
  CheckCircle2,
  Sparkles,
  Receipt,
  Coffee,
  Plus,
  Wifi,
  Copy,
  Check,
  X,
  Clock,
} from "lucide-react";
import { useCart } from "@/context/CartContext";
import { DigitalReceiptModal, type ReceiptData } from "./DigitalReceiptModal";

export interface PostPaymentCelebrationModalProps {
  orderId?: string;
  orderNo?: number;
  tableLabel: string;
  zone?: string;
  totalRupees: number;
  items?: Array<{ name: string; qty: number; priceRupees: number; subtotalRupees: number }>;
  transactionId?: string;
  appName?: string;
  onClose: () => void;
}

const DESSERT_SUGGESTIONS = [
  {
    id: "item_croissant_butter",
    name: "Flaky Butter Croissant",
    desc: "Golden layers with French butter & flake salt",
    priceRupees: 140,
    pricePaise: 14000,
    tag: "Fresh Bake",
  },
  {
    id: "item_cinnamon_bun",
    name: "Cinnamon Almond Bun",
    desc: "Warm morning brioche with spiced glaze",
    priceRupees: 180,
    pricePaise: 18000,
    tag: "Chef's Special",
  },
  {
    id: "item_chocolate_babka",
    name: "Sourdough Chocolate Babka",
    desc: "Valrhona cocoa swirl with toasted hazelnuts",
    priceRupees: 190,
    pricePaise: 19000,
    tag: "House Favorite",
  },
  {
    id: "item_pour_over",
    name: "Ratnagiri Pour Over",
    desc: "Single-origin manual brew with hazelnut finish",
    priceRupees: 220,
    pricePaise: 22000,
    tag: "Second Cup",
  },
];

export const PostPaymentCelebrationModal: React.FC<PostPaymentCelebrationModalProps> = ({
  orderId = `ORD-${Date.now().toString().slice(-6)}`,
  orderNo,
  tableLabel,
  zone = "Indoor Cozy",
  totalRupees,
  items = [],
  transactionId = `UPI/2026/${Math.floor(100000000 + Math.random() * 900000000)}`,
  appName = "UPI Instant",
  onClose,
}) => {
  const { addItem, openCart } = useCart();
  const [showReceipt, setShowReceipt] = useState(false);
  const [copiedWifi, setCopiedWifi] = useState(false);
  const [addedItemName, setAddedItemName] = useState<string | null>(null);

  const pointsEarned = Math.max(10, Math.round(totalRupees / 10));

  const handleCopyWifi = () => {
    navigator.clipboard.writeText("smolcoffee2026");
    setCopiedWifi(true);
    setTimeout(() => setCopiedWifi(false), 2000);
  };

  const handleQuickAddDessert = (dessert: (typeof DESSERT_SUGGESTIONS)[number]) => {
    addItem({
      id: dessert.id,
      categoryId: "desserts",
      name: dessert.name,
      status: "AVAILABLE",
      description: dessert.desc,
      pricePaise: dessert.pricePaise,
      imageUrl: null,
      metadata: {
        dietary: "Vegetarian",
      },
    });

    setAddedItemName(dessert.name);
    setTimeout(() => {
      setAddedItemName(null);
    }, 2500);
  };

  const defaultReceiptItems =
    items.length > 0
      ? items
      : [{ name: "Artisanal Table Order", qty: 1, priceRupees: totalRupees, subtotalRupees: totalRupees }];

  const receiptData: ReceiptData = {
    orderId,
    orderNo,
    tableLabel,
    zone,
    items: defaultReceiptItems,
    subtotalRupees: Math.round(totalRupees / 1.05),
    taxRupees: Math.round(totalRupees - totalRupees / 1.05),
    totalRupees,
    paymentMethod: "UPI",
    transactionId,
    paidAt: new Date().toISOString(),
    merchantName: "smol café Tapovan",
    gstin: "05AAACH7409R1ZZ",
  };

  if (showReceipt) {
    return (
      <DigitalReceiptModal
        receipt={receiptData}
        onClose={() => setShowReceipt(false)}
      />
    );
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/75 backdrop-blur-xs sm:items-center p-0 sm:p-4 animate-fade-in"
      onClick={onClose}
    >
      <div
        className="w-full max-w-lg rounded-t-[2.5rem] sm:rounded-3xl border border-[#C9AE8B]/40 dark:border-stone-800 bg-[#FAF4EB] dark:bg-[#1A1715] p-6 shadow-2xl text-[#241F1C] dark:text-[#FDFBF7] transition-all animate-scale-in max-h-[92vh] overflow-y-auto space-y-5"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Mobile Pull Handle Indicator */}
        <div className="pt-1 pb-1 flex justify-center sm:hidden">
          <div className="w-10 h-1 rounded-full bg-[#D8CEBF] dark:bg-stone-700" />
        </div>

        {/* Top Dismiss Button */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Image
              src="/logo-transparent.png"
              alt="smol café"
              width={24}
              height={36}
              className="h-8 w-auto object-contain"
              priority
            />
            <span className="rounded-full bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800 px-2.5 py-0.5 font-mono text-[10px] font-bold uppercase tracking-wider">
              PAYMENT VERIFIED &amp; SETTLED
            </span>
          </div>
          <button
            onClick={onClose}
            aria-label="Close modal"
            className="flex h-8 w-8 items-center justify-center rounded-full bg-[#EFE7DC] dark:bg-stone-800 text-[#786F66] dark:text-stone-400 hover:bg-[#E2D6C5] dark:hover:bg-stone-700 active:scale-95 transition"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Celebratory Hero Card */}
        <div className="text-center space-y-2 pt-1 pb-2">
          <div className="relative mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-emerald-100 dark:bg-emerald-950/80 text-emerald-700 dark:text-emerald-400 shadow-inner">
            <CheckCircle2 className="h-10 w-10 animate-bounce" />
            <div className="absolute -top-1 -right-1 flex h-7 w-7 items-center justify-center rounded-full bg-[#F2C84B] text-[#241F1C] shadow-md animate-pulse">
              <Sparkles className="h-4 w-4" />
            </div>
          </div>

          <h2 className="font-serif text-2xl sm:text-3xl font-black tracking-tight text-[#241F1C] dark:text-white">
            ₹{totalRupees} Received!
          </h2>

          <p className="font-serif italic text-xs text-[#725039] dark:text-stone-400">
            Paid via {appName} • Table {tableLabel} ({zone})
          </p>
          <div className="font-mono text-[11px] text-[#8C7E72] dark:text-stone-500">
            Txn ID: {transactionId}
          </div>
        </div>

        {/* Smol Club Loyalty Points Earned Card */}
        <div className="rounded-2xl border border-amber-300/80 dark:border-amber-600/40 bg-[#FFF8E7] dark:bg-amber-950/30 p-4 space-y-2 shadow-xs">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-[#F2C84B] text-[#241F1C] font-bold shadow-xs">
                ★
              </div>
              <div>
                <span className="block font-mono text-[10px] uppercase font-bold text-[#725039] dark:text-amber-300 tracking-wider">
                  SMOL CLUB LOYALTY
                </span>
                <span className="font-serif text-sm font-bold text-[#241F1C] dark:text-white">
                  +{pointsEarned} Points Credited
                </span>
              </div>
            </div>
            <span className="rounded-full bg-[#B72E35] text-white px-2.5 py-0.5 font-mono text-xs font-bold shadow-xs">
              ₹10 = 1 pt
            </span>
          </div>

          <div className="border-t border-amber-200/60 dark:border-amber-900/50 pt-2 flex items-center justify-between text-xs text-[#725039] dark:text-stone-400">
            <span>Tier Status: <strong>Seedling Patron</strong></span>
            <span className="font-mono text-[11px] text-[#B72E35] dark:text-[#F6AD55] font-bold">
              Free Cookie at 100 pts
            </span>
          </div>
        </div>

        {/* Primary Actions: Digital Receipt & Track Kitchen Order */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
          <button
            type="button"
            onClick={() => setShowReceipt(true)}
            className="flex items-center justify-center gap-2 rounded-2xl border border-[#C9AE8B]/60 dark:border-stone-700 bg-white dark:bg-stone-900 py-3 px-4 font-serif text-xs font-bold text-[#241F1C] dark:text-stone-200 shadow-xs hover:bg-[#F3E7D3]/50 dark:hover:bg-stone-800 transition active:scale-98"
          >
            <Receipt className="h-4 w-4 text-[#B72E35] dark:text-[#F6AD55]" />
            <span>View Digital Tax Chit →</span>
          </button>

          <Link
            href="/orders"
            onClick={onClose}
            className="flex items-center justify-center gap-2 rounded-2xl bg-[#B72E35] py-3 px-4 font-serif text-xs font-bold text-white shadow-md hover:bg-[#9B242A] transition active:scale-98"
          >
            <Clock className="h-4 w-4" />
            <span>Track Kitchen Prep Live →</span>
          </Link>
        </div>

        {/* Toast alert if dessert was added */}
        {addedItemName && (
          <div className="rounded-xl border border-emerald-300 dark:border-emerald-800 bg-emerald-100 dark:bg-emerald-950/80 p-3 text-xs text-emerald-900 dark:text-emerald-300 flex items-center justify-between animate-scale-in">
            <span className="font-serif">
              ✓ <strong>{addedItemName}</strong> added to your table order!
            </span>
            <button
              onClick={() => {
                onClose();
                openCart();
              }}
              className="font-bold underline text-emerald-800 dark:text-emerald-200 hover:text-emerald-950 ml-2"
            >
              Open Cart
            </button>
          </div>
        )}

        {/* "Fancy a Sweet Treat While You Wait?" - Re-order / Add Dessert Carousel */}
        <div className="rounded-3xl border border-[#C9AE8B]/40 dark:border-stone-800 bg-white dark:bg-stone-900/70 p-4 space-y-3 shadow-xs">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Coffee className="h-4 w-4 text-[#B72E35] dark:text-[#F6AD55]" />
              <h3 className="font-serif text-sm font-bold text-[#241F1C] dark:text-white">
                Fancy a Sweet Treat While You Wait?
              </h3>
            </div>
            <span className="rounded-full bg-[#FAF4EB] dark:bg-stone-800 border border-[#C9AE8B]/30 dark:border-stone-700 px-2 py-0.5 text-[10px] font-mono text-[#725039] dark:text-stone-400">
              Quick Add
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            {DESSERT_SUGGESTIONS.map((item) => (
              <div
                key={item.id}
                className="flex items-center justify-between p-3 rounded-2xl border border-[#C9AE8B]/20 dark:border-stone-800 bg-[#FAF4EB]/60 dark:bg-stone-800/40 hover:bg-[#FAF4EB] dark:hover:bg-stone-800 transition"
              >
                <div className="space-y-0.5 pr-2">
                  <span className="inline-block text-[9px] font-mono font-bold text-[#B72E35] dark:text-[#F6AD55] uppercase">
                    {item.tag}
                  </span>
                  <p className="font-serif text-xs font-bold text-[#241F1C] dark:text-stone-200">
                    {item.name}
                  </p>
                  <p className="font-mono text-xs font-black text-[#725039] dark:text-amber-400">
                    ₹{item.priceRupees}
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => handleQuickAddDessert(item)}
                  className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-[#B72E35] text-white hover:bg-[#9B242A] active:scale-90 transition shadow-xs cursor-pointer"
                  title={`Add ${item.name} to table`}
                >
                  <Plus className="h-4 w-4" />
                </button>
              </div>
            ))}
          </div>
        </div>

        {/* Cafe Wi-Fi & Ambiance Perks */}
        <div className="flex items-center justify-between rounded-2xl border border-[#C9AE8B]/30 dark:border-stone-800 bg-[#F3E7D3]/50 dark:bg-stone-900/40 p-3.5 text-xs text-[#725039] dark:text-stone-400">
          <div className="flex items-center gap-2">
            <Wifi className="h-4 w-4 text-[#B72E35] dark:text-[#F6AD55]" />
            <div>
              <span className="block font-bold text-[#241F1C] dark:text-stone-200">
                Café High-Speed Wi-Fi
              </span>
              <span className="font-mono text-[11px]">Pass: smolcoffee2026</span>
            </div>
          </div>

          <button
            type="button"
            onClick={handleCopyWifi}
            className="flex items-center gap-1 rounded-lg border border-[#C9AE8B]/40 dark:border-stone-700 bg-white dark:bg-stone-800 px-2.5 py-1 text-[11px] font-mono text-[#241F1C] dark:text-stone-300 hover:bg-[#FAF4EB] transition"
          >
            {copiedWifi ? (
              <>
                <Check className="h-3 w-3 text-emerald-600" />
                <span>Copied</span>
              </>
            ) : (
              <>
                <Copy className="h-3 w-3" />
                <span>Copy</span>
              </>
            )}
          </button>
        </div>

        {/* Dismiss and back to table */}
        <button
          type="button"
          onClick={onClose}
          className="w-full rounded-2xl border border-[#C9AE8B]/40 dark:border-stone-800 bg-[#FAF4EB] dark:bg-stone-900 py-3 font-serif text-xs font-semibold text-[#725039] dark:text-stone-400 hover:bg-[#F3E7D3] dark:hover:bg-stone-800 transition"
        >
          Done • Back to Table Menu
        </button>
      </div>
    </div>
  );
};
