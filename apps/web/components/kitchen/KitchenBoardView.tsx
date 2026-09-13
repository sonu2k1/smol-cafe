"use client";

import React, { useState, useEffect, useCallback, useRef } from "react";
import type { KitchenTicket } from "@/app/kitchen/actions";
import {
  fetchKitchenOrdersAction,
  transitionOrderStatusAction,
  staffLogoutAction,
} from "@/app/kitchen/actions";
import type { OrderStatus } from "@smol-cafe/db";
import { KitchenTicketCard } from "./KitchenTicketCard";
import { EtaAccuracyReview } from "./EtaAccuracyReview";
import { Bell, BellOff, AlertTriangle, ChefHat, RefreshCw, LogOut } from "lucide-react";
import { useSupabaseRealtime } from "@/hooks/useSupabaseRealtime";
import { broadcastSyncEvent, subscribeToSyncEvents } from "@/lib/sync-events";
import { ThemeToggle } from "@/components/common/ThemeToggle";

interface KitchenBoardViewProps {
  initialOrders: KitchenTicket[];
}

export const KitchenBoardView: React.FC<KitchenBoardViewProps> = ({ initialOrders }) => {
  const [orders, setOrders] = useState<KitchenTicket[]>(initialOrders);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [lastRefreshedAt, setLastRefreshedAt] = useState<Date>(new Date());
  const [conflictMessage, setConflictMessage] = useState<string | null>(null);
  const [soundEnabled, setSoundEnabled] = useState(false);
  const [showEtaAnalytics, setShowEtaAnalytics] = useState(false);
  const prevOrderCountRef = useRef(initialOrders.length);

  // Sound chime for incoming orders
  const playChime = useCallback(() => {
    if (!soundEnabled) return;
    try {
      const ctx = new (
        window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext
      )();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "sine";
      osc.frequency.setValueAtTime(587.33, ctx.currentTime); // D5
      osc.frequency.setValueAtTime(880, ctx.currentTime + 0.15); // A5
      gain.gain.setValueAtTime(0.3, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.4);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.4);
    } catch {
      // AudioContext unavailable
    }
  }, [soundEnabled]);

  const refreshOrders = useCallback(async () => {
    setIsRefreshing(true);
    try {
      const result = await fetchKitchenOrdersAction();
      if (result.success) {
        if (result.orders.length > prevOrderCountRef.current) {
          playChime();
        }
        prevOrderCountRef.current = result.orders.length;
        setOrders(result.orders);
        setLastRefreshedAt(new Date());
      }
    } catch (err) {
      console.error("Failed to refresh kitchen orders:", err);
    } finally {
      setIsRefreshing(false);
    }
  }, [playChime]);

  // Supabase Realtime WebSocket subscription for Instant KDS Ticket updates
  useSupabaseRealtime({
    table: "orders",
    onData: () => {
      refreshOrders();
    },
  });

  // Real-Time Event Listener & Polling Fallback Loop
  useEffect(() => {
    // 1. Fast 2s Polling
    const interval = setInterval(() => {
      if (document.visibilityState === "visible") {
        refreshOrders();
      }
    }, 2000);

    // 2. Cross-Interface Real-Time Sync Subscription
    const unsubscribe = subscribeToSyncEvents(() => {
      refreshOrders();
    });

    // 3. Window Focus Listener
    const handleFocus = () => refreshOrders();
    window.addEventListener("focus", handleFocus);

    return () => {
      clearInterval(interval);
      unsubscribe();
      window.removeEventListener("focus", handleFocus);
    };
  }, [refreshOrders]);

  // Optimistic Transition Handler
  const handleTransition = async (
    orderId: string,
    fromStatus: OrderStatus,
    toStatus: OrderStatus
  ) => {
    // 1. Apply Optimistic Update
    setOrders((prev) =>
      prev.map((o) => (o.id === orderId ? { ...o, status: toStatus } : o))
    );

    // 2. Execute Server Action
    const result = await transitionOrderStatusAction(orderId, fromStatus, toStatus);

    if (result.success) {
      broadcastSyncEvent({
        type: "STATUS_CHANGED",
        orderId,
        status: toStatus,
        timestamp: Date.now(),
      });
    } else {
      if (result.error === "STATUS_MISMATCH") {
        setConflictMessage(result.message || "Order status changed by another device.");
      }
      refreshOrders();
    }
  };

  // Group tickets strictly into 4 columns per specification:
  // NEW -> PREPARING -> READY -> COMPLETED
  const newOrders = orders.filter((o) => o.status === "SUBMITTED" || o.status === "ACCEPTED");
  const preparingOrders = orders.filter((o) => o.status === "PREPARING");
  const readyOrders = orders.filter((o) => o.status === "READY");
  const completedOrders = orders.filter((o) => o.status === "SERVED");

  return (
    <div className="flex min-h-screen flex-col bg-[#F3E7D3] dark:bg-[#241F1C] text-[#241F1C] dark:text-[#F3E7D3] font-sans transition-colors duration-200">
      {/* Header */}
      <header className="sticky top-0 z-30 border-b border-[#C9AE8B]/40 dark:border-[#C9AE8B]/20 bg-[#FAF4EB]/95 dark:bg-[#1D1815]/95 px-5 sm:px-6 py-3.5 backdrop-blur-md transition-colors duration-200">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#B72E35] text-white shadow-xs">
              <ChefHat className="h-5 w-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-serif text-lg font-bold tracking-tight text-[#241F1C] dark:text-[#F3E7D3] lowercase">
                  smol café
                </span>
                <span className="text-xs text-[#754CFF]">✦</span>
                <span className="rounded-md border border-[#C9AE8B]/40 dark:border-[#C9AE8B]/30 bg-[#F3E7D3] dark:bg-[#241F1C] px-2 py-0.5 font-mono text-[11px] text-[#B72E35] dark:text-[#F2C84B]">
                  kitchen gds
                </span>
              </div>
              <p className="font-serif italic text-[11px] text-[#725039] dark:text-[#C9AE8B] -mt-0.5">
                order preparation & ticket dispatch
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 sm:gap-3">
            {/* Station Load & ETA Analytics Toggle */}
            <button
              onClick={() => setShowEtaAnalytics(!showEtaAnalytics)}
              className={`hidden md:flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-mono transition cursor-pointer ${
                showEtaAnalytics
                  ? "border-[#B72E35] bg-[#B72E35]/15 text-[#B72E35] dark:text-[#F2C84B]"
                  : "border-[#C9AE8B]/40 dark:border-[#C9AE8B]/30 bg-[#FAF4EB] dark:bg-[#241F1C] text-[#725039] dark:text-[#C9AE8B] hover:text-[#241F1C] dark:hover:text-[#F3E7D3]"
              }`}
            >
              <span>⏱ station load</span>
            </button>

            {/* Sound Toggle */}
            <button
              onClick={() => setSoundEnabled((v) => !v)}
              className={`flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-mono transition cursor-pointer ${
                soundEnabled
                  ? "border-[#F2C84B]/60 bg-[#F2C84B]/20 text-[#8C6207] dark:text-[#F2C84B]"
                  : "border-[#C9AE8B]/40 dark:border-[#C9AE8B]/30 bg-[#FAF4EB] dark:bg-[#241F1C] text-[#725039] dark:text-[#C9AE8B] hover:text-[#241F1C] dark:hover:text-[#F3E7D3]"
              }`}
            >
              {soundEnabled ? (
                <span className="flex items-center gap-1"><Bell className="h-3.5 w-3.5 text-[#8C6207] dark:text-[#F2C84B]" /> chime on</span>
              ) : (
                <span className="flex items-center gap-1"><BellOff className="h-3.5 w-3.5" /> chime off</span>
              )}
            </button>

            {/* Live Polling Indicator */}
            <div className="flex items-center gap-2 rounded-full border border-[#C9AE8B]/40 dark:border-[#C9AE8B]/30 bg-[#FAF4EB] dark:bg-[#241F1C] px-3 py-1 text-xs font-mono text-[#725039] dark:text-[#C9AE8B]">
              <span
                className={`h-2 w-2 rounded-full bg-[#75AFA7] ${
                  isRefreshing ? "scale-125 opacity-70" : "animate-pulse"
                }`}
              />
              <span className="hidden sm:inline">
                live · {lastRefreshedAt.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" })}
              </span>
            </div>

            {/* Manual Sync Button */}
            <button
              onClick={refreshOrders}
              className="flex h-8 w-8 items-center justify-center rounded-full border border-[#C9AE8B]/40 dark:border-[#C9AE8B]/30 bg-[#FAF4EB] dark:bg-[#241F1C] text-[#725039] dark:text-[#C9AE8B] hover:text-[#241F1C] dark:hover:text-[#F3E7D3] transition cursor-pointer"
              title="Refresh tickets"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${isRefreshing ? "animate-spin" : ""}`} />
            </button>

            {/* Theme Toggle (Light / Dark Mode) */}
            <ThemeToggle />

            {/* Logout */}
            <button
              onClick={async () => {
                await staffLogoutAction();
                window.location.reload();
              }}
              className="flex items-center gap-1 rounded-full border border-[#C9AE8B]/40 dark:border-[#C9AE8B]/30 bg-[#FAF4EB] dark:bg-[#241F1C] px-3 py-1 text-xs font-mono text-[#725039] dark:text-[#C9AE8B] hover:text-[#B72E35] transition cursor-pointer"
            >
              <LogOut className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">logout</span>
            </button>
          </div>
        </div>

        {/* Concurrency Conflict Toast */}
        {conflictMessage && (
          <div className="mt-2 flex items-center justify-between rounded-xl border border-[#B72E35]/60 bg-[#B72E35]/20 px-4 py-2 text-xs text-[#F2C84B]">
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 shrink-0 text-[#F2C84B]" />
              <span>{conflictMessage}</span>
            </div>
            <button
              onClick={() => setConflictMessage(null)}
              className="font-bold text-[#F2C84B] hover:text-white cursor-pointer"
            >
              ✕
            </button>
          </div>
        )}

        {/* Station Load & ETA Review Drawer */}
        {showEtaAnalytics && (
          <div className="mt-4">
            <EtaAccuracyReview />
          </div>
        )}
      </header>

      {/* Kanban Board 4 Columns: NEW -> PREPARING -> READY -> COMPLETED */}
      <main className="grid flex-1 grid-cols-1 gap-4 p-4 md:grid-cols-2 xl:grid-cols-4 min-w-0">
        {/* Column 1: NEW */}
        <div className="flex flex-col rounded-3xl border border-[#C9AE8B]/40 dark:border-[#C9AE8B]/20 bg-[#FAF4EB] dark:bg-[#1A1715] p-4 shadow-sm transition-colors duration-200">
          <div className="mb-3 flex items-center justify-between border-b border-[#C9AE8B]/30 dark:border-stone-800 pb-2.5">
            <div className="flex items-center gap-2">
              <span className="h-2.5 w-2.5 rounded-full bg-[#B72E35]" />
              <h2 className="font-mono text-xs font-bold uppercase tracking-wider text-[#241F1C] dark:text-[#F3E7D3]">
                new
              </h2>
            </div>
            <span className="rounded-full bg-[#F3E7D3] dark:bg-[#241F1C] border border-[#C9AE8B]/40 dark:border-[#C9AE8B]/30 px-2.5 py-0.5 font-mono text-xs font-bold text-[#B72E35] dark:text-[#F2C84B]">
              {newOrders.length}
            </span>
          </div>

          <div className="flex-1 space-y-3 overflow-y-auto pr-1">
            {newOrders.length === 0 ? (
              <p className="py-14 text-center font-serif italic text-xs text-[#725039]/60 dark:text-stone-600">
                no new tickets in queue
              </p>
            ) : (
              newOrders.map((ticket) => (
                <KitchenTicketCard
                  key={ticket.id}
                  ticket={ticket}
                  onTransition={handleTransition}
                />
              ))
            )}
          </div>
        </div>

        {/* Column 2: PREPARING */}
        <div className="flex flex-col rounded-3xl border border-[#C9AE8B]/40 dark:border-[#C9AE8B]/20 bg-[#FAF4EB] dark:bg-[#1A1715] p-4 shadow-sm transition-colors duration-200">
          <div className="mb-3 flex items-center justify-between border-b border-[#C9AE8B]/30 dark:border-stone-800 pb-2.5">
            <div className="flex items-center gap-2">
              <span className="h-2.5 w-2.5 rounded-full bg-[#F2C84B] animate-pulse" />
              <h2 className="font-mono text-xs font-bold uppercase tracking-wider text-[#241F1C] dark:text-[#F3E7D3]">
                preparing
              </h2>
            </div>
            <span className="rounded-full bg-[#F3E7D3] dark:bg-[#241F1C] border border-[#C9AE8B]/40 dark:border-[#C9AE8B]/30 px-2.5 py-0.5 font-mono text-xs font-bold text-[#8C6207] dark:text-[#F2C84B]">
              {preparingOrders.length}
            </span>
          </div>

          <div className="flex-1 space-y-3 overflow-y-auto pr-1">
            {preparingOrders.length === 0 ? (
              <p className="py-14 text-center font-serif italic text-xs text-[#725039]/60 dark:text-stone-600">
                nothing actively on the brew or grill
              </p>
            ) : (
              preparingOrders.map((ticket) => (
                <KitchenTicketCard
                  key={ticket.id}
                  ticket={ticket}
                  onTransition={handleTransition}
                />
              ))
            )}
          </div>
        </div>

        {/* Column 3: READY */}
        <div className="flex flex-col rounded-3xl border border-[#C9AE8B]/40 dark:border-[#C9AE8B]/20 bg-[#FAF4EB] dark:bg-[#1A1715] p-4 shadow-sm transition-colors duration-200">
          <div className="mb-3 flex items-center justify-between border-b border-[#C9AE8B]/30 dark:border-stone-800 pb-2.5">
            <div className="flex items-center gap-2">
              <span className="h-2.5 w-2.5 rounded-full bg-[#75AFA7]" />
              <h2 className="font-mono text-xs font-bold uppercase tracking-wider text-[#241F1C] dark:text-[#F3E7D3]">
                ready
              </h2>
            </div>
            <span className="rounded-full bg-[#F3E7D3] dark:bg-[#241F1C] border border-[#C9AE8B]/40 dark:border-[#C9AE8B]/30 px-2.5 py-0.5 font-mono text-xs font-bold text-[#245850] dark:text-[#75AFA7]">
              {readyOrders.length}
            </span>
          </div>

          <div className="flex-1 space-y-3 overflow-y-auto pr-1">
            {readyOrders.length === 0 ? (
              <p className="py-14 text-center font-serif italic text-xs text-[#725039]/60 dark:text-stone-600">
                no orders awaiting pickup
              </p>
            ) : (
              readyOrders.map((ticket) => (
                <KitchenTicketCard
                  key={ticket.id}
                  ticket={ticket}
                  onTransition={handleTransition}
                />
              ))
            )}
          </div>
        </div>

        {/* Column 4: COMPLETED */}
        <div className="flex flex-col rounded-3xl border border-[#C9AE8B]/40 dark:border-[#C9AE8B]/20 bg-[#FAF4EB] dark:bg-[#1A1715] p-4 shadow-sm transition-colors duration-200">
          <div className="mb-3 flex items-center justify-between border-b border-[#C9AE8B]/30 dark:border-stone-800 pb-2.5">
            <div className="flex items-center gap-2">
              <span className="h-2.5 w-2.5 rounded-full bg-stone-400 dark:bg-stone-500" />
              <h2 className="font-mono text-xs font-bold uppercase tracking-wider text-[#725039] dark:text-[#C9AE8B]">
                completed
              </h2>
            </div>
            <span className="rounded-full bg-[#F3E7D3] dark:bg-[#241F1C] border border-[#C9AE8B]/40 dark:border-[#C9AE8B]/30 px-2.5 py-0.5 font-mono text-xs font-bold text-[#725039] dark:text-[#C9AE8B]">
              {completedOrders.length}
            </span>
          </div>

          <div className="flex-1 space-y-3 overflow-y-auto pr-1">
            {completedOrders.length === 0 ? (
              <p className="py-14 text-center font-serif italic text-xs text-[#725039]/60 dark:text-stone-600">
                served orders will appear here
              </p>
            ) : (
              completedOrders.map((ticket) => (
                <KitchenTicketCard
                  key={ticket.id}
                  ticket={ticket}
                  onTransition={handleTransition}
                />
              ))
            )}
          </div>
        </div>
      </main>
    </div>
  );
};
