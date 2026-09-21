"use client";

import React, { useState, useEffect, useCallback, useRef } from "react";
import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { fetchActiveOrdersAction, type CustomerOrderDetails } from "@/app/orders/actions";
import { OrderCard } from "./OrderCard";
import { ConversationDeckModal } from "./ConversationDeckModal";
import { BottomNavBar } from "@/components/navigation/BottomNavBar";
import { Bell, CreditCard, Tag, Receipt, Star, ExternalLink, MapPin } from "lucide-react";
import { useSupabaseRealtime } from "@/hooks/useSupabaseRealtime";
import { subscribeToSyncEvents } from "@/lib/sync-events";
import { createTableJsonTag } from "@/lib/table-tag";
import { JsonTagInspectorModal } from "@/components/table/JsonTagInspectorModal";
import { UpiPaymentDrawer } from "@/components/payment/UpiPaymentDrawer";
import { ThemeToggle } from "@/components/common/ThemeToggle";
import { PastBillsModal } from "./PastBillsModal";
import { soundManager } from "@/lib/sound";

interface OrderStatusClientViewProps {
  initialOrders: CustomerOrderDetails[];
  tableLabel?: string;
  locationName?: string;
  hasSession: boolean;
  guestName?: string;
}

export const OrderStatusClientView: React.FC<OrderStatusClientViewProps> = ({
  initialOrders,
  tableLabel = "01",
  locationName = "Rishikesh",
  hasSession,
  guestName = "",
}) => {
  const router = useRouter();
  const [orders, setOrders] = useState<CustomerOrderDetails[]>(initialOrders);
  const [currentGuestName, setCurrentGuestName] = useState(guestName);
  const [isDeckOpen, setIsDeckOpen] = useState(false);
  const [isJsonInspectorOpen, setIsJsonInspectorOpen] = useState(false);
  const [isUpiDrawerOpen, setIsUpiDrawerOpen] = useState(false);
  const [isPastBillsOpen, setIsPastBillsOpen] = useState(false);

  // Status tracker for audible chime on READY / COMPLETED transition
  const prevStatusesRef = useRef<Record<string, string>>({});

  useEffect(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("smol_guest_name");
      if (saved && !currentGuestName) {
        setCurrentGuestName(saved);
      }
    }
  }, [currentGuestName]);

  const displayTable = (tableLabel || "01").replace(/^(table|t)[-\s_]*/i, "").trim().padStart(2, "0");
  const tableJsonTag = createTableJsonTag(displayTable);

  const refreshOrders = useCallback(async () => {
    try {
      const res = await fetchActiveOrdersAction();
      if (res.success) {
        // Detect if any order transitioned to READY or COMPLETED
        res.orders.forEach((ord) => {
          const prevStatus = prevStatusesRef.current[ord.id];
          if (prevStatus && prevStatus !== ord.status && (ord.status === "READY" || ord.status === "COMPLETED" || ord.status === "SERVED")) {
            soundManager.playOrderReadyChime();
          }
          prevStatusesRef.current[ord.id] = ord.status;
        });

        setOrders(res.orders);
      }
    } catch (err) {
      console.error("Failed to refresh active orders:", err);
    }
  }, []);

  // 1. Cross-Interface & Cross-Port Supabase Broadcast Subscription
  useEffect(() => {
    const unsub = subscribeToSyncEvents(() => {
      refreshOrders();
    });
    return () => unsub();
  }, [refreshOrders]);

  // 2. Supabase Realtime WebSocket subscription for Customer Order Status Updates
  useSupabaseRealtime({
    table: "orders",
    onData: () => {
      refreshOrders();
    },
    enabled: true,
  });

  // 3. 2-Second Polling Timer & Window Focus Revalidation for Guaranteed Realtime Sync
  useEffect(() => {
    const handleFocus = () => refreshOrders();
    window.addEventListener("focus", handleFocus);

    const intervalId = setInterval(() => {
      refreshOrders();
    }, 2000);

    return () => {
      clearInterval(intervalId);
      window.removeEventListener("focus", handleFocus);
    };
  }, [refreshOrders]);

  if (!hasSession) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-[#FDFBF7] px-6 py-12 text-center text-[#1C1917] dark:bg-[#141211] dark:text-[#FDFBF7]">
        <div className="w-full max-w-md rounded-3xl border border-stone-200/80 bg-white/80 p-8 shadow-xl dark:border-stone-800 dark:bg-stone-900/80">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-amber-100 dark:bg-amber-900/30 text-3xl">
            🪑
          </div>
          <h2 className="text-2xl font-bold tracking-tight">No Active Table Session</h2>
          <p className="mt-2 text-xs text-stone-600 dark:text-stone-400">
            Please scan the QR code on your table stand or tap a table below to view live orders:
          </p>
          <div className="mt-4 flex flex-wrap justify-center gap-2 max-h-40 overflow-y-auto">
            {Array.from({ length: 13 }, (_, i) => (i + 1).toString().padStart(2, "0")).map((label) => {
              return (
                <a
                  key={label}
                  href={`/t/table-${label}`}
                  className="rounded-xl border border-amber-300 bg-amber-50 px-3 py-1.5 text-xs font-bold text-amber-900 shadow-xs hover:bg-amber-100 dark:border-amber-700 dark:bg-stone-800 dark:text-amber-200"
                >
                  Table {label}
                </a>
              );
            })}
          </div>
          <div className="mt-5">
            <Link
              href="/"
              className="inline-flex w-full items-center justify-center rounded-xl bg-stone-900 py-3 text-sm font-semibold text-white transition hover:bg-stone-800 dark:bg-stone-100 dark:text-stone-900"
            >
              Back to Home
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const latestOrder = orders[0];
  const hasOrders = orders.length > 0;

  const orderNumberStr = latestOrder
    ? `#SMOL ${latestOrder.orderNo.toString().padStart(4, "0")}`
    : "NO ACTIVE ORDER";

  const firstItemName = latestOrder?.items[0]?.name || (hasOrders ? "Order" : "Artisanal Coffee");

  // Dynamic Headline, Subtitle, and ETA based on actual order status
  let heroHeadline = `Brewing Your ${firstItemName}`;
  let heroSubtitle = "single-origin South Indian estate beans";
  let heroEta = "⏱ 8-10 mins";

  if (latestOrder) {
    if (latestOrder.status === "SERVED" || latestOrder.status === "COMPLETED") {
      heroHeadline = `${firstItemName} Served!`;
      heroSubtitle = "Delivered to your table. Hope you enjoyed it!";
      heroEta = "✓ Delivered";
    } else if (latestOrder.status === "READY") {
      heroHeadline = `${firstItemName} is Ready!`;
      heroSubtitle = "Piping hot! Your server is bringing it over, or collect at brew bar.";
      heroEta = "🔔 Ready Now";
    } else if (latestOrder.status === "PREPARING") {
      heroHeadline = `Crafting Your ${firstItemName}`;
      heroSubtitle = "Coffee is brewing and food is freshly on the kitchen grill.";
      heroEta = latestOrder.etaMinMinutes
        ? `⏱ ${latestOrder.etaMinMinutes}-${latestOrder.etaMaxMinutes || 10} mins`
        : "⏱ 5-8 mins";
    } else {
      heroHeadline = `Order Received: ${firstItemName}`;
      heroSubtitle = "Logged into café kitchen queue. Chef notified.";
      heroEta = "⏱ 8-12 mins";
    }
  } else {
    heroHeadline = "No Active Orders Placed";
    heroSubtitle = "Select your favourite brews & bakes from our menu.";
    heroEta = "—";
  }

  return (
    <div className="min-h-screen bg-[#F3E7D3] dark:bg-[#151110] text-[#241F1C] dark:text-[#FAF4EB] pb-28 font-serif transition-colors duration-200">
      {/* Top Header */}
      <header className="sticky top-0 z-40 border-b border-[#C9AE8B]/40 dark:border-white/10 bg-[#F3E7D3]/95 dark:bg-[#181412]/95 px-4 py-3.5 backdrop-blur-md transition-colors duration-200">
        <div className="mx-auto flex max-w-md items-start justify-between gap-2.5">
          <div className="flex items-start gap-2 min-w-0">
            {/* Back Button */}
            <Link
              href="/smol-menu"
              aria-label="Back to menu"
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-[#241F1C] dark:text-[#FAF4EB] transition hover:bg-black/5 dark:hover:bg-white/10 active:scale-95 cursor-pointer -ml-1 mt-0.5"
            >
              <svg
                className="h-5 w-5"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth={2}
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <polyline points="15 18 9 12 15 6" />
              </svg>
            </Link>

            <div className="min-w-0">
              <span className="block font-mono text-[10px] font-bold uppercase tracking-widest text-[#B72E35] dark:text-[#FF5B52]">
                4. ORDER STATUS
              </span>
              <h1 className="font-serif text-2xl font-bold tracking-tight text-[#241F1C] dark:text-[#FAF4EB] lowercase truncate">
                {currentGuestName ? `${currentGuestName}'s order` : "your order"}
              </h1>
              <p className="font-serif italic text-xs text-[#725039] dark:text-[#C9AE8B] truncate">
                Table {displayTable}{currentGuestName ? ` • Guest: ${currentGuestName}` : ""} • {locationName.toLowerCase()}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1.5 pt-1 shrink-0">
            {orders.length > 0 && (
              <button
                type="button"
                onClick={() => setIsPastBillsOpen(true)}
                className="inline-flex items-center gap-1 rounded-full bg-[#FAF4EB] dark:bg-white/10 border border-[#C9AE8B]/40 px-2.5 py-1 text-[10px] font-mono font-bold text-[#725039] dark:text-[#C9AE8B] hover:bg-[#EDE1D2] transition shadow-xs cursor-pointer"
                title="View All Bills & Invoices"
              >
                <Receipt className="h-3 w-3 text-[#B72E35] dark:text-[#FF6B6B]" />
                <span>Bills</span>
              </button>
            )}

            <span className="inline-flex items-center gap-1 rounded-full bg-[#75AFA7]/25 dark:bg-[#75AFA7]/20 border border-[#75AFA7]/40 px-2.5 py-1 text-[10px] font-mono font-bold tracking-wider text-[#1C463F] dark:text-[#75C7BC] shadow-xs">
              <span className="h-1.5 w-1.5 rounded-full bg-[#1C463F] dark:bg-[#75C7BC] animate-pulse" />
              LIVE
            </span>
            <ThemeToggle variant="icon" />
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="mx-auto max-w-md px-4 pt-4 space-y-5">
        {/* Arched Hero Status Card (Light Mode Warm Cream / Dark Mode Obsidian) */}
        <div className="relative overflow-hidden rounded-t-[5.5rem] rounded-b-3xl border-t-4 border-[#B72E35] dark:border-t-2 border-x border-b border-[#C9AE8B]/40 dark:border-x-0 dark:border-b-0 bg-[#FAF4EB] dark:bg-[#141517] p-6 text-center text-[#241F1C] dark:text-white shadow-[0_16px_36px_rgba(74,46,27,0.08)] dark:shadow-2xl animate-scale-in transition-colors duration-200">
          {/* Top Red Ambient Glow */}
          <div className="absolute -top-10 left-1/2 -translate-x-1/2 w-48 h-20 bg-[#B72E35]/15 dark:bg-[#B72E35]/25 rounded-full blur-xl pointer-events-none animate-pulse-glow" />

          {/* smol café Door Logo with Moving/Floating Animation */}
          <div className="relative mx-auto mt-1 flex flex-col items-center justify-center">
            {/* Ambient Back Glow for Logo */}
            <div
              aria-hidden="true"
              className="pointer-events-none absolute -inset-3 rounded-full bg-[#B72E35]/25 dark:bg-[#A855F7]/35 blur-xl animate-pulse-glow"
            />

            {/* Light Mode Floating Logo */}
            <div className="relative block dark:hidden animate-logo-moving-light">
              <Image
                src="/logo-transparent.png"
                alt="smol café"
                width={52}
                height={78}
                className="h-16 w-auto object-contain drop-shadow-[0_6px_14px_rgba(183,46,53,0.3)] transition-transform"
                priority
              />
            </div>

            {/* Dark Mode Floating Neon Logo */}
            <div className="relative hidden dark:block animate-logo-moving-dark">
              <Image
                src="/table-header-logo-dark-v2.png"
                alt="smol café"
                width={52}
                height={78}
                className="h-16 w-auto object-contain transition-transform"
                priority
              />
            </div>

            {/* Dynamic Ground Shadow (shrinks as logo floats up) */}
            <div
              aria-hidden="true"
              className="mt-1 h-1.5 w-10 rounded-full bg-[#725039]/20 dark:bg-black/40 blur-[2px] animate-logo-shadow pointer-events-none"
            />
          </div>

          {/* Headline & Subtitle */}
          <div className="mt-4 space-y-1">
            <h2 className="font-serif text-xl sm:text-2xl font-bold text-[#241F1C] dark:text-[#F3E7D3] tracking-tight">
              {heroHeadline}
            </h2>
            <p className="font-serif italic text-xs text-[#7A583E] dark:text-[#C9AE8B]">
              {heroSubtitle}
            </p>
          </div>

          {/* 2 Metric Tiles */}
          <div className="mt-5 grid grid-cols-2 gap-2.5">
            {/* Order Number */}
            <div className="rounded-2xl border border-[#C9AE8B]/40 dark:border-white/10 bg-[#F4ECE1]/80 dark:bg-[#0C0D0E] p-3 text-center shadow-xs transition-colors">
              <span className="block font-mono text-[9px] font-bold uppercase tracking-wider text-[#7A583E] dark:text-[#C9AE8B]/70">
                YOUR ORDER NO.
              </span>
              <span className="block font-mono text-sm font-bold text-[#8C5E1A] dark:text-[#F2C84B] mt-1 tracking-wider">
                {orderNumberStr}
              </span>
            </div>

            {/* Ready Time */}
            <div className="rounded-2xl border border-[#C9AE8B]/40 dark:border-white/10 bg-[#F4ECE1]/80 dark:bg-[#0C0D0E] p-3 text-center shadow-xs transition-colors">
              <span className="block font-mono text-[9px] font-bold uppercase tracking-wider text-[#7A583E] dark:text-[#C9AE8B]/70">
                EST. READY TIME
              </span>
              <span className="block font-mono text-sm font-bold text-[#B72E35] dark:text-[#FF6B6B] mt-1 tracking-wider">
                {heroEta}
              </span>
            </div>
          </div>

          {/* Table Zone Tag & Actions */}
          <div className="mt-4 pt-3 border-t border-[#C9AE8B]/30 dark:border-white/10 flex items-center justify-between gap-2">
            <button
              type="button"
              onClick={() => setIsJsonInspectorOpen(true)}
              className="inline-flex items-center gap-1.5 rounded-xl border border-[#C9AE8B]/50 dark:border-white/15 bg-[#F4ECE1] dark:bg-white/5 px-2.5 py-1.5 text-[11px] font-mono text-[#5A3825] dark:text-[#F3E7D3]/80 hover:bg-[#EDE1D2] dark:hover:bg-white/10 shadow-xs transition"
              title="Inspect JSON Table Tag"
            >
              <Tag className="h-3 w-3 text-[#8C5E1A] dark:text-[#F2C84B]" />
              <span>{tableJsonTag.zone} • Tag</span>
            </button>

            {latestOrder && (
              <button
                type="button"
                onClick={() => setIsUpiDrawerOpen(true)}
                className="inline-flex items-center gap-1.5 rounded-xl bg-[#B72E35] px-3.5 py-1.5 text-xs font-serif font-bold text-white shadow-sm hover:bg-[#91242C] transition active:scale-95"
              >
                <CreditCard className="h-3.5 w-3.5" />
                <span>Pay via UPI • ₹{Math.round(latestOrder.totalPaise / 100)}</span>
              </button>
            )}
          </div>
        </div>

        {/* Another Round While You Wait */}
        <div className="space-y-2.5 pt-1">
          <div className="flex items-center justify-between">
            <h3 className="font-serif text-sm font-bold text-[#241F1C] dark:text-[#FAF4EB]">
              another round? <span className="font-normal text-[#725039] dark:text-[#C9AE8B]">while you wait</span>
            </h3>
            <span className="text-[#F2C84B] text-xs">✧</span>
          </div>

          {/* Horizontal Scroller Cards */}
          <div className="flex items-center gap-3 overflow-x-auto no-scrollbar pb-1">
            {/* Card 1: Smol Espresso */}
            <div className="w-36 shrink-0 rounded-2xl border border-[#C9AE8B]/40 dark:border-white/10 bg-[#FAF4EB] dark:bg-[#201A17] p-3 shadow-xs flex flex-col justify-between h-24">
              <p className="font-serif font-bold text-xs text-[#241F1C] dark:text-[#FAF4EB] truncate">
                smol espresso
              </p>
              <div className="flex items-center justify-between">
                <span className="font-serif font-bold text-xs text-[#B72E35] dark:text-[#FF5B52]">₹120</span>
                <Link
                  href="/smol-menu"
                  className="flex h-7 w-7 items-center justify-center rounded-full bg-[#B72E35] text-white text-sm font-bold shadow-xs hover:bg-[#91242C] active:scale-95"
                >
                  +
                </Link>
              </div>
            </div>

            {/* Card 2: Jaggery Latte */}
            <div className="w-36 shrink-0 rounded-2xl border border-[#C9AE8B]/40 dark:border-white/10 bg-[#FAF4EB] dark:bg-[#201A17] p-3 shadow-xs flex flex-col justify-between h-24">
              <p className="font-serif font-bold text-xs text-[#241F1C] dark:text-[#FAF4EB] truncate">
                jaggery latte
              </p>
              <div className="flex items-center justify-between">
                <span className="font-serif font-bold text-xs text-[#B72E35] dark:text-[#FF5B52]">₹150</span>
                <Link
                  href="/smol-menu"
                  className="flex h-7 w-7 items-center justify-center rounded-full bg-[#B72E35] text-white text-sm font-bold shadow-xs hover:bg-[#91242C] active:scale-95"
                >
                  +
                </Link>
              </div>
            </div>

            {/* Card 3: Triple Decker */}
            <div className="w-36 shrink-0 rounded-2xl border border-[#C9AE8B]/40 dark:border-white/10 bg-[#FAF4EB] dark:bg-[#201A17] p-3 shadow-xs flex flex-col justify-between h-24">
              <p className="font-serif font-bold text-xs text-[#241F1C] dark:text-[#FAF4EB] truncate">
                triple decker
              </p>
              <div className="flex items-center justify-between">
                <span className="font-serif font-bold text-xs text-[#B72E35] dark:text-[#FF5B52]">₹140</span>
                <Link
                  href="/smol-menu"
                  className="flex h-7 w-7 items-center justify-center rounded-full bg-[#B72E35] text-white text-sm font-bold shadow-xs hover:bg-[#91242C] active:scale-95"
                >
                  +
                </Link>
              </div>
            </div>
          </div>
        </div>

        {/* Notify Me When Ready Button */}
        <div className="pt-2">
          <button
            type="button"
            onClick={() => {
              if (typeof window !== "undefined" && "Notification" in window) {
                Notification.requestPermission();
              }
              soundManager.playOrderPlacedChime();
              alert("You will be notified as soon as your order is ready!");
            }}
            className="flex w-full items-center justify-center gap-2 rounded-full bg-[#B72E35] py-3.5 font-serif text-sm font-semibold text-[#F3E7D3] shadow-md transition hover:bg-[#91242C] active:scale-[0.98] cursor-pointer"
          >
            <Bell className="h-4 w-4 text-[#F3E7D3]" />
            <span>notify me when ready</span>
          </button>
        </div>

        {/* Google Maps & Cafe Review Card */}
        <div className="rounded-2xl border border-amber-300/80 dark:border-amber-900/50 bg-amber-50/90 dark:bg-amber-950/20 p-4 shadow-xs space-y-2">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-2">
              <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-amber-500 text-white">
                <Star className="h-4 w-4 fill-white" />
              </div>
              <div>
                <h4 className="font-serif font-bold text-sm text-[#241F1C] dark:text-amber-100">
                  Enjoying smol café?
                </h4>
                <p className="text-[11px] text-[#725039] dark:text-amber-300/80 font-sans">
                  Tapovan, Rishikesh • Artisanal Coffee &amp; Slow Bakes
                </p>
              </div>
            </div>

            <a
              href="https://maps.google.com/?q=smol+cafe+tapovan+rishikesh"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 rounded-xl bg-[#241F1C] dark:bg-amber-400 text-white dark:text-[#241F1C] px-3 py-1.5 text-xs font-serif font-bold shadow-xs hover:opacity-90 transition active:scale-95"
            >
              <span>Review on Google</span>
              <ExternalLink className="h-3 w-3" />
            </a>
          </div>
        </div>

        {/* Active Ticket Progression Cards */}
        {orders.length > 0 ? (
          <div className="pt-3 space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="font-mono text-[10px] font-bold uppercase tracking-wider text-[#786F66] dark:text-[#C9AE8B]">
                Detailed Round Timeline ({orders.length} {orders.length === 1 ? "Round" : "Rounds"})
              </h4>
              <button
                type="button"
                onClick={() => setIsPastBillsOpen(true)}
                className="text-xs font-serif font-bold text-[#B72E35] dark:text-[#FF6B6B] hover:underline flex items-center gap-1 cursor-pointer"
              >
                <Receipt className="h-3 w-3" />
                <span>All Invoices</span>
              </button>
            </div>
            <div className="space-y-3">
              {orders.map((order) => (
                <OrderCard
                  key={order.id}
                  order={order}
                  tableLabel={tableLabel}
                  guestName={currentGuestName}
                />
              ))}
            </div>
          </div>
        ) : (
          <div className="pt-2">
            <div className="rounded-3xl border border-dashed border-[#C9AE8B]/60 dark:border-stone-800 bg-[#FAF4EB]/60 dark:bg-stone-900/40 p-6 text-center space-y-3">
              <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-amber-100 dark:bg-amber-950/50 text-2xl">
                ☕
              </div>
              <h3 className="font-serif text-lg font-bold text-[#241F1C] dark:text-white">
                No orders placed yet
              </h3>
              <p className="font-serif italic text-xs text-[#7A583E] dark:text-[#C9AE8B] max-w-xs mx-auto">
                Ready for your coffee ritual? Browse our artisanal brews and fresh bakery treats.
              </p>
              <div className="flex flex-col sm:flex-row items-center justify-center gap-2 pt-1">
                <Link
                  href="/smol-menu"
                  className="inline-flex items-center justify-center gap-2 rounded-full bg-[#B72E35] px-6 py-2.5 font-serif text-xs font-bold text-white shadow-md hover:bg-[#91242C] transition active:scale-95"
                >
                  <span>Browse Menu &amp; Order →</span>
                </Link>
              </div>

              <div className="pt-2 flex flex-wrap items-center justify-center gap-1.5 text-[11px] font-mono text-[#7A583E] dark:text-[#C9AE8B]">
                <span>Testing another table?</span>
                {["01", "02", "03", "04"].map((num) => (
                  <a
                    key={num}
                    href={`/t/table-${num}`}
                    className={`rounded-lg px-2.5 py-1 border text-xs font-bold transition ${
                      tableLabel === num
                        ? "bg-[#B72E35] text-white border-[#B72E35]"
                        : "bg-white/80 dark:bg-stone-800 border-[#C9AE8B]/50 hover:bg-[#F3E7D3] text-[#241F1C] dark:text-white"
                    }`}
                  >
                    Table {num}
                  </a>
                ))}
              </div>
            </div>
          </div>
        )}
      </main>

      {/* Conversation Prompt Deck Modal */}
      <ConversationDeckModal isOpen={isDeckOpen} onClose={() => setIsDeckOpen(false)} />

      {/* JSON Table Tag Inspector Modal */}
      {isJsonInspectorOpen && (
        <JsonTagInspectorModal
          tag={tableJsonTag}
          onClose={() => setIsJsonInspectorOpen(false)}
        />
      )}

      {/* Past Bills & Invoices Modal */}
      {isPastBillsOpen && (
        <PastBillsModal
          orders={orders}
          tableLabel={tableLabel}
          guestName={currentGuestName}
          onClose={() => setIsPastBillsOpen(false)}
        />
      )}

      {/* UPI Payment Gateway Drawer */}
      {isUpiDrawerOpen && latestOrder && (
        <UpiPaymentDrawer
          orderId={latestOrder.id}
          orderNo={latestOrder.orderNo}
          tableLabel={tableLabel}
          zone={tableJsonTag.zone}
          amountPaise={latestOrder.totalPaise}
          items={latestOrder.items.map((i) => ({
            name: i.name,
            qty: i.qty,
            priceRupees: Math.round(i.unitPricePaise / 100),
            subtotalRupees: Math.round((i.unitPricePaise / 100) * i.qty),
          }))}
          onClose={() => setIsUpiDrawerOpen(false)}
          onPaymentSuccess={() => {
            setIsUpiDrawerOpen(false);
            refreshOrders();
          }}
        />
      )}

      {/* Bottom Sticky Navigation */}
      <BottomNavBar />
    </div>
  );
};
