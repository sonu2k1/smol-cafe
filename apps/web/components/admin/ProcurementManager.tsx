"use client";

import React, { useState } from "react";
import Link from "next/link";
import type {
  ProcurementData,
  EnrichedPO,
  POLineInput,
  GRNLineInput,
} from "@/app/admin/procurement/actions";
import type { PurchaseOrderStatus } from "@smol-cafe/db";
import {
  createPurchaseOrderAction,
  recordGoodsReceiptAction,
  updatePurchaseOrderStatusAction,
  createVendorAction,
  fetchProcurementDataAction,
} from "@/app/admin/procurement/actions";
import { Send, PackageCheck } from "lucide-react";

interface ProcurementManagerProps {
  initialData: ProcurementData;
}

export const ProcurementManager: React.FC<ProcurementManagerProps> = ({ initialData }) => {
  const [data, setData] = useState<ProcurementData>(initialData);
  const [activeTab, setActiveTab] = useState<"pos" | "grns" | "vendors">("pos");
  const [feedback, setFeedback] = useState<{ type: "success" | "error"; text: string } | null>(
    null
  );

  // New PO State
  const [isPoModalOpen, setIsPoModalOpen] = useState(false);
  const [selectedVendorId, setSelectedVendorId] = useState("");
  const [expectedDate, setExpectedDate] = useState("");
  const [poNotes, setPoNotes] = useState("");
  const [poLines, setPoLines] = useState<POLineInput[]>([]);
  const [isCreatingPo, setIsCreatingPo] = useState(false);

  // Goods Receipt (GRN) Modal State
  const [activeReceivingPO, setActiveReceivingPO] = useState<EnrichedPO | null>(null);
  const [invoiceNo, setInvoiceNo] = useState("");
  const [grnNotes, setGrnNotes] = useState("");
  const [receivingLines, setReceivingLines] = useState<GRNLineInput[]>([]);
  const [isRecordingGrn, setIsRecordingGrn] = useState(false);

  // Add Vendor State
  const [vendorName, setVendorName] = useState("");
  const [contactPerson, setContactPerson] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [taxId, setTaxId] = useState("");
  const [isCreatingVendor, setIsCreatingVendor] = useState(false);

  const refreshData = async () => {
    const fresh = await fetchProcurementDataAction();
    if (fresh.success) setData(fresh);
  };

  // Add Line to new PO
  const handleAddPoLine = () => {
    if (data.ingredients.length === 0) return;
    setPoLines((prev) => [
      ...prev,
      {
        ingredientId: data.ingredients[0].id,
        orderedQty: 10,
        unitCostPaise: 5000,
      },
    ]);
  };

  const handleCreatePO = async (e: React.FormEvent) => {
    e.preventDefault();
    setFeedback(null);

    if (!selectedVendorId) {
      setFeedback({ type: "error", text: "Please select a vendor." });
      return;
    }

    if (poLines.length === 0) {
      setFeedback({ type: "error", text: "Please add at least one line item." });
      return;
    }

    setIsCreatingPo(true);
    try {
      const res = await createPurchaseOrderAction({
        vendorId: selectedVendorId,
        expectedDeliveryDate: expectedDate || undefined,
        notes: poNotes,
        lines: poLines,
      });

      if (res.success) {
        setFeedback({ type: "success", text: res.message || "Purchase order created!" });
        setIsPoModalOpen(false);
        setPoLines([]);
        setPoNotes("");
        await refreshData();
      } else {
        setFeedback({ type: "error", text: res.message || "Could not create PO." });
      }
    } catch {
      setFeedback({ type: "error", text: "An error occurred." });
    } finally {
      setIsCreatingPo(false);
    }
  };

  // Open Receive Modal for a PO
  const handleOpenReceiveModal = (po: EnrichedPO) => {
    setActiveReceivingPO(po);
    setInvoiceNo("");
    setGrnNotes("");
    setReceivingLines(
      po.lines.map((l) => ({
        poLineId: l.id,
        ingredientId: l.ingredient_id,
        receivedQty: Math.max(0, l.ordered_qty - l.received_qty),
        unitCostPaise: l.unit_cost_paise,
      }))
    );
  };

  const handleRecordGRN = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeReceivingPO) return;

    setIsRecordingGrn(true);
    setFeedback(null);

    try {
      const res = await recordGoodsReceiptAction({
        poId: activeReceivingPO.id,
        vendorId: activeReceivingPO.vendor_id,
        invoiceNo,
        notes: grnNotes,
        lines: receivingLines,
      });

      if (res.success) {
        setFeedback({ type: "success", text: res.message || "Goods received and stock updated!" });
        setActiveReceivingPO(null);
        await refreshData();
      } else {
        setFeedback({ type: "error", text: res.message || "Failed to record GRN." });
      }
    } catch {
      setFeedback({ type: "error", text: "An error occurred." });
    } finally {
      setIsRecordingGrn(false);
    }
  };

  const handleStatusChange = async (poId: string, status: PurchaseOrderStatus) => {
    try {
      const res = await updatePurchaseOrderStatusAction(poId, status);
      if (res.success) {
        await refreshData();
      }
    } catch {
      setFeedback({ type: "error", text: "Failed to update status." });
    }
  };

  const handleCreateVendor = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsCreatingVendor(true);
    setFeedback(null);

    try {
      const res = await createVendorAction({
        name: vendorName,
        contactPerson,
        phone,
        email,
        taxId,
      });

      if (res.success) {
        setFeedback({ type: "success", text: "Vendor added successfully!" });
        setVendorName("");
        setContactPerson("");
        setPhone("");
        setEmail("");
        setTaxId("");
        await refreshData();
      } else {
        setFeedback({ type: "error", text: res.message || "Failed to add vendor." });
      }
    } catch {
      setFeedback({ type: "error", text: "An error occurred." });
    } finally {
      setIsCreatingVendor(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#FDFBF7] text-[#1C1917] pb-24 dark:bg-[#141211] dark:text-[#FDFBF7]">
      {/* Top Bar */}
      <header className="border-b border-stone-200/80 bg-white/70 px-4 py-4 backdrop-blur-md dark:border-stone-800 dark:bg-stone-900/60">
        <div className="mx-auto flex max-w-5xl items-center justify-between">
          <div className="flex items-center gap-3">
            <Link
              href="/"
              className="rounded-full border border-stone-200 bg-stone-50 p-2 text-stone-600 transition hover:bg-stone-100 dark:border-stone-800 dark:bg-stone-800 dark:text-stone-300"
            >
              ← Back
            </Link>
            <div>
              <h1 className="text-lg font-black tracking-tight text-[#9B2C2C] dark:text-[#F6AD55]">
                Procurement & Goods Receipts
              </h1>
              <p className="text-xs text-stone-500 font-medium">
                Admin Panel • Purchase Orders, GRNs & Vendor Directory
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                setIsPoModalOpen(true);
                if (poLines.length === 0 && data.ingredients.length > 0) {
                  handleAddPoLine();
                }
              }}
              className="rounded-full bg-[#9B2C2C] px-4 py-1.5 text-xs font-bold text-white shadow-md transition hover:bg-[#822424] active:scale-95 dark:bg-[#C53030]"
            >
              + Create Purchase Order
            </button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-4 pt-6 space-y-6">
        {feedback && (
          <div
            className={`rounded-2xl p-3 text-xs font-bold ${
              feedback.type === "error"
                ? "border border-red-200 bg-red-50 text-red-700 dark:border-red-900/50 dark:bg-red-950/40 dark:text-red-300"
                : "border border-emerald-200 bg-emerald-50 text-emerald-800 dark:border-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300"
            }`}
          >
            {feedback.text}
          </div>
        )}

        {/* Tab Switcher */}
        <div className="flex items-center gap-2 border-b border-stone-200 dark:border-stone-800">
          <button
            onClick={() => setActiveTab("pos")}
            className={`px-4 py-2 text-xs font-bold transition border-b-2 ${
              activeTab === "pos"
                ? "border-[#9B2C2C] text-[#9B2C2C] dark:border-[#F6AD55] dark:text-[#F6AD55]"
                : "border-transparent text-stone-500 hover:text-stone-800 dark:hover:text-stone-200"
            }`}
          >
            Purchase Orders ({data.purchaseOrders.length})
          </button>
          <button
            onClick={() => setActiveTab("grns")}
            className={`px-4 py-2 text-xs font-bold transition border-b-2 ${
              activeTab === "grns"
                ? "border-[#9B2C2C] text-[#9B2C2C] dark:border-[#F6AD55] dark:text-[#F6AD55]"
                : "border-transparent text-stone-500 hover:text-stone-800 dark:hover:text-stone-200"
            }`}
          >
            Goods Receipts / Stock Ingested ({data.goodsReceipts.length})
          </button>
          <button
            onClick={() => setActiveTab("vendors")}
            className={`px-4 py-2 text-xs font-bold transition border-b-2 ${
              activeTab === "vendors"
                ? "border-[#9B2C2C] text-[#9B2C2C] dark:border-[#F6AD55] dark:text-[#F6AD55]"
                : "border-transparent text-stone-500 hover:text-stone-800 dark:hover:text-stone-200"
            }`}
          >
            Vendors & Directory ({data.vendors.length})
          </button>
        </div>

        {/* Tab 1: Purchase Orders */}
        {activeTab === "pos" && (
          <div className="space-y-4">
            {data.purchaseOrders.length === 0 ? (
              <div className="rounded-3xl border border-dashed border-stone-300 p-12 text-center text-xs text-stone-500 dark:border-stone-800">
                No purchase orders created yet. Tap &ldquo;+ Create Purchase Order&rdquo; to begin.
              </div>
            ) : (
              <div className="space-y-3">
                {data.purchaseOrders.map((po) => (
                  <div
                    key={po.id}
                    className="rounded-3xl border border-stone-200 bg-white p-5 shadow-sm dark:border-stone-800 dark:bg-stone-900 space-y-3"
                  >
                    <div className="flex items-start justify-between">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-xs font-black text-stone-900 dark:text-stone-100">
                            {po.po_number}
                          </span>
                          <span className="text-stone-300 dark:text-stone-700">•</span>
                          <span className="text-xs font-bold text-stone-700 dark:text-stone-300">
                            {po.vendor_name}
                          </span>
                        </div>
                        <p className="text-[11px] text-stone-400 font-mono mt-0.5">
                          Created{" "}
                          {new Date(po.created_at).toLocaleDateString("en-IN", {
                            month: "short",
                            day: "numeric",
                          })}
                          {po.expected_delivery_date && ` • Expected ${po.expected_delivery_date}`}
                        </p>
                      </div>

                      <div className="flex items-center gap-2">
                        <span
                          className={`rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase font-mono ${
                            po.status === "RECEIVED"
                              ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300"
                              : po.status === "PARTIALLY_RECEIVED"
                                ? "bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300"
                                : po.status === "SENT"
                                  ? "bg-blue-100 text-blue-800 dark:bg-blue-950/60 dark:text-blue-300"
                                  : "bg-stone-100 text-stone-600 dark:bg-stone-800 dark:text-stone-300"
                          }`}
                        >
                          {po.status}
                        </span>

                        <span className="font-mono text-xs font-black text-stone-900 dark:text-stone-100">
                          ₹{Math.round(po.total_amount_paise / 100)}
                        </span>
                      </div>
                    </div>

                    {/* Lines List */}
                    <div className="rounded-2xl border border-stone-100 bg-stone-50/70 p-3 dark:border-stone-800 dark:bg-stone-800/40 divide-y divide-stone-100 dark:divide-stone-800">
                      {po.lines.map((line) => (
                        <div
                          key={line.id}
                          className="py-1.5 first:pt-0 last:pb-0 flex items-center justify-between text-xs font-mono"
                        >
                          <span className="text-stone-800 dark:text-stone-200">
                            {line.ingredient_name}
                          </span>
                          <span className="text-stone-500">
                            Ordered: {line.ordered_qty} {line.unit_symbol} • Recv:{" "}
                            {line.received_qty} {line.unit_symbol} (₹
                            {Math.round(line.line_total_paise / 100)})
                          </span>
                        </div>
                      ))}
                    </div>

                    {/* Actions Bar */}
                    <div className="flex items-center justify-between pt-1 text-xs">
                      <div className="flex gap-2">
                        {po.status === "DRAFT" && (
                          <button
                            onClick={() => handleStatusChange(po.id, "SENT")}
                            className="rounded-xl border border-stone-300 bg-stone-50 px-3 py-1.5 font-bold hover:bg-stone-100 dark:border-stone-700 dark:bg-stone-800 flex items-center gap-1.5"
                          >
                            Mark as Sent <Send className="h-3.5 w-3.5" />
                          </button>
                        )}
                      </div>

                      {po.status !== "RECEIVED" && po.status !== "CLOSED" && (
                        <button
                          onClick={() => handleOpenReceiveModal(po)}
                          className="rounded-xl bg-[#9B2C2C] px-4 py-1.5 font-bold text-white shadow-sm hover:bg-[#822424] active:scale-95 dark:bg-[#C53030] flex items-center gap-1.5"
                        >
                          <PackageCheck className="h-4 w-4" /> Record Delivery (GRN)
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Tab 2: Goods Receipts (GRN) */}
        {activeTab === "grns" && (
          <div className="space-y-3">
            {data.goodsReceipts.length === 0 ? (
              <div className="rounded-3xl border border-dashed border-stone-300 p-12 text-center text-xs text-stone-500 dark:border-stone-800">
                No deliveries recorded yet.
              </div>
            ) : (
              data.goodsReceipts.map((grn) => (
                <div
                  key={grn.id}
                  className="rounded-3xl border border-stone-200 bg-white p-5 shadow-sm dark:border-stone-800 dark:bg-stone-900 space-y-3"
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-xs font-black text-emerald-700 dark:text-emerald-400">
                          {grn.grn_number}
                        </span>
                        <span className="text-stone-300 dark:text-stone-700">•</span>
                        <span className="text-xs font-bold text-stone-800 dark:text-stone-200">
                          {grn.vendor_name}
                        </span>
                      </div>
                      <p className="text-[11px] text-stone-400 font-mono mt-0.5">
                        Received{" "}
                        {new Date(grn.received_at).toLocaleDateString("en-IN", {
                          month: "short",
                          day: "numeric",
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                        {grn.invoice_no && ` • Invoice: ${grn.invoice_no}`}
                      </p>
                    </div>

                    <span className="rounded-full bg-emerald-100 px-2.5 py-0.5 text-[10px] font-bold text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300 font-mono">
                      ✓ Stock Ingested
                    </span>
                  </div>

                  <div className="rounded-2xl border border-stone-100 bg-stone-50/70 p-3 dark:border-stone-800 dark:bg-stone-800/40 space-y-1">
                    {grn.lines.map((line) => (
                      <div
                        key={line.id}
                        className="flex items-center justify-between text-xs font-mono"
                      >
                        <span className="text-stone-700 dark:text-stone-300">
                          + {line.received_qty} {line.ingredient_name}
                        </span>
                        <span className="text-stone-500">
                          @ ₹{Math.round(line.unit_cost_paise / 100)} / unit
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              ))
            )}
          </div>
        )}

        {/* Tab 3: Vendors Directory */}
        {activeTab === "vendors" && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="md:col-span-1">
              <div className="rounded-3xl border border-stone-200 bg-white p-5 shadow-sm dark:border-stone-800 dark:bg-stone-900 space-y-4">
                <h3 className="text-sm font-bold uppercase tracking-wider text-stone-900 dark:text-stone-100">
                  Add New Vendor
                </h3>
                <form onSubmit={handleCreateVendor} className="space-y-3">
                  <div>
                    <label className="block text-[11px] font-bold uppercase tracking-wider text-stone-500 mb-1">
                      Vendor / Company Name
                    </label>
                    <input
                      type="text"
                      value={vendorName}
                      onChange={(e) => setVendorName(e.target.value)}
                      placeholder="e.g. Blue Mountain Dairy"
                      required
                      className="w-full rounded-xl border border-stone-300 bg-stone-50 px-3 py-2 text-xs text-stone-900 focus:border-[#9B2C2C] focus:outline-none dark:border-stone-700 dark:bg-stone-800 dark:text-stone-100"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold uppercase tracking-wider text-stone-500 mb-1">
                      Contact Person
                    </label>
                    <input
                      type="text"
                      value={contactPerson}
                      onChange={(e) => setContactPerson(e.target.value)}
                      placeholder="e.g. Rajesh"
                      className="w-full rounded-xl border border-stone-300 bg-stone-50 px-3 py-2 text-xs text-stone-900 focus:border-[#9B2C2C] focus:outline-none dark:border-stone-700 dark:bg-stone-800 dark:text-stone-100"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold uppercase tracking-wider text-stone-500 mb-1">
                      Phone Number
                    </label>
                    <input
                      type="text"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      placeholder="+91 98..."
                      className="w-full rounded-xl border border-stone-300 bg-stone-50 px-3 py-2 text-xs text-stone-900 focus:border-[#9B2C2C] focus:outline-none dark:border-stone-700 dark:bg-stone-800 dark:text-stone-100"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold uppercase tracking-wider text-stone-500 mb-1">
                      GSTIN / Tax ID
                    </label>
                    <input
                      type="text"
                      value={taxId}
                      onChange={(e) => setTaxId(e.target.value)}
                      placeholder="27AAAAA..."
                      className="w-full rounded-xl border border-stone-300 bg-stone-50 px-3 py-2 text-xs text-stone-900 focus:border-[#9B2C2C] focus:outline-none dark:border-stone-700 dark:bg-stone-800 dark:text-stone-100"
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={isCreatingVendor || !vendorName.trim()}
                    className="w-full rounded-2xl bg-[#9B2C2C] py-2.5 text-xs font-bold text-white shadow transition hover:bg-[#822424] disabled:opacity-50 dark:bg-[#C53030]"
                  >
                    {isCreatingVendor ? "Adding..." : "+ Add Vendor"}
                  </button>
                </form>
              </div>
            </div>

            <div className="md:col-span-2 space-y-3">
              {data.vendors.map((v) => (
                <div
                  key={v.id}
                  className="rounded-3xl border border-stone-200 bg-white p-5 shadow-sm dark:border-stone-800 dark:bg-stone-900 space-y-2"
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <h4 className="text-sm font-bold text-stone-900 dark:text-stone-100">
                        {v.name}
                      </h4>
                      <p className="text-xs text-stone-500">
                        {v.contact_person ? `${v.contact_person} • ` : ""}
                        {v.phone || "No phone"}
                      </p>
                    </div>
                    {v.tax_id && (
                      <span className="font-mono text-[10px] text-stone-400 bg-stone-100 px-2 py-0.5 rounded-lg dark:bg-stone-800">
                        GSTIN: {v.tax_id}
                      </span>
                    )}
                  </div>
                  {v.notes && (
                    <p className="text-xs text-stone-600 dark:text-stone-400">{v.notes}</p>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </main>

      {/* Modal: Create Purchase Order */}
      {isPoModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
          <div className="w-full max-w-lg rounded-3xl border border-stone-200 bg-white p-6 shadow-2xl dark:border-stone-800 dark:bg-stone-900 space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-bold text-stone-900 dark:text-stone-100">
                New Purchase Order
              </h3>
              <button
                onClick={() => setIsPoModalOpen(false)}
                className="text-stone-400 hover:text-stone-600"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreatePO} className="space-y-4">
              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wider text-stone-500 mb-1">
                  Vendor
                </label>
                <select
                  value={selectedVendorId}
                  onChange={(e) => setSelectedVendorId(e.target.value)}
                  required
                  className="w-full rounded-xl border border-stone-300 bg-stone-50 px-3 py-2 text-xs text-stone-900 focus:outline-none dark:border-stone-700 dark:bg-stone-800 dark:text-stone-100"
                >
                  <option value="">Select a vendor...</option>
                  {data.vendors.map((v) => (
                    <option key={v.id} value={v.id}>
                      {v.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wider text-stone-500 mb-1">
                  Expected Delivery Date (Optional)
                </label>
                <input
                  type="date"
                  value={expectedDate}
                  onChange={(e) => setExpectedDate(e.target.value)}
                  className="w-full rounded-xl border border-stone-300 bg-stone-50 px-3 py-2 text-xs text-stone-900 focus:outline-none dark:border-stone-700 dark:bg-stone-800 dark:text-stone-100 font-mono"
                />
              </div>

              {/* PO Line Items */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-[11px] font-bold uppercase tracking-wider text-stone-500">
                    Order Line Items
                  </label>
                  <button
                    type="button"
                    onClick={handleAddPoLine}
                    className="text-xs font-bold text-[#9B2C2C] hover:underline dark:text-[#F6AD55]"
                  >
                    + Add Item
                  </button>
                </div>

                {poLines.map((line, idx) => (
                  <div
                    key={idx}
                    className="grid grid-cols-12 gap-2 items-center bg-stone-50 p-2.5 rounded-2xl dark:bg-stone-800/60"
                  >
                    <div className="col-span-5">
                      <select
                        value={line.ingredientId}
                        onChange={(e) => {
                          const val = e.target.value;
                          setPoLines((prev) =>
                            prev.map((l, i) => (i === idx ? { ...l, ingredientId: val } : l))
                          );
                        }}
                        className="w-full rounded-lg border border-stone-300 bg-white px-2 py-1.5 text-xs text-stone-900 dark:border-stone-600 dark:bg-stone-900 dark:text-stone-100"
                      >
                        {data.ingredients.map((ing) => (
                          <option key={ing.id} value={ing.id}>
                            {ing.name}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="col-span-3">
                      <input
                        type="number"
                        placeholder="Qty"
                        value={line.orderedQty}
                        onChange={(e) => {
                          const val = parseFloat(e.target.value) || 0;
                          setPoLines((prev) =>
                            prev.map((l, i) => (i === idx ? { ...l, orderedQty: val } : l))
                          );
                        }}
                        className="w-full rounded-lg border border-stone-300 bg-white px-2 py-1.5 text-xs text-stone-900 dark:border-stone-600 dark:bg-stone-900 dark:text-stone-100 font-mono"
                      />
                    </div>

                    <div className="col-span-3">
                      <input
                        type="number"
                        placeholder="₹ Unit"
                        value={line.unitCostPaise / 100}
                        onChange={(e) => {
                          const val = Math.round((parseFloat(e.target.value) || 0) * 100);
                          setPoLines((prev) =>
                            prev.map((l, i) => (i === idx ? { ...l, unitCostPaise: val } : l))
                          );
                        }}
                        className="w-full rounded-lg border border-stone-300 bg-white px-2 py-1.5 text-xs text-stone-900 dark:border-stone-600 dark:bg-stone-900 dark:text-stone-100 font-mono"
                      />
                    </div>

                    <div className="col-span-1 text-right">
                      <button
                        type="button"
                        onClick={() => setPoLines((prev) => prev.filter((_, i) => i !== idx))}
                        className="text-stone-400 hover:text-red-600 text-xs"
                      >
                        ✕
                      </button>
                    </div>
                  </div>
                ))}
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="submit"
                  disabled={isCreatingPo || poLines.length === 0}
                  className="flex-1 rounded-2xl bg-[#9B2C2C] py-3 text-xs font-bold text-white shadow hover:bg-[#822424] disabled:opacity-50 dark:bg-[#C53030]"
                >
                  {isCreatingPo ? "Creating..." : "Save Purchase Order"}
                </button>
                <button
                  type="button"
                  onClick={() => setIsPoModalOpen(false)}
                  className="rounded-2xl border border-stone-300 px-5 py-3 text-xs font-bold text-stone-600 hover:bg-stone-100 dark:border-stone-700 dark:text-stone-300"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Record Goods Receipt (GRN) */}
      {activeReceivingPO && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
          <div className="w-full max-w-lg rounded-3xl border border-stone-200 bg-white p-6 shadow-2xl dark:border-stone-800 dark:bg-stone-900 space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-base font-bold text-stone-900 dark:text-stone-100">
                  Record Goods Receipt (GRN)
                </h3>
                <p className="text-xs text-stone-500 font-mono">
                  Against {activeReceivingPO.po_number} • {activeReceivingPO.vendor_name}
                </p>
              </div>
              <button
                onClick={() => setActiveReceivingPO(null)}
                className="text-stone-400 hover:text-stone-600"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleRecordGRN} className="space-y-4">
              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wider text-stone-500 mb-1">
                  Vendor Invoice / Bill No.
                </label>
                <input
                  type="text"
                  placeholder="e.g. INV-2026-9021"
                  value={invoiceNo}
                  onChange={(e) => setInvoiceNo(e.target.value)}
                  className="w-full rounded-xl border border-stone-300 bg-stone-50 px-3 py-2 text-xs text-stone-900 focus:outline-none dark:border-stone-700 dark:bg-stone-800 dark:text-stone-100"
                />
              </div>

              {/* Receiving Line Quantities */}
              <div className="space-y-2">
                <label className="block text-[11px] font-bold uppercase tracking-wider text-stone-500">
                  Received Quantities (Will increase stock)
                </label>

                {receivingLines.map((line, idx) => {
                  const poLine = activeReceivingPO.lines.find((l) => l.id === line.poLineId);
                  return (
                    <div
                      key={idx}
                      className="flex items-center justify-between bg-stone-50 p-3 rounded-2xl dark:bg-stone-800/60"
                    >
                      <div>
                        <span className="text-xs font-bold text-stone-900 dark:text-stone-100">
                          {poLine?.ingredient_name || "Ingredient"}
                        </span>
                        <p className="text-[10px] text-stone-500 font-mono">
                          Ordered: {poLine?.ordered_qty} {poLine?.unit_symbol}
                        </p>
                      </div>

                      <div className="flex items-center gap-2">
                        <span className="text-xs text-stone-500 font-bold">Recv:</span>
                        <input
                          type="number"
                          step="0.01"
                          value={line.receivedQty}
                          onChange={(e) => {
                            const val = parseFloat(e.target.value) || 0;
                            setReceivingLines((prev) =>
                              prev.map((l, i) => (i === idx ? { ...l, receivedQty: val } : l))
                            );
                          }}
                          className="w-24 rounded-lg border border-stone-300 bg-white px-2 py-1 text-xs text-stone-900 dark:border-stone-600 dark:bg-stone-900 dark:text-stone-100 font-mono"
                        />
                      </div>
                    </div>
                  );
                })}
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="submit"
                  disabled={isRecordingGrn}
                  className="flex-1 rounded-2xl bg-emerald-700 py-3 text-xs font-bold text-white shadow hover:bg-emerald-800 disabled:opacity-50"
                >
                  {isRecordingGrn ? "Ingesting Stock..." : "Confirm Delivery & Ingest Stock →"}
                </button>
                <button
                  type="button"
                  onClick={() => setActiveReceivingPO(null)}
                  className="rounded-2xl border border-stone-300 px-5 py-3 text-xs font-bold text-stone-600 hover:bg-stone-100 dark:border-stone-700 dark:text-stone-300"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
