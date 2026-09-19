"use client";

import React, { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import Image from "next/image";
import type { ActiveCashierTable } from "@/app/bill/actions";
import {
  fetchActiveCashierTablesAction,
  recordCashPaymentAction,
  openTableSessionAction,
} from "@/app/bill/actions";
import {
  fetchPendingCashierOrdersAction,
  confirmCashierOrderAction,
  rejectCashierOrderAction,
  fetchPaidCashierHistoryAction,
  type PendingOrderVerification,
  type PaidHistoryRecord,
} from "@/app/cashier/actions";
import { Bell, Armchair, Sparkles, Check, Receipt, CreditCard, Tag, Printer, RefreshCw } from "lucide-react";
import { useSupabaseRealtime } from "@/hooks/useSupabaseRealtime";
import { broadcastSyncEvent, subscribeToSyncEvents } from "@/lib/sync-events";
import { createTableJsonTag, type TableJsonTag } from "@/lib/table-tag";
import { JsonTagInspectorModal } from "@/components/table/JsonTagInspectorModal";
import { UpiPaymentDrawer } from "@/components/payment/UpiPaymentDrawer";
import { DigitalReceiptModal, type ReceiptData } from "@/components/payment/DigitalReceiptModal";
import { ThemeToggle } from "@/components/common/ThemeToggle";

interface CashierDashboardProps {
  initialTables: ActiveCashierTable[];
  initialPendingOrders?: PendingOrderVerification[];
  initialPaidHistory?: PaidHistoryRecord[];
}

export const CashierDashboard: React.FC<CashierDashboardProps> = ({
  initialTables,
  initialPendingOrders = [],
  initialPaidHistory = [],
}) => {
  const [activeTab, setActiveTab] = useState<"queue" | "tables" | "paid">("paid");
  const [tables, setTables] = useState<ActiveCashierTable[]>(initialTables);
  const [pendingOrders, setPendingOrders] = useState<PendingOrderVerification[]>(initialPendingOrders);
  const [paidHistory, setPaidHistory] = useState<PaidHistoryRecord[]>(initialPaidHistory);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [selectedTable, setSelectedTable] = useState<ActiveCashierTable | null>(null);
  const [inspectingTag, setInspectingTag] = useState<TableJsonTag | null>(null);
  const [activeUpiTable, setActiveUpiTable] = useState<ActiveCashierTable | null>(null);
  const [activeReceipt, setActiveReceipt] = useState<ReceiptData | null>(null);
  const [amountTendered, setAmountTendered] = useState("");
  const [staffName, setStaffName] = useState("Cashier");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [actionFeedback, setActionFeedback] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);
  const [resultMessage, setResultMessage] = useState<{
    type: "success" | "error";
    text: string;
    changeRupees?: number;
  } | null>(null);

  const refreshData = useCallback(async () => {
    setIsRefreshing(true);
    try {
      const [tableData, pendingData, paidData] = await Promise.all([
        fetchActiveCashierTablesAction(),
        fetchPendingCashierOrdersAction(),
        fetchPaidCashierHistoryAction(),
      ]);
      setTables(tableData);
      if (pendingData.success) {
        setPendingOrders(pendingData.orders);
      }
      if (paidData.success) {
        setPaidHistory(paidData.records);
      }
    } catch (err) {
      console.error("Failed to refresh cashier data:", err);
    } finally {
      setIsRefreshing(false);
    }
  }, []);

  // Supabase Real-time subscriptions for cross-device live updates
  useSupabaseRealtime({ table: "orders", onData: () => refreshData() });
  useSupabaseRealtime({ table: "table_sessions", onData: () => refreshData() });
  useSupabaseRealtime({ table: "bills", onData: () => refreshData() });

  const handleOpenTableForGuest = async (label: string) => {
    await openTableSessionAction(label);
    refreshData();
  };

  // Poll pending orders and tables every 3 seconds + real-time event listener + window focus revalidation
  useEffect(() => {
    refreshData();

    const handleFocus = () => refreshData();
    window.addEventListener("focus", handleFocus);

    // Smart fallback polling: 7s when tab is active (Realtime sync events handle instant push)
    const interval = setInterval(() => {
      if (document.visibilityState === "visible") {
        refreshData();
      }
    }, 7000);

    const unsubscribe = subscribeToSyncEvents(() => {
      refreshData();
    });

    return () => {
      clearInterval(interval);
      window.removeEventListener("focus", handleFocus);
      unsubscribe();
    };
  }, [refreshData]);

  const handleConfirmOrder = async (orderId: string) => {
    setIsSubmitting(true);
    setActionFeedback(null);
    try {
      const res = await confirmCashierOrderAction(orderId, staffName);
      if (res.success) {
        broadcastSyncEvent({
          type: "ORDER_CONFIRMED",
          orderId,
          timestamp: Date.now(),
        });
        setActionFeedback({ type: "success", text: res.message || "Order confirmed & sent to kitchen!" });
        refreshData();
      } else {
        setActionFeedback({ type: "error", text: res.message || "Failed to confirm order." });
      }
    } catch {
      setActionFeedback({ type: "error", text: "Network error confirming order." });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRejectOrder = async (orderId: string) => {
    const reason = prompt("Enter reason for order cancellation/rejection:", "Customer requested cancellation");
    if (!reason) return;

    setIsSubmitting(true);
    setActionFeedback(null);
    try {
      const res = await rejectCashierOrderAction(orderId, reason, staffName);
      if (res.success) {
        setActionFeedback({ type: "success", text: res.message || "Order rejected." });
        refreshData();
      } else {
        setActionFeedback({ type: "error", text: res.message || "Failed to reject order." });
      }
    } catch {
      setActionFeedback({ type: "error", text: "Network error rejecting order." });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleOpenSettlement = (table: ActiveCashierTable) => {
    setSelectedTable(table);
    setAmountTendered(String(Math.round(table.totalPaise / 100)));
    setResultMessage(null);
  };

  const handleRecordPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTable || isSubmitting) return;

    const tenderedPaise = Math.round(parseFloat(amountTendered) * 100);
    if (isNaN(tenderedPaise) || tenderedPaise < selectedTable.totalPaise) {
      setResultMessage({
        type: "error",
        text: "Tendered amount cannot be less than the total bill amount.",
      });
      return;
    }

    setIsSubmitting(true);
    setResultMessage(null);

    try {
      const res = await recordCashPaymentAction(selectedTable.sessionId, tenderedPaise, staffName);

      if (res.success) {
        const change = Math.round((res.changePaise || 0) / 100);
        setResultMessage({
          type: "success",
          text: `Table ${selectedTable.tableLabel} settled successfully!`,
          changeRupees: change,
        });
        refreshData();
      } else {
        setResultMessage({
          type: "error",
          text: res.message || "Failed to record cash payment.",
        });
      }
    } catch {
      setResultMessage({
        type: "error",
        text: "An unexpected error occurred during cash settlement.",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const selectedTotalRupees = selectedTable ? Math.round(selectedTable.totalPaise / 100) : 0;
  const tenderedRupees = parseFloat(amountTendered) || 0;
  const changeDueRupees = Math.max(0, tenderedRupees - selectedTotalRupees);

  return (
    <div className="min-h-screen bg-[#F3E7D3] dark:bg-[#141211] text-[#241F1C] dark:text-[#FDFBF7] transition-colors duration-200">
      {/* Header */}
      {/* Header */}
      <header className="sticky top-0 z-30 border-b border-[#C9AE8B]/40 dark:border-stone-800 bg-[#FAF4EB]/95 dark:bg-[#1C1917]/95 px-3 sm:px-6 py-2.5 sm:py-3.5 backdrop-blur-md transition-colors duration-200">
        <div className="mx-auto flex max-w-5xl items-center justify-between gap-2">
          {/* Brand Left */}
          <div className="flex items-center gap-2 sm:gap-3 min-w-0">
            <Link
              href="/smol-backdoor"
              className="flex h-8 w-8 sm:h-9 sm:w-9 items-center justify-center rounded-xl border border-[#C9AE8B]/40 dark:border-stone-800 bg-[#F3E7D3] dark:bg-stone-800 text-[#725039] dark:text-stone-300 hover:bg-[#EBDDC8] dark:hover:bg-stone-700 transition cursor-pointer shrink-0"
              title="Back to staff portal"
            >
              ←
            </Link>
            <div className="relative h-9 w-7 sm:h-11 sm:w-8 shrink-0 select-none">
              <Image
                src="/cashier-logo.png"
                alt="smol café cashier logo"
                fill
                priority
                className="object-contain drop-shadow-xs dark:hidden block"
              />
              <Image
                src="/cashier-logo-dark.png"
                alt="smol café cashier logo night mode"
                fill
                priority
                className="object-contain drop-shadow-[0_0_8px_rgba(168,85,247,0.4)] hidden dark:block"
              />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-1.5 flex-wrap">
                <span className="text-base sm:text-xl font-black tracking-tight text-[#B72E35] dark:text-[#F6AD55] truncate">
                  smol café • Cashier Desk
                </span>
                <span className="hidden sm:inline rounded-md border border-[#C9AE8B]/30 dark:border-stone-700 bg-[#F3E7D3] dark:bg-stone-800 px-2 py-0.5 font-mono text-[10px] text-[#725039] dark:text-stone-400 shrink-0">
                  Front-Desk Queue &amp; POS
                </span>
              </div>
              <p className="sm:hidden font-mono text-[10px] text-[#725039] dark:text-stone-400 truncate">
                Front-Desk Queue &amp; POS
              </p>
            </div>
          </div>

          {/* Controls Right */}
          <div className="flex items-center gap-1.5 sm:gap-3 shrink-0">
            <button
              type="button"
              onClick={() => refreshData()}
              disabled={isRefreshing}
              className="flex items-center gap-1.5 rounded-xl border border-[#C9AE8B]/40 dark:border-stone-800 bg-[#FAF4EB] dark:bg-stone-900 px-2.5 py-1 text-xs font-mono text-[#725039] dark:text-stone-400 hover:bg-[#F3E7D3] dark:hover:bg-stone-800 active:scale-95 transition cursor-pointer"
              title="Refresh Queue & Tables"
            >
              <RefreshCw className={`h-3.5 w-3.5 text-[#B72E35] dark:text-[#F6AD55] ${isRefreshing ? "animate-spin" : ""}`} />
              <span className="hidden sm:inline">Sync</span>
            </button>
            <span className="flex items-center gap-1 sm:gap-1.5 rounded-full border border-[#C9AE8B]/40 dark:border-stone-800 bg-[#FAF4EB] dark:bg-stone-900 px-2 sm:px-3 py-1 text-[11px] sm:text-xs font-mono text-[#725039] dark:text-stone-400">
              <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
              <span className="hidden sm:inline">Live 3s</span>
            </span>
            <Link
              href="/smol-backdoor"
              className="hidden sm:inline rounded-xl border border-[#C9AE8B]/40 dark:border-stone-800 bg-[#FAF4EB] dark:bg-stone-900 px-3 py-1 text-xs font-mono text-[#725039] dark:text-stone-400 hover:bg-[#F3E7D3] dark:hover:bg-stone-800 transition"
            >
              Role Portal
            </Link>

            {/* Theme Toggle Button */}
            <ThemeToggle />
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="mx-auto max-w-5xl p-4 sm:p-6 space-y-4 sm:space-y-6">
        {actionFeedback && (
          <div
            className={`rounded-2xl p-4 text-xs font-serif ${
              actionFeedback.type === "error"
                ? "bg-rose-100 dark:bg-rose-950/50 text-rose-800 dark:text-rose-300 border border-rose-300 dark:border-rose-900/60"
                : "bg-emerald-100 dark:bg-emerald-950/50 text-emerald-800 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-900/60"
            }`}
          >
            {actionFeedback.text}
          </div>
        )}

        {/* Tab Switcher */}
        <div className="flex items-center gap-1.5 sm:gap-2 border-b border-[#C9AE8B]/30 dark:border-stone-800 pb-2.5 overflow-x-auto scrollbar-none">
          {/* Order Confirmation Queue & Tables tabs temporarily commented out */}
          {/*
          <button
            type="button"
            onClick={() => setActiveTab("queue")}
            className={`flex shrink-0 items-center gap-1.5 sm:gap-2 rounded-xl sm:rounded-2xl px-3.5 sm:px-5 py-2 sm:py-2.5 text-xs font-bold transition-all cursor-pointer ${
              activeTab === "queue"
                ? "bg-[#B72E35] text-white shadow-md font-extrabold"
                : "bg-[#FAF4EB] dark:bg-stone-900 border border-[#C9AE8B]/40 dark:border-stone-800 text-[#725039] dark:text-stone-400 hover:bg-[#F3E7D3] dark:hover:bg-stone-800"
            }`}
          >
            <Bell className="h-4 w-4 shrink-0 text-[#8C6207] dark:text-[#F6AD55]" />
            <span className="hidden sm:inline">Order Confirmation Queue</span>
            <span className="sm:hidden">Order Queue</span>
            {pendingOrders.length > 0 && (
              <span className="rounded-full bg-white px-1.5 sm:px-2 py-0.2 text-[10px] font-black text-[#B72E35] animate-bounce">
                {pendingOrders.length}
              </span>
            )}
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("tables")}
            className={`flex shrink-0 items-center gap-1.5 sm:gap-2 rounded-xl sm:rounded-2xl px-3.5 sm:px-5 py-2 sm:py-2.5 text-xs font-bold transition-all cursor-pointer ${
              activeTab === "tables"
                ? "bg-[#F2C84B] text-[#241F1C] shadow-md font-extrabold"
                : "bg-[#FAF4EB] dark:bg-stone-900 border border-[#C9AE8B]/40 dark:border-stone-800 text-[#725039] dark:text-stone-400 hover:bg-[#F3E7D3] dark:hover:bg-stone-800"
            }`}
          >
            <Armchair className="h-4 w-4 shrink-0 text-[#8C6207] dark:text-amber-400" />
            <span className="hidden sm:inline">Tables &amp; Settlement</span>
            <span className="sm:hidden">Tables</span>
            <span className="rounded-full bg-[#F3E7D3] dark:bg-stone-800 px-1.5 sm:px-2 py-0.2 text-[10px] font-mono text-[#725039] dark:text-stone-300">
              {tables.length}
            </span>
          </button>
          */}

          <button
            type="button"
            onClick={() => setActiveTab("paid")}
            className={`flex shrink-0 items-center gap-1.5 sm:gap-2 rounded-xl sm:rounded-2xl px-3.5 sm:px-5 py-2 sm:py-2.5 text-xs font-bold transition-all cursor-pointer ${
              activeTab === "paid"
                ? "bg-[#75AFA7] text-white shadow-md font-extrabold"
                : "bg-[#FAF4EB] dark:bg-stone-900 border border-[#C9AE8B]/40 dark:border-stone-800 text-[#725039] dark:text-stone-400 hover:bg-[#F3E7D3] dark:hover:bg-stone-800"
            }`}
          >
            <Receipt className="h-4 w-4 shrink-0 text-[#245850] dark:text-emerald-400" />
            <span className="hidden sm:inline">Paid Orders</span>
            <span className="sm:hidden">Paid History</span>
            <span className="rounded-full bg-[#F3E7D3] dark:bg-stone-800 px-1.5 sm:px-2 py-0.2 text-[10px] font-mono text-[#725039] dark:text-stone-300">
              {paidHistory.length}
            </span>
          </button>
        </div>

        {/* TAB 1 & TAB 2 TEMPORARILY COMMENTED OUT */}
        {/*
        {activeTab === "queue" && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-xl font-extrabold tracking-tight text-[#241F1C] dark:text-[#FDFBF7]">
                  Incoming Order Confirmation Queue
                </h1>
                <p className="text-xs text-[#725039] dark:text-stone-400">
                  Verify customer Table PIN &amp; confirm before pushing ticket to Kitchen KDS
                </p>
              </div>
              <span className="rounded-full bg-[#B72E35]/10 dark:bg-[#B72E35]/20 border border-[#B72E35]/30 dark:border-[#B72E35]/50 px-3 py-1 font-mono text-xs font-bold text-[#B72E35] dark:text-[#F2C84B]">
                {pendingOrders.length} Awaiting Verification
              </span>
            </div>

            {pendingOrders.length === 0 ? (
              <div className="rounded-3xl border border-[#C9AE8B]/40 dark:border-stone-800 bg-[#FAF4EB] dark:bg-[#1A1715] p-12 text-center text-[#725039] dark:text-stone-500 space-y-2 shadow-xs transition-colors">
                <Sparkles className="h-8 w-8 text-amber-500 mx-auto" />
                <p className="text-sm font-bold text-[#241F1C] dark:text-stone-200">No pending orders in queue</p>
                <p className="text-xs text-[#8C6D53] dark:text-stone-500">
                  All customer orders have been confirmed and sent to kitchen preparation.
                </p>
              </div>
            ) : (
              <div className="grid gap-4 sm:grid-cols-2">
                {pendingOrders.map((order) => (
                  <div
                    key={order.id}
                    className="relative flex flex-col justify-between rounded-3xl border-2 border-[#F2C84B] dark:border-amber-500/60 bg-[#FAF4EB] dark:bg-[#1A1715] p-5 shadow-lg space-y-4 animate-scale-in transition-colors"
                  >
                    <div>
                      <div className="flex items-center justify-between border-b border-[#C9AE8B]/30 dark:border-stone-800 pb-2.5">
                        <div className="flex items-center gap-2">
                          <span className="h-2.5 w-2.5 rounded-full bg-[#B72E35] animate-pulse" />
                          <span className="font-mono text-xs font-black uppercase tracking-wider text-[#B72E35] dark:text-[#F2C84B]">
                            NEW ORDER
                          </span>
                        </div>
                        <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 dark:bg-emerald-950/80 border border-emerald-300 dark:border-emerald-700/60 px-2.5 py-0.5 font-mono text-[11px] font-extrabold text-emerald-800 dark:text-emerald-300">
                          <Check className="h-3 w-3" />
                          Payment: {order.paymentStatus || "PAID"}
                        </span>
                      </div>

                      <div className="flex items-start justify-between pt-2.5 pb-2">
                        <div>
                          <h2 className="font-mono text-2xl font-black text-[#241F1C] dark:text-white">
                            Table {order.tableLabel}
                          </h2>
                          <p className="font-mono text-xs text-[#725039] dark:text-stone-400">
                            Order #{order.orderNo} • {new Date(order.submittedAt || Date.now()).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                          </p>
                        </div>

                        <div className="rounded-2xl border border-[#C9AE8B]/40 dark:border-stone-700 bg-[#F3E7D3]/70 dark:bg-stone-800/80 px-3 py-1 text-right">
                          <span className="block font-mono text-[8.5px] uppercase font-bold text-[#725039] dark:text-stone-400 tracking-wider">
                            PIN
                          </span>
                          <span className="font-mono text-lg font-black text-[#241F1C] dark:text-white">
                            {order.verificationCode}
                          </span>
                        </div>
                      </div>

                      {order.instructions && (
                        <div className="mt-1 rounded-xl border border-amber-300 dark:border-amber-800/40 bg-amber-50 dark:bg-amber-950/20 p-2 text-xs text-amber-900 dark:text-amber-300 font-serif italic">
                          &quot;{order.instructions}&quot;
                        </div>
                      )}

                      <div className="mt-2 space-y-1.5 font-sans text-xs divide-y divide-[#C9AE8B]/20 dark:divide-stone-800/60">
                        {order.items.map((item) => (
                          <div key={item.id} className="pt-1.5 flex items-center justify-between">
                            <span className="font-medium text-[#241F1C] dark:text-stone-200">
                              <strong className="font-mono text-[#B72E35] dark:text-[#F6AD55]">{item.qty}×</strong> {item.name}
                            </span>
                            <span className="font-mono text-[#725039] dark:text-stone-400">
                              ₹{Math.round(item.lineSubtotal / 100)}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>

                    <div className="border-t border-[#C9AE8B]/30 dark:border-stone-800 pt-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
                      <div>
                        <span className="block font-mono text-[9px] uppercase font-bold text-[#8C6D53] dark:text-stone-500">
                          ORDER TOTAL (PAID)
                        </span>
                        <span className="font-mono text-xl font-black text-emerald-600 dark:text-emerald-400">
                          ₹{Math.round(order.totalPaise / 100)}
                        </span>
                      </div>

                      <div className="flex gap-2">
                        <button
                          type="button"
                          disabled={isSubmitting}
                          onClick={() => handleRejectOrder(order.id)}
                          className="flex-1 sm:flex-none rounded-xl border border-rose-300 dark:border-rose-900/60 bg-rose-50 dark:bg-rose-950/30 px-3 py-2 text-xs font-bold text-rose-800 dark:text-rose-300 hover:bg-rose-100 dark:hover:bg-rose-900/40 transition active:scale-95 disabled:opacity-50 cursor-pointer text-center"
                        >
                          Reject
                        </button>
                        <button
                          type="button"
                          disabled={isSubmitting}
                          onClick={() => handleConfirmOrder(order.id)}
                          className="flex-2 sm:flex-none flex items-center justify-center gap-1.5 rounded-xl bg-emerald-600 px-4 py-2 text-xs font-bold text-white shadow-md hover:bg-emerald-500 active:scale-95 transition disabled:opacity-50 cursor-pointer text-center"
                        >
                          <Check className="h-4 w-4" />
                          <span>Pushed to Kitchen</span>
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {activeTab === "tables" && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-xl font-extrabold tracking-tight">Active Dining Tables</h1>
                <p className="text-xs text-stone-400">
                  Select a table to record cash settlement &amp; close session
                </p>
              </div>
              <span className="rounded-full bg-[#F3E7D3] dark:bg-stone-800 border border-[#C9AE8B]/40 dark:border-stone-700 px-3 py-1 font-mono text-xs font-bold text-[#725039] dark:text-stone-300">
                {tables.length} {tables.length === 1 ? "Active Table" : "Active Tables"}
              </span>
            </div>

            {tables.length === 0 ? (
              <div className="rounded-3xl border border-[#C9AE8B]/40 dark:border-stone-800 bg-[#FAF4EB] dark:bg-[#1A1715] p-8 text-center text-[#725039] dark:text-stone-400 space-y-4 shadow-xs transition-colors">
                <Armchair className="h-8 w-8 text-[#8C6D53] dark:text-stone-500 mx-auto" />
                <p className="text-sm font-bold text-[#241F1C] dark:text-stone-200">No open table sessions</p>
                <p className="text-xs text-[#8C6D53] dark:text-stone-500 max-w-sm mx-auto">
                  All tables are currently settled. Open a table for walk-in guests:
                </p>
                <div className="flex flex-wrap justify-center gap-2 pt-2">
                  {["01", "02", "03", "04", "05", "06"].map((num) => (
                    <button
                      key={num}
                      type="button"
                      onClick={() => handleOpenTableForGuest(num)}
                      className="rounded-xl border border-[#C9AE8B]/40 dark:border-stone-700 bg-[#FAF4EB] dark:bg-stone-900 px-4 py-2 font-mono text-xs font-bold text-[#8C6207] dark:text-[#F6AD55] hover:bg-[#F3E7D3] dark:hover:bg-stone-800 active:scale-95 transition cursor-pointer"
                    >
                      + Open Table {num}
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {tables.map((table) => {
                  const isRequested = table.sessionStatus === "PAYMENT_PENDING";
                  const totalRupees = Math.round(table.totalPaise / 100);

                  return (
                    <div
                      key={table.sessionId}
                      onClick={() => handleOpenSettlement(table)}
                      role="button"
                      tabIndex={0}
                      className={`group relative flex flex-col justify-between rounded-3xl border-2 p-5 text-left transition-all hover:scale-[1.01] hover:shadow-xl active:scale-[0.99] cursor-pointer ${
                        isRequested
                          ? "border-[#F2C84B] bg-[#FDF8E7] dark:border-amber-500/80 dark:bg-amber-950/30"
                          : "border-[#C9AE8B]/40 dark:border-stone-800 bg-[#FAF4EB] dark:bg-[#1A1715] hover:border-[#B72E35]/40 dark:hover:border-stone-700"
                      }`}
                    >
                      <div>
                        <div className="flex items-center justify-between">
                          <h2 className="text-2xl font-black font-mono tracking-tight text-[#241F1C] dark:text-white group-hover:text-[#B72E35] dark:group-hover:text-[#F6AD55]">
                            Table {table.tableLabel}
                          </h2>
                          {isRequested ? (
                            <span className="flex items-center gap-1 rounded-full border border-amber-300 dark:border-amber-500/80 bg-amber-100 dark:bg-amber-500/20 px-2.5 py-0.5 text-xs font-bold text-amber-900 dark:text-amber-300 animate-pulse">
                              <Receipt className="h-3.5 w-3.5" /> Bill Requested
                            </span>
                          ) : (
                            <span className="rounded-full bg-[#F3E7D3] dark:bg-stone-800 border border-[#C9AE8B]/30 dark:border-transparent px-2.5 py-0.5 text-xs font-semibold text-[#725039] dark:text-stone-400">
                              Dining Active
                            </span>
                          )}
                        </div>

                        <p className="mt-2 text-xs text-[#725039] dark:text-stone-400">
                          {table.orderCount} {table.orderCount === 1 ? "order round" : "order rounds"}
                        </p>
                      </div>

                      <div className="mt-6 flex flex-col gap-2 border-t border-[#C9AE8B]/30 dark:border-stone-800/80 pt-4">
                        <div className="flex items-baseline justify-between">
                          <div>
                            <span className="text-[10px] uppercase font-bold text-[#8C6D53] dark:text-stone-500">
                              Bill Total
                            </span>
                            <p className="font-mono text-xl font-black text-[#B72E35] dark:text-[#F6AD55]">₹{totalRupees}</p>
                          </div>

                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setInspectingTag(createTableJsonTag(table.tableLabel));
                            }}
                            className="inline-flex items-center gap-1 rounded-lg border border-[#C9AE8B]/40 dark:border-stone-700 bg-[#F3E7D3] dark:bg-stone-800 px-2 py-1 text-[10px] font-mono text-[#725039] dark:text-stone-300 hover:bg-[#EBDDC8] dark:hover:bg-stone-700 transition cursor-pointer"
                            title="Inspect JSON Tag"
                          >
                            <Tag className="h-3 w-3 text-[#B72E35] dark:text-[#F2C84B]" />
                            <span>JSON Tag</span>
                          </button>
                        </div>

                        <div className="grid grid-cols-2 gap-2 pt-1">
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setActiveUpiTable(table);
                            }}
                            className="flex items-center justify-center gap-1 rounded-xl border border-[#C9AE8B]/40 dark:border-stone-700 bg-[#FAF4EB] dark:bg-stone-900 py-2 text-xs font-bold text-[#8C6207] dark:text-[#F2C84B] hover:bg-[#F3E7D3] dark:hover:bg-stone-800 transition cursor-pointer"
                          >
                            <CreditCard className="h-3.5 w-3.5" />
                            <span>UPI QR</span>
                          </button>

                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleOpenSettlement(table);
                            }}
                            className="rounded-xl bg-[#B72E35] py-2 text-xs font-bold text-white shadow-sm transition hover:bg-[#9B242A] cursor-pointer"
                          >
                            Settle Cash →
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}
        */}

        {/* TAB 3: PAID ORDERS & SETTLEMENT AUDIT */}
        {activeTab === "paid" && (
          <div className="space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
              <div>
                <h1 className="text-xl font-extrabold tracking-tight text-[#241F1C] dark:text-white">Today&apos;s Paid Orders &amp; Audit Log</h1>
                <p className="text-xs text-[#725039] dark:text-stone-400">
                  Closed table chits and completed payment transactions
                </p>
              </div>
              <div className="self-start sm:self-auto">
                <span className="inline-flex items-center rounded-full bg-emerald-100 dark:bg-emerald-950/80 border border-emerald-300 dark:border-emerald-800/60 px-3 py-1 font-mono text-xs font-bold text-emerald-800 dark:text-emerald-400 shadow-xs">
                  Total: ₹{paidHistory.reduce((acc, p) => acc + p.totalRupees, 0)}
                </span>
              </div>
            </div>

            {paidHistory.length === 0 ? (
              <div className="rounded-3xl border border-[#C9AE8B]/40 dark:border-stone-800 bg-[#FAF4EB] dark:bg-[#1A1715] p-8 text-center text-[#725039] dark:text-stone-400 space-y-3 shadow-xs transition-colors">
                <Receipt className="h-8 w-8 text-[#8C6D53] dark:text-stone-500 mx-auto" />
                <p className="text-sm font-bold text-[#241F1C] dark:text-stone-200">No settled orders yet today</p>
                <p className="text-xs text-[#8C6D53] dark:text-stone-500 max-w-sm mx-auto">
                  Completed orders and cash settlements will appear here as audit logs.
                </p>
              </div>
            ) : (
              <>
                {/* Mobile View: Responsive Cards (< sm) */}
                <div className="space-y-3 sm:hidden">
                  {paidHistory.map((rec) => (
                    <div
                      key={rec.id}
                      className="rounded-2xl border border-[#C9AE8B]/40 dark:border-stone-800 bg-[#FAF4EB] dark:bg-[#1A1715] p-4 shadow-xs transition-colors space-y-3"
                    >
                      {/* Top Row: Settlement ID, Table, and Payment Method */}
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-xs font-bold text-[#241F1C] dark:text-stone-200 bg-[#F3E7D3] dark:bg-stone-800 px-2 py-0.5 rounded-md border border-[#C9AE8B]/30 dark:border-stone-700">
                            {rec.id}
                          </span>
                          <span className="font-mono text-xs font-bold text-[#8C6207] dark:text-[#F6AD55]">
                            Table {rec.tableLabel}
                          </span>
                        </div>
                        {rec.paymentMethod === "UPI" ? (
                          <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md bg-white dark:bg-stone-800 border border-[#C9AE8B]/40 dark:border-stone-700 shadow-2xs">
                            <Image
                              src="/upi-logo-trimmed.png"
                              alt="UPI"
                              width={32}
                              height={12}
                              className="h-3 w-auto object-contain dark:hidden"
                            />
                            <Image
                              src="/upi-logo-dark.png"
                              alt="UPI"
                              width={32}
                              height={12}
                              className="h-3 w-auto object-contain hidden dark:block"
                            />
                          </span>
                        ) : rec.paymentMethod === "CARD" ? (
                          <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md bg-white dark:bg-stone-800 border border-[#C9AE8B]/40 dark:border-stone-700 shadow-2xs font-mono text-[10px] font-bold text-stone-800 dark:text-stone-200">
                            <Image
                              src="/icon_card_hd.png"
                              alt="Card"
                              width={16}
                              height={16}
                              className="h-3.5 w-auto object-contain drop-shadow-2xs"
                            />
                            <span>CARD</span>
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-amber-100 dark:bg-amber-950 text-amber-800 dark:text-amber-300 border border-amber-300 dark:border-amber-800/50">
                            {rec.paymentMethod}
                          </span>
                        )}
                      </div>

                      {/* Bottom Row: Timestamp, Amount, and Chit Action */}
                      <div className="flex items-center justify-between pt-2 border-t border-[#C9AE8B]/20 dark:border-stone-800/80">
                        <div className="flex flex-col">
                          <span className="text-[10px] uppercase font-mono text-[#8C6D53] dark:text-stone-500">Settled At</span>
                          <span className="font-mono text-xs text-[#725039] dark:text-stone-400">
                            {new Date(rec.paidAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </span>
                        </div>

                        <div className="flex items-center gap-3">
                          <span className="font-serif text-lg font-bold text-[#241F1C] dark:text-white">
                            ₹{rec.totalRupees}
                          </span>
                          <button
                            type="button"
                            onClick={() => {
                              setActiveReceipt({
                                orderId: rec.id,
                                tableLabel: rec.tableLabel,
                                items: rec.items || [
                                  { name: "Settled Order Items", qty: rec.itemsCount, priceRupees: Math.round(rec.totalRupees / rec.itemsCount), subtotalRupees: rec.totalRupees }
                                ],
                                subtotalRupees: Math.round(rec.totalRupees / 1.05),
                                taxRupees: Math.round(rec.totalRupees - rec.totalRupees / 1.05),
                                totalRupees: rec.totalRupees,
                                paymentMethod: rec.paymentMethod,
                                paidAt: rec.paidAt,
                              });
                            }}
                            className="inline-flex items-center gap-1 rounded-xl border border-[#C9AE8B]/40 dark:border-stone-700 bg-[#F3E7D3] dark:bg-stone-800 px-3 py-1.5 text-xs font-semibold text-[#725039] dark:text-stone-300 hover:bg-[#EBDDC8] dark:hover:bg-stone-700 active:scale-95 transition cursor-pointer"
                          >
                            <Printer className="h-3.5 w-3.5" />
                            <span>Chit</span>
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Tablet / Desktop View: Clean Table with horizontal scroll support */}
                <div className="hidden sm:block rounded-3xl border border-[#C9AE8B]/40 dark:border-stone-800 bg-[#FAF4EB] dark:bg-[#1A1715] overflow-hidden shadow-xs transition-colors">
                  <div className="overflow-x-auto scrollbar-none">
                    <table className="w-full min-w-[560px] text-left text-xs">
                      <thead className="bg-[#F3E7D3] dark:bg-stone-900 text-[10px] uppercase tracking-wider font-mono text-[#725039] dark:text-stone-400 border-b border-[#C9AE8B]/30 dark:border-stone-800">
                        <tr>
                          <th className="p-3.5 whitespace-nowrap">Settlement ID</th>
                          <th className="p-3.5 whitespace-nowrap">Table</th>
                          <th className="p-3.5 whitespace-nowrap">Method</th>
                          <th className="p-3.5 whitespace-nowrap">Amount</th>
                          <th className="p-3.5 whitespace-nowrap">Settled At</th>
                          <th className="p-3.5 text-right whitespace-nowrap">Receipt</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-[#C9AE8B]/20 dark:divide-stone-800 font-mono">
                        {paidHistory.map((rec) => (
                          <tr key={rec.id} className="hover:bg-[#F3E7D3]/60 dark:hover:bg-stone-900/50 transition">
                            <td className="p-3.5 font-bold text-[#241F1C] dark:text-stone-200 whitespace-nowrap">{rec.id}</td>
                            <td className="p-3.5 text-[#8C6207] dark:text-[#F6AD55] font-bold whitespace-nowrap">Table {rec.tableLabel}</td>
                            <td className="p-3.5 whitespace-nowrap">
                              {rec.paymentMethod === "UPI" ? (
                                <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md bg-white dark:bg-stone-800 border border-[#C9AE8B]/40 dark:border-stone-700 shadow-2xs">
                                  <Image
                                    src="/upi-logo-trimmed.png"
                                    alt="UPI"
                                    width={32}
                                    height={12}
                                    className="h-3 w-auto object-contain dark:hidden"
                                  />
                                  <Image
                                    src="/upi-logo-dark.png"
                                    alt="UPI"
                                    width={32}
                                    height={12}
                                    className="h-3 w-auto object-contain hidden dark:block"
                                  />
                                </span>
                              ) : rec.paymentMethod === "CARD" ? (
                                <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md bg-white dark:bg-stone-800 border border-[#C9AE8B]/40 dark:border-stone-700 shadow-2xs font-mono text-[10px] font-bold text-stone-800 dark:text-stone-200">
                                  <Image
                                    src="/icon_card_hd.png"
                                    alt="Card"
                                    width={16}
                                    height={16}
                                    className="h-3.5 w-auto object-contain drop-shadow-2xs"
                                  />
                                  <span>CARD</span>
                                </span>
                              ) : (
                                <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-amber-100 dark:bg-amber-950 text-amber-800 dark:text-amber-300 border border-amber-300 dark:border-amber-800/50">
                                  {rec.paymentMethod}
                                </span>
                              )}
                            </td>
                            <td className="p-3.5 font-bold text-[#241F1C] dark:text-white font-serif text-sm whitespace-nowrap">₹{rec.totalRupees}</td>
                            <td className="p-3.5 text-[#725039] dark:text-stone-400 text-[11px] whitespace-nowrap">
                              {new Date(rec.paidAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </td>
                            <td className="p-3.5 text-right whitespace-nowrap">
                              <button
                                onClick={() => {
                                  setActiveReceipt({
                                    orderId: rec.id,
                                    tableLabel: rec.tableLabel,
                                    items: rec.items || [
                                      { name: "Settled Order Items", qty: rec.itemsCount, priceRupees: Math.round(rec.totalRupees / rec.itemsCount), subtotalRupees: rec.totalRupees }
                                    ],
                                    subtotalRupees: Math.round(rec.totalRupees / 1.05),
                                    taxRupees: Math.round(rec.totalRupees - rec.totalRupees / 1.05),
                                    totalRupees: rec.totalRupees,
                                    paymentMethod: rec.paymentMethod,
                                    paidAt: rec.paidAt,
                                  });
                                }}
                                className="inline-flex items-center gap-1 rounded-xl border border-[#C9AE8B]/40 dark:border-stone-700 bg-[#F3E7D3] dark:bg-stone-800 px-3 py-1 text-xs text-[#725039] dark:text-stone-300 hover:bg-[#EBDDC8] dark:hover:bg-stone-700 hover:text-[#241F1C] dark:hover:text-white transition cursor-pointer"
                              >
                                <Printer className="h-3 w-3" />
                                <span>Chit</span>
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </>
            )}
          </div>
        )}
      </main>

      {/* Cash Payment Settlement Modal */}
      {selectedTable && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4 backdrop-blur-sm"
          onClick={() => setSelectedTable(null)}
        >
          <div
            className="w-full max-w-md rounded-3xl border border-[#C9AE8B]/40 dark:border-stone-800 bg-[#FAF4EB] dark:bg-[#1C1917] p-6 shadow-2xl transition-colors"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="flex items-start justify-between border-b border-[#C9AE8B]/30 dark:border-stone-800 pb-4">
              <div>
                <span className="text-xs font-bold text-[#B72E35] dark:text-[#F6AD55]">Cash Settlement</span>
                <h3 className="text-2xl font-black font-mono text-[#241F1C] dark:text-white">
                  Table {selectedTable.tableLabel}
                </h3>
              </div>
              <button
                onClick={() => setSelectedTable(null)}
                className="flex h-8 w-8 items-center justify-center rounded-full bg-[#F3E7D3] dark:bg-stone-800 text-[#725039] dark:text-stone-400 hover:bg-[#EBDDC8] dark:hover:bg-stone-700 transition cursor-pointer"
              >
                ✕
              </button>
            </div>

            {resultMessage ? (
              /* Success / Result View */
              <div className="py-6 text-center space-y-4">
                <div
                  className={`mx-auto flex h-14 w-14 items-center justify-center rounded-2xl text-2xl ${
                    resultMessage.type === "success"
                      ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800"
                      : "bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-300 border border-red-300 dark:border-red-800"
                  }`}
                >
                  {resultMessage.type === "success" ? "✓" : "✕"}
                </div>
                <h4 className="text-lg font-bold text-[#241F1C] dark:text-white">{resultMessage.text}</h4>

                {resultMessage.changeRupees !== undefined && resultMessage.changeRupees > 0 && (
                  <div className="rounded-2xl border border-amber-300 dark:border-amber-900/60 bg-amber-50 dark:bg-amber-950/40 p-4">
                    <span className="text-xs text-amber-900 dark:text-amber-300 font-semibold">Change to Return</span>
                    <p className="text-3xl font-black font-mono text-amber-800 dark:text-amber-200 mt-1">
                      ₹{resultMessage.changeRupees}
                    </p>
                  </div>
                )}

                <button
                  onClick={() => {
                    setSelectedTable(null);
                    setResultMessage(null);
                  }}
                  className="w-full rounded-2xl bg-[#241F1C] dark:bg-stone-800 py-3 text-xs font-bold text-[#F3E7D3] dark:text-white transition hover:bg-[#362B24] dark:hover:bg-stone-700 cursor-pointer"
                >
                  Close & Done
                </button>
              </div>
            ) : (
              /* Settlement Form */
              <form onSubmit={handleRecordPayment} className="mt-5 space-y-4">
                {/* Total Bill Display */}
                <div className="flex items-center justify-between rounded-2xl border border-[#C9AE8B]/40 dark:border-stone-800 bg-[#F3E7D3] dark:bg-stone-900/80 p-4">
                  <span className="text-xs font-bold text-[#725039] dark:text-stone-400">Total Bill Due</span>
                  <span className="font-mono text-2xl font-black text-[#B72E35] dark:text-[#F6AD55]">
                    ₹{selectedTotalRupees}
                  </span>
                </div>

                {/* Amount Tendered Input */}
                <div>
                  <label className="block text-xs font-bold text-[#725039] dark:text-stone-400 mb-1.5">
                    Amount Tendered by Customer (₹)
                  </label>
                  <input
                    type="number"
                    min={selectedTotalRupees}
                    step="1"
                    value={amountTendered}
                    onChange={(e) => setAmountTendered(e.target.value)}
                    className="w-full rounded-2xl border border-[#C9AE8B]/40 dark:border-stone-700 bg-[#F3E7D3] dark:bg-stone-900 px-4 py-3.5 font-mono text-xl font-bold text-[#241F1C] dark:text-white focus:border-[#B72E35] focus:outline-none"
                    autoFocus
                    required
                  />
                </div>

                {/* Change Due Calculator */}
                <div className="flex items-center justify-between rounded-2xl border border-emerald-300 dark:border-emerald-900/50 bg-emerald-50 dark:bg-emerald-950/30 p-3.5 text-xs">
                  <span className="font-semibold text-emerald-800 dark:text-emerald-300">Change Due to Customer</span>
                  <span className="font-mono text-lg font-bold text-emerald-800 dark:text-emerald-300">
                    ₹{changeDueRupees}
                  </span>
                </div>

                {/* Staff Identifier */}
                <div>
                  <label className="block text-xs font-semibold text-[#8C6D53] dark:text-stone-500 mb-1">
                    Staff Identifier
                  </label>
                  <input
                    type="text"
                    value={staffName}
                    onChange={(e) => setStaffName(e.target.value)}
                    className="w-full rounded-xl border border-[#C9AE8B]/40 dark:border-stone-800 bg-[#F3E7D3] dark:bg-stone-900 px-3 py-2 text-xs text-[#241F1C] dark:text-white focus:border-[#B72E35] focus:outline-none"
                    required
                  />
                </div>

                {/* Submit Settlement Button */}
                <div className="pt-2">
                  <button
                    type="submit"
                    disabled={isSubmitting || tenderedRupees < selectedTotalRupees}
                    className="flex min-h-[50px] w-full items-center justify-center gap-2 rounded-2xl bg-[#B72E35] py-4 text-base font-bold text-white shadow-xl transition hover:bg-[#9B242A] active:scale-[0.98] disabled:opacity-50 cursor-pointer"
                  >
                    {isSubmitting
                      ? "Processing Settlement..."
                      : `Record Cash ₹${selectedTotalRupees} & Close Table`}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}

      {/* JSON Table Tag Inspector Modal */}
      {inspectingTag && (
        <JsonTagInspectorModal
          tag={inspectingTag}
          onClose={() => setInspectingTag(null)}
        />
      )}

      {/* UPI Payment Gateway Drawer */}
      {activeUpiTable && (
        <UpiPaymentDrawer
          tableLabel={activeUpiTable.tableLabel}
          amountPaise={activeUpiTable.totalPaise}
          onClose={() => setActiveUpiTable(null)}
          onPaymentSuccess={(res) => {
            setActiveUpiTable(null);
            setPaidHistory((prev) => [
              {
                id: res.transactionId || `SETTLE-${Math.floor(1000 + Math.random() * 9000)}`,
                tableLabel: activeUpiTable.tableLabel,
                totalRupees: Math.round(activeUpiTable.totalPaise / 100),
                paymentMethod: "UPI",
                paidAt: res.paidAt,
                itemsCount: activeUpiTable.orderCount || 1,
              },
              ...prev,
            ]);
            refreshData();
          }}
        />
      )}

      {/* Digital Receipt / Tax Chit Modal */}
      {activeReceipt && (
        <DigitalReceiptModal
          receipt={activeReceipt}
          onClose={() => setActiveReceipt(null)}
        />
      )}
    </div>
  );
};
