"use client";

import React, { useState, useEffect, useTransition } from "react";
import { useRouter } from "next/navigation";
import { User, Phone, ArrowRight, Sparkles } from "lucide-react";
import { onboardGuestAndRedirectAction } from "@/app/t/actions";

interface TableGuestOnboardingFormProps {
  tableToken: string;
  tableLabel: string;
  initialGuestName?: string;
  initialGuestPhone?: string;
}

export function TableGuestOnboardingForm({
  tableToken,
  tableLabel,
  initialGuestName = "",
  initialGuestPhone = "",
}: TableGuestOnboardingFormProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const [name, setName] = useState(initialGuestName);
  const [phone, setPhone] = useState(initialGuestPhone);
  const [error, setError] = useState<string | null>(null);

  // Pre-fill from localStorage if available
  useEffect(() => {
    if (typeof window !== "undefined") {
      const savedName = localStorage.getItem("smol_guest_name");
      const savedPhone = localStorage.getItem("smol_guest_phone");
      if (savedName && !name) setName(savedName);
      if (savedPhone && !phone) setPhone(savedPhone);
    }
  }, []);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);

    const trimmedName = name.trim();
    const cleanDigits = phone.replace(/\D/g, "");

    if (!trimmedName || trimmedName.length < 2) {
      setError("Please enter your name to continue.");
      return;
    }

    if (!cleanDigits || cleanDigits.length < 10) {
      setError("Please enter a valid 10-digit mobile number.");
      return;
    }

    // Persist immediately in localStorage for instant client-side responsiveness
    if (typeof window !== "undefined") {
      localStorage.setItem("smol_guest_name", trimmedName);
      localStorage.setItem("smol_guest_phone", cleanDigits);
      localStorage.setItem("smol_current_table", tableLabel);
    }

    const formData = new FormData();
    formData.append("tableToken", tableToken);
    formData.append("guestName", trimmedName);
    formData.append("guestPhone", cleanDigits);

    startTransition(async () => {
      try {
        const result = await onboardGuestAndRedirectAction(formData);
        if (result && !result.success) {
          setError(result.error || "Could not set up table session. Please try again.");
        } else {
          router.push("/home");
        }
      } catch (err) {
        console.error("Error onboarding guest:", err);
        // Fallback directly to home since local state is already saved
        router.push("/home");
      }
    });
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="w-full max-w-[320px] sm:max-w-xs pt-3 space-y-3"
    >
      {/* Error Alert */}
      {error && (
        <div className="rounded-xl border border-[#B72E35]/40 bg-[#B72E35]/10 px-3.5 py-2 text-xs font-sans text-[#B72E35] dark:text-[#FF8080] text-center animate-shake">
          {error}
        </div>
      )}

      {/* Guest Name Input */}
      <div className="relative">
        <div className="absolute inset-y-0 left-0 flex items-center pl-3.5 pointer-events-none text-[#725039] dark:text-[#C9AE8B]">
          <User className="h-4 w-4 opacity-70" />
        </div>
        <input
          type="text"
          name="guestName"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Your Name (e.g. Sonu)"
          required
          autoComplete="name"
          className="w-full pl-10 pr-4 py-3 rounded-2xl border border-[#C9AE8B]/60 dark:border-white/15 bg-[#FAF4EB] dark:bg-[#1E1815] text-[#241F1C] dark:text-[#FAF4EB] placeholder-[#725039]/60 dark:placeholder-[#C9AE8B]/50 font-serif text-sm focus:outline-none focus:border-[#B72E35] dark:focus:border-[#F2C84B] focus:ring-2 focus:ring-[#B72E35]/20 shadow-xs transition-all"
        />
      </div>

      {/* Phone Number Input */}
      <div className="relative flex items-center rounded-2xl border border-[#C9AE8B]/60 dark:border-white/15 bg-[#FAF4EB] dark:bg-[#1E1815] shadow-xs focus-within:border-[#B72E35] dark:focus-within:border-[#F2C84B] focus-within:ring-2 focus-within:ring-[#B72E35]/20 transition-all overflow-hidden">
        <div className="flex items-center gap-1 pl-3.5 pr-2 py-3 bg-[#EFE3D3]/50 dark:bg-white/5 border-r border-[#C9AE8B]/30 dark:border-white/10 select-none">
          <Phone className="h-3.5 w-3.5 text-[#725039] dark:text-[#C9AE8B] opacity-70" />
          <span className="font-mono text-xs font-bold text-[#241F1C] dark:text-[#FAF4EB]">
            +91
          </span>
        </div>
        <input
          type="tel"
          name="guestPhone"
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          placeholder="10-digit mobile number"
          required
          maxLength={10}
          autoComplete="tel-national"
          className="flex-1 px-3 py-3 bg-transparent text-[#241F1C] dark:text-[#FAF4EB] placeholder-[#725039]/60 dark:placeholder-[#C9AE8B]/50 font-mono text-xs sm:text-sm focus:outline-none"
        />
      </div>

      {/* Micro Loyalty Banner */}
      <div className="flex items-center justify-center gap-1.5 pt-0.5 text-[10.5px] font-mono text-[#725039] dark:text-[#C9AE8B]">
        <Sparkles className="h-3 w-3 text-[#B72E35] dark:text-[#F2C84B]" />
        <span>Earn loyalty points &amp; receipts on this number</span>
      </div>

      {/* Primary CTA: Continue to Café (Navigating to /home) */}
      <div className="pt-1">
        <button
          type="submit"
          disabled={isPending}
          className="w-full flex items-center justify-center gap-2 rounded-full bg-[#B72E35] hover:bg-[#9B242A] py-3.5 px-6 text-sm sm:text-base font-serif font-bold text-white shadow-md shadow-[#B72E35]/25 transition hover:scale-[1.01] active:scale-[0.98] disabled:opacity-60 cursor-pointer"
        >
          <span>{isPending ? "Entering Café..." : "Continue to Café"}</span>
          <ArrowRight className="h-4 w-4" />
        </button>
      </div>
    </form>
  );
}
