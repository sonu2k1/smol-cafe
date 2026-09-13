"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";

export const BottomNavBar: React.FC = () => {
  const pathname = usePathname();

  const navItems = [
    {
      label: "HOME",
      href: "/home",
      isActive: pathname === "/home" || pathname === "/",
      icon: (active: boolean) => (
        /* Home roof & doorway */
        <svg
          className={`h-[22px] w-[22px] transition-colors duration-200 ${
            active ? "text-[#B72E35]" : "text-[#725039]"
          }`}
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth={active ? 2.2 : 1.9}
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M3 10.5 12 3l9 7.5V20a1.5 1.5 0 0 1-1.5 1.5H4.5A1.5 1.5 0 0 1 3 20v-9.5Z" />
          <polyline points="9 21 9 12 15 12 15 21" />
        </svg>
      ),
    },
    {
      label: "MENU",
      href: "/smol-menu",
      isActive: pathname.startsWith("/smol-menu") || pathname.startsWith("/menu"),
      icon: (active: boolean) => (
        /* Open Book / Menu card icon */
        <svg
          className={`h-[22px] w-[22px] transition-colors duration-200 ${
            active ? "text-[#B72E35]" : "text-[#725039]"
          }`}
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth={active ? 2.2 : 1.9}
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M4 19.5v-15A2.5 2.5 0 0 1 6.5 2H20v20H6.5a2.5 2.5 0 0 1-2.5-2.5Z" />
          <path d="M6 6h10" />
          <circle cx="10" cy="12" r="1.5" />
        </svg>
      ),
    },
    {
      label: "TABLE",
      href: "/t/table-01",
      isActive: pathname.startsWith("/t/"),
      icon: (active: boolean) => (
        /* Cafe Table with two chairs */
        <svg
          className={`h-[22px] w-[22px] transition-colors duration-200 ${
            active ? "text-[#B72E35]" : "text-[#725039]"
          }`}
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth={active ? 2.2 : 1.9}
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M7 10h10" />
          <path d="M12 10v11" />
          <path d="M9 21h6" />
          <path d="M4 14h3v7H4z" />
          <path d="M17 14h3v7h-3z" />
          <path d="M5 6v4" />
          <path d="M19 6v4" />
        </svg>
      ),
    },
    {
      label: "ORDERS",
      href: "/orders",
      isActive: pathname.startsWith("/orders") || pathname.startsWith("/order-status"),
      icon: (active: boolean) => (
        /* Takeaway Bag with clock / status indicator */
        <svg
          className={`h-[22px] w-[22px] transition-colors duration-200 ${
            active ? "text-[#B72E35]" : "text-[#725039]"
          }`}
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth={active ? 2.2 : 1.9}
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M5 9 7 4h10l2 5v12a1.5 1.5 0 0 1-1.5 1.5H6.5A1.5 1.5 0 0 1 5 21V9Z" />
          <circle cx="12" cy="14" r="3" />
          <path d="M12 13v1.5l1 .5" />
        </svg>
      ),
    },
    {
      label: "PROFILE",
      href: "/profile",
      isActive: pathname.startsWith("/profile") || pathname.startsWith("/account"),
      icon: (active: boolean) => (
        /* Clean minimal head & shoulders profile avatar */
        <svg
          className={`h-[22px] w-[22px] transition-colors duration-200 ${
            active ? "text-[#B72E35]" : "text-[#725039]"
          }`}
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth={active ? 2.2 : 1.9}
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <circle cx="12" cy="7.5" r="4" />
          <path d="M5.5 20.5c0-3.8 2.9-6.5 6.5-6.5s6.5 2.7 6.5 6.5" />
        </svg>
      ),
    },
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 border-t border-[#C9AE8B]/40 bg-[#F3E7D3]/95 backdrop-blur-md shadow-[0_-2px_10px_rgba(36,31,28,0.04)] pb-[max(0.7rem,env(safe-area-inset-bottom))] pt-2.5 select-none">
      <div className="mx-auto flex max-w-md items-center justify-between px-5">
        {navItems.map((item) => {
          const active = item.isActive;
          return (
            <Link
              key={item.label}
              href={item.href}
              className="flex flex-col items-center justify-center gap-1 transition-transform duration-150 active:scale-95 touch-manipulation group"
            >
              <div className="flex items-center justify-center h-6 w-6">
                {item.icon(active)}
              </div>
              <span
                className={`text-[9px] tracking-[0.14em] font-mono transition-colors duration-200 ${
                  active
                    ? "font-bold text-[#B72E35]"
                    : "font-normal text-[#725039]"
                }`}
              >
                {item.label}
              </span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
};

