"use client";

import React, { useState } from "react";
import type { SuggestedMenuItem } from "@/app/orders/pairings-actions";
import { useCart } from "@/context/CartContext";
import { Coffee } from "lucide-react";

interface AnotherRoundSuggestionsProps {
  suggestions: SuggestedMenuItem[];
  isKitchenBusy: boolean;
}

export const AnotherRoundSuggestions: React.FC<AnotherRoundSuggestionsProps> = ({
  suggestions,
  isKitchenBusy,
}) => {
  const { addItem, openCart } = useCart();
  const [addedIds, setAddedIds] = useState<Set<string>>(new Set());

  // Automatically suppressed if kitchen load is high or no suggestions
  if (isKitchenBusy || !suggestions || suggestions.length === 0) {
    return null;
  }

  const handleQuickAdd = (item: SuggestedMenuItem) => {
    addItem({
      id: item.id,
      categoryId: "",
      name: item.name,
      status: "AVAILABLE",
      description: item.description,
      pricePaise: item.pricePaise,
      imageUrl: null,
      metadata: {
        dietary: item.dietaryClassification,
      },
    });

    setAddedIds((prev) => new Set([...prev, item.id]));
    openCart();
  };

  return (
    <section className="rounded-3xl border border-stone-200 bg-white p-5 shadow-sm dark:border-stone-800 dark:bg-stone-900 space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Coffee className="h-4 w-4 text-[#9B2C2C] dark:text-[#F6AD55]" />
          <h3 className="text-xs font-bold uppercase tracking-wider text-stone-900 dark:text-stone-100">
            Fancy Another Round?
          </h3>
        </div>
        <span className="rounded-full bg-amber-50 px-2.5 py-0.5 text-[10px] font-mono font-bold text-amber-800 dark:bg-amber-950/40 dark:text-amber-300">
          Chef Pairings
        </span>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
        {suggestions.map((item) => {
          const isAdded = addedIds.has(item.id);
          const priceRupees = Math.round(item.pricePaise / 100);

          return (
            <div
              key={item.id}
              className="rounded-2xl border border-stone-100 bg-stone-50/80 p-3.5 dark:border-stone-800 dark:bg-stone-800/40 flex items-center justify-between gap-2"
            >
              <div className="overflow-hidden">
                <span className="text-[10px] font-mono font-bold text-[#9B2C2C] dark:text-[#F6AD55]">
                  {item.pairingReason}
                </span>
                <h4 className="text-xs font-bold text-stone-900 dark:text-stone-100 truncate mt-0.5">
                  {item.name}
                </h4>
                <p className="text-[11px] font-mono text-stone-600 dark:text-stone-400">
                  ₹{priceRupees}
                </p>
              </div>

              <button
                onClick={() => handleQuickAdd(item)}
                className={`rounded-xl px-3 py-1.5 text-xs font-bold transition flex-shrink-0 ${
                  isAdded
                    ? "border border-emerald-300 bg-emerald-50 text-emerald-800 dark:border-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300"
                    : "bg-[#9B2C2C] text-white shadow hover:bg-[#822424] active:scale-95 dark:bg-[#C53030]"
                }`}
              >
                {isAdded ? "✓ In Cart" : "+ Add"}
              </button>
            </div>
          );
        })}
      </div>
    </section>
  );
};
