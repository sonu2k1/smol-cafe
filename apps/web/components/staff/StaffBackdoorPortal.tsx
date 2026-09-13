"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { staffBackdoorLoginAction } from "@/app/smol-backdoor/actions";
import { ChefHat, CreditCard, Zap, AlertTriangle } from "lucide-react";

export const StaffBackdoorPortal: React.FC = () => {
  const router = useRouter();
  const [selectedRole, setSelectedRole] = useState<"kitchen" | "cashier" | "admin">("cashier");
  const [pin, setPin] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const roles = [
    {
      id: "kitchen" as const,
      name: "Kitchen KDS",
      icon: ChefHat,
      tagline: "Live confirmed ticket queue & brewing timer",
      defaultPin: "7711",
      accent: "#F2C84B",
      destination: "/smol-backdoor/kitchen",
    },
    {
      id: "cashier" as const,
      name: "Cashier Desk",
      icon: CreditCard,
      tagline: "Order verification queue & table cash settlement",
      defaultPin: "4422",
      accent: "#B72E35",
      destination: "/smol-backdoor/cashier",
    },
    {
      id: "admin" as const,
      name: "Admin Control",
      icon: Zap,
      tagline: "Master café management, chalkboard & observability",
      defaultPin: "9900",
      accent: "#754CFF",
      destination: "/smol-backdoor/admin",
    },
  ];

  const handleQuickLogin = async (role: "kitchen" | "cashier" | "admin", customPin?: string) => {
    setIsSubmitting(true);
    setErrorMessage(null);

    const defaultRolePin = roles.find((r) => r.id === role)?.defaultPin;
    const activePin = customPin || pin || defaultRolePin;

    try {
      const res = await staffBackdoorLoginAction({
        role,
        pin: activePin,
      });

      if (res.success && res.redirectTo) {
        router.push(res.redirectTo);
      } else {
        setErrorMessage(res.message || "Authentication failed. Please check credentials.");
      }
    } catch {
      setErrorMessage("An unexpected network error occurred.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const currentRoleConfig = roles.find((r) => r.id === selectedRole)!;

  return (
    <div className="min-h-screen bg-[#241F1C] text-[#F3E7D3] font-sans flex flex-col justify-between p-4 sm:p-6">
      {/* Top Header */}
      <header className="mx-auto flex w-full max-w-lg items-center justify-between py-4 border-b border-[#3D3530]">
        <div className="flex items-center gap-2.5">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#B72E35] text-white font-serif font-bold text-lg shadow-md">
            s
          </div>
          <div>
            <h1 className="font-serif text-xl font-bold tracking-tight text-white lowercase">
              smol backdoor
            </h1>
            <p className="font-mono text-[10px] font-medium text-[#C9AE8B]">
              staff authorization &amp; role portal
            </p>
          </div>
        </div>

        <Link
          href="/smol-menu"
          className="rounded-full border border-[#C9AE8B]/40 bg-[#3D3530] px-3.5 py-1 text-xs font-serif text-[#F3E7D3] hover:bg-[#4A423A] transition active:scale-95"
        >
          Customer Menu →
        </Link>
      </header>

      {/* Main Role Selection & Keypad */}
      <main className="mx-auto my-auto w-full max-w-lg space-y-6 py-6">
        {/* Role Selector Tabs */}
        <div className="grid grid-cols-3 gap-2 rounded-2xl border border-[#3D3530] bg-[#1A1715] p-1.5">
          {roles.map((r) => {
            const isSelected = selectedRole === r.id;
            const IconComp = r.icon;
            return (
              <button
                key={r.id}
                type="button"
                onClick={() => {
                  setSelectedRole(r.id);
                  setPin("");
                  setErrorMessage(null);
                }}
                className={`flex flex-col items-center justify-center rounded-xl py-3 px-2 text-center transition-all ${
                  isSelected
                    ? "bg-[#2E2824] shadow-md border border-[#C9AE8B]/30"
                    : "opacity-60 hover:opacity-100"
                }`}
              >
                <IconComp className="h-6 w-6 mb-1 text-[#F2C84B]" />
                <span className="font-serif text-xs font-bold text-white line-clamp-1">{r.name}</span>
              </button>
            );
          })}
        </div>

        {/* Selected Station Card */}
        <div className="rounded-3xl border border-[#C9AE8B]/30 bg-[#1A1715] p-6 shadow-xl space-y-5">
          <div className="flex items-start justify-between">
            <div>
              <span className="inline-block rounded-md bg-[#2E2824] px-2.5 py-0.5 font-mono text-[10px] uppercase font-bold text-[#F2C84B] tracking-wider">
                STATION AUTHORIZATION
              </span>
              <h2 className="font-serif text-2xl font-bold text-white mt-1">
                {currentRoleConfig.name}
              </h2>
              <p className="font-serif italic text-xs text-[#C9AE8B] mt-0.5">
                {currentRoleConfig.tagline}
              </p>
            </div>
            <currentRoleConfig.icon className="h-8 w-8 text-[#C9AE8B]" />
          </div>

          {errorMessage && (
            <div className="flex items-center gap-2 rounded-2xl border border-rose-900/60 bg-rose-950/40 p-3 text-xs text-rose-300 font-serif">
              <AlertTriangle className="h-4 w-4 shrink-0" />
              <span>{errorMessage}</span>
            </div>
          )}

          {/* Quick PIN Input / Display */}
          <div className="space-y-2">
            <label className="block text-xs font-mono text-[#C9AE8B]">
              Enter Station PIN (Default: {currentRoleConfig.defaultPin})
            </label>
            <div className="flex gap-2">
              <input
                type="password"
                maxLength={6}
                value={pin}
                placeholder={currentRoleConfig.defaultPin}
                onChange={(e) => setPin(e.target.value)}
                className="flex-1 rounded-xl border border-[#3D3530] bg-[#2E2824] px-4 py-3 font-mono text-xl font-bold text-center tracking-widest text-white focus:border-[#B72E35] focus:outline-none"
              />
              <button
                type="button"
                disabled={isSubmitting}
                onClick={() => handleQuickLogin(selectedRole, pin)}
                className="rounded-xl bg-[#B72E35] px-6 font-mono text-sm font-bold text-white hover:bg-[#9E242B] active:scale-95 transition disabled:opacity-50"
              >
                {isSubmitting ? "..." : "Unlock →"}
              </button>
            </div>
          </div>

          {/* 1-Click Station Launch */}
          <div className="pt-2 border-t border-[#3D3530] flex items-center justify-between text-xs">
            <span className="font-mono text-[11px] text-[#C9AE8B]">
              One-click station launch:
            </span>
            <button
              type="button"
              disabled={isSubmitting}
              onClick={() => handleQuickLogin(selectedRole, currentRoleConfig.defaultPin)}
              className="rounded-lg bg-[#2E2824] px-3 py-1.5 font-mono text-xs font-bold text-[#F2C84B] hover:bg-[#3D3530] transition active:scale-95"
            >
              Instant Enter ({currentRoleConfig.name})
            </button>
          </div>
        </div>

        {/* Navigation Quick Links */}
        <div className="grid grid-cols-3 gap-2 text-center text-xs font-mono text-[#C9AE8B]">
          <Link
            href="/smol-backdoor/kitchen"
            className="flex items-center justify-center gap-1.5 rounded-xl border border-[#3D3530] bg-[#1A1715] p-3 hover:bg-[#2E2824] transition"
          >
            <ChefHat className="h-4 w-4" /> Kitchen KDS
          </Link>
          <Link
            href="/smol-backdoor/cashier"
            className="flex items-center justify-center gap-1.5 rounded-xl border border-[#3D3530] bg-[#1A1715] p-3 hover:bg-[#2E2824] transition"
          >
            <CreditCard className="h-4 w-4" /> Cashier POS
          </Link>
          <Link
            href="/smol-backdoor/admin"
            className="flex items-center justify-center gap-1.5 rounded-xl border border-[#3D3530] bg-[#1A1715] p-3 hover:bg-[#2E2824] transition"
          >
            <Zap className="h-4 w-4" /> Admin Tower
          </Link>
        </div>
      </main>

      {/* Footer */}
      <footer className="mx-auto w-full max-w-lg text-center py-3 text-[11px] font-mono text-[#725039]">
        smol café • secure role-based operations • rishikesh
      </footer>
    </div>
  );
};
