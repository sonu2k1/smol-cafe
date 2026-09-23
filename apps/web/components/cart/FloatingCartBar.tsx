"use client";

import React from "react";
import { useCart } from "@/context/CartContext";

export const FloatingCartBar: React.FC = () => {
  const { totalCount, subtotalPaise, openCart } = useCart();
  const [guestName, setGuestName] = React.useState("");

  React.useEffect(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("smol_guest_name");
      if (saved) setGuestName(saved);
    }
  }, []);

  if (totalCount === 0) return null;

  const totalRupees = Math.round(subtotalPaise / 100);

  return (
    <aside
      aria-label="Cart summary"
      className="fixed bottom-[calc(6.25rem+env(safe-area-inset-bottom,0px))] left-0 right-0 z-40 px-3 pointer-events-none select-none animate-fade-in-up"
    >
      <div className="pointer-events-auto mx-auto flex max-w-[355px] items-center justify-between rounded-2xl border border-red-900/30 dark:border-white/15 bg-[#B72E35] px-4 py-2.5 text-white shadow-xl shadow-red-950/30 transition-all">
        <div className="flex items-center gap-2.5">
          <div className="flex h-7 w-7 items-center justify-center rounded-full bg-white text-xs font-bold text-[#B72E35] shadow-xs shrink-0">
            {totalCount}
          </div>
          <div>
            <span className="text-[9.5px] text-white/80 font-mono uppercase tracking-wider block leading-none">
              {guestName ? `${guestName}'s Order` : "Your Order"}
            </span>
            <p className="font-serif text-base font-bold tracking-tight leading-tight mt-0.5">
              ₹{totalRupees}
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={openCart}
          className="flex items-center gap-1.5 rounded-xl bg-white/20 hover:bg-white/30 px-3.5 py-1.5 font-serif text-xs font-bold text-white transition active:scale-95 touch-manipulation cursor-pointer"
        >
          <span>View Cart</span>
          <span aria-hidden="true">→</span>
        </button>
      </div>
    </aside>
  );
};
