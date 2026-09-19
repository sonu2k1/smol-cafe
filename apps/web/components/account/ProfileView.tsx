"use client";

import React, { useState } from "react";
import Link from "next/link";
import type { Profile } from "@smol-cafe/db";
import type { CustomerHistoricalOrder } from "@/app/account/actions";
import { claimCurrentSessionOrdersAction } from "@/app/account/actions";
import {
  redeemLoyaltyRewardAction,
  claimBonusQuestAction,
  type LoyaltyAccountDetails,
  type LoyaltyBonusRule,
} from "@/app/account/loyalty-actions";
import { AuthModal } from "./AuthModal";
import {
  Coffee,
  UtensilsCrossed,
  Award,
  Coins,
  Sparkles,
  CheckCircle2,
  Gift,
  Share2,
  Calendar,
  Zap,
  ArrowRight,
  Flame,
  Clock,
} from "lucide-react";
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
  const [loyalty, setLoyalty] = useState<LoyaltyAccountDetails | undefined>(initialLoyalty);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [isClaiming, setIsClaiming] = useState(false);
  const [claimMessage, setClaimMessage] = useState<string | null>(null);

  const [localName, setLocalName] = useState(initialProfile?.display_name || "");
  const [localPhone, setLocalPhone] = useState(initialProfile?.phone || "");
  const [birthday, setBirthday] = useState<string>("1998-08-15");
  const [showBirthdayPicker, setShowBirthdayPicker] = useState<boolean>(false);
  const [claimedQuests, setClaimedQuests] = useState<Set<string>>(
    new Set(initialLoyalty?.claimedQuests || ["first_order"])
  );

  React.useEffect(() => {
    if (typeof window !== "undefined") {
      const savedName = localStorage.getItem("smol_guest_name");
      const savedPhone = localStorage.getItem("smol_guest_phone");
      const savedBday = localStorage.getItem("smol_guest_birthday");
      if (savedName && !localName) setLocalName(savedName);
      if (savedPhone && !localPhone) {
        const clean = savedPhone.replace(/\D/g, "");
        setLocalPhone(`+91 ${clean.slice(0, 5)} ${clean.slice(5)}`);
      }
      if (savedBday) setBirthday(savedBday);
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

  const [currentBalance, setCurrentBalance] = useState(
    loyalty?.account?.current_balance_cached || 145
  );
  const [redeemFeedback, setRedeemFeedback] = useState<string | null>(null);

  const rewardCoupons = [
    { id: "rew_croissant", title: "Free Flaky Croissant", cost: 100, icon: UtensilsCrossed, value: "₹140 value" },
    { id: "rew_pour_over", title: "Free Ratnagiri Pour Over", cost: 150, icon: Coffee, value: "₹220 value" },
    { id: "rew_percent_20", title: "Max 20% Off Next Bill", cost: 80, icon: Award, value: "Instant discount" },
  ];

  const handleRedeemCoupon = async (rewardId: string, title: string, cost: number) => {
    if (currentBalance < cost) {
      setRedeemFeedback(`Insufficient points for ${title}. You need ${cost} points.`);
      return;
    }

    try {
      const res = await redeemLoyaltyRewardAction(rewardId);
      if (res.success) {
        setCurrentBalance(res.newBalance || Math.max(0, currentBalance - cost));
        setRedeemFeedback(`🎉 Successfully unlocked: ${title}! It will be applied at checkout.`);
      } else {
        setRedeemFeedback(res.message || "Failed to redeem reward.");
      }
    } catch {
      setRedeemFeedback("Network error redeeming reward.");
    }
  };

  const handleClaimBonusQuest = async (questId: string, pts: number) => {
    if (claimedQuests.has(questId)) return;
    try {
      const res = await claimBonusQuestAction(questId);
      if (res.success) {
        setClaimedQuests((prev) => new Set(prev).add(questId));
        setCurrentBalance((prev) => prev + pts);
        setRedeemFeedback(res.message || `+${pts} Smol Points credited!`);
      } else {
        setRedeemFeedback(res.message || "Could not claim quest.");
      }
    } catch {
      setRedeemFeedback("Network error claiming quest.");
    }
  };

  const handleSaveBirthday = async () => {
    if (typeof window !== "undefined") {
      localStorage.setItem("smol_guest_birthday", birthday);
    }
    setShowBirthdayPicker(false);
    await handleClaimBonusQuest("complete_profile", 10);
  };

  const tierName =
    currentBalance >= 300
      ? "Artisan Ambassador"
      : currentBalance >= 100
      ? "Regular Patron"
      : "Seedling Patron";

  const nextTierMax = currentBalance >= 300 ? 500 : currentBalance >= 100 ? 300 : 100;
  const progressPercent = Math.min(100, Math.round((currentBalance / nextTierMax) * 100));

  const bonusRulesList = loyalty?.config?.bonusRules || [
    { id: "first_order", behaviour: "First order through Smol app", points: 25, category: "ONBOARDING", description: "Welcome bonus for placing your first table order" },
    { id: "complete_profile", behaviour: "Complete profile / birthday", points: 10, category: "ONBOARDING", description: "Unlock annual birthday gifts & member status" },
    { id: "second_visit", behaviour: "Second visit", points: 20, category: "VISITS", description: "Awarded automatically on your 2nd dining visit" },
    { id: "visits_3_in_30", behaviour: "3 visits in 30 days", points: 30, category: "VISITS", description: "Consistent cafe visitor milestone" },
    { id: "visits_5_in_30", behaviour: "5 visits in 30 days", points: 50, category: "VISITS", description: "Dedicated smol regular achievement" },
    { id: "refer_friend", behaviour: "Refer a friend who actually orders", points: 50, category: "SOCIAL", description: "Share your patron code with a companion" },
    { id: "birthday_visit", behaviour: "Birthday visit", points: 50, category: "SOCIAL", description: "Celebrate your birthday with free points" },
    { id: "attend_event", behaviour: "Attend a Smol event", points: 20, category: "SOCIAL", description: "Poetry reading, live jazz, or manual brew workshop" },
    { id: "try_featured", behaviour: "Try a featured/new menu item", points: 10, category: "ONBOARDING", description: "Seasonal and chef's special explorer perk" },
    { id: "slow_period_2x", behaviour: "Order during designated slow period", points: 0, isMultiplier: true, multiplierText: "2× points", category: "TIME_BASED", description: "Earn double points between 2:00 PM – 5:00 PM daily" },
  ];

  return (
    <div className="min-h-screen bg-[#F3E7D3] dark:bg-[#151110] text-[#241F1C] dark:text-[#FAF4EB] pb-28 font-sans transition-colors duration-200">
      {/* Top Header */}
      <header className="sticky top-0 z-40 border-b border-[#C9AE8B]/40 dark:border-white/10 bg-[#F3E7D3]/90 dark:bg-[#181412]/90 px-4 py-3.5 backdrop-blur-md transition-colors duration-200">
        <div className="mx-auto flex max-w-md items-center justify-between">
          <Link
            href="/home"
            className="flex h-9 w-9 items-center justify-center rounded-xl text-[#241F1C] dark:text-[#FAF4EB] transition hover:bg-black/5 dark:hover:bg-white/10 active:scale-95"
            aria-label="Back to home"
          >
            <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
              <polyline points="15 18 9 12 15 6" />
            </svg>
          </Link>

          <h1 className="font-serif text-xl font-bold tracking-tight text-[#B72E35] dark:text-[#FF5B52] lowercase">
            smol club loyalty
          </h1>

          <ThemeToggle variant="icon" />
        </div>
      </header>

      <main className="mx-auto max-w-md px-4 pt-4 space-y-4">
        {/* Smol Loyalty Pass Card */}
        <div className="relative overflow-hidden rounded-3xl border border-[#C9AE8B]/50 dark:border-white/10 bg-[#FAF4EB] dark:bg-[#201A17] p-5 shadow-xs transition-colors space-y-3">
          <div className="flex items-start justify-between">
            <div>
              <div className="flex items-center gap-1.5">
                <span className="inline-block rounded-full bg-[#EFE7DC] dark:bg-white/10 px-2.5 py-0.5 font-mono text-[9.5px] font-bold text-[#725039] dark:text-[#C9AE8B] uppercase tracking-wider">
                  SMOL REWARDS PASS
                </span>
                <span className="rounded-full bg-[#B72E35] text-white px-2 py-0.5 font-mono text-[9.5px] font-bold shadow-2xs">
                  ₹10 = 1 pt
                </span>
              </div>
              <h2 className="font-serif text-2xl font-bold text-[#241F1C] dark:text-[#FAF4EB] mt-1">
                {profile?.display_name || localName || "Sonu Singh"}
              </h2>
              <p className="font-mono text-[11px] text-[#725039] dark:text-[#C9AE8B]">
                {profile?.phone || localPhone || "+91 98765 43210"} • <strong className="text-[#B72E35] dark:text-[#FF5B52]">{tierName}</strong>
              </p>
            </div>

            <div className="rounded-2xl border border-[#F2C84B]/80 dark:border-amber-500/30 bg-[#FDF6E2] dark:bg-amber-950/20 px-3.5 py-2 text-right">
              <span className="block font-mono text-[9px] font-bold uppercase text-[#725039] dark:text-[#C9AE8B] tracking-wider">
                POINTS BALANCE
              </span>
              <span className="font-mono text-2xl font-black text-[#241F1C] dark:text-[#FAF4EB] flex items-center justify-end gap-1">
                <Coins className="h-5 w-5 text-[#B72E35] dark:text-[#FF5B52]" /> {currentBalance}
              </span>
              <span className="block font-mono text-[9.5px] text-[#059669] dark:text-emerald-400 font-bold">
                Worth ₹{currentBalance} on bills
              </span>
            </div>
          </div>

          {/* Redemption Rule Banner */}
          <div className="rounded-2xl bg-[#F3E7D3]/60 dark:bg-stone-900/60 p-2.5 border border-[#C9AE8B]/30 flex items-center justify-between text-xs text-[#725039] dark:text-stone-300">
            <span className="font-serif italic">
              Claim on next order: <strong>Max 20% of bill value</strong>
            </span>
            <span className="font-mono text-[10px] font-bold text-[#B72E35] dark:text-[#F87171] uppercase">
              1 pt = ₹1 off
            </span>
          </div>

          {/* Points Progress Bar */}
          <div className="pt-1 space-y-1.5">
            <div className="flex justify-between font-mono text-[10px] text-[#725039] dark:text-[#C9AE8B]">
              <span>Tier: <strong>{tierName}</strong></span>
              <span>{currentBalance} / {nextTierMax} pts</span>
            </div>
            <div className="h-2 w-full rounded-full bg-[#E8DFD3] dark:bg-[#2F2520] overflow-hidden">
              <div
                className="h-full rounded-full bg-[#B72E35] dark:bg-[#FF5B52] transition-all duration-300"
                style={{ width: `${progressPercent}%` }}
              />
            </div>
          </div>
        </div>

        {redeemFeedback && (
          <div className="rounded-2xl border border-emerald-300 dark:border-emerald-800 bg-emerald-50 dark:bg-emerald-950/50 p-3 text-xs text-emerald-900 dark:text-emerald-300 font-serif flex items-center justify-between animate-scale-in">
            <span>{redeemFeedback}</span>
            <button onClick={() => setRedeemFeedback(null)} className="text-emerald-700 font-bold ml-2">✕</button>
          </div>
        )}

        {/* SECTION: BONUS SMOL POINTS QUESTS (From Specification & Screenshot) */}
        <section className="space-y-3">
          <div className="flex items-center justify-between px-1">
            <div>
              <div className="flex items-center gap-1.5">
                <Sparkles className="h-4 w-4 text-[#B72E35]" />
                <h3 className="font-serif text-sm font-bold text-[#241F1C] dark:text-[#FAF4EB] uppercase tracking-wider">
                  Bonus Smol Points
                </h3>
              </div>
              <p className="font-serif italic text-xs text-[#725039] dark:text-[#C9AE8B]">
                Don&apos;t award points only for money. Complete behaviours to unlock:
              </p>
            </div>
          </div>

          {/* Happy Hour Slow Period Callout */}
          <div className="rounded-2xl border border-amber-300 dark:border-amber-800/60 bg-gradient-to-r from-amber-50 via-[#FFFBEB] to-amber-100 dark:from-amber-950/40 dark:to-stone-900 p-3.5 flex items-center justify-between shadow-2xs">
            <div className="flex items-center gap-2.5">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-amber-400 text-amber-950 font-black shadow-xs text-sm">
                2×
              </div>
              <div>
                <span className="block font-serif text-xs font-bold text-[#78350F] dark:text-amber-300">
                  Happy Hour: 2× Points Active!
                </span>
                <span className="font-mono text-[10px] text-[#92400E] dark:text-amber-400/80">
                  Order between 2:00 PM – 5:00 PM to double all points
                </span>
              </div>
            </div>
            <span className="rounded-full bg-[#B72E35] text-white px-2.5 py-0.5 font-mono text-[10px] font-bold shadow-2xs">
              Active
            </span>
          </div>

          {/* Bonus Quests List */}
          <div className="space-y-2">
            {bonusRulesList.map((rule) => {
              const isClaimed = claimedQuests.has(rule.id);
              return (
                <div
                  key={rule.id}
                  className="rounded-2xl border border-[#E2D7C7] dark:border-stone-800 bg-[#FAF4EB] dark:bg-[#1E1A17] p-3 flex items-center justify-between gap-2 shadow-2xs hover:bg-white dark:hover:bg-[#25201D] transition"
                >
                  <div className="space-y-0.5 min-w-0 flex-1">
                    <div className="flex items-center gap-1.5">
                      <span className="font-serif text-xs font-bold text-[#241F1C] dark:text-white truncate">
                        {rule.behaviour}
                      </span>
                      {isClaimed && (
                        <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600 shrink-0" />
                      )}
                    </div>
                    <p className="font-serif italic text-[11px] text-[#725039] dark:text-[#C9AE8B] line-clamp-1">
                      {rule.description}
                    </p>
                  </div>

                  <div className="shrink-0 flex items-center gap-2">
                    <span className="rounded-full bg-[#EFE7DC] dark:bg-stone-800 border border-[#C9AE8B]/40 dark:border-stone-700 px-2.5 py-1 font-mono text-xs font-black text-[#B72E35] dark:text-[#FF5B52]">
                      {rule.isMultiplier ? rule.multiplierText : `+${rule.points}`}
                    </span>

                    {rule.id === "complete_profile" && !isClaimed && (
                      <button
                        type="button"
                        onClick={() => setShowBirthdayPicker(true)}
                        className="rounded-xl bg-[#B72E35] text-white px-2.5 py-1 text-[10px] font-mono font-bold hover:bg-[#9E242B] active:scale-95 transition cursor-pointer"
                      >
                        Add B&apos;day
                      </button>
                    )}

                    {rule.id === "refer_friend" && (
                      <button
                        type="button"
                        onClick={() => {
                          if (navigator.share) {
                            navigator.share({
                              title: "Join me at smol café!",
                              text: `Use my invite code SMOL${localPhone.slice(-4) || "2026"} to get 50 bonus points at smol café!`,
                              url: window.location.origin,
                            });
                          } else {
                            navigator.clipboard.writeText(`https://smolcafe.com?ref=SMOL${localPhone.slice(-4) || "2026"}`);
                            setRedeemFeedback("Referral link copied to clipboard!");
                          }
                        }}
                        className="flex items-center gap-1 rounded-xl bg-[#241F1C] dark:bg-white text-[#FAF4EB] dark:text-[#241F1C] px-2.5 py-1 text-[10px] font-mono font-bold hover:opacity-90 active:scale-95 transition cursor-pointer"
                      >
                        <Share2 className="h-3 w-3" />
                        <span>Invite</span>
                      </button>
                    )}

                    {!rule.isMultiplier && rule.id !== "complete_profile" && rule.id !== "refer_friend" && !isClaimed && (
                      <button
                        type="button"
                        onClick={() => handleClaimBonusQuest(rule.id, rule.points)}
                        className="rounded-xl bg-[#B72E35] text-white px-2.5 py-1 text-[10px] font-mono font-bold hover:bg-[#9E242B] active:scale-95 transition cursor-pointer"
                      >
                        Claim
                      </button>
                    )}

                    {isClaimed && (
                      <span className="font-mono text-[10px] font-bold text-emerald-700 dark:text-emerald-400">
                        Earned ✓
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        {/* Birthday Picker Modal */}
        {showBirthdayPicker && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4 animate-fade-in">
            <div className="w-full max-w-sm rounded-3xl border border-[#C9AE8B] bg-[#FAF4EB] dark:bg-[#1E1A17] p-5 shadow-2xl space-y-4">
              <div className="flex items-center justify-between border-b border-[#C9AE8B]/30 pb-2">
                <div className="flex items-center gap-2">
                  <Gift className="h-5 w-5 text-[#B72E35]" />
                  <h3 className="font-serif text-base font-bold">Add Birthday for +10 Pts</h3>
                </div>
                <button onClick={() => setShowBirthdayPicker(false)} className="text-stone-500">✕</button>
              </div>
              <p className="font-serif italic text-xs text-[#725039] dark:text-[#C9AE8B]">
                We&apos;ll send you a complimentary artisanal brew on your birthday!
              </p>
              <div>
                <label className="block font-mono text-[11px] font-bold uppercase text-[#725039] mb-1">
                  Select Birth Date
                </label>
                <input
                  type="date"
                  value={birthday}
                  onChange={(e) => setBirthday(e.target.value)}
                  className="w-full p-2.5 rounded-xl border border-[#C9AE8B] bg-white dark:bg-stone-900 font-mono text-sm"
                />
              </div>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={handleSaveBirthday}
                  className="flex-1 py-2.5 rounded-xl bg-[#B72E35] text-white font-serif font-bold text-xs shadow-sm hover:bg-[#9E242B] transition"
                >
                  Save &amp; Claim +10 Pts
                </button>
                <button
                  type="button"
                  onClick={() => setShowBirthdayPicker(false)}
                  className="px-4 py-2.5 rounded-xl border border-stone-300 text-xs font-serif"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Redeemable Rewards Catalog */}
        <section className="space-y-2.5">
          <div className="flex items-center justify-between px-1">
            <h3 className="font-serif text-xs font-bold text-[#241F1C] dark:text-[#FAF4EB] uppercase tracking-wider">
              Redeemable Perk Vouchers
            </h3>
            <span className="font-serif italic text-xs text-[#725039] dark:text-[#C9AE8B]">
              1 pt = ₹1 on bill
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
                <div className="my-1">
                  <p className="font-serif text-[11px] font-bold text-[#1C1917] dark:text-[#FAF4EB] line-clamp-2">
                    {coupon.title}
                  </p>
                  <span className="font-mono text-[9px] text-[#059669] dark:text-emerald-400 font-bold">
                    {coupon.value}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => handleRedeemCoupon(coupon.id, coupon.title, coupon.cost)}
                  className="rounded-full bg-[#A62B34] dark:bg-[#B72E35] py-1 text-[10px] font-serif font-bold text-white shadow-xs hover:bg-[#91242C] active:scale-95 transition cursor-pointer"
                >
                  {coupon.cost} pts
                </button>
              </div>
            ))}
          </div>
        </section>

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
                className="rounded-full bg-[#75AFA7] hover:bg-[#5C968E] dark:bg-[#2A5235] dark:hover:bg-[#1E3B26] px-3.5 py-1.5 font-serif text-xs font-bold text-white shadow-xs active:scale-95 disabled:opacity-50 transition cursor-pointer"
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
                      })} • Table {order.tableLabel || "01"}
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

