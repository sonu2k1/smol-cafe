"use client";

import React, { useState, useEffect } from "react";
import type { KitchenTicket } from "@/app/kitchen/actions";
import type { OrderStatus } from "@smol-cafe/db";

interface KitchenTicketCardProps {
  ticket: KitchenTicket;
  onTransition: (orderId: string, fromStatus: OrderStatus, toStatus: OrderStatus) => Promise<void>;
}

export const KitchenTicketCard: React.FC<KitchenTicketCardProps> = ({ ticket, onTransition }) => {
  const [isUpdating, setIsUpdating] = useState(false);
  const [elapsedMinutes, setElapsedMinutes] = useState(0);

  useEffect(() => {
    const calculateElapsed = () => {
      if (!ticket.submittedAt) return;
      const diffMs = Date.now() - new Date(ticket.submittedAt).getTime();
      setElapsedMinutes(Math.max(0, Math.floor(diffMs / 60000)));
    };

    calculateElapsed();
    const timer = setInterval(calculateElapsed, 15000); // refresh every 15s
    return () => clearInterval(timer);
  }, [ticket.submittedAt]);

  const handleAction = async () => {
    if (isUpdating) return;

    let nextStatus: OrderStatus | null = null;
    if (ticket.status === "SUBMITTED" || ticket.status === "ACCEPTED") nextStatus = "PREPARING";
    else if (ticket.status === "PREPARING") nextStatus = "READY";
    else if (ticket.status === "READY") nextStatus = "SERVED";

    if (!nextStatus) return;

    setIsUpdating(true);
    try {
      await onTransition(ticket.id, ticket.status, nextStatus);
    } finally {
      setIsUpdating(false);
    }
  };

  // Formatted order time in Noto Sans Mono
  const orderTimeFormatted = ticket.submittedAt
    ? new Date(ticket.submittedAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
    : "--:--";

  // Brand timer styling in Noto Sans Mono
  const timerBadgeStyle =
    elapsedMinutes < 6
      ? "bg-[#75AFA7]/20 text-[#75AFA7] border-[#75AFA7]/40"
      : elapsedMinutes < 12
        ? "bg-[#F2C84B]/20 text-[#F2C84B] border-[#F2C84B]/40"
        : "bg-[#B72E35]/20 text-[#B72E35] border-[#B72E35]/60 animate-pulse";

  // Status mapping for display
  const displayStatus =
    ticket.status === "SUBMITTED" || ticket.status === "ACCEPTED"
      ? "NEW"
      : ticket.status === "PREPARING"
        ? "PREPARING"
        : ticket.status === "READY"
          ? "READY"
          : "COMPLETED";

  const statusBadgeStyle =
    displayStatus === "NEW"
      ? "bg-[#C9AE8B]/20 text-[#C9AE8B] border-[#C9AE8B]/40"
      : displayStatus === "PREPARING"
        ? "bg-[#F2C84B]/20 text-[#F2C84B] border-[#F2C84B]/40"
        : displayStatus === "READY"
          ? "bg-[#75AFA7]/20 text-[#75AFA7] border-[#75AFA7]/40"
          : "bg-stone-800 text-stone-400 border-stone-700";

  let actionButtonLabel = "start preparing";
  let actionButtonColor = "bg-[#B72E35] hover:bg-[#9B242A] text-white";

  if (displayStatus === "PREPARING") {
    actionButtonLabel = "mark ready";
    actionButtonColor = "bg-[#F2C84B] text-[#241F1C] hover:bg-[#DEB33A] font-semibold";
  } else if (displayStatus === "READY") {
    actionButtonLabel = "complete order";
    actionButtonColor = "bg-[#75AFA7] text-white hover:bg-[#5C968E]";
  }

  return (
    <div className="flex flex-col justify-between rounded-2xl border border-[#C9AE8B]/40 dark:border-[#C9AE8B]/20 bg-[#FAF4EB] dark:bg-[#1D1815] p-4 shadow-sm transition-all hover:border-[#B72E35]/40 dark:hover:border-[#C9AE8B]/40">
      <div>
        {/* Card Header: Order ID & Table Number in Noto Sans Mono */}
        <div className="flex items-center justify-between gap-2 border-b border-[#C9AE8B]/30 dark:border-stone-800/80 pb-3">
          <div className="flex items-center gap-2">
            <span className="font-mono text-lg font-bold text-[#241F1C] dark:text-[#F3E7D3]">
              #{ticket.orderNo || ticket.id.slice(-4)}
            </span>
            <span className="rounded-lg border border-[#C9AE8B]/40 dark:border-[#C9AE8B]/30 bg-[#F3E7D3] dark:bg-[#241F1C] px-2 py-0.5 font-mono text-xs font-semibold text-[#B72E35] dark:text-[#F2C84B]">
              table {ticket.tableLabel}{ticket.guestName ? ` • ${ticket.guestName}` : ""}
            </span>
          </div>

          {/* Current Status Badge */}
          <span className={`rounded-full border px-2 py-0.5 font-mono text-[10px] font-bold ${statusBadgeStyle}`}>
            {displayStatus}
          </span>
        </div>

        {/* Metadata Bar: Order Time & Preparation Timer */}
        <div className="flex items-center justify-between mt-2.5 px-0.5 font-mono text-xs text-[#725039] dark:text-[#C9AE8B]">
          <div className="flex items-center gap-1">
            <span className="text-[#8C6D53] dark:text-stone-500">time:</span>
            <span>{orderTimeFormatted}</span>
          </div>

          <div className={`flex items-center gap-1 rounded-full border px-2 py-0.5 text-[11px] font-bold ${timerBadgeStyle}`}>
            <span>⏱</span>
            <span>{elapsedMinutes}m timer</span>
          </div>
        </div>

        {/* Special Instructions Alert */}
        {ticket.instructions && (
          <div className="mt-2.5 rounded-xl border border-[#F2C84B]/60 dark:border-[#F2C84B]/40 bg-[#F2C84B]/15 dark:bg-[#F2C84B]/10 p-2 font-mono text-xs text-[#8C6207] dark:text-[#F2C84B]">
            <span className="font-bold">NOTE:</span> {ticket.instructions}
          </div>
        )}

        {/* Items List with Quantity */}
        <div className="my-3 space-y-2">
          {ticket.items.map((item) => (
            <div key={item.id} className="flex items-start gap-2.5 text-xs sm:text-sm">
              <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded bg-[#B72E35] font-mono text-xs font-bold text-white shadow-xs">
                {item.qty}
              </span>
              <span className="font-medium leading-snug text-[#241F1C] dark:text-[#F3E7D3]">
                {item.name}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Action Button or Completed Indicator */}
      <div className="pt-2 border-t border-[#C9AE8B]/30 dark:border-stone-800/80 mt-1">
        {displayStatus === "COMPLETED" ? (
          <div className="flex h-11 w-full items-center justify-center rounded-xl bg-[#F3E7D3] dark:bg-stone-900 border border-[#C9AE8B]/40 dark:border-stone-800 font-mono text-xs font-medium text-[#245850] dark:text-[#75AFA7]">
            ✓ order completed
          </div>
        ) : (
          <button
            onClick={handleAction}
            disabled={isUpdating}
            className={`flex min-h-[44px] w-full items-center justify-center gap-2 rounded-xl text-xs sm:text-sm font-bold tracking-wide shadow-sm transition-all active:scale-[0.98] disabled:opacity-50 cursor-pointer ${actionButtonColor}`}
          >
            {isUpdating ? (
              <span className="h-4 w-4 rounded-full border-2 border-current border-t-transparent animate-spin" />
            ) : (
              actionButtonLabel
            )}
          </button>
        )}
      </div>
    </div>
  );
};
