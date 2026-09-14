"use client";

import React, { useState } from "react";
import Link from "next/link";
import type { CustomerOrderDetails } from "@/app/orders/actions";
import { OrderStatusProgress } from "./OrderStatusProgress";
import { Clock } from "lucide-react";

interface OrderCardProps {
  order: CustomerOrderDetails;
}

interface StatusCopy {
  title: string;
  subtitle: string;
  badgeColor: string;
}

function getStatusCopy(status: string): StatusCopy {
  switch (status) {
    case "PENDING_CONFIRMATION":
    case "DRAFT":
      return {
        title: "Waiting for Confirmation",
        subtitle: "Order sent to Cashier Queue. You can still modify items or instructions.",
        badgeColor:
          "bg-[#F2C84B]/20 text-[#725039] border-[#C9AE8B]",
      };
    case "CONFIRMED":
    case "ACCEPTED":
      return {
        title: "Order Confirmed",
        subtitle: "Cashier verified your order! Pushed to Kitchen for preparation.",
        badgeColor:
          "bg-[#75AFA7]/25 text-[#1C463F] border-[#75AFA7]/40",
      };
    case "PREPARING":
      return {
        title: "Crafting Your Order",
        subtitle: "Your coffee is brewing and your food is on the grill.",
        badgeColor:
          "bg-[#F2C84B]/30 text-[#725039] border-[#C9AE8B]",
      };
    case "READY":
      return {
        title: "Order is Ready!",
        subtitle:
          "Fresh and piping hot. Your server is bringing it over, or collect at the counter.",
        badgeColor:
          "bg-[#75AFA7]/30 text-[#1C463F] border-[#75AFA7]/60",
      };
    case "COMPLETED":
    case "SERVED":
    case "CLOSED":
      return {
        title: "Served & Enjoyed",
        subtitle: "Hope you loved it! You can order another round anytime from the menu.",
        badgeColor:
          "bg-[#FAF4EB] text-[#725039] border-[#C9AE8B]/40",
      };
    case "CANCELLED":
    case "REJECTED":
      return {
        title: "Order Cancelled",
        subtitle: "This order was cancelled by staff.",
        badgeColor:
          "bg-[#B72E35]/15 text-[#B72E35] border-[#B72E35]/30",
      };
    default:
      return {
        title: "Processing Order",
        subtitle: "Your order is in progress.",
        badgeColor: "bg-[#FAF4EB] text-[#725039] border-[#C9AE8B]/40",
      };
  }
}

function formatRelativeTime(dateStr: string | null): string {
  if (!dateStr) return "Just now";
  const diffMs = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diffMs / 60000);
  if (mins < 1) return "Just now";
  if (mins === 1) return "1 min ago";
  if (mins < 60) return `${mins} mins ago`;
  const hours = Math.floor(mins / 60);
  return `${hours}h ${mins % 60}m ago`;
}

