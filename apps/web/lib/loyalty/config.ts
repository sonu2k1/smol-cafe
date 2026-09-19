import type { LoyaltyAccount, LoyaltyLedgerEntry } from "@smol-cafe/db";

export interface LoyaltyBonusRule {
  id: string;
  behaviour: string;
  points: number;
  isMultiplier?: boolean;
  multiplierText?: string;
  category: "ONBOARDING" | "VISITS" | "SOCIAL" | "TIME_BASED";
  description: string;
}

export interface LoyaltyConfig {
  rupeesPerPoint: number; // default 10 (₹10 spent = 1 pt)
  pointRupeeValue: number; // default 1 (1 pt = ₹1)
  maxBillDiscountPercent: number; // default 20 (Max 20% of bill value)
  slowPeriodActive: boolean;
  slowPeriodHoursText: string; // e.g. "2:00 PM – 5:00 PM Daily"
  slowPeriodMultiplier: number; // 2x points
  bonusRules: LoyaltyBonusRule[];
}

export interface LoyaltyAccountDetails {
  account: LoyaltyAccount | null;
  ledger: LoyaltyLedgerEntry[];
  config: LoyaltyConfig;
  claimedQuests: string[];
  totalVisits: number;
  tier: "Seedling Patron" | "Regular Patron" | "Artisan Ambassador";
  nextTierPoints: number;
}

export interface LoyaltyActionResult {
  success: boolean;
  newBalance?: number;
  message?: string;
  error?: string;
}

export interface LoyaltyMemberItem {
  id: string;
  profileId: string;
  displayName: string;
  phone: string;
  currentBalance: number;
  totalEarned: number;
  totalSpentRupees: number;
  visitCount: number;
  tier: string;
  lastVisitAt: string;
}

// Master Bonus Rules from specification & screenshot
export const DEFAULT_BONUS_RULES: LoyaltyBonusRule[] = [
  {
    id: "first_order",
    behaviour: "First order through Smol app",
    points: 25,
    category: "ONBOARDING",
    description: "Welcome perk on completing your very first digital table order.",
  },
  {
    id: "complete_profile",
    behaviour: "Complete profile / birthday",
    points: 10,
    category: "ONBOARDING",
    description: "Add your name and birth date to receive special annual gifts.",
  },
  {
    id: "second_visit",
    behaviour: "Second visit",
    points: 20,
    category: "VISITS",
    description: "Awarded automatically when you visit and dine at smol café twice.",
  },
  {
    id: "visits_3_in_30",
    behaviour: "3 visits in 30 days",
    points: 30,
    category: "VISITS",
    description: "Consistent patron bonus for 3 visits within a month.",
  },
  {
    id: "visits_5_in_30",
    behaviour: "5 visits in 30 days",
    points: 50,
    category: "VISITS",
    description: "Dedicated cafe regular reward for 5 visits within 30 days.",
  },
  {
    id: "refer_friend",
    behaviour: "Refer a friend who actually orders",
    points: 50,
    category: "SOCIAL",
    description: "Invite a companion to smol café. Credited when they place their first order.",
  },
  {
    id: "birthday_visit",
    behaviour: "Birthday visit",
    points: 50,
    category: "SOCIAL",
    description: "Celebrate your special day with us for a hefty points booster.",
  },
  {
    id: "attend_event",
    behaviour: "Attend a Smol event",
    points: 20,
    category: "SOCIAL",
    description: "Poetry nights, jazz evenings, and manual brew workshops.",
  },
  {
    id: "try_featured",
    behaviour: "Try a featured/new menu item",
    points: 10,
    category: "ONBOARDING",
    description: "Explorer perk when trying newly launched seasonals and specials.",
  },
  {
    id: "slow_period_2x",
    behaviour: "Order during designated slow period",
    points: 0,
    isMultiplier: true,
    multiplierText: "2× points",
    category: "TIME_BASED",
    description: "Happy hour perk: Earn double points on all orders from 2:00 PM to 5:00 PM daily.",
  },
];

export const DEFAULT_LOYALTY_CONFIG: LoyaltyConfig = {
  rupeesPerPoint: 10,
  pointRupeeValue: 1,
  maxBillDiscountPercent: 20,
  slowPeriodActive: true,
  slowPeriodHoursText: "2:00 PM – 5:00 PM Daily",
  slowPeriodMultiplier: 2,
  bonusRules: DEFAULT_BONUS_RULES,
};

// In-memory persistent config store
declare global {
  var __SMOL_LOYALTY_CONFIG__: LoyaltyConfig | undefined;
  var __SMOL_CLAIMED_QUESTS__: Record<string, string[]> | undefined;
}

export function getLoyaltyConfigStore(): LoyaltyConfig {
  if (!globalThis.__SMOL_LOYALTY_CONFIG__) {
    globalThis.__SMOL_LOYALTY_CONFIG__ = DEFAULT_LOYALTY_CONFIG;
  }
  return globalThis.__SMOL_LOYALTY_CONFIG__;
}
