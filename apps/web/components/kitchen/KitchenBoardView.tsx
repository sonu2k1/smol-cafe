"use client";

import React, { useState, useEffect, useCallback, useRef } from "react";
import Image from "next/image";
import type { KitchenTicket } from "@/app/kitchen/actions";
import {
  fetchKitchenOrdersAction,
  transitionOrderStatusAction,
  staffLogoutAction,
} from "@/app/kitchen/actions";
import type { OrderStatus } from "@smol-cafe/db";
import { KitchenTicketCard } from "./KitchenTicketCard";
import { EtaAccuracyReview } from "./EtaAccuracyReview";
import { KitchenMenuManager } from "./KitchenMenuManager";
import { Bell, BellOff, AlertTriangle, RefreshCw, LogOut, Coffee, UtensilsCrossed, RotateCcw, Trash2 } from "lucide-react";
import { useSupabaseRealtime } from "@/hooks/useSupabaseRealtime";
import { broadcastSyncEvent, subscribeToSyncEvents } from "@/lib/sync-events";
import { ThemeToggle } from "@/components/common/ThemeToggle";

interface KitchenBoardViewProps {
  initialOrders: KitchenTicket[];
}

export const KitchenBoardView: React.FC<KitchenBoardViewProps> = ({ initialOrders }) => {
  const [orders, setOrders] = useState<KitchenTicket[]>(initialOrders);
  const [dismissedTicketIds, setDismissedTicketIds] = useState<Set<string>>(new Set());
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [lastRefreshedAt, setLastRefreshedAt] = useState<Date>(new Date());
  const [conflictMessage, setConflictMessage] = useState<string | null>(null);
  const [soundEnabled, setSoundEnabled] = useState(false);
  const [showEtaAnalytics, setShowEtaAnalytics] = useState(false);
  const [currentView, setCurrentView] = useState<"TICKETS" | "MENU_STOCK">("TICKETS");
  const [mounted, setMounted] = useState(false);
  const prevOrderCountRef = useRef(initialOrders.length);
  // Track ongoing optimistic transitions to prevent polling flicker/snap-back
  const optimisticLocksRef = useRef<Map<string, { status: OrderStatus; timestamp: number }>>(new Map());

  useEffect(() => {
    setMounted(true);
    try {
      const saved = sessionStorage.getItem("smol_kds_dismissed_tickets");
      if (saved) {
        setDismissedTicketIds(new Set(JSON.parse(saved)));
      }
    } catch {
      // sessionStorage safe fallback
    }
  }, []);

  const handleDismissTicket = (orderId: string) => {
    setDismissedTicketIds((prev) => {
      const updated = new Set(prev);
      updated.add(orderId);
      try {
        sessionStorage.setItem("smol_kds_dismissed_tickets", JSON.stringify(Array.from(updated)));
      } catch {
        // safe
      }
      return updated;
    });
  };

  const handleClearAllCompleted = () => {
    const completedToDismiss = orders.filter(
      (o) => ["SERVED", "COMPLETED", "CLOSED"].includes(o.status) && !dismissedTicketIds.has(o.id)
    );
    if (completedToDismiss.length === 0) return;

    setDismissedTicketIds((prev) => {
      const updated = new Set(prev);
      completedToDismiss.forEach((o) => updated.add(o.id));
      try {
        sessionStorage.setItem("smol_kds_dismissed_tickets", JSON.stringify(Array.from(updated)));
      } catch {
        // safe
      }
      return updated;
    });
  };

  const handleRestoreDismissed = () => {
    setDismissedTicketIds(new Set());
    try {
      sessionStorage.removeItem("smol_kds_dismissed_tickets");
    } catch {
      // safe
    }
  };

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
      if (result && result.success && Array.isArray(result.orders)) {
        if (result.orders.length > prevOrderCountRef.current) {
          playChime();
        }
        prevOrderCountRef.current = result.orders.length;

        // Clean up expired optimistic locks (> 8000ms)
        const now = Date.now();
        for (const [id, lock] of optimisticLocksRef.current.entries()) {
          if (now - lock.timestamp > 8000) {
            optimisticLocksRef.current.delete(id);
          }
        }

        // Merge server snapshot with any active in-flight optimistic locks
        const mergedOrders = result.orders.map((serverOrder) => {
          const activeLock = optimisticLocksRef.current.get(serverOrder.id);
          if (activeLock) {
            if (serverOrder.status === activeLock.status) {
              // Server status has caught up, release lock
              optimisticLocksRef.current.delete(serverOrder.id);
              return serverOrder;
            }
            // Server hasn't caught up yet, keep the optimistic status so it doesn't flicker/snap back!
            return { ...serverOrder, status: activeLock.status };
          }
          return serverOrder;
        });

        setOrders(mergedOrders);
        setLastRefreshedAt(new Date());
      }
    } catch (err) {
      console.warn("Kitchen orders sync retry scheduled:", err);
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
    // 1. Smart Fallback Polling (6s interval when tab is visible, WebSocket handles instant push)
    const interval = setInterval(() => {
      if (document.visibilityState === "visible") {
        refreshOrders();
      }
    }, 6000);

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
    // 1. Record optimistic lock with timestamp
    optimisticLocksRef.current.set(orderId, { status: toStatus, timestamp: Date.now() });

    // 2. Apply Instant Optimistic Update in UI
    setOrders((prev) =>
      prev.map((o) => (o.id === orderId ? { ...o, status: toStatus } : o))
    );

    // 3. Execute Server Action
    const result = await transitionOrderStatusAction(orderId, fromStatus, toStatus);

    if (result.success) {
      broadcastSyncEvent({
        type: "STATUS_CHANGED",
        orderId,
        status: toStatus,
        timestamp: Date.now(),
      });
    } else {
      // Revert optimistic lock if rejected by server
      optimisticLocksRef.current.delete(orderId);
      if (result.error === "STATUS_MISMATCH") {
        setConflictMessage(result.message || "Order status changed by another device.");
      }
      refreshOrders();
    }
  };

  // Group tickets strictly into 4 columns per specification:
  // Filter out any locally dismissed tickets (keeps data safe on DB and Admin Tower)
  const visibleOrders = orders.filter((o) => !dismissedTicketIds.has(o.id));

  const newOrders = visibleOrders.filter((o) =>
    ["SUBMITTED", "PENDING_CONFIRMATION", "CONFIRMED", "ACCEPTED"].includes(o.status)
  );
  const preparingOrders = visibleOrders.filter((o) => o.status === "PREPARING");
  const readyOrders = visibleOrders.filter((o) => o.status === "READY");
  const completedOrders = visibleOrders.filter((o) =>
    ["SERVED", "COMPLETED", "CLOSED"].includes(o.status)
  );

  return (
    <div className="flex min-h-screen flex-col bg-[#F3E7D3] dark:bg-[#241F1C] text-[#241F1C] dark:text-[#F3E7D3] font-sans transition-colors duration-200">
      {/* Header */}
      <header className="sticky top-0 z-30 border-b border-[#C9AE8B]/40 dark:border-[#C9AE8B]/20 bg-[#FAF4EB]/95 dark:bg-[#1D1815]/95 px-3 sm:px-6 py-2 sm:py-3 backdrop-blur-md transition-colors duration-200">
        <div className="flex items-center justify-between gap-2 sm:gap-4">
          {/* Brand */}
          <div className="flex items-center gap-2 sm:gap-3 shrink-0">
            <div className="relative h-8 w-6 sm:h-10 sm:w-7.5 shrink-0 select-none">
              <Image
                src="/kitchen-logo.png"
                alt="smol café kitchen logo"
                fill
                priority
                className="object-contain drop-shadow-xs dark:hidden block"
              />
              <Image
                src="/kitchen-logo-dark.png"
                alt="smol café kitchen logo night mode"
                fill
                priority
                className="object-contain drop-shadow-[0_0_8px_rgba(168,85,247,0.4)] hidden dark:block"
              />
            </div>
            <div className="shrink-0">
              <div className="flex items-center gap-1.5 sm:gap-2">
                <span className="font-serif text-base sm:text-lg font-bold tracking-tight text-[#241F1C] dark:text-[#F3E7D3] lowercase whitespace-nowrap">
                  smol café
                </span>
                <span className="text-[10px] sm:text-xs text-[#754CFF]">✦</span>
                <span className="rounded-md border border-[#C9AE8B]/40 dark:border-[#C9AE8B]/30 bg-[#F3E7D3] dark:bg-[#241F1C] px-1.5 sm:px-2 py-0.5 font-mono text-[10px] sm:text-[11px] text-[#B72E35] dark:text-[#F2C84B] shrink-0 whitespace-nowrap">
                  kitchen kds
                </span>
              </div>
              <p className="hidden lg:block font-serif italic text-[11px] text-[#725039] dark:text-[#C9AE8B] -mt-0.5 truncate whitespace-nowrap">
                order preparation &amp; ticket dispatch
              </p>
            </div>
          </div>

          {/* Central KDS View Switcher (Desktop XL Only: inline on wide screens) */}
          <div className="hidden xl:flex items-center gap-1 rounded-2xl bg-[#EFE7DC] dark:bg-[#151110] p-1 border border-[#C9AE8B]/30 dark:border-stone-800 shrink-0">
            <button
              onClick={() => setCurrentView("TICKETS")}
              className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl font-mono text-xs font-bold transition cursor-pointer whitespace-nowrap ${
                currentView === "TICKETS"
                  ? "bg-[#B72E35] text-white shadow-xs"
                  : "text-[#725039] dark:text-[#C9AE8B] hover:text-[#241F1C] dark:hover:text-white"
              }`}
            >
              <Coffee className="h-3.5 w-3.5 shrink-0" />
              <span>Live Tickets ({visibleOrders.filter((o) => o.status !== "SERVED").length})</span>
            </button>
            <button
              onClick={() => setCurrentView("MENU_STOCK")}
              className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl font-mono text-xs font-bold transition cursor-pointer whitespace-nowrap ${
                currentView === "MENU_STOCK"
                  ? "bg-[#B72E35] text-white shadow-xs"
                  : "text-[#725039] dark:text-[#C9AE8B] hover:text-[#241F1C] dark:hover:text-white"
              }`}
            >
              <UtensilsCrossed className="h-3.5 w-3.5 shrink-0" />
              <span>Daily Menu &amp; 86</span>
            </button>
          </div>

          {/* Right Action Controls */}
          <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
            {/* Restore Dismissed Tickets Button (only visible if any are dismissed) */}
            {dismissedTicketIds.size > 0 && (
              <button
                onClick={handleRestoreDismissed}
                className="flex items-center gap-1 rounded-full border border-[#C9AE8B]/60 dark:border-stone-700 bg-[#FAF4EB] dark:bg-[#1D1815] px-2.5 py-1 text-xs font-mono text-[#725039] dark:text-[#C9AE8B] hover:text-[#B72E35] hover:border-[#B72E35] transition cursor-pointer shadow-xs whitespace-nowrap"
                title="Restore dismissed tickets back to board"
              >
                <RotateCcw className="h-3 w-3 shrink-0" />
                <span className="hidden sm:inline">restore ({dismissedTicketIds.size})</span>
              </button>
            )}

            {/* Station Load & ETA Analytics Toggle (Desktop XL) */}
            <button
              onClick={() => setShowEtaAnalytics(!showEtaAnalytics)}
              className={`hidden xl:flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-mono transition cursor-pointer whitespace-nowrap ${
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
              className={`flex items-center gap-1 rounded-full border px-2 sm:px-3 py-1 text-xs font-mono transition cursor-pointer whitespace-nowrap ${
                soundEnabled
                  ? "border-[#F2C84B]/60 bg-[#F2C84B]/20 text-[#8C6207] dark:text-[#F2C84B]"
                  : "border-[#C9AE8B]/40 dark:border-[#C9AE8B]/30 bg-[#FAF4EB] dark:bg-[#241F1C] text-[#725039] dark:text-[#C9AE8B] hover:text-[#241F1C] dark:hover:text-[#F3E7D3]"
              }`}
              title={soundEnabled ? "Mute audio alerts" : "Enable audio alerts"}
            >
              {soundEnabled ? (
                <>
                  <Bell className="h-3.5 w-3.5 text-[#8C6207] dark:text-[#F2C84B] shrink-0" />
                  <span className="hidden sm:inline">chime on</span>
                </>
              ) : (
                <>
                  <BellOff className="h-3.5 w-3.5 shrink-0" />
                  <span className="hidden sm:inline">chime off</span>
                </>
              )}
            </button>

            {/* Live Polling Indicator */}
            <div className="flex items-center gap-1.5 sm:gap-2 rounded-full border border-[#C9AE8B]/40 dark:border-[#C9AE8B]/30 bg-[#FAF4EB] dark:bg-[#241F1C] px-2 sm:px-3 py-1 text-xs font-mono text-[#725039] dark:text-[#C9AE8B] whitespace-nowrap">
              <span
                className={`h-2 w-2 rounded-full bg-[#75AFA7] shrink-0 ${
                  isRefreshing ? "scale-125 opacity-70" : "animate-pulse"
                }`}
              />
              <span className="hidden sm:inline" suppressHydrationWarning>
                live · {mounted ? lastRefreshedAt.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" }) : "--:--:--"}
              </span>
            </div>

            {/* Manual Sync Button */}
            <button
              onClick={refreshOrders}
              className="flex h-7.5 w-7.5 sm:h-8 sm:w-8 items-center justify-center rounded-full border border-[#C9AE8B]/40 dark:border-[#C9AE8B]/30 bg-[#FAF4EB] dark:bg-[#241F1C] text-[#725039] dark:text-[#C9AE8B] hover:text-[#241F1C] dark:hover:text-[#F3E7D3] transition cursor-pointer shrink-0"
              title="Refresh tickets"
            >
              <RefreshCw className={`h-3.5 w-3.5 shrink-0 ${isRefreshing ? "animate-spin" : ""}`} />
            </button>

            {/* Theme Toggle (Light / Dark Mode) */}
            <div className="shrink-0">
              <ThemeToggle />
            </div>

            {/* Logout */}
            <button
              onClick={async () => {
                await staffLogoutAction();
                window.location.reload();
              }}
              className="flex h-7.5 w-7.5 sm:h-auto sm:w-auto items-center justify-center gap-1 rounded-full border border-[#C9AE8B]/40 dark:border-[#C9AE8B]/30 bg-[#FAF4EB] dark:bg-[#241F1C] sm:px-3 sm:py-1 text-xs font-mono text-[#725039] dark:text-[#C9AE8B] hover:text-[#B72E35] transition cursor-pointer shrink-0 whitespace-nowrap"
              title="Logout"
            >
              <LogOut className="h-3.5 w-3.5 shrink-0" />
              <span className="hidden sm:inline">logout</span>
            </button>
          </div>
        </div>

        {/* Tablet & Mobile View Switcher Row (< xl screens, including iPads / tablets) */}
        <div className="xl:hidden flex items-center justify-between gap-2 pt-2 border-t border-[#C9AE8B]/20 dark:border-stone-800/60 mt-2">
          <div className="flex flex-1 items-center gap-1 rounded-xl bg-[#EFE7DC] dark:bg-[#151110] p-1 border border-[#C9AE8B]/30 dark:border-stone-800">
            <button
              onClick={() => setCurrentView("TICKETS")}
              className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 px-2 rounded-lg font-mono text-xs font-bold transition cursor-pointer whitespace-nowrap ${
                currentView === "TICKETS"
                  ? "bg-[#B72E35] text-white shadow-xs"
                  : "text-[#725039] dark:text-[#C9AE8B] hover:text-[#241F1C] dark:hover:text-white"
              }`}
            >
              <Coffee className="h-3.5 w-3.5 shrink-0" />
              <span>Live Tickets ({orders.filter((o) => o.status !== "SERVED").length})</span>
            </button>
            <button
              onClick={() => setCurrentView("MENU_STOCK")}
              className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 px-2 rounded-lg font-mono text-xs font-bold transition cursor-pointer whitespace-nowrap ${
                currentView === "MENU_STOCK"
                  ? "bg-[#B72E35] text-white shadow-xs"
                  : "text-[#725039] dark:text-[#C9AE8B] hover:text-[#241F1C] dark:hover:text-white"
              }`}
            >
              <UtensilsCrossed className="h-3.5 w-3.5 shrink-0" />
              <span>Daily Menu &amp; 86</span>
            </button>
          </div>

          <button
            onClick={() => setShowEtaAnalytics(!showEtaAnalytics)}
            className={`flex items-center gap-1 rounded-xl border px-3 py-1.5 text-xs font-mono transition cursor-pointer shrink-0 whitespace-nowrap ${
              showEtaAnalytics
                ? "border-[#B72E35] bg-[#B72E35]/15 text-[#B72E35] dark:text-[#F2C84B]"
                : "border-[#C9AE8B]/40 dark:border-[#C9AE8B]/30 bg-[#FAF4EB] dark:bg-[#241F1C] text-[#725039] dark:text-[#C9AE8B]"
            }`}
            title="Toggle Station Load"
          >
            <span>⏱ ETA Load</span>
          </button>
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

      {currentView === "MENU_STOCK" ? (
        <main className="flex-1 min-w-0">
          <KitchenMenuManager />
        </main>
      ) : (
        /* Kanban Board 4 Columns: NEW -> PREPARING -> READY -> COMPLETED */
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
                  onDismiss={handleDismissTicket}
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
                  onDismiss={handleDismissTicket}
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
                  onDismiss={handleDismissTicket}
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
            <div className="flex items-center gap-1.5">
              {completedOrders.length > 0 && (
                <button
                  type="button"
                  onClick={handleClearAllCompleted}
                  className="flex items-center gap-1 rounded-full border border-[#C9AE8B]/60 dark:border-stone-700 bg-[#F3E7D3] dark:bg-[#241F1C] px-2 py-0.5 font-mono text-[10px] font-bold text-[#725039] dark:text-[#C9AE8B] hover:text-[#B72E35] dark:hover:text-[#F2C84B] hover:border-[#B72E35] transition active:scale-95 cursor-pointer shadow-2xs"
                  title="Clear all completed tickets from view"
                >
                  <Trash2 className="h-2.5 w-2.5" />
                  <span>Clear All</span>
                </button>
              )}
              <span className="rounded-full bg-[#F3E7D3] dark:bg-[#241F1C] border border-[#C9AE8B]/40 dark:border-[#C9AE8B]/30 px-2.5 py-0.5 font-mono text-xs font-bold text-[#725039] dark:text-[#C9AE8B]">
                {completedOrders.length}
              </span>
            </div>
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
                  onDismiss={handleDismissTicket}
                />
              ))
            )}
          </div>
        </div>
      </main>
      )}
    </div>
  );
};
