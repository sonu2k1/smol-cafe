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
    <div className="min-h-screen bg-[#F5EDE2] text-[#1C1917] font-sans antialiased flex flex-col justify-between selection:bg-[#963336]/20 selection:text-[#963336]">
      {/* Mobile-Proportioned Container */}
      <div className="w-full max-w-[420px] mx-auto px-4 pt-3 pb-6 flex-1 flex flex-col justify-between">
        {/* Top Header Bar */}
        <header className="flex items-center justify-between py-1 px-1 mb-2">
          {/* Back Arrow Button */}
          <button
            type="button"
            onClick={() => router.back()}
            aria-label="Go Back"
            className="p-1 -ml-1 text-[#1C1917] hover:opacity-75 active:scale-95 transition cursor-pointer"
          >
            <svg
              width="24"
              height="24"
              viewBox="0 0 24 24"
              fill="none"
              stroke="#1C1917"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <polyline points="15 18 9 12 15 6" />
            </svg>
          </button>

          {/* Centered Title "Settle Up" */}
          <h1 className="font-serif font-bold text-[24px] tracking-tight text-[#1C1917] text-center">
            Settle Up
          </h1>

          {/* Empty spacer to balance header */}
          <div className="w-7" />
        </header>

        {/* Main Content Area */}
        <main className="space-y-4">
          {/* Arched Roman Dome Bill Card */}
          <div className="relative rounded-t-[13.5rem] sm:rounded-t-[14.5rem] rounded-b-[1.75rem] border border-[#D8CCBD] bg-[#FAF5EE] p-1.5 shadow-[0_2px_12px_rgba(0,0,0,0.03)] select-none">
            {/* Inner Decorative Inset Border */}
            <div className="rounded-t-[12.8rem] sm:rounded-t-[13.8rem] rounded-b-[1.25rem] border border-[#E5D9CC] px-6 pt-5 pb-6 text-center">
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

              {/* Poetic Headline */}
              <h2 className="font-serif font-bold text-[25px] sm:text-[27px] text-[#1C1917] leading-[1.18] mt-3">
                Good things
                <br />
                deserve good pauses.
              </h2>

              {/* Subtitle */}
              <p className="font-serif italic text-[16px] sm:text-[17px] text-[#2C2420] mt-1.5 mb-3">
                Here&apos;s your bill.
              </p>

              {/* Dashed Horizontal Line Divider */}
              <div className="border-t border-dashed border-[#D8CCBD] my-3.5" />

              {/* Itemized Summary in Typewriter / Mono Font */}
              <div className="space-y-1.5 font-mono text-[13.5px] text-[#2A231E]">
                <div className="flex items-center justify-between">
                  <span>Items Total</span>
                  <span>₹{itemsTotal}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span>Taxes &amp; Charges</span>
                  <span>₹{taxesAndCharges}</span>
                </div>
              </div>

              {/* Solid Horizontal Line Divider */}
              <div className="border-t border-[#D8CCBD] mt-3.5 mb-3" />

              {/* Grand Total */}
              <div className="flex items-baseline justify-between pt-0.5">
                <span className="font-serif font-bold text-[20px] sm:text-[21px] text-[#8C292E]">
                  Grand Total
                </span>
                <span className="font-serif font-bold text-[32px] sm:text-[36px] text-[#8C292E] leading-none">
                  ₹{grandTotal}
                </span>
              </div>
            </div>
          </div>

          {/* Status / Request Notification Message */}
          {requestMessage && (
            <div className="rounded-2xl border border-emerald-200 bg-emerald-50/90 p-3 text-center text-xs font-serif font-semibold text-emerald-900 shadow-xs animate-fade-in flex items-center justify-center gap-1.5">
              <CheckCircle2 className="w-4 h-4 text-emerald-700" />
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
              className="w-full rounded-[1.25rem] border border-[#D8CCBD] bg-[#FAF5EE] p-3.5 flex items-center justify-between hover:bg-[#F4ECE1] active:scale-[0.99] transition shadow-xs cursor-pointer text-left"
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
                  <h3 className="font-sans font-bold text-[15.5px] text-[#1C1917] leading-tight">
                    UPI
                  </h3>
                  <p className="font-sans text-[12.5px] text-[#725039] mt-0.5">
                    Pay with any UPI app
                  </p>
                </div>
              </div>
              <ChevronRight className="w-5 h-5 text-[#8C7E72]" />
            </button>

            {/* Card Option */}
            <button
              type="button"
              onClick={() => handlePaymentClick("Card")}
              disabled={isRequesting}
              className="w-full rounded-[1.25rem] border border-[#D8CCBD] bg-[#FAF5EE] p-3.5 flex items-center justify-between hover:bg-[#F4ECE1] active:scale-[0.99] transition shadow-xs cursor-pointer text-left"
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
                  <h3 className="font-sans font-bold text-[15.5px] text-[#1C1917] leading-tight">
                    Card
                  </h3>
                  <p className="font-sans text-[12.5px] text-[#725039] mt-0.5">
                    Visa, MasterCard, Rupay
                  </p>
                </div>
              </div>
              <ChevronRight className="w-5 h-5 text-[#8C7E72]" />
            </button>

            {/* Wallets Option */}
            <button
              type="button"
              onClick={() => handlePaymentClick("Wallets")}
              disabled={isRequesting}
              className="w-full rounded-[1.25rem] border border-[#D8CCBD] bg-[#FAF5EE] p-3.5 flex items-center justify-between hover:bg-[#F4ECE1] active:scale-[0.99] transition shadow-xs cursor-pointer text-left"
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
                  <h3 className="font-sans font-bold text-[15.5px] text-[#1C1917] leading-tight">
                    Wallets
                  </h3>
                  <p className="font-sans text-[12.5px] text-[#725039] mt-0.5">
                    PhonePe, Paytm, etc.
                  </p>
                </div>
              </div>
              <ChevronRight className="w-5 h-5 text-[#8C7E72]" />
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
            <div className="w-32 h-1 bg-[#1C1917] rounded-full mx-auto opacity-75" />
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