export const OrderCard: React.FC<OrderCardProps> = ({ order }) => {
  const [showItems, setShowItems] = useState(true);
  const copy = getStatusCopy(order.status);
  const totalRupees = Math.round(order.totalPaise / 100);
  const timeAgo = formatRelativeTime(order.submittedAt);
  const canEdit = order.status === "PENDING_CONFIRMATION" || order.status === "DRAFT";

  return (
    <div className="rounded-3xl border border-[#C9AE8B]/40 dark:border-white/10 bg-[#FAF4EB]/90 dark:bg-[#201A17] p-5 shadow-xs backdrop-blur-sm transition-all hover:shadow-md space-y-3">
      {/* Header: Order No & Status Badge */}
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <span className="font-mono text-base font-black text-[#241F1C] dark:text-[#FAF4EB]">
              Order #{order.orderNo}
            </span>
            <span className="text-[#C9AE8B]">•</span>
            <span className="text-xs text-[#725039] dark:text-[#C9AE8B] font-medium">{timeAgo}</span>
          </div>
          <h3 className="mt-1 font-serif text-lg font-bold tracking-tight text-[#241F1C] dark:text-[#FAF4EB]">
            {copy.title}
          </h3>
        </div>

        <span
          className={`inline-flex items-center rounded-full border px-3 py-1 text-xs font-mono font-bold uppercase tracking-wider ${copy.badgeColor}`}
        >
          {order.status.replace("_", " ")}
        </span>
      </div>

      {/* Verification Notice & Customer Edit Button */}
      {canEdit ? (
        <div className="flex items-center justify-between rounded-2xl border border-[#F2C84B] dark:border-amber-500/40 bg-[#F2C84B]/15 dark:bg-amber-950/20 p-3 text-xs">
          <div className="text-[#725039] dark:text-amber-200">
            <span className="font-bold">Pending Confirmation</span>
            <p className="text-[11px] text-[#725039]/80 dark:text-amber-300/80">
              Cashier is verifying. You can edit items now:
            </p>
          </div>
          <Link
            href={`/smol-menu?editOrder=${order.id}`}
            className="rounded-xl bg-[#B72E35] px-3 py-1.5 font-mono text-xs font-bold text-white shadow-xs hover:bg-[#9E242B] active:scale-95 transition"
          >
            Edit Order
          </Link>
        </div>
      ) : (order.status === "CONFIRMED" || order.status === "ACCEPTED" || order.status === "PREPARING") ? (
        <div className="rounded-xl border border-[#C9AE8B]/30 dark:border-white/10 bg-[#F3E7D3]/60 dark:bg-white/[0.04] p-2.5 text-[11px] text-[#725039] dark:text-[#C9AE8B] font-serif italic text-center">
          Order confirmed. Preparation has started and editing is locked.
        </div>
      ) : null}

      <div className="flex items-center justify-between">
        <p className="font-serif text-xs leading-relaxed text-[#725039] dark:text-[#C9AE8B]">
          {copy.subtitle}
        </p>

        {/* Honest ETA Range Badge */}
        {(order.status === "PENDING_CONFIRMATION" ||
          order.status === "CONFIRMED" ||
          order.status === "ACCEPTED" ||
          order.status === "PREPARING") &&
          order.etaMinMinutes &&
          order.etaMaxMinutes && (
            <div className="flex-shrink-0 ml-2 flex items-center gap-1 rounded-full bg-[#F2C84B]/20 dark:bg-amber-950/30 border border-[#C9AE8B] dark:border-amber-500/40 px-2.5 py-1 text-[11px] font-mono font-bold text-[#725039] dark:text-amber-200">
              <Clock className="h-3 w-3 text-[#B72E35] dark:text-[#FF5B52]" />
              <span>
                {order.etaMinMinutes}–{order.etaMaxMinutes} min
              </span>
            </div>
          )}
      </div>

      {/* 5-Step Visual Stepper */}
      <div className="mt-4 border-t border-[#C9AE8B]/30 dark:border-white/10 pt-2">
        <OrderStatusProgress status={order.status} />
      </div>

      {/* Items Toggle & Breakdown */}
      <div className="mt-3 border-t border-[#C9AE8B]/30 dark:border-white/10 pt-3">
        <button
          onClick={() => setShowItems((v) => !v)}
          className="flex w-full items-center justify-between text-xs font-serif font-bold text-[#725039] dark:text-[#C9AE8B] transition hover:text-[#241F1C] dark:hover:text-[#FAF4EB]"
        >
          <span>
            {order.items.length} {order.items.length === 1 ? "item" : "items"} (₹{totalRupees})
          </span>
          <span className="text-[#C9AE8B]">{showItems ? "Hide details ▲" : "Show details ▼"}</span>
        </button>

        {showItems && (
          <div className="mt-3 divide-y divide-[#C9AE8B]/20 dark:divide-white/10 rounded-2xl bg-[#F3E7D3]/50 dark:bg-black/30 p-3.5 text-xs">
            {order.items.map((item) => (
              <div key={item.id} className="flex items-center justify-between py-2">
                <div className="flex items-center gap-2">
                  <span className="font-mono font-bold text-[#725039] dark:text-[#C9AE8B]">{item.qty}x</span>
                  <span className="font-serif font-medium text-[#241F1C] dark:text-[#FAF4EB]">
                    {item.name.toLowerCase()}
                  </span>
                </div>
                <span className="font-mono font-semibold text-[#241F1C] dark:text-[#FAF4EB]">
                  ₹{Math.round(item.lineSubtotal / 100)}
                </span>
              </div>
            ))}

            <div className="flex items-center justify-between pt-2.5 font-bold text-[#241F1C] dark:text-[#FAF4EB] border-t border-[#C9AE8B]/30 dark:border-white/10">
              <span className="font-serif">Total</span>
              <span className="font-mono text-sm text-[#B72E35] dark:text-[#FF5B52]">
                ₹{totalRupees}
              </span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
