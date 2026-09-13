"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { switchTableSessionAction } from "@/app/t/actions";
import { BottomNavBar } from "@/components/navigation/BottomNavBar";
import { Coffee, UtensilsCrossed } from "lucide-react";

export interface TableItemView {
  id: string;
  name: string;
  category: string;
  quantity: number;
  priceRupees: number;
  subtotalRupees: number;
  modifier?: string;
}

interface TableClientViewProps {
  currentTableLabel: string;
  guestCount: number;
  items: TableItemView[];
  totalRupees: number;
  totalItemsCount: number;
  hasActiveSession: boolean;
}

export const TableClientView: React.FC<TableClientViewProps> = ({
  currentTableLabel,
  guestCount,
  items,
  totalRupees,
  totalItemsCount,
  hasActiveSession,
}) => {
  const router = useRouter();
  const [switchingTable, setSwitchingTable] = useState<string | null>(null);
  const [hasAddedBoard, setHasAddedBoard] = useState(false);

  const tablesList = Array.from({ length: 12 }, (_, i) =>
    (i + 1).toString().padStart(2, "0")
  );

  const handleTableSwitch = async (label: string) => {
    if (label === currentTableLabel) return;
    setSwitchingTable(label);
    try {
      const res = await switchTableSessionAction(label);
      if (res.success) {
        router.refresh();
      }
    } finally {
      setSwitchingTable(null);
    }
  };

  // Group items by category
  const categories = ["COFFEE", "CHAI", "FOOD"];
  const grouped = categories
    .map((cat) => ({
      name: cat,
      items: items.filter((i) => i.category === cat),
    }))
    .filter((g) => g.items.length > 0);

  const isTableEmpty = items.length === 0;

  return (
    <div className="min-h-screen bg-[#F3E7D3] text-[#241F1C] pb-28 font-sans">
      {/* Top Header */}
      <header className="sticky top-0 z-40 border-b border-[#E8DFD3]/80 bg-[#F5EFEB]/90 px-4 py-3.5 backdrop-blur-md">
        <div className="mx-auto flex max-w-md items-center justify-between">
          <Link
            href="/menu"
            className="flex h-9 w-9 items-center justify-center rounded-xl text-[#1C1917] transition hover:bg-black/5 active:scale-95"
            aria-label="Back to menu"
          >
            <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
              <polyline points="15 18 9 12 15 6" />
            </svg>
          </Link>

          <div className="text-center">
            <h1 className="font-serif text-lg sm:text-xl font-bold tracking-tight text-[#1C1917]">
              Table Session
            </h1>
            <p className="font-serif italic text-[11px] text-[#786F66]">
              smol café • Rishikesh
            </p>
          </div>

          <Link
            href="/menu"
            className="text-xs font-serif font-bold text-[#A62B34] hover:underline"
          >
            + Add items
          </Link>
        </div>

        {/* Horizontal Table Switcher Bar */}
        <div className="mx-auto max-w-md pt-2.5">
          <div className="flex items-center justify-between px-1 pb-1">
            <span className="font-mono text-[10px] font-bold uppercase tracking-wider text-[#786F66]">
              Switch Table (12 Tables Active):
            </span>
            <span className="font-mono text-[10px] text-[#A62B34] font-bold">
              Seated: T{currentTableLabel}
            </span>
          </div>

          <div className="flex gap-1.5 overflow-x-auto no-scrollbar py-1">
            {tablesList.map((label) => {
              const isSelected = label === currentTableLabel;
              const isBusy = switchingTable === label;

              return (
                <button
                  key={label}
                  type="button"
                  onClick={() => handleTableSwitch(label)}
                  disabled={isBusy}
                  className={`shrink-0 rounded-xl px-3 py-1.5 font-mono text-xs font-bold transition-all duration-150 active:scale-90 ${
                    isSelected
                      ? "bg-[#A62B34] text-white shadow-xs scale-105"
                      : "border border-[#E2D7C7] bg-[#FCF8F2] text-[#4A423A] hover:bg-[#EFE7DC] hover:border-[#D0C2B0]"
                  } ${isBusy ? "opacity-50 animate-pulse" : ""}`}
                >
                  T{label}
                </button>
              );
            })}
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="mx-auto max-w-md px-4 pt-4 space-y-4">
        {/* Grand Arched Table Receipt Card */}
        <div className="relative rounded-[2.5rem] border border-[#E2D7C7] bg-[#FAF5ED] p-6 shadow-xs animate-scale-in">
          {/* Top Table Badge */}
          <div className="text-center space-y-1">
            <p className="font-mono text-[10px] font-bold uppercase tracking-widest text-[#786F66]">
              TABLE
            </p>
            <div className="font-serif text-5xl font-extrabold text-[#1C1917] tracking-tight">
              {currentTableLabel}
            </div>
            <div className="pt-1 flex items-center justify-center gap-1.5">
              <span className="inline-block rounded-full bg-[#336870] px-3.5 py-0.5 text-[11px] font-medium text-white shadow-xs">
                {guestCount || 2} guests
              </span>
              <span className={`inline-block rounded-full px-2.5 py-0.5 text-[10px] font-semibold border ${
                hasActiveSession
                  ? "bg-emerald-100 text-emerald-800 border-emerald-200"
                  : "bg-stone-100 text-stone-700 border-stone-300"
              }`}>
                ● {hasActiveSession ? "Live Session" : "Active Table"}
              </span>
            </div>
          </div>


          {/* If Table has active placed orders */}
          {!isTableEmpty ? (
            <div className="mt-6 divide-y divide-[#EADFCF]/80">
              {grouped.map((group) => (
                <div key={group.name} className="py-3.5 first:pt-0 last:pb-0 space-y-2.5">
                  <h2 className="font-mono text-[10px] font-bold uppercase tracking-wider text-[#8C7E72]">
                    {group.name}
                  </h2>
                  <div className="space-y-3">
                    {group.items.map((item) => (
                      <div
                        key={item.id}
                        className="flex items-start justify-between gap-2 text-xs animate-fade-in-up hover-lift"
                      >
                        <div className="flex items-start gap-2.5">
                          <span className="font-serif font-bold text-[#1C1917] text-sm">
                            {item.quantity}
                          </span>
                          <div>
                            <p className="font-serif font-semibold text-[#1C1917]">
                              {item.name}
                            </p>
                            {item.modifier && (
                              <p className="font-serif italic text-[11px] text-[#786F66]">
                                {item.modifier}
                              </p>
                            )}
                          </div>
                        </div>
                        <span className="font-serif font-bold text-[#1C1917] shrink-0">
                          ₹{item.subtotalRupees}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            /* If Table is Empty (Fresh session) */
            <div className="mt-6 text-center space-y-3 py-3 border-t border-dashed border-[#E2D7C7]">
              <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-[#EFE7DC] text-[#786F66] shadow-inner">
                <Coffee className="h-7 w-7" />
              </div>
              <div className="space-y-1">
                <h3 className="font-serif text-base font-bold text-[#1C1917]">
                  Ready for your first round!
                </h3>
                <p className="font-serif italic text-xs text-[#786F66] max-w-xs mx-auto">
                  Table {currentTableLabel} is active. Explore our 59 artisanal coffees, spiced chais &amp; warm buns.
                </p>
              </div>
              <Link
                href="/menu"
                className="inline-flex items-center gap-1.5 rounded-full bg-[#A62B34] px-5 py-2.5 font-serif text-xs font-bold text-white shadow-xs hover:bg-[#91242C] hover-lift active:scale-95 transition"
              >
                <span>Browse Smol Menu</span>
                <span>→</span>
              </Link>
            </div>
          )}
        </div>

        {/* Upsell Conversation Board Card */}
        <div className="rounded-2xl border border-[#D0DFD2] bg-[#E3EBE4] p-3.5 flex items-center justify-between gap-3 shadow-xs hover-lift animate-fade-in-up delay-100">
          <div className="flex items-center gap-3">
            <div className="h-12 w-12 shrink-0 rounded-xl bg-[#D4E3D6] border border-[#BED2C1] flex items-center justify-center text-[#2C4830] overflow-hidden animate-float">
              <UtensilsCrossed className="h-6 w-6" />
            </div>
            <div>
              <p className="font-serif font-bold text-xs text-[#1C1917]">
                Make it a moment?
              </p>
              <p className="font-serif text-[11px] font-semibold text-[#2C4830]">
                Conversation Board
              </p>
              <p className="font-serif italic text-[10px] text-[#5A735E] line-clamp-1">
                Cheese, fruits, nuts &amp; a little something sweet.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <div className="text-right">
              <span className="font-serif font-bold text-xs text-[#1C1917]">₹260</span>
              <span className="block font-mono text-[9px] text-[#786F66] line-through">₹300</span>
            </div>
            <Link
              href="/menu?category=cat_munchies"
              onClick={() => setHasAddedBoard(true)}
              className={`flex h-8 w-8 items-center justify-center rounded-full font-bold text-white shadow-xs active:scale-90 transition-transform ${
                hasAddedBoard ? "bg-emerald-600" : "bg-[#E5A842] hover:bg-[#D49935]"
              }`}
              aria-label="Add conversation board"
            >
              {hasAddedBoard ? "✓" : "+"}
            </Link>

          </div>
        </div>

        {/* Total and CTA Button */}
        {!isTableEmpty && (
          <div className="pt-1 text-center space-y-3 animate-fade-in-up delay-150">
            <p className="font-mono text-xs text-[#6B6056] font-medium">
              {totalItemsCount} items &nbsp;•&nbsp; Total ₹{totalRupees}
            </p>

            <Link
              href="/bill"
              className="block w-full rounded-full bg-[#A62B34] py-4 text-center font-serif text-base font-semibold text-white shadow-md transition hover:bg-[#91242C] active:scale-[0.98] hover-lift"
            >
              View Bill &amp; Settle
            </Link>
          </div>
        )}
      </main>

      {/* Bottom Sticky Navigation */}
      <BottomNavBar />
    </div>
  );
};
