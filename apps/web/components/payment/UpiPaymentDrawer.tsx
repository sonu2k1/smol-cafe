"use client";

import React, { useState, useEffect } from "react";
import Image from "next/image";
import {
  getUpiConfig,
  buildAppSpecificUpiUri,
  simulateUpiPayment,
  type UpiVerificationResult,
} from "@/lib/upi";
import { broadcastSyncEvent } from "@/lib/sync-events";
import { DigitalReceiptModal, type ReceiptData } from "./DigitalReceiptModal";
import { PostPaymentCelebrationModal } from "./PostPaymentCelebrationModal";
import { X, Copy, Check, Smartphone } from "lucide-react";

interface UpiPaymentDrawerProps {
  orderId?: string;
  orderNo?: number;
  tableLabel: string;
  zone?: string;
  amountPaise: number;
  items?: Array<{ name: string; qty: number; priceRupees: number; subtotalRupees: number }>;
  onClose: () => void;
  onPaymentSuccess?: (result: UpiVerificationResult) => void;
}

export const UpiPaymentDrawer: React.FC<UpiPaymentDrawerProps> = ({
  orderId = `ORD-${Date.now().toString().slice(-6)}`,
  orderNo,
  tableLabel,
  zone = "Café",
  amountPaise,
  items = [],
  onClose,
  onPaymentSuccess,
}) => {
  const [config, setConfig] = useState(getUpiConfig());
  const [copied, setCopied] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [activeProcessingApp, setActiveProcessingApp] = useState<string | null>(null);
  const [paymentResult, setPaymentResult] = useState<UpiVerificationResult | null>(null);
  const [showReceipt, setShowReceipt] = useState(false);

  useEffect(() => {
    setConfig(getUpiConfig());
  }, []);

  const totalRupees = Math.round(amountPaise / 100);

  const handleCopyUpiId = () => {
    navigator.clipboard.writeText(config.vpa);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleAppClick = async (appName: string, appKey: "gpay" | "paytm" | "phonepe" | "bhim" | "cred") => {
    setActiveProcessingApp(appName);
    setIsProcessing(true);

    // If mobile, attempt deep link launch
    if (typeof window !== "undefined" && /Android|iPhone|iPad/i.test(navigator.userAgent)) {
      const deepLink = buildAppSpecificUpiUri(appKey, { amountPaise, orderNo: orderNo || orderId });

      // Try opening app via deep link
      window.location.href = deepLink;
    }

    // Execute realistic payment simulation
    try {
      const res = await simulateUpiPayment(appName, { amountPaise, orderNo: orderNo || orderId });
      setPaymentResult(res);

      // Broadcast payment across interface (Cashier, Kitchen, Admin)
      broadcastSyncEvent({
        type: "PAYMENT_COMPLETED",
        orderId,
        tableLabel,
        status: "PAID",
        timestamp: Date.now(),
        metadata: {
          transactionId: res.transactionId,
          amountPaise,
          paymentMethod: "UPI",
          appName,
        },
      });

      if (onPaymentSuccess) {
        onPaymentSuccess(res);
      }
    } catch (err) {
      console.error("UPI simulation failed", err);
    } finally {
      setIsProcessing(false);
      setActiveProcessingApp(null);
    }
  };

  const defaultReceiptItems = items.length > 0 ? items : [
    { name: "Artisanal Table Order", qty: 1, priceRupees: totalRupees, subtotalRupees: totalRupees }
  ];

  const receiptData: ReceiptData = {
    orderId,
    orderNo,
    tableLabel,
    zone,
    items: defaultReceiptItems,
    subtotalRupees: Math.round(totalRupees / 1.05),
    taxRupees: Math.round(totalRupees - totalRupees / 1.05),
    totalRupees,
    paymentMethod: "UPI",
    transactionId: paymentResult?.transactionId || `UPI/2026/${Math.floor(100000000 + Math.random() * 900000000)}`,
    paidAt: paymentResult?.paidAt || new Date().toISOString(),
    merchantName: config.name,
    gstin: config.gstin,
  };

  if (showReceipt) {
    return (
      <DigitalReceiptModal
        receipt={receiptData}
        onClose={() => {
          setShowReceipt(false);
          onClose();
        }}
      />
    );
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-[#241F1C]/40 dark:bg-black/50 p-0 sm:p-4 backdrop-blur-md animate-fade-in"
      onClick={onClose}
    >
      <div
        className="w-full max-w-md rounded-t-[2.5rem] sm:rounded-3xl border border-[#E2D7C7] dark:border-stone-800 bg-[#FAF4EB] dark:bg-[#1E1A17] p-6 shadow-2xl text-[#241F1C] dark:text-[#F3E7D3] transition-all animate-scale-in max-h-[92vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Drawer Pull Handle on Mobile */}
        <div className="pt-1 pb-3 flex justify-center sm:hidden">
          <div className="w-10 h-1 rounded-full bg-stone-300 dark:bg-stone-700" />
        </div>

        {/* Drawer Header */}
        <div className="flex items-center justify-between border-b border-[#E2D7C7] dark:border-stone-800 pb-3">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 px-2.5 items-center justify-center rounded-2xl bg-white dark:bg-stone-800 border border-[#C9AE8B]/40 dark:border-stone-700 shadow-2xs">
              <Image
                src="/upi-logo-trimmed.png"
                alt="UPI"
                width={36}
                height={14}
                className="h-4 w-auto object-contain dark:hidden"
              />
              <Image
                src="/upi-logo-dark.png"
                alt="UPI"
                width={36}
                height={14}
                className="h-4 w-auto object-contain hidden dark:block"
              />
            </div>
            <div>
              <h3 className="font-serif text-lg font-bold tracking-tight text-[#241F1C] dark:text-white">
                UPI Instant Gateway
              </h3>
              <p className="font-serif italic text-xs text-[#725039] dark:text-[#C9AE8B]">
                Zero convenience fee • Direct bank transfer
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-full bg-stone-200/70 dark:bg-stone-800 text-stone-600 dark:text-stone-300 hover:bg-stone-300 dark:hover:bg-stone-700 transition cursor-pointer"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Successful Payment State */}
        {paymentResult ? (
          <PostPaymentCelebrationModal
            orderId={orderId}
            orderNo={orderNo}
            tableLabel={tableLabel}
            zone={zone}
            totalRupees={totalRupees}
            items={items}
            transactionId={paymentResult.transactionId}
            appName={paymentResult.appName}
            onClose={onClose}
          />
        ) : (
          /* Payment Interface: QR + VPA + App Drawer */
          <div className="space-y-5 pt-4">
            {/* Amount Banner */}
            <div className="flex items-center justify-between rounded-2xl border border-[#E2D7C7] bg-white p-4 shadow-xs">
              <div>
                <span className="font-mono text-[10px] uppercase font-bold text-stone-500">
                  Total Bill Amount
                </span>
                <div className="font-serif text-3xl font-black text-[#B72E35]">
                  ₹{totalRupees}
                </div>
              </div>
              <div className="text-right font-mono text-xs">
                <span className="rounded-lg bg-stone-100 px-2 py-1 font-bold text-stone-700">
                  Table {tableLabel}
                </span>
                <p className="text-[10px] text-stone-400 mt-1">{zone}</p>
              </div>
            </div>

            {/* Merchant Info & Dynamic QR Code */}
            <div className="flex flex-col items-center justify-center rounded-3xl border border-[#E2D7C7] bg-white p-5 shadow-sm space-y-3">
              <div className="text-center">
                <span className="text-xs font-bold text-[#241F1C]">{config.name}</span>
                <div className="flex items-center justify-center gap-1.5 mt-0.5">
                  <code className="font-mono text-xs text-[#725039] bg-[#FAF4EB] px-2 py-0.5 rounded-md border border-[#E2D7C7]">
                    {config.vpa}
                  </code>
                  <button
                    onClick={handleCopyUpiId}
                    className="text-stone-500 hover:text-stone-800 p-1"
                    title="Copy UPI VPA"
                  >
                    {copied ? (
                      <Check className="h-3.5 w-3.5 text-emerald-600" />
                    ) : (
                      <Copy className="h-3.5 w-3.5" />
                    )}
                  </button>
                </div>
              </div>

              {/* Dynamic QR Code Canvas Display */}
              <div className="relative flex h-44 w-44 items-center justify-center rounded-2xl border-2 border-[#E2D7C7] bg-[#FAF4EB] p-2 shadow-inner">
                {/* Visual SVG QR Code pattern */}
                <svg className="h-40 w-40" viewBox="0 0 100 100" fill="none">
                  {/* Outer corner markers */}
                  <rect x="5" y="5" width="26" height="26" rx="4" fill="#241F1C" />
                  <rect x="9" y="9" width="18" height="18" rx="2" fill="#FAF4EB" />
                  <rect x="13" y="13" width="10" height="10" rx="1" fill="#B72E35" />

                  <rect x="69" y="5" width="26" height="26" rx="4" fill="#241F1C" />
                  <rect x="73" y="9" width="18" height="18" rx="2" fill="#FAF4EB" />
                  <rect x="77" y="13" width="10" height="10" rx="1" fill="#B72E35" />

                  <rect x="5" y="69" width="26" height="26" rx="4" fill="#241F1C" />
                  <rect x="9" y="73" width="18" height="18" rx="2" fill="#FAF4EB" />
                  <rect x="13" y="77" width="10" height="10" rx="1" fill="#B72E35" />

                  {/* QR Data Grid Matrix */}
                  <circle cx="40" cy="18" r="3" fill="#241F1C" />
                  <circle cx="50" cy="12" r="2.5" fill="#241F1C" />
                  <circle cx="60" cy="20" r="3" fill="#241F1C" />
                  <circle cx="45" cy="35" r="3" fill="#B72E35" />
                  <circle cx="55" cy="45" r="3.5" fill="#241F1C" />
                  <circle cx="35" cy="55" r="2.5" fill="#241F1C" />
                  <circle cx="65" cy="60" r="3" fill="#B72E35" />
                  <circle cx="85" cy="45" r="2.5" fill="#241F1C" />
                  <circle cx="18" cy="45" r="3" fill="#241F1C" />
                  <circle cx="45" cy="75" r="2.5" fill="#241F1C" />
                  <circle cx="55" cy="85" r="3" fill="#241F1C" />
                  <circle cx="75" cy="80" r="2.5" fill="#241F1C" />
                  <circle cx="85" cy="85" r="3" fill="#B72E35" />
                </svg>

                {/* Center Cafe Badge */}
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="h-8 w-8 rounded-lg bg-[#FAF4EB] border border-[#E2D7C7] flex items-center justify-center font-serif font-black text-xs text-[#B72E35] shadow-xs">
                    s
                  </div>
                </div>
              </div>

              <span className="text-[11px] text-stone-500 font-mono">
                Scan with any UPI app on phone
              </span>
            </div>

            {/* UPI App Drawer: Google Pay, Paytm, PhonePe, BHIM, CRED */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="font-serif text-xs font-bold text-[#241F1C] flex items-center gap-1.5">
                  <Smartphone className="h-3.5 w-3.5 text-[#B72E35]" />
                  Tap to Pay with Installed App
                </span>
                <span className="font-mono text-[10px] text-[#725039]">Instant verification</span>
              </div>

              {isProcessing ? (
                <div className="rounded-2xl border border-amber-300 bg-amber-50/80 p-5 text-center space-y-2 animate-pulse">
                  <div className="mx-auto h-7 w-7 rounded-full border-2 border-[#B72E35] border-t-transparent animate-spin" />
                  <p className="font-serif font-bold text-sm text-[#241F1C]">
                    Connecting to {activeProcessingApp}...
                  </p>
                  <p className="font-mono text-[11px] text-stone-500">
                    Authorizing payment of ₹{totalRupees} with your bank
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-5 gap-2">
                  {[
                    { name: "Google Pay", key: "gpay" as const, color: "#4285F4", label: "GPay" },
                    { name: "Paytm", key: "paytm" as const, color: "#00B9F5", label: "Paytm" },
                    { name: "PhonePe", key: "phonepe" as const, color: "#5F259F", label: "PhonePe" },
                    { name: "BHIM", key: "bhim" as const, color: "#007A3D", label: "BHIM" },
                    { name: "CRED", key: "cred" as const, color: "#1C1917", label: "CRED" },
                  ].map((app) => (
                    <button
                      key={app.key}
                      onClick={() => handleAppClick(app.name, app.key)}
                      className="group flex flex-col items-center justify-center rounded-2xl border border-[#E2D7C7] bg-white p-2.5 shadow-xs hover:border-[#B72E35] hover:shadow-md transition active:scale-95"
                    >
                      <div
                        className="flex h-9 w-9 items-center justify-center rounded-xl text-white font-bold text-xs shadow-xs"
                        style={{ backgroundColor: app.color }}
                      >
                        {app.label.slice(0, 2)}
                      </div>
                      <span className="mt-1.5 font-sans text-[10px] font-bold text-[#241F1C] group-hover:text-[#B72E35]">
                        {app.label}
                      </span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
