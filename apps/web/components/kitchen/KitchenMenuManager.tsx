"use client";

import React, { useState, useEffect, useMemo } from "react";
import {
  ChefHat,
  Search,
  CheckCircle2,
  AlertTriangle,
  Flame,
  Sparkles,
  Layers,
  Edit3,
  X,
  Plus,
  Minus,
  Check,
  Package,
  RefreshCw,
} from "lucide-react";
import {
  type KitchenMenuItem,
  type KitchenIngredientItem,
  type ItemStockStatus,
  fetchKitchenMenuCatalogAction,
  updateMenuItemStockAction,
  updateChefItemNotesAction,
  updateIngredientStockAction,
} from "@/app/kitchen/menu-actions";
import { broadcastSyncEvent } from "@/lib/sync-events";

interface KitchenMenuManagerProps {
  onClose?: () => void;
}

export const KitchenMenuManager: React.FC<KitchenMenuManagerProps> = () => {
  const [items, setItems] = useState<KitchenMenuItem[]>([]);
  const [ingredients, setIngredients] = useState<KitchenIngredientItem[]>([]);
  const [stations, setStations] = useState<string[]>([]);
  const [selectedStation, setSelectedStation] = useState<string>("All Stations");
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [stockFilter, setStockFilter] = useState<"ALL" | "IN_STOCK" | "LOW_STOCK" | "SOLD_OUT">("ALL");

  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [feedback, setFeedback] = useState<{ type: "success" | "error"; text: string } | null>(null);

  // Chef Note Modal state
  const [noteItem, setNoteItem] = useState<KitchenMenuItem | null>(null);
  const [noteText, setNoteText] = useState<string>("");
  const [isSpecial, setIsSpecial] = useState<boolean>(false);
  const [isSavingNote, setIsSavingNote] = useState<boolean>(false);

  // Load menu items on mount
  const loadData = async () => {
    setIsLoading(true);
    try {
      const res = await fetchKitchenMenuCatalogAction();
      if (res.success) {
        setItems(res.items);
        setIngredients(res.ingredients);
        setStations(res.stations);
      }
    } catch {
      setFeedback({ type: "error", text: "Failed to load kitchen menu catalog." });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // Compute stats
  const stats = useMemo(() => {
    const total = items.length;
    const inStock = items.filter((i) => i.stockStatus === "IN_STOCK").length;
    const lowStock = items.filter((i) => i.stockStatus === "LOW_STOCK").length;
    const soldOut = items.filter((i) => i.stockStatus === "SOLD_OUT").length;
    const specials = items.filter((i) => i.isChefSpecial).length;
    return { total, inStock, lowStock, soldOut, specials };
  }, [items]);

  // Filtered menu items
  const filteredItems = useMemo(() => {
    return items.filter((item) => {
      const matchStation = selectedStation === "All Stations" || item.station === selectedStation;
      const matchStock = stockFilter === "ALL" || item.stockStatus === stockFilter;
      const matchSearch =
        !searchQuery.trim() ||
        item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.category.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (item.coreIngredients || "").toLowerCase().includes(searchQuery.toLowerCase());
      return matchStation && matchStock && matchSearch;
    });
  }, [items, selectedStation, stockFilter, searchQuery]);

  // Toggle Item Stock Status (IN_STOCK / LOW_STOCK / SOLD_OUT)
  const handleSetStock = async (itemId: string, newStatus: ItemStockStatus, count: number = 3) => {
    // Optimistic update
    setItems((prev) =>
      prev.map((i) => (i.id === itemId ? { ...i, stockStatus: newStatus, lowStockCount: count } : i))
    );

    try {
      const res = await updateMenuItemStockAction(itemId, newStatus, count);
      if (res.success) {
        broadcastSyncEvent({
          type: "STATUS_CHANGED",
          orderId: itemId,
          status: newStatus as any,
          timestamp: Date.now(),
        });
        setFeedback({ type: "success", text: res.message });
      }
    } catch {
      setFeedback({ type: "error", text: "Failed to update item availability." });
      loadData();
    }
  };

  // Adjust Low Stock Count
  const handleAdjustCount = async (itemId: string, delta: number) => {
    const current = items.find((i) => i.id === itemId);
    if (!current) return;
    const currentCount = current.lowStockCount ?? 3;
    const newCount = Math.max(1, currentCount + delta);

    setItems((prev) =>
      prev.map((i) => (i.id === itemId ? { ...i, lowStockCount: newCount } : i))
    );

    try {
      await updateMenuItemStockAction(itemId, "LOW_STOCK", newCount);
    } catch {
      // ignore
    }
  };

  // Open Chef Note Modal
  const handleOpenNoteModal = (item: KitchenMenuItem) => {
    setNoteItem(item);
    setNoteText(item.chefNotes || "");
    setIsSpecial(item.isChefSpecial || false);
  };

  // Submit Chef Note
  const handleSaveNote = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!noteItem) return;
    setIsSavingNote(true);
    try {
      const res = await updateChefItemNotesAction(noteItem.id, noteText, isSpecial);
      if (res.success) {
        setItems((prev) =>
          prev.map((i) =>
            i.id === noteItem.id ? { ...i, chefNotes: noteText.trim(), isChefSpecial: isSpecial } : i
          )
        );
        setNoteItem(null);
        setFeedback({ type: "success", text: "Chef notes updated!" });
      }
    } catch {
      setFeedback({ type: "error", text: "Error saving chef notes." });
    } finally {
      setIsSavingNote(false);
    }
  };

  // Toggle Ingredient Stock
  const handleToggleIngredient = async (name: string, current: boolean) => {
    const nextState = !current;
    setIngredients((prev) =>
      prev.map((ing) => (ing.name === name ? { ...ing, inStock: nextState } : ing))
    );

    try {
      const res = await updateIngredientStockAction(name, nextState);
      setFeedback({ type: "success", text: res.message });
    } catch {
      setFeedback({ type: "error", text: "Failed to update ingredient." });
    }
  };

  return (
    <div className="p-4 sm:p-6 space-y-6 max-w-7xl mx-auto">
      {/* Toast Feedback */}
      {feedback && (
        <div
          className={`flex items-center justify-between rounded-2xl p-4 text-xs font-mono transition-all border ${
            feedback.type === "success"
              ? "bg-emerald-50 text-emerald-900 border-emerald-300 dark:bg-emerald-950/80 dark:text-emerald-200 dark:border-emerald-800"
              : "bg-rose-50 text-rose-900 border-rose-300 dark:bg-rose-950/80 dark:text-rose-200 dark:border-rose-800"
          }`}
        >
          <div className="flex items-center gap-2">
            {feedback.type === "success" ? (
              <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600 dark:text-emerald-400" />
            ) : (
              <AlertTriangle className="h-4 w-4 shrink-0 text-rose-600 dark:text-rose-400" />
            )}
            <span>{feedback.text}</span>
          </div>
          <button onClick={() => setFeedback(null)} className="text-stone-400 hover:text-stone-700">
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      {/* Header & Quick Action */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-2xl bg-[#B72E35] text-white shadow-xs">
              <ChefHat className="h-5 w-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="font-serif text-2xl font-bold text-[#241F1C] dark:text-white">
                  Daily Kitchen Menu & 86 Editor
                </h1>
                <span className="rounded-full bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800 px-2 py-0.5 text-[11px] font-mono font-bold">
                  Chef Live
                </span>
              </div>
              <p className="font-mono text-xs text-[#725039] dark:text-stone-400 mt-0.5">
                Toggle dish availability (86), set low-stock portion alerts, and update daily chef specials.
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={loadData}
            className="flex items-center gap-1.5 rounded-2xl border border-[#C9AE8B]/50 dark:border-stone-700 bg-[#FAF4EB] dark:bg-stone-900 px-3.5 py-2 text-xs font-mono font-bold text-[#241F1C] dark:text-white hover:bg-[#F3E7D3] dark:hover:bg-stone-800 transition"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${isLoading ? "animate-spin" : ""}`} />
            <span>Sync Catalog</span>
          </button>
        </div>
      </div>

      {/* Chef Quick Status Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
        <div className="rounded-2xl border border-[#C9AE8B]/40 dark:border-stone-800 bg-[#FAF4EB] dark:bg-[#1C1815] p-3 shadow-xs">
          <span className="text-[10px] font-mono uppercase text-[#725039] dark:text-stone-400 block">Total Dishes</span>
          <p className="mt-1 text-2xl font-serif font-bold text-[#241F1C] dark:text-white">{stats.total}</p>
        </div>

        <div className="rounded-2xl border border-emerald-300/60 dark:border-emerald-900/60 bg-emerald-50/50 dark:bg-emerald-950/20 p-3 shadow-xs">
          <span className="text-[10px] font-mono uppercase text-emerald-800 dark:text-emerald-300 block font-bold">
            In Stock
          </span>
          <p className="mt-1 text-2xl font-serif font-bold text-emerald-700 dark:text-emerald-400">{stats.inStock}</p>
        </div>

        <div className="rounded-2xl border border-amber-300/60 dark:border-amber-900/60 bg-amber-50/50 dark:bg-amber-950/20 p-3 shadow-xs">
          <span className="text-[10px] font-mono uppercase text-amber-800 dark:text-amber-300 block font-bold">
            Low Stock (Portions)
          </span>
          <p className="mt-1 text-2xl font-serif font-bold text-amber-700 dark:text-amber-400">{stats.lowStock}</p>
        </div>

        <div className="rounded-2xl border border-rose-300/60 dark:border-rose-900/60 bg-rose-50/50 dark:bg-rose-950/20 p-3 shadow-xs">
          <span className="text-[10px] font-mono uppercase text-rose-800 dark:text-rose-300 block font-bold">
            86 / Sold Out
          </span>
          <p className="mt-1 text-2xl font-serif font-bold text-rose-700 dark:text-rose-400">{stats.soldOut}</p>
        </div>

        <div className="rounded-2xl border border-[#C9AE8B]/40 dark:border-stone-800 bg-[#FAF4EB] dark:bg-[#1C1815] p-3 shadow-xs col-span-2 sm:col-span-1">
          <span className="text-[10px] font-mono uppercase text-[#754CFF] block font-bold">✦ Chef Specials</span>
          <p className="mt-1 text-2xl font-serif font-bold text-[#754CFF]">{stats.specials}</p>
        </div>
      </div>

      {/* Critical Ingredient Inventory Quick Bar */}
      <div className="rounded-3xl border border-[#C9AE8B]/40 dark:border-stone-800 bg-[#FAF4EB] dark:bg-[#1A1715] p-4 shadow-xs">
        <div className="flex items-center justify-between mb-2.5">
          <div className="flex items-center gap-2">
            <Package className="h-4 w-4 text-[#B72E35] dark:text-[#F2C84B]" />
            <span className="font-serif text-sm font-bold text-[#241F1C] dark:text-white">
              Chef&apos;s Core Ingredients Stock Check
            </span>
          </div>
          <span className="text-[11px] font-mono text-stone-500">Tap to toggle pantry status</span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-8 gap-2">
          {ingredients.map((ing) => (
            <button
              key={ing.name}
              onClick={() => handleToggleIngredient(ing.name, ing.inStock)}
              className={`p-2 rounded-2xl border text-left transition flex flex-col justify-between ${
                ing.inStock
                  ? "bg-white dark:bg-stone-900 border-[#C9AE8B]/40 dark:border-stone-800 hover:border-emerald-500"
                  : "bg-rose-50 dark:bg-rose-950/40 border-rose-300 dark:border-rose-900 text-rose-800 dark:text-rose-300"
              }`}
            >
              <div className="flex items-center justify-between">
                <span
                  className={`h-2 w-2 rounded-full ${ing.inStock ? "bg-emerald-500" : "bg-rose-500 animate-pulse"}`}
                />
                <span className="text-[9px] font-mono text-stone-400 uppercase font-bold">
                  {ing.inStock ? "OK" : "DEPLETED"}
                </span>
              </div>
              <span className="text-xs font-serif font-bold text-[#241F1C] dark:text-white block mt-1 line-clamp-1">
                {ing.name}
              </span>
              <span className="text-[9.5px] font-mono text-stone-500 mt-0.5">
                {ing.affectedItemsCount} dishes
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* Station Tabs & Stock Filters */}
      <div className="space-y-3 border-b border-[#C9AE8B]/30 dark:border-stone-800 pb-4">
        {/* Stations */}
        <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-1">
          {stations.map((st) => (
            <button
              key={st}
              onClick={() => setSelectedStation(st)}
              className={`shrink-0 rounded-xl px-3 py-1.5 text-xs font-mono font-bold transition ${
                selectedStation === st
                  ? "bg-[#241F1C] text-white dark:bg-white dark:text-[#241F1C] shadow-xs"
                  : "bg-[#FAF4EB] text-[#725039] border border-[#C9AE8B]/40 dark:bg-stone-900 dark:text-stone-400 dark:border-stone-800 hover:bg-[#F3E7D3]"
              }`}
            >
              {st}
            </button>
          ))}
        </div>

        {/* Stock Status Pills & Search */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
          <div className="flex items-center gap-1.5">
            <span className="text-[11px] font-mono text-stone-500 mr-1">Status:</span>
            {(["ALL", "IN_STOCK", "LOW_STOCK", "SOLD_OUT"] as const).map((s) => (
              <button
                key={s}
                onClick={() => setStockFilter(s)}
                className={`rounded-xl px-2.5 py-1 text-[11px] font-mono font-bold transition border ${
                  stockFilter === s
                    ? s === "SOLD_OUT"
                      ? "bg-rose-600 text-white border-rose-600"
                      : s === "LOW_STOCK"
                      ? "bg-amber-600 text-white border-amber-600"
                      : "bg-[#B72E35] text-white border-[#B72E35]"
                    : "bg-[#FAF4EB] text-stone-600 border-[#C9AE8B]/40 dark:bg-stone-900 dark:text-stone-400 dark:border-stone-800"
                }`}
              >
                {s === "ALL" ? "All Items" : s === "IN_STOCK" ? "In Stock" : s === "LOW_STOCK" ? "Low Stock" : "86 Sold Out"}
              </button>
            ))}
          </div>

          <div className="relative w-full sm:w-64 shrink-0">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-stone-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search dish or ingredient..."
              className="w-full rounded-xl border border-[#C9AE8B]/40 dark:border-stone-800 bg-[#FAF4EB] dark:bg-stone-900 pl-9 pr-3 py-1.5 text-xs font-mono text-[#241F1C] dark:text-white placeholder-stone-400 focus:outline-none focus:ring-1 focus:ring-[#B72E35]"
            />
          </div>
        </div>
      </div>

      {/* Menu Items Grid */}
      {filteredItems.length === 0 ? (
        <div className="text-center py-16 rounded-3xl border border-dashed border-[#C9AE8B]/50 dark:border-stone-800 bg-[#FAF4EB]/40 dark:bg-stone-900/40 p-6">
          <ChefHat className="h-10 w-10 text-stone-400 mx-auto mb-2 opacity-50" />
          <p className="font-serif text-base font-bold text-[#241F1C] dark:text-white">No Menu Items Found</p>
          <p className="font-mono text-xs text-stone-500 mt-1">Try adjusting the station or stock filters above.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
          {filteredItems.map((item) => {
            const is86 = item.stockStatus === "SOLD_OUT";
            const isLow = item.stockStatus === "LOW_STOCK";

            return (
              <div
                key={item.id}
                className={`rounded-3xl border p-4 transition-all relative flex flex-col justify-between shadow-xs bg-[#FAF4EB] dark:bg-[#1A1715] ${
                  is86
                    ? "border-rose-300 dark:border-rose-900/80 bg-rose-50/30 dark:bg-rose-950/20"
                    : isLow
                    ? "border-amber-300 dark:border-amber-900/80 bg-amber-50/30 dark:bg-amber-950/20"
                    : "border-[#C9AE8B]/40 dark:border-stone-800"
                }`}
              >
                {/* Item Card Header */}
                <div>
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5">
                        <span className="text-[10px] font-mono uppercase text-[#725039] dark:text-stone-400 font-bold">
                          {item.station}
                        </span>
                        {item.isChefSpecial && (
                          <span className="flex items-center gap-0.5 text-[9.5px] font-mono font-bold bg-purple-100 text-purple-900 dark:bg-purple-950/80 dark:text-purple-300 px-1.5 py-0.2 rounded-md">
                            <Sparkles className="h-2.5 w-2.5" /> Special
                          </span>
                        )}
                      </div>
                      <h3 className="font-serif text-base font-bold text-[#241F1C] dark:text-white leading-tight mt-0.5 line-clamp-1">
                        {item.name}
                      </h3>
                      <p className="text-[11px] font-mono text-[#725039] dark:text-stone-400">
                        {item.category} • ₹{item.priceRupees}
                      </p>
                    </div>

                    {/* Quick Chef Note Edit Icon */}
                    <button
                      onClick={() => handleOpenNoteModal(item)}
                      className="p-1.5 rounded-xl border border-[#C9AE8B]/40 dark:border-stone-700 hover:bg-[#F3E7D3] dark:hover:bg-stone-800 transition text-[#725039] dark:text-stone-300"
                      title="Chef note / recommendation"
                    >
                      <Edit3 className="h-3.5 w-3.5" />
                    </button>
                  </div>

                  {/* Chef Daily Note Display if present */}
                  {item.chefNotes && (
                    <div className="mt-2 text-[10.5px] font-mono italic bg-[#F3E7D3]/70 dark:bg-stone-900/80 p-2 rounded-xl text-[#725039] dark:text-stone-300 border border-[#C9AE8B]/30 dark:border-stone-800">
                      &ldquo;{item.chefNotes}&rdquo;
                    </div>
                  )}
                </div>

                {/* 3-State Availability Control Bar */}
                <div className="mt-4 pt-3 border-t border-[#C9AE8B]/20 dark:border-stone-800 space-y-2">
                  <div className="grid grid-cols-3 gap-1">
                    {/* State 1: IN STOCK */}
                    <button
                      onClick={() => handleSetStock(item.id, "IN_STOCK")}
                      className={`py-1.5 px-2 rounded-xl font-mono text-[11px] font-bold transition flex items-center justify-center gap-1 ${
                        item.stockStatus === "IN_STOCK"
                          ? "bg-emerald-600 text-white shadow-xs"
                          : "bg-white dark:bg-stone-900 text-stone-600 dark:text-stone-400 border border-stone-200 dark:border-stone-800 hover:bg-emerald-50 dark:hover:bg-emerald-950/40"
                      }`}
                    >
                      {item.stockStatus === "IN_STOCK" && <Check className="h-3 w-3" />}
                      <span>IN STOCK</span>
                    </button>

                    {/* State 2: LOW STOCK */}
                    <button
                      onClick={() => handleSetStock(item.id, "LOW_STOCK", item.lowStockCount || 3)}
                      className={`py-1.5 px-2 rounded-xl font-mono text-[11px] font-bold transition flex items-center justify-center gap-1 ${
                        isLow
                          ? "bg-amber-500 text-white shadow-xs"
                          : "bg-white dark:bg-stone-900 text-stone-600 dark:text-stone-400 border border-stone-200 dark:border-stone-800 hover:bg-amber-50 dark:hover:bg-amber-950/40"
                      }`}
                    >
                      <span>LOW</span>
                    </button>

                    {/* State 3: 86 / SOLD OUT */}
                    <button
                      onClick={() => handleSetStock(item.id, "SOLD_OUT")}
                      className={`py-1.5 px-2 rounded-xl font-mono text-[11px] font-bold transition flex items-center justify-center gap-1 ${
                        is86
                          ? "bg-rose-600 text-white shadow-xs"
                          : "bg-white dark:bg-stone-900 text-stone-600 dark:text-stone-400 border border-stone-200 dark:border-stone-800 hover:bg-rose-50 dark:hover:bg-rose-950/40"
                      }`}
                    >
                      <span>86 (OUT)</span>
                    </button>
                  </div>

                  {/* Low Stock Portions Counter */}
                  {isLow && (
                    <div className="flex items-center justify-between bg-amber-100/70 dark:bg-amber-950/40 p-1.5 rounded-xl border border-amber-300 dark:border-amber-800">
                      <span className="text-[10px] font-mono text-amber-900 dark:text-amber-300 font-bold">
                        Remaining Portions:
                      </span>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => handleAdjustCount(item.id, -1)}
                          className="h-6 w-6 flex items-center justify-center rounded-lg bg-white dark:bg-stone-900 text-stone-700 dark:text-stone-200 border border-amber-300 dark:border-amber-800"
                        >
                          <Minus className="h-3 w-3" />
                        </button>
                        <span className="font-mono text-xs font-bold text-amber-900 dark:text-amber-200 min-w-4 text-center">
                          {item.lowStockCount ?? 3}
                        </span>
                        <button
                          onClick={() => handleAdjustCount(item.id, 1)}
                          className="h-6 w-6 flex items-center justify-center rounded-lg bg-white dark:bg-stone-900 text-stone-700 dark:text-stone-200 border border-amber-300 dark:border-amber-800"
                        >
                          <Plus className="h-3 w-3" />
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ========================================================================= */}
      {/* CHEF NOTE & SPECIAL MODAL                                                */}
      {/* ========================================================================= */}
      {noteItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-fade-in">
          <div className="relative w-full max-w-md rounded-3xl border border-[#C9AE8B]/50 dark:border-stone-700 bg-[#FAF4EB] dark:bg-[#1A1715] p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-[#C9AE8B]/30 dark:border-stone-800 pb-3">
              <div>
                <h3 className="font-serif text-lg font-bold text-[#241F1C] dark:text-white">
                  Chef Notes: {noteItem.name}
                </h3>
                <p className="text-[11px] font-mono text-stone-500">Live notes displayed to customers on menu</p>
              </div>
              <button onClick={() => setNoteItem(null)} className="text-stone-400 hover:text-stone-600">
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleSaveNote} className="space-y-4">
              <div>
                <label className="block text-xs font-mono font-bold text-[#241F1C] dark:text-stone-300 mb-1">
                  Daily Preparation Notice / Note
                </label>
                <textarea
                  rows={3}
                  value={noteText}
                  onChange={(e) => setNoteText(e.target.value)}
                  placeholder="e.g. Fresh batch out of oven at 4 PM! Extra creamy paneer today."
                  className="w-full rounded-xl border border-[#C9AE8B]/50 dark:border-stone-700 bg-white dark:bg-stone-900 p-3 text-xs font-mono text-[#241F1C] dark:text-white focus:outline-none focus:ring-2 focus:ring-[#B72E35]"
                />
              </div>

              <div className="flex items-center justify-between rounded-xl bg-[#F3E7D3]/60 dark:bg-stone-900/60 p-3 border border-[#C9AE8B]/30 dark:border-stone-800">
                <div className="flex items-center gap-2">
                  <Sparkles className="h-4 w-4 text-[#754CFF]" />
                  <div>
                    <span className="block text-xs font-mono font-bold text-[#241F1C] dark:text-white">
                      Today&apos;s Recommendation
                    </span>
                    <span className="text-[10px] font-mono text-stone-500">
                      Highlights item with &ldquo;Chef&apos;s Special ✦&rdquo; badge
                    </span>
                  </div>
                </div>
                <input
                  type="checkbox"
                  checked={isSpecial}
                  onChange={(e) => setIsSpecial(e.target.checked)}
                  className="h-5 w-5 accent-[#754CFF] cursor-pointer"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-[#C9AE8B]/20 dark:border-stone-800">
                <button
                  type="button"
                  onClick={() => setNoteItem(null)}
                  className="rounded-xl px-4 py-2 text-xs font-mono text-stone-600 dark:text-stone-400 hover:bg-black/5"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSavingNote}
                  className="rounded-xl bg-[#B72E35] hover:bg-[#9B252B] px-5 py-2 text-xs font-mono font-bold text-white shadow-md transition disabled:opacity-50"
                >
                  {isSavingNote ? "Saving..." : "Save Note"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
