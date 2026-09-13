"use client";

import React, { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { BottomNavBar } from "@/components/navigation/BottomNavBar";
import { TodayBlackboardCard } from "@/components/home/TodayBlackboardCard";

interface CustomerHomeClientProps {
  tableLabel?: string;
  locationName?: string;
}

export const CustomerHomeClientView: React.FC<CustomerHomeClientProps> = ({
  tableLabel = "01",
  locationName = "Rishikesh",
}) => {
  const [isSideMenuOpen, setIsSideMenuOpen] = useState(false);

  // Time-aware greeting
  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return "Good morning";
    if (hour < 17) return "Good afternoon";
    return "Good evening";
  };

  const moodCards = [
    {
      id: "feed-me",
      title: "FEED ME",
      subtitle: "I’m hungry",
      titleColor: "#9E2A2B", // smol cherry
      borderColor: "#F3C5C5",
      bgColor: "#FDF2F0",
      image: "/home_card_feedme_hd.png",
      href: "/smol-menu?category=All-Day+Bites",
    },
    {
      id: "coffee-first",
      title: "COFFEE FIRST",
      subtitle: "But make it strong",
      titleColor: "#1E433C", // deep forest/pool
      borderColor: "#CCE3DE",
      bgColor: "#EEF6F4",
      image: "/home_card_coffee_hd.png",
      href: "/smol-menu?category=Signature+Coffees",
    },
    {
      id: "chai-scene",
      title: "CHAI SCENE",
      subtitle: "Spiced & soothing",
      titleColor: "#8C5E1A", // warm amber/spice
      borderColor: "#F6E2B3",
      bgColor: "#FDF7E7",
      image: "/home_card_chai_hd.png",
      href: "/smol-menu?category=Chai+%26+Comfort",
    },
    {
      id: "something-light",
      title: "SOMETHING LIGHT",
      subtitle: "Fresh & easy",
      titleColor: "#2F4F38", // olive green
      borderColor: "#D3E5D4",
      bgColor: "#F1F8F2",
      image: "/home_card_light_hd.png",
      href: "/smol-menu?category=Fresh+Bakes",
    },
  ];

  return (
    <div className="min-h-screen bg-[#F3E7D3] text-[#241F1C] pb-28 font-serif selection:bg-[#B72E35]/20 selection:text-[#B72E35]">
      {/* Top App Header */}
      <header className="sticky top-0 z-40 bg-[#F3E7D3]/95 backdrop-blur-md px-5 pt-3 pb-2 border-b border-[#C9AE8B]/40">
        <div className="mx-auto flex max-w-md items-center justify-between">
          {/* Hamburger Menu button */}
          <button
            type="button"
            onClick={() => setIsSideMenuOpen(true)}
            aria-label="Open Navigation Drawer"
            className="p-1.5 -ml-1.5 text-[#241F1C] hover:text-[#B72E35] transition"
          >
            <svg
              className="h-6 w-6"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth={2}
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <line x1="4" y1="7" x2="20" y2="7" />
              <line x1="4" y1="12" x2="20" y2="12" />
              <line x1="4" y1="17" x2="20" y2="17" />
            </svg>
          </button>

          {/* Center Brand Name */}
          <Link href="/home" className="text-center group">
            <h1 className="font-serif text-2xl font-bold tracking-tight text-[#241F1C] group-hover:text-[#B72E35] transition">
              smol café
            </h1>
          </Link>

          {/* Profile Avatar Icon */}
          <Link
            href="/profile"
            aria-label="View Profile & Rewards"
            className="p-1.5 -mr-1.5 text-[#241F1C] hover:text-[#B72E35] transition"
          >
            <svg
              className="h-6 w-6"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth={1.8}
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <circle cx="12" cy="12" r="10" />
              <circle cx="12" cy="10" r="3.5" />
              <path d="M6.5 18.5c1.2-2.5 3.2-3.8 5.5-3.8s4.3 1.3 5.5 3.8" />
            </svg>
          </Link>
        </div>
      </header>

      {/* Main Home Container */}
      <main className="mx-auto max-w-md px-4 pt-3.5 space-y-4">
        {/* Editorial Greeting */}
        <div className="text-center space-y-0.5 pt-1">
          <h2 className="font-serif text-[22px] sm:text-2xl font-bold text-[#241F1C] tracking-tight">
            {getGreeting()}, {locationName}
          </h2>
          <p className="font-serif italic text-sm text-[#725039]">
            What’re we feeling today?
          </p>
        </div>

        {/* 2x2 Arched Mood Cards Grid */}
        <div className="grid grid-cols-2 gap-3 pt-1">
          {moodCards.map((card) => (
            <Link
              key={card.id}
              href={card.href}
              className="group relative flex flex-col items-center overflow-hidden rounded-t-[5.5rem] rounded-b-[1.75rem] border transition-all duration-300 hover:shadow-md hover:-translate-y-0.5 active:scale-[0.98] shadow-xs"
              style={{
                borderColor: card.borderColor,
                backgroundColor: card.bgColor,
              }}
            >
              <div className="relative w-full aspect-[2/3] max-h-[220px]">
                <Image
                  src={card.image}
                  alt={card.title}
                  fill
                  className="object-cover transition-transform duration-300 group-hover:scale-102"
                  priority
                />
              </div>
            </Link>
          ))}
        </div>

        {/* Today's Blackboard Card (Pure Code Component) */}
        <div className="pt-2 pb-6">
          <TodayBlackboardCard
            title="Today's Blackboard"
            headline="Jaggery Sea-Salt Latte"
            subline="is our new crush."
            href="/smol-menu"
          />
        </div>
      </main>

      {/* Side Drawer for Hamburger Menu */}
      {isSideMenuOpen && (
        <div className="fixed inset-0 z-50 flex">
          {/* Backdrop */}
          <div
            className="fixed inset-0 bg-black/40 backdrop-blur-xs transition-opacity"
            onClick={() => setIsSideMenuOpen(false)}
          />

          {/* Drawer Content */}
          <div className="relative w-72 max-w-[80vw] bg-[#FBF7F0] h-full shadow-2xl flex flex-col p-6 z-10 border-r border-[#C9AE8B]/40">
            <div className="flex items-center justify-between pb-4 border-b border-[#C9AE8B]/30">
              <div>
                <span className="font-serif text-xl font-bold text-[#241F1C]">
                  smol café
                </span>
                <span className="block font-serif italic text-xs text-[#725039]">
                  tapovan • rishikesh
                </span>
              </div>
              <button
                onClick={() => setIsSideMenuOpen(false)}
                className="p-1 rounded-full text-[#725039] hover:bg-black/5"
              >
                ✕
              </button>
            </div>

            {/* Nav links */}
            <div className="py-6 space-y-4 font-serif text-base">
              <Link
                href="/home"
                onClick={() => setIsSideMenuOpen(false)}
                className="flex items-center gap-3 text-[#B72E35] font-bold"
              >
                <span>🏠</span> Home
              </Link>
              <Link
                href="/smol-menu"
                onClick={() => setIsSideMenuOpen(false)}
                className="flex items-center gap-3 text-[#241F1C] hover:text-[#B72E35]"
              >
                <span>☕</span> View Full Menu
              </Link>
              <Link
                href={`/t/table-${tableLabel}`}
                onClick={() => setIsSideMenuOpen(false)}
                className="flex items-center gap-3 text-[#241F1C] hover:text-[#B72E35]"
              >
                <span>🪑</span> Table {tableLabel} Card
              </Link>
              <Link
                href="/orders"
                onClick={() => setIsSideMenuOpen(false)}
                className="flex items-center gap-3 text-[#241F1C] hover:text-[#B72E35]"
              >
                <span>🛍️</span> Live Order Status
              </Link>
              <Link
                href="/bill"
                onClick={() => setIsSideMenuOpen(false)}
                className="flex items-center gap-3 text-[#241F1C] hover:text-[#B72E35]"
              >
                <span>🧾</span> Bill &amp; Split
              </Link>
              <Link
                href="/profile"
                onClick={() => setIsSideMenuOpen(false)}
                className="flex items-center gap-3 text-[#241F1C] hover:text-[#B72E35]"
              >
                <span>👤</span> Loyalty &amp; Rewards
              </Link>
            </div>

            {/* Footer note in Drawer */}
            <div className="mt-auto pt-4 border-t border-[#C9AE8B]/30 text-center">
              <span className="font-serif italic text-xs text-[#725039]">
                slow mornings &amp; handcrafted sips
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Realistic 5-Tab Customer Bottom Navigation */}
      <BottomNavBar />
    </div>
  );
};
