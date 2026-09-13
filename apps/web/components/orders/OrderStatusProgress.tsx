"use client";

import React from "react";
import type { OrderStatus } from "@smol-cafe/db";
import { Clock, Check, ChefHat, Bell, Sparkles, XCircle } from "lucide-react";

interface OrderStatusProgressProps {
  status: OrderStatus;
}

const STEPS: { key: OrderStatus; label: string; icon: React.ComponentType<{ className?: string }> }[] = [
  { key: "PENDING_CONFIRMATION", label: "Verification", icon: Clock },
  { key: "CONFIRMED", label: "Confirmed", icon: Check },
  { key: "PREPARING", label: "Preparing", icon: ChefHat },
  { key: "READY", label: "Ready", icon: Bell },
  { key: "SERVED", label: "Served", icon: Sparkles },
];

function getStepIndex(status: OrderStatus): number {
  switch (status) {
    case "DRAFT":
    case "PENDING_CONFIRMATION":
    case "SUBMITTED":
      return 0;
    case "CONFIRMED":
    case "ACCEPTED":
      return 1;
    case "PREPARING":
      return 2;
    case "READY":
      return 3;
    case "COMPLETED":
    case "SERVED":
    case "CLOSED":
      return 4;
    case "CANCELLED":
    case "REJECTED":
      return -1;
    default:
      return 0;
  }
}

export const OrderStatusProgress: React.FC<OrderStatusProgressProps> = ({ status }) => {
  const currentIndex = getStepIndex(status);
  const isCancelled = status === "CANCELLED" || status === "REJECTED";

  if (isCancelled) {
    return (
      <div className="flex items-center justify-center gap-2 rounded-2xl border border-red-200 bg-red-50/80 p-3.5 text-center text-xs font-semibold text-red-700 dark:border-red-900/50 dark:bg-red-950/40 dark:text-red-300">
        <XCircle className="h-4 w-4 shrink-0" />
        <span>Order {status.toLowerCase()} by café staff.</span>
      </div>
    );
  }

  return (
    <div className="w-full py-3">
      <div className="relative flex items-center justify-between">
        {/* Background connector line */}
        <div className="absolute left-4 right-4 top-1/2 -translate-y-1/2 h-1 bg-[#C9AE8B]/30 -z-0" />
        {/* Progress fill line */}
        <div
          className="absolute left-4 top-1/2 -translate-y-1/2 h-1 bg-[#B72E35] transition-all duration-500 -z-0"
          style={{
            width: `${(Math.min(currentIndex, STEPS.length - 1) / (STEPS.length - 1)) * 90}%`,
          }}
        />

        {STEPS.map((step, idx) => {
          const isDone = idx <= currentIndex;
          const isCurrent = idx === currentIndex;

          return (
            <div key={step.key} className="relative z-10 flex flex-col items-center">
              <div
                className={`flex h-8 w-8 items-center justify-center rounded-full text-xs font-mono font-bold transition-all duration-300 ${
                  isCurrent
                    ? "bg-[#B72E35] text-white ring-4 ring-[#B72E35]/20 scale-110 shadow-md"
                    : isDone
                      ? "bg-[#B72E35] text-white"
                      : "bg-[#FAF4EB] text-[#725039]/60 border border-[#C9AE8B]/60"
                }`}
              >
                {isDone ? <step.icon className="h-4 w-4" /> : idx + 1}
              </div>
              <span
                className={`mt-1.5 text-[10px] tracking-tight font-serif ${
                  isCurrent
                    ? "font-bold text-[#B72E35]"
                    : isDone
                      ? "text-[#241F1C] font-semibold"
                      : "text-[#725039]/60"
                }`}
              >
                {step.label.toLowerCase()}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
};
