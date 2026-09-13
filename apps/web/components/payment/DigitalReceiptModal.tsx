"use client";

import React, { useRef } from "react";
import Image from "next/image";
import { X, Printer, CheckCircle } from "lucide-react";

export interface ReceiptItem {
  name: string;
  qty: number;
  priceRupees: number;
  subtotalRupees: number;
}

export interface ReceiptData {
  orderId: string;
  orderNo?: number;
  tableLabel: string;
  zone?: string;
  guestCount?: number;
  items: ReceiptItem[];
  subtotalRupees: number;
  taxRupees: number;
  totalRupees: number;
  paymentMethod: "UPI" | "CASH" | "CARD";
  transactionId?: string;
  paidAt: string;
  merchantName?: string;
  gstin?: string;
}

interface DigitalReceiptModalProps {
  receipt: ReceiptData;
  onClose: () => void;
}

export const DigitalReceiptModal: React.FC<DigitalReceiptModalProps> = ({ receipt, onClose }) => {
  const receiptRef = useRef<HTMLDivElement>(null);

  const handlePrint = () => {
    window.print();
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-xs animate-fade-in print:p-0 print:bg-white"
      onClick={onClose}
    >
      <div
        ref={receiptRef}
        className="w-full max-w-sm rounded-3xl border border-[#E2D7C7] bg-[#FAF4EB] p-6 shadow-2xl text-[#241F1C] transition-all animate-scale-in print:border-none print:shadow-none print:max-w-none print:w-full print:bg-white"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Top Control Bar (hidden in print) */}
        <div className="flex items-center justify-between border-b border-[#E2D7C7] pb-3 print:hidden">
          <span className="font-mono text-xs font-bold text-emerald-800 flex items-center gap-1">
            <CheckCircle className="h-4 w-4 text-emerald-600" />
            Payment Settled
          </span>
          <div className="flex items-center gap-1.5">
            <button
              onClick={handlePrint}
              className="flex items-center gap-1 rounded-xl bg-stone-200/80 px-2.5 py-1 text-xs font-medium text-stone-700 hover:bg-stone-300 transition"
              title="Print Receipt Chit"
            >
              <Printer className="h-3.5 w-3.5" />
              <span>Print</span>
            </button>
            <button
              onClick={onClose}
              className="flex h-7 w-7 items-center justify-center rounded-full bg-stone-200/80 text-stone-600 hover:bg-stone-300 transition"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Receipt Body (Designed as Authentic Cafe Thermal Slip) */}
        <div className="pt-4 space-y-4 font-mono text-xs">
          {/* Cafe Header */}
          <div className="text-center space-y-1">
            <div className="mx-auto flex justify-center pb-1">
              <Image
                src="/logo-transparent.png"
                alt="smol café logo"
                width={60}
                height={88}
                className="h-16 w-auto object-contain drop-shadow-xs"
                priority
              />
            </div>
            <h2 className="font-serif text-2xl font-black tracking-tight text-[#241F1C] lowercase">
              smol café
            </h2>
            <p className="text-[11px] text-[#725039]">Tapovan, Rishikesh, Uttarakhand</p>
            <p className="text-[10px] text-stone-500">GSTIN: {receipt.gstin || "05AAECS1482M1ZB"}</p>
          </div>

          <div className="border-t border-b border-dashed border-stone-400 py-2.5 space-y-1 text-[11px]">
            <div className="flex justify-between">
              <span className="text-stone-500">Order ID:</span>
              <span className="font-bold text-[#241F1C]">
                #{receipt.orderNo || receipt.orderId.slice(-6).toUpperCase()}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-stone-500">Table &amp; Zone:</span>
              <span className="font-bold text-[#B72E35]">
                Table {receipt.tableLabel} ({receipt.zone || "Indoor"})
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-stone-500">Date &amp; Time:</span>
              <span>{new Date(receipt.paidAt).toLocaleString("en-IN", { hour12: true })}</span>
            </div>
            {receipt.transactionId && (
              <div className="flex justify-between text-[10px] text-stone-500 truncate">
                <span>Txn Ref:</span>
                <span className="font-mono">{receipt.transactionId}</span>
              </div>
            )}
          </div>

          {/* Line Items Table */}
          <div className="space-y-1.5">
            <div className="flex justify-between text-[10px] font-bold text-stone-500 uppercase">
              <span>Item</span>
              <span>Qty x Price</span>
              <span>Total</span>
            </div>
            <div className="border-b border-stone-300" />

            {receipt.items.map((item, idx) => (
              <div key={idx} className="flex items-center justify-between text-xs py-0.5">
                <div className="max-w-[55%] truncate font-sans font-medium text-[#241F1C]">
                  {item.name}
                </div>
                <div className="text-stone-500 text-[11px]">
                  {item.qty} x ₹{item.priceRupees}
                </div>
                <div className="font-bold text-[#241F1C]">₹{item.subtotalRupees}</div>
              </div>
            ))}
          </div>

          {/* Subtotal, Taxes, Total */}
          <div className="border-t border-dashed border-stone-400 pt-2 space-y-1 text-xs">
            <div className="flex justify-between text-stone-600">
              <span>Item Subtotal</span>
              <span>₹{receipt.subtotalRupees}</span>
            </div>
            <div className="flex justify-between text-stone-600 text-[11px]">
              <span>CGST (2.5%) + SGST (2.5%)</span>
              <span>₹{receipt.taxRupees}</span>
            </div>
            <div className="flex justify-between border-t border-stone-800 pt-1.5 font-bold text-sm text-[#241F1C]">
              <span>TOTAL PAID</span>
              <span className="text-[#B72E35] font-serif text-base">₹{receipt.totalRupees}</span>
            </div>
            <div className="flex justify-between text-[10px] text-emerald-800 pt-0.5">
              <span>Method: {receipt.paymentMethod}</span>
              <span className="font-bold">PAID IN FULL</span>
            </div>
          </div>

          {/* Thermal Slip Footer */}
          <div className="pt-3 text-center space-y-1 text-[10px] text-stone-500 font-sans border-t border-dashed border-stone-400">
            <p className="font-serif italic text-[#725039]">
              Thank you for visiting smol café.
            </p>
            <p>small place. long stay.</p>
          </div>
        </div>
      </div>
    </div>
  );
};
