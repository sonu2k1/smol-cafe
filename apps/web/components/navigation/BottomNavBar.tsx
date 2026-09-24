"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";

export const BottomNavBar: React.FC = () => {
  const pathname = usePathname();

  const getActiveIndex = React.useCallback(() => {
    if (pathname === "/home" || pathname === "/") return 0;
    if (pathname.startsWith("/drinks")) return 2;
    if (pathname.startsWith("/smol-menu") || pathname.startsWith("/menu")) return 1;
    if (pathname.startsWith("/orders") || pathname.startsWith("/order-status")) return 3;
    if (pathname.startsWith("/profile") || pathname.startsWith("/account")) return 4;
    return 0;
  }, [pathname]);

  const [activeIndex, setActiveIndex] = React.useState<number>(getActiveIndex);

  React.useEffect(() => {
    setActiveIndex(getActiveIndex());
  }, [pathname, getActiveIndex]);

  const navItems = [
    {
      label: "Home",
      href: "/home",
      icon: (
        <svg className="h-[25px] w-[25px] shrink-0" viewBox="0 0 24 24">
          <mask id="nav-dining-home-mask">
            <rect width="24" height="24" fill="white" />
            <path
              d="M5.4 11.2v3.0a1.1 1.1 0 0 0 1.1 1.1v4.8a.75.75 0 0 0 1.5 0v-4.8a1.1 1.1 0 0 0 1.1-1.1v-3.0"
              stroke="black"
              strokeWidth="1.1"
              strokeLinecap="round"
              strokeLinejoin="round"
              fill="none"
            />
            <line x1="6.5" y1="11.2" x2="6.5" y2="14.2" stroke="black" strokeWidth="1.1" strokeLinecap="round" />
            <circle cx="12.0" cy="15.5" r="3.7" stroke="black" strokeWidth="1.2" fill="none" />
            <circle cx="12.0" cy="15.5" r="2.2" stroke="black" strokeWidth="1.2" fill="none" />
            <path
              d="M18.2 11.2c-1.5 0-2.1 1.4-2.1 4.2h2.1v-4.2z"
              stroke="black"
              strokeWidth="1.1"
              strokeLinejoin="round"
              fill="none"
            />
            <path
              d="M17.1 15.6v4.5a.75.75 0 0 0 1.5 0v-4.5"
              stroke="black"
              strokeWidth="1.1"
              strokeLinecap="round"
              fill="none"
            />
          </mask>
          <rect x="5.4" y="4.5" width="2.4" height="4.5" rx="0.4" fill="currentColor" />
          <path
            d="M12 3.5L2.2 10.8h1.8v9.4a1.8 1.8 0 0 0 1.8 1.8h12.4a1.8 1.8 0 0 0 1.8-1.8v-9.4h1.8L12 3.5z"
            fill="currentColor"
            mask="url(#nav-dining-home-mask)"
          />
        </svg>
      ),
    },
    {
      label: "Menu",
      href: "/smol-menu",
      icon: (
        <svg className="h-[25px] w-[25px] shrink-0" viewBox="0 0 24 24">
          <mask id="nav-restaurant-menu-mask">
            <rect width="24" height="24" fill="white" />
            <line x1="14.2" y1="8.2" x2="18.8" y2="8.2" stroke="black" strokeWidth="1.2" strokeLinecap="round" />
            <line x1="14.2" y1="10.7" x2="18.8" y2="10.7" stroke="black" strokeWidth="1.2" strokeLinecap="round" />
            <line x1="14.2" y1="13.2" x2="18.8" y2="13.2" stroke="black" strokeWidth="1.2" strokeLinecap="round" />
            <line x1="14.2" y1="15.7" x2="18.8" y2="15.7" stroke="black" strokeWidth="1.2" strokeLinecap="round" />
            <path
              d="M6.6 11.5c-.7 0-1.3-.6-1.3-1.3 0-.7.5-1.3 1.2-1.4.1-.9.9-1.6 1.8-1.6.9 0 1.7.7 1.8 1.6.7.1 1.2.7 1.2 1.4 0 .7-.6 1.3-1.3 1.3"
              fill="none"
              stroke="black"
              strokeWidth="1.2"
              strokeLinecap="round"
            />
            <path d="M6.8 11.8h4.4v1.3H6.8z" fill="none" stroke="black" strokeWidth="1.1" strokeLinejoin="round" />
            <circle cx="9.0" cy="12.45" r="0.5" fill="black" />
            <line x1="6.0" y1="14.8" x2="12.0" y2="14.8" stroke="black" strokeWidth="1.2" strokeLinecap="round" />
            <line x1="7.0" y1="16.8" x2="11.0" y2="16.8" stroke="black" strokeWidth="1.2" strokeLinecap="round" />
            <line x1="7.4" y1="18.8" x2="10.6" y2="18.8" stroke="black" strokeWidth="1.2" strokeLinecap="round" />
          </mask>
          <path
            d="M8.2 6.8 L 12.2 4.2 L 16.0 5.8 L 12.2 7.2"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.4"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <rect x="12.2" y="5.0" width="8.8" height="14.8" rx="1.5" fill="currentColor" mask="url(#nav-restaurant-menu-mask)" />
          <rect x="4.0" y="6.8" width="10.0" height="14.4" rx="1.5" fill="currentColor" mask="url(#nav-restaurant-menu-mask)" />
        </svg>
      ),
    },
    {
      label: "Drinks",
      href: "/drinks",
      icon: (
        <svg className="h-[25px] w-[25px] shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round">
          {/* Steam waves */}
          <path d="M6 2v2M10 2v2M14 2v2" strokeWidth="1.6" />
          {/* Coffee cup */}
          <path d="M3 8h14v8a4 4 0 0 1-4 4H7a4 4 0 0 1-4-4V8z" strokeWidth="1.8" fill="currentColor" fillOpacity="0.15" />
          {/* Handle */}
          <path d="M17 9h2a2 2 0 0 1 2 2v2a2 2 0 0 1-2 2h-2" strokeWidth="1.8" />
          {/* Saucer */}
          <line x1="2" y1="21" x2="18" y2="21" strokeWidth="1.8" />
        </svg>
      ),
    },
    {
      label: "Orders",
      href: "/orders",
      icon: (
        <svg className="h-[25px] w-[25px] shrink-0" viewBox="0 0 24 24" fill="currentColor">
          <path d="M12 2.5a1.75 1.75 0 0 1 1.75 1.75c0 .44-.16.84-.43 1.15.44.33.73.85.73 1.44v.36a9.5 9.5 0 0 0-4.1 0v-.36c0-.59.29-1.11.73-1.44A1.74 1.74 0 0 1 10.25 4.25 1.75 1.75 0 0 1 12 2.5Z" />
          <path
            fillRule="evenodd"
            clipRule="evenodd"
            d="M12 7.75c-4.83 0-8.75 3.92-8.75 8.75h17.5c0-4.83-3.92-8.75-8.75-8.75Zm2.2 1.85c.42-.38 1.07-.3 1.42.15 1.25 1.48 1.9 3.02 1.98 4.2.04.55-.4.98-.95.92-.5-.06-.85-.52-.9-1.02-.07-.9-.58-2.15-1.65-3.32-.38-.42-.32-1.05.1-1.43Z"
          />
          <path d="M2.5 18h19c.69 0 1.25.56 1.25 1.25s-.56 1.25-1.25 1.25h-19c-.69 0-1.25-.56-1.25-1.25S1.81 18 2.5 18Z" />
        </svg>
      ),
    },
    {
      label: "Account",
      href: "/profile",
      icon: (
        <svg className="h-[25px] w-[25px] shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="5.2" r="3.2" strokeWidth="1.7" />
          <path d="M4.6 15.8C4.6 11.6 7.8 9.8 12 9.8s7.4 1.8 7.4 6.0" strokeWidth="1.7" />
          <path d="M7.4 15.8v2.4M16.6 15.8v2.4" strokeWidth="1.7" />
          <rect x="1.8" y="15.8" width="5.2" height="3.2" rx="1.6" strokeWidth="1.7" />
          <rect x="17.0" y="15.8" width="5.2" height="3.2" rx="1.6" strokeWidth="1.7" />
          <path d="M4.4 15.8V12.8M3.0 9.8v2.0a1.4 1.4 0 0 0 2.8 0V9.8M4.4 9.8v2.8" strokeWidth="1.6" />
          <path d="M19.6 15.8v-3.2c0-1.8-.8-2.8-1.8-2.8v6.0" strokeWidth="1.6" />
          <ellipse cx="12" cy="20.0" rx="5.4" ry="2.0" strokeWidth="1.8" />
        </svg>
      ),
    },
  ];

  return (
    <nav
      aria-label="Bottom Navigation"
      className="fixed bottom-4 left-0 right-0 z-50 px-3 pb-[max(0.25rem,env(safe-area-inset-bottom))] pointer-events-none select-none"
    >
      <div className="relative pointer-events-auto mx-auto w-full max-w-[375px]">
        {/* Ambient Backlight Glass Diffusion */}
        <div className="absolute -inset-1.5 rounded-full bg-gradient-to-r from-amber-600/10 via-[#B72E35]/15 to-amber-500/10 dark:from-purple-600/20 dark:via-purple-800/30 dark:to-purple-600/20 blur-xl -z-10 opacity-80" />

        {/* Floating Ultra-Frosted Glassmorphic Container */}
        <div
          className="relative h-[62px] rounded-full px-3 py-1.5 flex items-center justify-around gap-1
            bg-white/45 dark:bg-[#1C1613]/55
            backdrop-blur-[28px] backdrop-saturate-[200%]
            border border-white/70 dark:border-white/15
            shadow-[0_12px_40px_rgba(74,46,27,0.12),0_4px_12px_rgba(0,0,0,0.04),inset_0_1.5px_1.5px_rgba(255,255,255,0.9),inset_0_-1px_1.5px_rgba(0,0,0,0.05)]
            dark:shadow-[0_18px_48px_rgba(0,0,0,0.7),inset_0_1.5px_1px_rgba(255,255,255,0.16),inset_0_-1px_1px_rgba(0,0,0,0.5)]
            transition-all duration-300"
        >
          {navItems.map((item, index) => {
            const active = activeIndex === index;

            return (
              <Link
                key={item.label}
                href={item.href}
                prefetch={true}
                aria-label={item.label}
                onClick={() => setActiveIndex(index)}
                className={`group relative flex items-center justify-center rounded-full transition-all duration-[650ms] ease-[cubic-bezier(0.25,1,0.35,1)] active:scale-95 touch-manipulation focus:outline-none ${
                  active
                    ? "relative bg-gradient-to-b from-[#E03A43]/65 via-[#B72E35]/75 to-[#7D1217]/85 dark:from-[#A855F7]/70 dark:via-[#7E22CE]/80 dark:to-[#4C1D95]/90 text-white px-4 h-[46px] backdrop-blur-[16px] border border-white/55 dark:border-purple-300/40 shadow-[0_8px_24px_rgba(183,46,53,0.42),inset_0_1.5px_1.5px_rgba(255,255,255,0.85),inset_0_-1.5px_2px_rgba(0,0,0,0.4),inset_0_0_14px_rgba(255,140,140,0.35)] dark:shadow-[0_8px_26px_rgba(126,34,206,0.5),inset_0_1.5px_1.5px_rgba(255,255,255,0.85),inset_0_-1.5px_2px_rgba(0,0,0,0.5),inset_0_0_16px_rgba(192,132,252,0.45)]"
                    : "w-[46px] h-[46px] text-[#4A2E1B] dark:text-[#C9AE8B] hover:text-[#241F1C] dark:hover:text-[#FAF4EB] hover:bg-white/40 dark:hover:bg-white/[0.08] hover:shadow-[inset_0_1px_1px_rgba(255,255,255,0.6)] backdrop-blur-xs"
                }`}
              >
                {/* Curved Specular Glass Gloss Reflection */}
                {active && (
                  <span className="absolute inset-x-2 top-1 h-[42%] rounded-full bg-gradient-to-b from-white/50 via-white/15 to-transparent pointer-events-none opacity-90" />
                )}

                <div className="relative z-10 flex items-center overflow-hidden">
                  <div
                    className={`shrink-0 flex items-center justify-center transition-all duration-[550ms] ease-[cubic-bezier(0.25,1,0.35,1)] ${
                      active
                        ? "text-white scale-105 drop-shadow-[0_1.5px_2.5px_rgba(0,0,0,0.35)]"
                        : "group-hover:scale-110 group-active:scale-95"
                    }`}
                  >
                    {item.icon}
                  </div>
                  <div
                    className={`grid transition-all duration-[650ms] ease-[cubic-bezier(0.25,1,0.35,1)] ${
                      active
                        ? "grid-rows-[1fr] opacity-100 ml-2 translate-x-0"
                        : "grid-rows-[0fr] opacity-0 ml-0 -translate-x-1"
                    }`}
                  >
                    <div className="overflow-hidden">
                      <span className="text-[13.5px] font-sans font-bold tracking-tight text-white whitespace-nowrap block drop-shadow-[0_1.5px_2.5px_rgba(0,0,0,0.35)]">
                        {item.label}
                      </span>
                    </div>
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      </div>
    </nav>
  );
};
