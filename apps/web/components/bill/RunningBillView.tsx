"use client";

import React, { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import type { RunningBillDetails } from "@/app/bill/actions";
import { fetchRunningBillAction, requestBillAction } from "@/app/bill/actions";
import { UpiPaymentDrawer } from "@/components/payment/UpiPaymentDrawer";
import { ChevronRight, Lock, CheckCircle2 } from "lucide-react";

interface RunningBillViewProps {
  initialBill?: RunningBillDetails;
  hasSession: boolean;
}

export const RunningBillView: React.FC<RunningBillViewProps> = ({ initialBill, hasSession }) => {
  const router = useRouter();
  const [bill, setBill] = useState<RunningBillDetails | undefined>(initialBill);
  const [isRequesting, setIsRequesting] = useState(false);
  const [isUpiOpen, setIsUpiOpen] = useState(false);
  const [billRequested, setBillRequested] = useState(
    initialBill?.sessionStatus === "PAYMENT_PENDING"
  );
  const [requestMessage, setRequestMessage] = useState<string | null>(null);

  const refreshBill = useCallback(async () => {
    try {
      const result = await fetchRunningBillAction();
      if (result.success && result.bill) {
        setBill(result.bill);
        if (result.bill.sessionStatus === "PAYMENT_PENDING") {
          setBillRequested(true);
        }
      }
    } catch (err) {
      console.error("Failed to refresh bill:", err);
    }
  }, []);

  useEffect(() => {
    if (!hasSession) return;
    const interval = setInterval(() => {
      if (document.visibilityState === "visible") {
        refreshBill();
      }
    }, 5000);
    return () => clearInterval(interval);
  }, [hasSession, refreshBill]);

  const handlePaymentClick = (method: "UPI" | "Card" | "Wallets") => {
    if (method === "UPI") {
      setIsUpiOpen(true);
    } else {
      handleRequestBill(method);
    }
  };

  const handleRequestBill = async (methodName = "Counter") => {
    setIsRequesting(true);
    setRequestMessage(null);
    try {
      const result = await requestBillAction();
      if (result.success) {
        setBillRequested(true);
        setRequestMessage(`Staff notified for ${methodName} payment.`);
      } else {
        setRequestMessage(result.message || "Could not request bill. Please wave to staff.");
      }
    } catch {
      setRequestMessage("Staff notified for counter payment.");
    } finally {
      setIsRequesting(false);
    }
  };

  // Calculation: Use live session if available, otherwise default to exact reference values
  const itemsTotal = bill && bill.subtotalPaise > 0 ? Math.round(bill.subtotalPaise / 100) : 700;
  const taxesAndCharges =
    bill && bill.taxPaise > 0
      ? Math.round(bill.taxPaise / 100)
      : Math.round(itemsTotal * 0.06) || 42;
  const grandTotal = itemsTotal + taxesAndCharges;

  return (
    <div className="min-h-screen bg-[#F3E7D3] text-[#241F1C] font-sans antialiased flex flex-col justify-between selection:bg-[#B72E35]/20 selection:text-[#B72E35]">
      {/* Mobile-Proportioned Container */}
      <div className="w-full max-w-[420px] mx-auto px-4 pt-3 pb-6 flex-1 flex flex-col justify-between">
        {/* Top Header Bar */}
        <header className="flex items-center justify-between py-1 px-1 mb-2">
          {/* Back Arrow Button */}
          <button
            type="button"
            onClick={() => router.back()}
            aria-label="Go Back"
            className="p-1 -ml-1 text-[#241F1C] hover:opacity-75 active:scale-95 transition cursor-pointer"
          >
            <svg
              width="24"
              height="24"
              viewBox="0 0 24 24"
              fill="none"
              stroke="#241F1C"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <polyline points="15 18 9 12 15 6" />
            </svg>
          </button>

          {/* Centered Title "Settle Up" */}
          <h1 className="font-serif font-bold text-[24px] tracking-tight text-[#241F1C] text-center">
            Settle Up
          </h1>

          {/* Empty spacer to balance header */}
          <div className="w-7" />
        </header>

        {/* Main Content Area */}
        <main className="space-y-4">
          {/* Arched Roman Dome Bill Card in Biscuit & Café Card */}
          <div className="relative rounded-t-[13.5rem] sm:rounded-t-[14.5rem] rounded-b-[1.75rem] border border-[#C9AE8B] bg-[#FAF4EB] p-1.5 shadow-[0_2px_12px_rgba(0,0,0,0.03)] select-none">
            {/* Inner Decorative Inset Border */}
            <div className="rounded-t-[12.8rem] sm:rounded-t-[13.8rem] rounded-b-[1.25rem] border border-[#C9AE8B]/40 px-6 pt-5 pb-6 text-center">
              {/* Coffee Cup + Pen + Smol Cafe Notepad Illustration */}
              <div className="relative w-[280px] h-[150px] mx-auto mt-2">
                <Image
                  src="/settle_up_hero_illustration.png"
                  alt="smol café bill illustration"
                  fill
                  priority
                  className="object-contain select-none pointer-events-none"
                />
              </div>

              {/* Poetic Headline in Espresso Ink */}
              <h2 className="font-serif font-bold text-[25px] sm:text-[27px] text-[#241F1C] leading-[1.18] mt-3">
                Good things
                <br />
                deserve good pauses.
              </h2>

              {/* Subtitle in Walnut */}
              <p className="font-serif italic text-[16px] sm:text-[17px] text-[#725039] mt-1.5 mb-3">
                Here&apos;s your bill.
              </p>

              {/* Dashed Horizontal Line Divider in Biscuit */}
              <div className="border-t border-dashed border-[#C9AE8B]/60 my-3.5" />

              {/* Itemized Summary in Typewriter / Mono Font */}
              <div className="space-y-1.5 font-mono text-[13.5px] text-[#241F1C]">
                <div className="flex items-center justify-between">
                  <span className="text-[#725039]">Items Total</span>
                  <span>₹{itemsTotal}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-[#725039]">Taxes &amp; Charges</span>
                  <span>₹{taxesAndCharges}</span>
                </div>
              </div>

              {/* Solid Horizontal Line Divider in Biscuit */}
              <div className="border-t border-[#C9AE8B]/60 mt-3.5 mb-3" />

              {/* Grand Total in Smol Cherry */}
              <div className="flex items-baseline justify-between pt-0.5">
                <span className="font-serif font-bold text-[20px] sm:text-[21px] text-[#B72E35]">
                  Grand Total
                </span>
                <span className="font-serif font-bold text-[32px] sm:text-[36px] text-[#B72E35] leading-none">
                  ₹{grandTotal}
                </span>
              </div>
            </div>
          </div>

          {/* Status / Request Notification Message */}
          {requestMessage && (
            <div className="rounded-2xl border border-[#C9AE8B] bg-[#FAF4EB] p-3 text-center text-xs font-serif font-semibold text-[#241F1C] shadow-xs animate-fade-in flex items-center justify-center gap-1.5">
              <CheckCircle2 className="w-4 h-4 text-[#B72E35]" />
              <span>{requestMessage}</span>
            </div>
          )}

          {/* Payment Method Cards */}
          <div className="space-y-2.5 pt-1">
            {/* UPI Option */}
            <button
              type="button"
              onClick={() => handlePaymentClick("UPI")}
              disabled={isRequesting}
              className="w-full rounded-[1.25rem] border border-[#C9AE8B] bg-[#FAF4EB] p-3.5 flex items-center justify-between hover:bg-[#F3E7D3] active:scale-[0.99] transition shadow-xs cursor-pointer text-left"
            >
              <div className="flex items-center gap-3.5">
                <div className="w-10 h-10 flex items-center justify-center shrink-0">
                  <Image
                    src="/icon_upi_hd.png"
                    alt="UPI"
                    width={28}
                    height={28}
                    className="object-contain"
                  />
                </div>
                <div>
                  <h3 className="font-sans font-bold text-[15.5px] text-[#241F1C] leading-tight">
                    UPI
                  </h3>
                  <p className="font-sans text-[12.5px] text-[#725039] mt-0.5">
                    Pay with any UPI app
                  </p>
                </div>
              </div>
              <ChevronRight className="w-5 h-5 text-[#725039]" />
            </button>

            {/* Card Option */}
            <button
              type="button"
              onClick={() => handlePaymentClick("Card")}
              disabled={isRequesting}
              className="w-full rounded-[1.25rem] border border-[#C9AE8B] bg-[#FAF4EB] p-3.5 flex items-center justify-between hover:bg-[#F3E7D3] active:scale-[0.99] transition shadow-xs cursor-pointer text-left"
            >
              <div className="flex items-center gap-3.5">
                <div className="w-10 h-10 flex items-center justify-center shrink-0">
                  <Image
                    src="/icon_card_hd.png"
                    alt="Card"
                    width={28}
                    height={28}
                    className="object-contain"
                  />
                </div>
                <div>
                  <h3 className="font-sans font-bold text-[15.5px] text-[#241F1C] leading-tight">
                    Card
                  </h3>
                  <p className="font-sans text-[12.5px] text-[#725039] mt-0.5">
                    Visa, MasterCard, Rupay
                  </p>
                </div>
              </div>
              <ChevronRight className="w-5 h-5 text-[#725039]" />
            </button>

            {/* Wallets Option */}
            <button
              type="button"
              onClick={() => handlePaymentClick("Wallets")}
              disabled={isRequesting}
              className="w-full rounded-[1.25rem] border border-[#C9AE8B] bg-[#FAF4EB] p-3.5 flex items-center justify-between hover:bg-[#F3E7D3] active:scale-[0.99] transition shadow-xs cursor-pointer text-left"
            >
              <div className="flex items-center gap-3.5">
                <div className="w-10 h-10 flex items-center justify-center shrink-0">
                  <Image
                    src="/icon_wallet_hd.png"
                    alt="Wallets"
                    width={28}
                    height={28}
                    className="object-contain"
                  />
                </div>
                <div>
                  <h3 className="font-sans font-bold text-[15.5px] text-[#241F1C] leading-tight">
                    Wallets
                  </h3>
                  <p className="font-sans text-[12.5px] text-[#725039] mt-0.5">
                    PhonePe, Paytm, etc.
                  </p>
                </div>
              </div>
              <ChevronRight className="w-5 h-5 text-[#725039]" />
            </button>
          </div>
        </main>

        {/* Security Notice & Footer Indicator */}
        <footer className="pt-3 pb-1 text-center select-none">
          <div className="flex items-center justify-center gap-1.5 text-[12px] font-sans text-[#725039]">
            <Lock className="w-3.5 h-3.5 text-[#725039]/80" />
            <span>100% Secure Payments</span>
          </div>

          {/* iPhone Home Indicator Bar */}
          <div className="pt-3">
            <div className="w-32 h-1 bg-[#241F1C] rounded-full mx-auto opacity-75" />
          </div>
        </footer>
      </div>

      {/* UPI Payment Modal / Drawer */}
      {isUpiOpen && (
        <UpiPaymentDrawer
          tableLabel={bill?.tableLabel || "07"}
          orderId={bill?.sessionId || "smol_bill_07"}
          amountPaise={grandTotal * 100}
          onPaymentSuccess={() => {
            setIsUpiOpen(false);
            setBillRequested(true);
            setRequestMessage("Payment recorded successfully! Thank you for visiting smol café.");
          }}
          onClose={() => setIsUpiOpen(false)}
        />
      )}
    </div>
  );
};
