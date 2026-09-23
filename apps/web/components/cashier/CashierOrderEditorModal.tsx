"use client";

import React, { useState, useEffect } from "react";
import { X, Plus, Minus, Trash2, Search, Coffee, UtensilsCrossed, AlertCircle, Check, Loader2 } from "lucide-react";
import {
  fetchAllMenuItemsForCashierAction,
  type PendingOrderVerification,
  type MenuCatalogItem,
  type EditCashierOrderItemInput,
} from "@/app/cashier/actions";

interface CashierOrderEditorModalProps {
  order: PendingOrderVerification | null;
  isOpen: boolean;
  onClose: () => void;
  onSaveSuccess: () => void;
}

interface EditableItem {
  key: string;
  menuItemId?: string;
  name: string;
  qty: number;
  unitPricePaise: number;
  isBeverage: boolean;
}

export const CashierOrderEditorModal: React.FC<CashierOrderEditorModalProps> = ({
  order,
  isOpen,
  onClose,
  onSaveSuccess,
}) => {
  const [items, setItems] = useState<EditableItem[]>([]);
  const [instructions, setInstructions] = useState<string>("");
  const [catalog, setCatalog] = useState<MenuCatalogItem[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCatalogItem, setSelectedCatalogItem] = useState<MenuCatalogItem | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Initialize editable state whenever an order is opened
  useEffect(() => {
    if (order) {
      setItems(
        order.items.map((i, idx) => ({
          key: i.id || `item_${idx}_${Date.now()}`,
          menuItemId: i.menuItemId,
          name: i.name,
          qty: i.qty,
          unitPricePaise: i.unitPricePaise,
          isBeverage: i.isBeverage,
        }))
      );
      setInstructions(order.instructions || "");
      setErrorMessage(null);
    }
  }, [order]);

  // Fetch full menu catalog once
  useEffect(() => {
    if (isOpen) {
      fetchAllMenuItemsForCashierAction().then((res) => {
        if (res.success && res.items) {
          setCatalog(res.items);
        }
      });
    }
  }, [isOpen]);

  if (!isOpen || !order) return null;

  const handleQtyChange = (key: string, delta: number) => {
    setItems((prev) =>
      prev
        .map((it) => {
          if (it.key === key) {
            const newQty = it.qty + delta;
            return newQty > 0 ? { ...it, qty: newQty } : null;
          }
          return it;
        })
        .filter((it): it is EditableItem => it !== null)
    );
  };

  const handleRemoveItem = (key: string) => {
    setItems((prev) => prev.filter((it) => it.key !== key));
  };

  const handleAddItemFromCatalog = (item: MenuCatalogItem) => {
    setItems((prev) => {
      // Check if already in order
      const existing = prev.find((it) => it.name.toLowerCase() === item.name.toLowerCase());
      if (existing) {
        return prev.map((it) =>
          it.key === existing.key ? { ...it, qty: it.qty + 1 } : it
        );
      }
      return [
        ...prev,
        {
          key: `new_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
          menuItemId: item.id,
          name: item.name,
          qty: 1,
          unitPricePaise: item.pricePaise,
          isBeverage: item.isBeverage,
        },
      ];
    });
    setSelectedCatalogItem(null);
    setSearchQuery("");
  };

  // Calculations
  const subtotalPaise = items.reduce((acc, it) => acc + it.unitPricePaise * it.qty, 0);
  const taxPaise = Math.round(subtotalPaise * 0.05); // 5% GST
  const grandTotalPaise = subtotalPaise + taxPaise;

  const handleSave = async () => {
    if (items.length === 0) {
      setErrorMessage("Order must contain at least 1 item.");
      return;
    }

    setIsSaving(true);
    setErrorMessage(null);

    try {
      const payload: EditCashierOrderItemInput[] = items.map((i) => ({
        menuItemId: i.menuItemId,
        name: i.name,
        qty: i.qty,
        unitPricePaise: i.unitPricePaise,
      }));

      const { editCashierOrderAction } = await import("@/app/cashier/actions");
      const res = await editCashierOrderAction(order.id, payload, instructions);

      if (res.success) {
        onSaveSuccess();
        onClose();
      } else {
        setErrorMessage(res.message || "Failed to update order.");
      }
    } catch (err) {
      console.error("Save error:", err);
      setErrorMessage("An unexpected error occurred while saving the order.");
    } finally {
      setIsSaving(false);
    }
  };

  const filteredCatalog = searchQuery
    ? catalog.filter((c) => c.name.toLowerCase().includes(searchQuery.toLowerCase()))
    : catalog.slice(0, 8);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-3 sm:p-4 backdrop-blur-sm animate-fade-in"
      onClick={onClose}
    >
      <div
        className="w-full max-w-2xl max-h-[92vh] flex flex-col rounded-3xl border border-[#C9AE8B]/40 dark:border-stone-800 bg-[#FAF4EB] dark:bg-[#1C1917] shadow-2xl overflow-hidden transition-colors"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="flex items-center justify-between border-b border-[#C9AE8B]/30 dark:border-stone-800 px-5 py-4 shrink-0 bg-[#F3E7D3]/60 dark:bg-stone-900/50">
          <div>
            <div className="flex items-center gap-2">
              <span className="rounded-full bg-[#B72E35] text-white px-2.5 py-0.5 font-mono text-[11px] font-bold">
                Table {order.tableLabel}
              </span>
              <span className="font-mono text-xs font-semibold text-[#725039] dark:text-stone-400">
                Order #{order.orderNo}
              </span>
            </div>
            <h2 className="text-lg font-black text-[#241F1C] dark:text-white mt-0.5">
              Edit Order Items &amp; Instructions
            </h2>
          </div>
          <button
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-full bg-[#FAF4EB] dark:bg-stone-800 text-[#725039] dark:text-stone-300 hover:bg-[#EBDDC8] dark:hover:bg-stone-700 transition cursor-pointer"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto p-5 space-y-5 scrollbar-thin">
          {errorMessage && (
            <div className="flex items-center gap-2 rounded-2xl border border-rose-300 bg-rose-50 dark:border-rose-900/60 dark:bg-rose-950/40 p-3.5 text-xs text-rose-800 dark:text-rose-300">
              <AlertCircle className="h-4 w-4 shrink-0" />
              <span>{errorMessage}</span>
            </div>
          )}

          {/* Current Items List */}
          <div className="space-y-2.5">
            <h3 className="text-xs font-bold uppercase tracking-wider text-[#8C6D53] dark:text-stone-400">
              Current Order Items ({items.length})
            </h3>

            {items.length === 0 ? (
              <div className="p-6 text-center rounded-2xl border border-dashed border-[#C9AE8B]/40 dark:border-stone-800 text-xs text-[#725039] dark:text-stone-500">
                No items in order. Use the menu catalog below to add items.
              </div>
            ) : (
              <div className="space-y-2">
                {items.map((it) => {
                  const lineTotal = Math.round((it.unitPricePaise * it.qty) / 100);
                  const unitPrice = Math.round(it.unitPricePaise / 100);

                  return (
                    <div
                      key={it.key}
                      className="flex items-center justify-between gap-3 rounded-2xl border border-[#C9AE8B]/40 dark:border-stone-800 bg-[#FAF4EB] dark:bg-stone-900/60 p-3 transition"
                    >
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <span
                            className={`inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-[10px] font-bold font-mono ${
                              it.isBeverage
                                ? "bg-amber-100 dark:bg-amber-950/80 text-amber-800 dark:text-amber-300 border border-amber-300 dark:border-amber-800"
                                : "bg-orange-100 dark:bg-orange-950/80 text-orange-800 dark:text-orange-300 border border-orange-300 dark:border-orange-800"
                            }`}
                          >
                            {it.isBeverage ? <Coffee className="h-3 w-3" /> : <UtensilsCrossed className="h-3 w-3" />}
                            <span>{it.isBeverage ? "Barista" : "Kitchen"}</span>
                          </span>
                          <span className="font-bold text-sm text-[#241F1C] dark:text-white truncate">
                            {it.name}
                          </span>
                        </div>
                        <p className="font-mono text-xs text-[#725039] dark:text-stone-400 mt-0.5">
                          ₹{unitPrice} each • <span className="font-bold text-[#241F1C] dark:text-stone-200">₹{lineTotal}</span>
                        </p>
                      </div>

                      {/* Quantity Stepper & Remove */}
                      <div className="flex items-center gap-1.5 shrink-0">
                        <div className="flex items-center rounded-xl border border-[#C9AE8B]/50 dark:border-stone-700 bg-[#F3E7D3] dark:bg-stone-800 p-0.5">
                          <button
                            type="button"
                            onClick={() => handleQtyChange(it.key, -1)}
                            className="flex h-7 w-7 items-center justify-center rounded-lg hover:bg-[#FAF4EB] dark:hover:bg-stone-700 text-[#241F1C] dark:text-white transition cursor-pointer"
                            title="Decrease"
                          >
                            <Minus className="h-3.5 w-3.5" />
                          </button>
                          <span className="w-7 text-center font-mono font-bold text-xs text-[#241F1C] dark:text-white">
                            {it.qty}
                          </span>
                          <button
                            type="button"
                            onClick={() => handleQtyChange(it.key, 1)}
                            className="flex h-7 w-7 items-center justify-center rounded-lg hover:bg-[#FAF4EB] dark:hover:bg-stone-700 text-[#241F1C] dark:text-white transition cursor-pointer"
                            title="Increase"
                          >
                            <Plus className="h-3.5 w-3.5" />
                          </button>
                        </div>

                        <button
                          type="button"
                          onClick={() => handleRemoveItem(it.key)}
                          className="flex h-8 w-8 items-center justify-center rounded-xl border border-rose-200 dark:border-rose-900/50 bg-rose-50 dark:bg-rose-950/30 text-rose-700 dark:text-rose-400 hover:bg-rose-100 dark:hover:bg-rose-900/50 transition cursor-pointer"
                          title="Remove Item"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Add Item From Catalog Section */}
          <div className="space-y-2.5 rounded-2xl border border-[#C9AE8B]/40 dark:border-stone-800 bg-[#F3E7D3]/40 dark:bg-stone-900/40 p-4">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-bold uppercase tracking-wider text-[#8C6D53] dark:text-stone-400">
                + Add Item from Menu Catalog
              </h3>
              <span className="text-[11px] font-mono text-[#725039] dark:text-stone-400">
                {catalog.length} items available
              </span>
            </div>

            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[#8C6D53] dark:text-stone-500" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search coffee, burger, pasta, drinks..."
                className="w-full rounded-xl border border-[#C9AE8B]/40 dark:border-stone-700 bg-[#FAF4EB] dark:bg-stone-900 pl-9 pr-3 py-2 text-xs text-[#241F1C] dark:text-white placeholder-[#8C6D53]/60 focus:border-[#B72E35] focus:outline-none"
              />
            </div>

            {/* Quick Catalog Chips */}
            <div className="flex flex-wrap gap-1.5 max-h-36 overflow-y-auto p-1 scrollbar-none">
              {filteredCatalog.map((catItem) => (
                <button
                  key={catItem.id}
                  type="button"
                  onClick={() => handleAddItemFromCatalog(catItem)}
                  className="inline-flex items-center gap-1.5 rounded-xl border border-[#C9AE8B]/40 dark:border-stone-700 bg-[#FAF4EB] dark:bg-stone-800/90 px-2.5 py-1 text-xs font-medium text-[#241F1C] dark:text-stone-200 hover:border-[#B72E35] hover:bg-[#F3E7D3] dark:hover:bg-stone-700 transition active:scale-95 cursor-pointer"
                >
                  <span>{catItem.isBeverage ? "☕" : "🍳"}</span>
                  <span>{catItem.name}</span>
                  <span className="font-mono text-[11px] font-bold text-[#B72E35] dark:text-[#F6AD55]">
                    ₹{Math.round(catItem.pricePaise / 100)}
                  </span>
                  <Plus className="h-3 w-3 ml-0.5 text-stone-500" />
                </button>
              ))}
            </div>
          </div>

          {/* Special Instructions */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold uppercase tracking-wider text-[#8C6D53] dark:text-stone-400">
              Kitchen &amp; Barista Preparation Notes / Instructions
            </label>
            <textarea
              rows={2}
              value={instructions}
              onChange={(e) => setInstructions(e.target.value)}
              placeholder="e.g. Extra hot milk, less sugar, no onions..."
              className="w-full rounded-2xl border border-[#C9AE8B]/40 dark:border-stone-700 bg-[#FAF4EB] dark:bg-stone-900 p-3 text-xs text-[#241F1C] dark:text-white placeholder-[#8C6D53]/60 focus:border-[#B72E35] focus:outline-none resize-none"
            />
          </div>
        </div>

        {/* Modal Footer / Billing Summary & Save */}
        <div className="border-t border-[#C9AE8B]/30 dark:border-stone-800 p-4 sm:p-5 bg-[#F3E7D3]/80 dark:bg-stone-900/90 shrink-0">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-4 text-xs font-mono">
              <div>
                <span className="block text-[10px] text-[#8C6D53] dark:text-stone-400">Subtotal</span>
                <span className="font-bold text-[#241F1C] dark:text-stone-200">
                  ₹{Math.round(subtotalPaise / 100)}
                </span>
              </div>
              <div className="text-stone-300 dark:text-stone-700">+</div>
              <div>
                <span className="block text-[10px] text-[#8C6D53] dark:text-stone-400">GST (5%)</span>
                <span className="font-bold text-[#241F1C] dark:text-stone-200">
                  ₹{Math.round(taxPaise / 100)}
                </span>
              </div>
              <div className="text-stone-300 dark:text-stone-700">=</div>
              <div>
                <span className="block text-[10px] font-bold text-[#B72E35] dark:text-[#F6AD55]">
                  Updated Grand Total
                </span>
                <span className="font-mono text-xl font-black text-[#B72E35] dark:text-[#F6AD55]">
                  ₹{Math.round(grandTotalPaise / 100)}
                </span>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onClose}
                disabled={isSaving}
                className="flex-1 sm:flex-none rounded-xl border border-[#C9AE8B]/40 dark:border-stone-700 bg-[#FAF4EB] dark:bg-stone-800 px-4 py-2.5 text-xs font-bold text-[#725039] dark:text-stone-300 hover:bg-[#EBDDC8] dark:hover:bg-stone-700 transition cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSave}
                disabled={isSaving || items.length === 0}
                className="flex-2 sm:flex-none flex items-center justify-center gap-2 rounded-xl bg-[#B72E35] px-6 py-2.5 text-xs font-bold text-white shadow-md hover:bg-[#9B242A] active:scale-95 transition disabled:opacity-50 cursor-pointer"
              >
                {isSaving ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    <span>Saving...</span>
                  </>
                ) : (
                  <>
                    <Check className="h-4 w-4" />
                    <span>Save &amp; Update Order</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
