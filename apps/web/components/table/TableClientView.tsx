"use client";

import React, { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { TableArchedCard } from "./TableArchedCard";
import { switchTableSessionAction } from "@/app/t/actions";
import { X, Check, Utensils, QrCode, ArrowLeft, RefreshCw, Trash2, Plus } from "lucide-react";

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
  items: initialItems,
  totalRupees: initialTotal,
  totalItemsCount: initialCount,
}) => {
  const router = useRouter();

  // Local state for items and interactive upsell
  const [itemsList, setItemsList] = useState<TableItemView[]>(initialItems);
  const [hasAddedBoard, setHasAddedBoard] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [activeItemModal, setActiveItemModal] = useState<TableItemView | null>(null);
  const [switchingTable, setSwitchingTable] = useState<string | null>(null);

  // Toggle upsell Conversation Board
  const toggleConversationBoard = () => {
    if (!hasAddedBoard) {
      const boardItem: TableItemView = {
        id: "upsell-board-" + Date.now(),
        name: "Conversation Board",
        category: "FOOD",
        quantity: 1,
        priceRupees: 260,
        subtotalRupees: 260,
        modifier: "• Cheese, fruits & nuts",
      };
      setItemsList((prev) => [...prev, boardItem]);
      setHasAddedBoard(true);
    } else {
      setItemsList((prev) => prev.filter((i) => !i.id.startsWith("upsell-board")));
      setHasAddedBoard(false);
    }
  };

  // Group items by category in exact order: COFFEE -> CHAI -> FOOD
  const categoryOrder = ["COFFEE", "CHAI", "FOOD"];
  const grouped = categoryOrder
    .map((cat) => ({
      name: cat,
      items: itemsList.filter((i) => i.category === cat),
    }))
    .filter((g) => g.items.length > 0);

  // Calculate live total and count
  const liveCount = itemsList.reduce((acc, it) => acc + it.quantity, 0);
  const liveTotal = itemsList.reduce((acc, it) => acc + it.subtotalRupees, 0);

  // Switch table handler
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
      setDrawerOpen(false);
    }
  };

  // Item options: duplicate item
  const handleAddAnother = (item: TableItemView) => {
    setItemsList((prev) =>
      prev.map((i) =>
        i.id === item.id
          ? {
              ...i,
              quantity: i.quantity + 1,
              subtotalRupees: (i.quantity + 1) * i.priceRupees,
            }
          : i
      )
    );
    setActiveItemModal(null);
  };

  // Item options: remove item
  const handleRemoveItem = (item: TableItemView) => {
    setItemsList((prev) => prev.filter((i) => i.id !== item.id));
    if (item.name.toLowerCase().includes("conversation board")) {
      setHasAddedBoard(false);
    }
    setActiveItemModal(null);
  };

  return (
    <div className="min-h-screen bg-[#F4ECE1] text-[#1C1917] font-sans antialiased flex flex-col justify-between selection:bg-[#963336]/20 selection:text-[#963336]">
      {/* Mobile-Proportioned Container */}
      <div className="w-full max-w-[420px] mx-auto px-4 pt-2 pb-4 flex-1 flex flex-col justify-between">
        {/* Top Header Bar */}
        <header className="flex items-center justify-between py-1 px-1 mb-1">
          {/* Hamburger Menu Icon */}
          <button
            type="button"
            onClick={() => setDrawerOpen(true)}
            aria-label="Open Navigation"
            className="p-1 -ml-1 text-[#1C1917] hover:opacity-75 active:scale-95 transition cursor-pointer"
          >
            <svg
              width="24"
              height="20"
              viewBox="0 0 24 20"
              fill="none"
              stroke="#1C1917"
              strokeWidth="2.2"
              strokeLinecap="round"
            >
              <line x1="2" y1="3" x2="22" y2="3" />
              <line x1="2" y1="10" x2="22" y2="10" />
              <line x1="2" y1="17" x2="22" y2="17" />
            </svg>
          </button>

          {/* Centered Title "Your Table" */}
          <h1 className="font-serif font-bold text-[24px] tracking-tight text-[#1C1917] text-center">
            Your Table
          </h1>

          {/* Right Action "Add more" */}
          <Link
            href="/menu"
            className="font-serif text-[15px] font-medium text-[#8C292E] hover:opacity-85 active:scale-95 transition"
          >
            Add more
          </Link>
        </header>

        {/* Center Main Ticket Card with Stepped Arch Silhouette */}
        <div className="w-full">
          <TableArchedCard
            tableNumber={currentTableLabel}
            guestCount={guestCount}
          >
            {/* Categorized Item List */}
            <div className="w-full">
              {grouped.map((group, groupIdx) => (
                <div key={group.name} className="w-full">
                  {/* Category Header Bar */}
                  <div className={`px-4 py-1.5 bg-[#FAF5EE] ${groupIdx > 0 ? "border-t" : ""} border-b border-[#E8DFD3]`}>
                    <span className="font-mono text-[10.5px] font-bold uppercase tracking-[0.16em] text-[#382E28]">
                      {group.name}
                    </span>
                  </div>

                  {/* Items in this Category */}
                  <div className="divide-y divide-[#EBE3D7]">
                    {group.items.map((item) => (
                      <div
                        key={item.id}
                        className="px-4 py-2 flex items-start justify-between gap-2 hover:bg-[#F5EDE1]/60 transition-colors"
                      >
                        {/* Left: Quantity + Details */}
                        <div className="flex items-start gap-2.5 min-w-0 pr-2">
                          <span className="font-serif font-bold text-[16px] text-[#1C1917] w-4 shrink-0 text-left pt-0.5">
                            {item.quantity}
                          </span>
                          <div className="min-w-0">
                            <h2 className="font-serif font-bold text-[15.5px] text-[#1C1917] leading-tight whitespace-pre-line">
                              {item.name}
                            </h2>
                            {item.modifier && (
                              <p className="font-mono text-[11.5px] text-[#332A24] mt-0.5 tracking-tight">
                                {item.modifier}
                              </p>
                            )}
                          </div>
                        </div>

                        {/* Right: Price + "•••" Options Button */}
                        <div className="flex items-center gap-3 shrink-0 self-start pt-0.5">
                          <span className="font-serif font-medium text-[15.5px] text-[#1C1917] tracking-tight">
                            ₹{item.subtotalRupees}
                          </span>
                          <button
                            type="button"
                            onClick={() => setActiveItemModal(item)}
                            className="text-[#1C1917] text-[18px] font-bold tracking-widest px-1 py-0.5 hover:opacity-60 active:scale-90 transition cursor-pointer"
                            aria-label={`Options for ${item.name}`}
                          >
                            •••
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>

            {/* "Make it a moment?" Upsell Banner */}
            <div className="p-3">
              <div className="rounded-[1.4rem] border border-[#BCC9BD] bg-gradient-to-br from-[#DFE5DE] via-[#D7E1D6] to-[#CCD7CB] p-3 shadow-xs transition-all">
                <h3 className="font-serif font-semibold text-[16px] text-[#1C1917] mb-1.5">
                  Make it a moment?
                </h3>

                <div className="flex items-center justify-between gap-2">
                  {/* Left: Platter Illustration */}
                  <div className="shrink-0 -ml-1 flex items-center justify-center">
                    <Image
                      src="/conversation_board_clean.png"
                      alt="Conversation Board"
                      width={100}
                      height={64}
                      className="w-[100px] h-[64px] object-contain select-none pointer-events-none"
                    />
                  </div>

                  {/* Center: Title & Description */}
                  <div className="flex-1 min-w-0 pr-1">
                    <h4 className="font-serif font-bold text-[13.5px] text-[#1C1917] leading-snug truncate">
                      Conversation Board
                    </h4>
                    <p className="font-mono text-[10.5px] text-[#374438] leading-tight mt-0.5">
                      Cheese, fruits, nuts &amp; a little something sweet.
                    </p>
                  </div>

                  {/* Right: Price & Add/Remove Circular Button */}
                  <div className="flex flex-col items-end gap-1.5 shrink-0 pl-1">
                    <div className="flex items-center gap-1 font-serif text-right">
                      <span className="line-through font-mono text-[11px] text-[#617062]">
                        ₹350
                      </span>
                      <span className="font-serif font-bold text-[13.5px] text-[#1C1917]">
                        ₹260
                      </span>
                    </div>

                    <button
                      type="button"
                      onClick={toggleConversationBoard}
                      className={`w-9 h-9 rounded-full border border-[#231F1D] flex items-center justify-center transition-all duration-200 active:scale-90 shadow-xs cursor-pointer ${
                        hasAddedBoard
                          ? "bg-emerald-700 text-white border-emerald-900"
                          : "bg-[#EBB974] text-[#1C1917] hover:bg-[#DEAB65]"
                      }`}
                      aria-label="Add Conversation Board"
                    >
                      {hasAddedBoard ? (
                        <Check className="w-4 h-4 stroke-[2.5]" />
                      ) : (
                        <Plus className="w-4 h-4 stroke-[2.5]" />
                      )}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </TableArchedCard>
        </div>

        {/* Bottom Section (Outside the Card): Total & "View Bill" CTA */}
        <div className="pt-3 pb-1 text-center space-y-2.5">
          {/* Summary Items & Total */}
          <p className="font-serif text-[15px] font-medium text-[#1C1917] tracking-wide">
            {liveCount} items &nbsp;•&nbsp; Total ₹{liveTotal}
          </p>

          {/* Primary CTA Button: "View Bill" */}
          <Link
            href="/bill"
            className="w-full block rounded-full bg-[#963336] hover:bg-[#832B2E] active:scale-[0.99] text-white font-serif text-[17.5px] font-medium py-3.5 shadow-sm transition duration-150 cursor-pointer text-center"
          >
            View Bill
          </Link>

          {/* iPhone Home Indicator Bar */}
          <div className="pt-2">
            <div className="w-32 h-1 bg-[#1C1917] rounded-full mx-auto opacity-75" />
          </div>
        </div>
      </div>

      {/* Hamburger Navigation Drawer Modal */}
      {drawerOpen && (
        <div className="fixed inset-0 z-50 flex">
          {/* Backdrop */}
          <div
            className="fixed inset-0 bg-black/40 backdrop-blur-xs transition-opacity animate-fade-in"
            onClick={() => setDrawerOpen(false)}
          />

          {/* Slide-out Panel */}
          <div className="relative w-4/5 max-w-xs bg-[#FAF5EE] border-r border-[#D8CCBD] h-full p-6 flex flex-col justify-between shadow-xl z-10 animate-fade-in-up">
            <div className="space-y-6">
              <div className="flex items-center justify-between pb-3 border-b border-[#E8DFD3]">
                <div>
                  <h3 className="font-serif text-xl font-bold text-[#1C1917]">
                    smol café
                  </h3>
                  <p className="font-mono text-[11px] text-[#725039]">
                    Table {currentTableLabel} • Rishikesh
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setDrawerOpen(false)}
                  className="p-1 rounded-full text-[#1C1917] hover:bg-black/5"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Navigation Links */}
              <nav className="space-y-2">
                <Link
                  href="/menu"
                  onClick={() => setDrawerOpen(false)}
                  className="flex items-center gap-3 px-3 py-2.5 rounded-xl font-serif text-sm font-semibold text-[#1C1917] hover:bg-[#F3E7D3] transition"
                >
                  <Utensils className="w-4 h-4 text-[#963336]" />
                  <span>Browse Full Menu</span>
                </Link>

                <Link
                  href={`/t/${currentTableLabel}`}
                  onClick={() => setDrawerOpen(false)}
                  className="flex items-center gap-3 px-3 py-2.5 rounded-xl font-serif text-sm font-semibold text-[#1C1917] hover:bg-[#F3E7D3] transition"
                >
                  <QrCode className="w-4 h-4 text-[#963336]" />
                  <span>Table QR Poster</span>
                </Link>

                <Link
                  href="/bill"
                  onClick={() => setDrawerOpen(false)}
                  className="flex items-center gap-3 px-3 py-2.5 rounded-xl font-serif text-sm font-semibold text-[#1C1917] hover:bg-[#F3E7D3] transition"
                >
                  <span className="font-mono text-[#963336] font-bold">₹</span>
                  <span>View Bill &amp; Settle</span>
                </Link>
              </nav>

              {/* Quick Table Switcher */}
              <div className="pt-2">
                <p className="font-mono text-[10px] uppercase font-bold tracking-wider text-[#725039] mb-2">
                  Switch Active Table:
                </p>
                <div className="grid grid-cols-4 gap-1.5">
                  {Array.from({ length: 12 }, (_, i) =>
                    (i + 1).toString().padStart(2, "0")
                  ).map((lbl) => (
                    <button
                      key={lbl}
                      type="button"
                      onClick={() => handleTableSwitch(lbl)}
                      disabled={switchingTable === lbl}
                      className={`py-1 rounded-lg font-mono text-xs font-bold border transition ${
                        lbl === currentTableLabel
                          ? "bg-[#963336] text-white border-[#963336]"
                          : "border-[#E2D7C7] bg-[#FAF5EE] text-[#1C1917] hover:bg-[#EFE7DC]"
                      }`}
                    >
                      T{lbl}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="pt-4 border-t border-[#E8DFD3] text-center">
              <p className="font-serif italic text-xs text-[#725039]">
                “A lived-in neighbourhood café”
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Item Action "•••" Bottom Sheet Dialog */}
      {activeItemModal && (
        <div className="fixed inset-0 z-50 flex items-end justify-center">
          <div
            className="fixed inset-0 bg-black/40 backdrop-blur-xs transition-opacity"
            onClick={() => setActiveItemModal(null)}
          />
          <div className="relative w-full max-w-[424px] bg-[#FAF5EE] border-t border-x border-[#D8CCBD] rounded-t-3xl p-5 shadow-2xl z-10 animate-fade-in-up">
            <div className="w-12 h-1 bg-[#D8CCBD] rounded-full mx-auto mb-4" />
            <div className="flex items-start justify-between pb-3 border-b border-[#E8DFD3]">
              <div>
                <h4 className="font-serif font-bold text-lg text-[#1C1917]">
                  {activeItemModal.name}
                </h4>
                <p className="font-mono text-xs text-[#725039] mt-0.5">
                  ₹{activeItemModal.priceRupees} each &nbsp;•&nbsp; Qty: {activeItemModal.quantity}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setActiveItemModal(null)}
                className="p-1 rounded-full text-[#1C1917] hover:bg-black/5"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="py-4 space-y-2.5">
              <button
                type="button"
                onClick={() => handleAddAnother(activeItemModal)}
                className="w-full flex items-center justify-between px-4 py-3 rounded-xl bg-[#F3E7D3] hover:bg-[#ECE0CC] font-serif text-sm font-semibold text-[#1C1917] transition"
              >
                <span>Order another round (+1)</span>
                <Plus className="w-4 h-4 text-[#963336]" />
              </button>

              <button
                type="button"
                onClick={() => handleRemoveItem(activeItemModal)}
                className="w-full flex items-center justify-between px-4 py-3 rounded-xl bg-red-50 hover:bg-red-100 font-serif text-sm font-semibold text-red-800 transition"
              >
                <span>Remove from table</span>
                <Trash2 className="w-4 h-4 text-red-700" />
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
