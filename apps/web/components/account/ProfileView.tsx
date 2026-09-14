"use client";

import React, { useState } from "react";
import Link from "next/link";
import type { Profile } from "@smol-cafe/db";
import type { CustomerHistoricalOrder } from "@/app/account/actions";
import { claimCurrentSessionOrdersAction } from "@/app/account/actions";
import { redeemLoyaltyRewardAction, type LoyaltyAccountDetails } from "@/app/account/loyalty-actions";
import { AuthModal } from "./AuthModal";
import { Coffee, UtensilsCrossed, Award, Coins } from "lucide-react";
import { ThemeToggle } from "@/components/common/ThemeToggle";

import { BottomNavBar } from "@/components/navigation/BottomNavBar";

interface ProfileViewProps {
  initialProfile: Profile | null;
  initialOrders: CustomerHistoricalOrder[];
  initialLoyalty?: LoyaltyAccountDetails;
  activeSession: {
    sessionId: string;
    tableLabel: string;
    locationName: string;
  } | null;
}

export const ProfileView: React.FC<ProfileViewProps> = ({
  initialProfile,
  initialOrders,
  initialLoyalty,
  activeSession,
}) => {
  const [profile, setProfile] = useState<Profile | null>(initialProfile);
  const [orders] = useState<CustomerHistoricalOrder[]>(initialOrders);
  const [loyalty] = useState<LoyaltyAccountDetails | undefined>(initialLoyalty);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [isClaiming, setIsClaiming] = useState(false);
  const [claimMessage, setClaimMessage] = useState<string | null>(null);

  const [localName, setLocalName] = useState(initialProfile?.display_name || "");
  const [localPhone, setLocalPhone] = useState(initialProfile?.phone || "");

  React.useEffect(() => {
    if (typeof window !== "undefined") {
      const savedName = localStorage.getItem("smol_guest_name");
      const savedPhone = localStorage.getItem("smol_guest_phone");
      if (savedName && !localName) setLocalName(savedName);
      if (savedPhone && !localPhone) {
        const clean = savedPhone.replace(/\D/g, "");
        setLocalPhone(`+91 ${clean.slice(0, 5)} ${clean.slice(5)}`);
      }
    }
  }, [localName, localPhone]);

  const handleClaimOrders = async () => {
    setIsClaiming(true);
    setClaimMessage(null);

    try {
      const res = await claimCurrentSessionOrdersAction();
      if (res.success) {
        setClaimMessage(res.message || "Orders linked successfully!");
      } else {
        setClaimMessage(res.message || "Could not claim orders.");
      }
    } catch {
      setClaimMessage("Failed to claim orders.");
    } finally {
      setIsClaiming(false);
    }
  };

  const [currentBalance, setCurrentBalance] = useState(loyalty?.account?.current_balance_cached || 240);
  const [redeemFeedback, setRedeemFeedback] = useState<string | null>(null);

  const rewardCoupons = [
    { id: "rew_pour_over", title: "Free Pour Over Coffee", cost: 150, icon: Coffee },
    { id: "rew_bun_makkhan", title: "Free Bun Makkhan", cost: 100, icon: UtensilsCrossed },
    { id: "rew_board", title: "Table Conversation Board", cost: 200, icon: Award },
  ];

  const handleRedeemCoupon = async (rewardId: string, title: string, cost: number) => {
    if (currentBalance < cost) {
      setRedeemFeedback(`Insufficient points for ${title}. You need ${cost} points.`);
      return;
    }

    try {
      const res = await redeemLoyaltyRewardAction(rewardId);
      if (res.success) {
        setCurrentBalance(res.newBalance || (currentBalance - cost));
        setRedeemFeedback(`Successfully redeemed: ${title}! Use code at checkout.`);
      } else {
        setRedeemFeedback(res.message || "Failed to redeem reward.");
      }
    } catch {
      setRedeemFeedback("Network error redeeming reward.");
    }
  };

  return (
    <div className="min-h-screen bg-[#F3E7D3] dark:bg-[#151110] text-[#241F1C] dark:text-[#FAF4EB] pb-28 font-sans transition-colors duration-200">
      {/* Top Header */}
      <header className="sticky top-0 z-40 border-b border-[#C9AE8B]/40 dark:border-white/10 bg-[#F3E7D3]/90 dark:bg-[#181412]/90 px-4 py-3.5 backdrop-blur-md transition-colors duration-200">
        <div className="mx-auto flex max-w-md items-center justify-between">
          <Link
            href="/"
            className="flex h-9 w-9 items-center justify-center rounded-xl text-[#241F1C] dark:text-[#FAF4EB] transition hover:bg-black/5 dark:hover:bg-white/10 active:scale-95"
            aria-label="Back to home"
          >
            <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
              <polyline points="15 18 9 12 15 6" />
            </svg>
          </Link>

          <h1 className="font-serif text-xl font-bold tracking-tight text-[#B72E35] dark:text-[#FF5B52] lowercase">
            loyalty &amp; pass
          </h1>

          <ThemeToggle variant="icon" />
        </div>
      </header>

      <main className="mx-auto max-w-md px-4 pt-4 space-y-4">
        {/* Smol Loyalty Pass Card */}
        <div className="relative overflow-hidden rounded-3xl border border-[#C9AE8B]/50 dark:border-white/10 bg-[#FAF4EB] dark:bg-[#201A17] p-5 shadow-xs transition-colors">
          <div className="flex items-start justify-between">
            <div>
              <span className="inline-block rounded-full bg-[#EFE7DC] dark:bg-white/10 px-2.5 py-0.5 font-mono text-[10px] font-bold text-[#725039] dark:text-[#C9AE8B] uppercase tracking-wider">
                SMOL REWARDS PASS
              </span>
              <h2 className="font-serif text-xl font-bold text-[#241F1C] dark:text-[#FAF4EB] mt-1.5">
                {profile?.display_name || localName || "Sonu Singh"}
              </h2>
              <p className="font-mono text-[11px] text-[#725039] dark:text-[#C9AE8B] mt-0.5">
                {profile?.phone || localPhone || "+91 98765 43210"} • Gold Member
              </p>
            </div>

            <div className="rounded-2xl border border-[#F2C84B]/80 dark:border-amber-500/30 bg-[#FDF6E2] dark:bg-amber-950/20 px-3.5 py-2 text-right">
              <span className="block font-mono text-[9px] font-bold uppercase text-[#725039] dark:text-[#C9AE8B] tracking-wider">
                POINTS
              </span>
              <span className="font-mono text-xl font-extrabold text-[#241F1C] dark:text-[#FAF4EB] flex items-center justify-end gap-1">
                <Coins className="h-4 w-4 text-[#B72E35] dark:text-[#FF5B52]" /> {currentBalance}
              </span>
            </div>
          </div>

          {/* Points Progress Bar */}
          <div className="mt-4 pt-3 border-t border-[#C9AE8B]/30 dark:border-white/10 space-y-1.5">
            <div className="flex justify-between font-mono text-[10px] text-[#725039] dark:text-[#C9AE8B]">
              <span>Tier Progress</span>
              <span>{currentBalance} / 500 pts for Platinum</span>
            </div>
            <div className="h-2 w-full rounded-full bg-[#E8DFD3] dark:bg-[#2F2520] overflow-hidden">
              <div
                className="h-full rounded-full bg-[#B72E35] dark:bg-[#FF5B52] transition-all duration-300"
                style={{ width: `${Math.min(100, Math.round((currentBalance / 500) * 100))}%` }}
              />
            </div>
          </div>
        </div>

        {redeemFeedback && (
          <div className="rounded-2xl border border-[#C9AE8B] dark:border-white/10 bg-[#FAF4EB] dark:bg-[#201A17] p-3 text-xs text-[#241F1C] dark:text-[#FAF4EB] font-serif animate-scale-in">
            {redeemFeedback}
          </div>
        )}

        {/* Redeemable Rewards Catalog */}
        <div className="space-y-2.5">
          <div className="flex items-center justify-between px-1">
            <h3 className="font-serif text-xs font-bold text-[#241F1C] dark:text-[#FAF4EB] uppercase tracking-wider">
              Redeem Rewards
            </h3>
            <span className="font-serif italic text-xs text-[#725039] dark:text-[#C9AE8B]">
              1 pt per ₹10 spent
            </span>
          </div>

          <div className="grid grid-cols-3 gap-2">
            {rewardCoupons.map((coupon) => (
              <div
                key={coupon.title}
                className="rounded-2xl border border-[#C9AE8B]/40 dark:border-white/10 bg-[#FAF4EB] dark:bg-[#201A17] p-3 text-center shadow-xs flex flex-col justify-between transition-colors"
              >
                <div className="flex justify-center text-[#B72E35] dark:text-[#FF5B52]">
                  <coupon.icon className="h-6 w-6" />
                </div>
                <p className="font-serif text-[11px] font-bold text-[#1C1917] dark:text-[#FAF4EB] line-clamp-2 my-1">
                  {coupon.title}
                </p>
                <button
                  type="button"
                  onClick={() => handleRedeemCoupon(coupon.id, coupon.title, coupon.cost)}
                  className="rounded-full bg-[#A62B34] dark:bg-[#B72E35] py-1 text-[10px] font-serif font-bold text-white shadow-xs hover:bg-[#91242C] active:scale-95 transition"
                >
                  {coupon.cost} pts
                </button>
              </div>
            ))}
          </div>
        </div>

        {/* Active Session Claim Card (if seated) */}
        {activeSession && (
          <div className="rounded-2xl border border-[#75AFA7]/60 dark:border-[#75AFA7]/30 bg-[#75AFA7]/20 dark:bg-[#142318] p-4 transition-colors">
            <div className="flex items-center justify-between">
              <div>
                <span className="font-mono text-[10px] font-bold uppercase tracking-wider text-[#1C463F] dark:text-[#75C7BC]">
                  Seated Table Session
                </span>
                <p className="font-serif text-sm font-bold text-[#1C1917] dark:text-[#E2F0E7]">
                  Table {activeSession.tableLabel} • {activeSession.locationName}
                </p>
              </div>
              <button
                onClick={handleClaimOrders}
                disabled={isClaiming}
                className="rounded-full bg-[#75AFA7] hover:bg-[#5C968E] dark:bg-[#2A5235] dark:hover:bg-[#1E3B26] px-3.5 py-1.5 font-serif text-xs font-bold text-white shadow-xs active:scale-95 disabled:opacity-50 transition"
              >
                {isClaiming ? "Linking..." : "Claim Orders ✓"}
              </button>
            </div>
            {claimMessage && (
              <p className="mt-2 font-serif text-xs text-[#1C463F] dark:text-[#75C7BC]">
                {claimMessage}
              </p>
            )}
          </div>
        )}

        {/* Past Visits & Digital Invoices */}
        <section className="space-y-2.5">
          <h3 className="font-serif text-xs font-bold text-[#1C1917] dark:text-[#FAF4EB] uppercase tracking-wider px-1">
            Past Invoices &amp; Receipts ({orders.length})
          </h3>

          {orders.length === 0 ? (
            <div className="rounded-2xl border border-[#E2D7C7] dark:border-white/10 bg-[#FCF8F2] dark:bg-[#201A17] p-6 text-center">
              <p className="font-serif text-xs text-[#786F66] dark:text-[#C9AE8B]">
                No past visit receipts yet. Orders placed at your table will appear here automatically.
              </p>
            </div>
          ) : (
            orders.map((order) => (
              <div
                key={order.id}
                className="rounded-2xl border border-[#E8DFD3] dark:border-white/10 bg-[#FAF5ED] dark:bg-[#201A17] p-3.5 shadow-xs space-y-2 transition-colors"
              >
                <div className="flex items-center justify-between">
                  <div>
                    <span className="font-mono text-xs font-bold text-[#1C1917] dark:text-[#FAF4EB]">
                      Order #{order.orderNo}
                    </span>
                    <p className="font-serif italic text-[11px] text-[#786F66] dark:text-[#C9AE8B]">
                      {new Date(order.submittedAt).toLocaleDateString("en-IN", {
                        day: "numeric",
                        month: "short",
                        year: "numeric",
                      })}
                    </p>
                  </div>
                  <div className="text-right">
                    <span className="font-serif font-bold text-sm text-[#9E2A2B] dark:text-[#FF5B52]">
                      ₹{order.totalRupees}
                    </span>
                    <span className="block font-mono text-[9px] uppercase font-bold text-emerald-700 dark:text-emerald-400">
                      {order.status}
                    </span>
                  </div>
                </div>

                <div className="border-t border-[#EADFCF] dark:border-white/10 pt-2 space-y-1">
                  {order.items.map((it, idx) => (
                    <div
                      key={idx}
                      className="flex justify-between font-serif text-xs text-[#5C544D] dark:text-[#D4BCA0]"
                    >
                      <span>
                        <span className="font-mono">{it.qty}x</span> {it.name}
                      </span>
                      <span className="font-mono">₹{it.priceRupees * it.qty}</span>
                    </div>
                  ))}
                </div>
              </div>
            ))
          )}
        </section>
      </main>

      {/* Sign-in Modal */}
      <AuthModal
        isOpen={isAuthModalOpen}
        onClose={() => setIsAuthModalOpen(false)}
        onSuccess={() => {
          setProfile({
            id: "user",
            display_name: "Sonu Singh",
            phone: "+91 98765 43210",
            email: null,
            avatar_url: null,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          });
        }}
      />

      {/* Bottom Sticky Navigation */}
      <BottomNavBar />
    </div>
  );
};

