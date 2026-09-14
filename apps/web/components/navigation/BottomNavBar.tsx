"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";

export const BottomNavBar: React.FC = () => {
  const pathname = usePathname();

  const getActiveIndex = React.useCallback(() => {
    if (pathname === "/home" || pathname === "/") return 0;
    if (pathname.startsWith("/smol-menu") || pathname.startsWith("/menu")) return 1;
    if (pathname.startsWith("/music")) return 2;
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
      label: "HOME",
      href: "/home",
      icon: (active: boolean) => (
        <svg
          className="h-[17px] w-[17px]"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth={active ? 2.4 : 2.0}
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M3.5 10.5 11.2 3.8a1.2 1.2 0 0 1 1.6 0l7.7 6.7a1.5 1.5 0 0 1 .5 1.1V19a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-7.4a1.5 1.5 0 0 1 .5-1.1Z" />
          <path d="M10 21v-4a2 2 0 0 1 4 0v4" />
        </svg>
      ),
    },
    {
      label: "MENU",
      href: "/smol-menu",
      icon: (active: boolean) => (
        <svg
          className="h-[17px] w-[17px]"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth={active ? 2.4 : 2.0}
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <rect x="5" y="3.5" width="14" height="17" rx="3" ry="3" />
          <path d="M9 8h4.5" />
          <path d="M9 11.5h6" />
          <circle cx="9" cy="15.5" r="0.8" fill="currentColor" stroke="none" />
        </svg>
      ),
    },
    {
      label: "MUSIC",
      href: "/music",
      icon: (active: boolean) => (
        <svg
          className="h-[17px] w-[17px]"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth={active ? 2.3 : 2.0}
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M9 18V5l12-2v13" />
          <circle cx="6" cy="18" r="3" />
          <circle cx="18" cy="16" r="3" />
        </svg>
      ),
    },
    {
      label: "ORDERS",
      href: "/orders",
      icon: (active: boolean) => (
        <svg
          className="h-[17px] w-[17px]"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth={active ? 2.3 : 2.0}
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M9 3h6v2.5a1 1 0 0 1-1 1h-4a1 1 0 0 1-1-1V3Z" />
          <path d="M6 6.5h12a1.5 1.5 0 0 1 1.5 1.5v10a3 3 0 0 1-3 3H7.5A3 3 0 0 1 4.5 18V8a1.5 1.5 0 0 1 1.5-1.5Z" />
          <circle cx="12" cy="14" r="3.2" />
          <polyline points="12 12.3 12 14 13.5 14" strokeWidth={1.7} />
        </svg>
      ),
    },
    {
      label: "PROFILE",
      href: "/profile",
      icon: (active: boolean) => (
        <svg
          className="h-[17px] w-[17px]"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth={active ? 2.4 : 2.0}
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <circle cx="12" cy="8" r="3.8" />
          <path d="M5.5 20a6.5 6.5 0 0 1 13 0" />
        </svg>
      ),
    },
  ];

  return (
    <nav
      aria-label="Bottom Navigation"
      className="fixed bottom-3 left-0 right-0 z-50 px-2 pb-[max(0.25rem,env(safe-area-inset-bottom))] pointer-events-none select-none"
    >
      <div
        className="relative pointer-events-auto mx-auto w-[calc(100%-12px)] max-w-[355px] rounded-full px-2.5 pt-2 pb-1.5 
          bg-white/60 dark:bg-white/[0.08] 
          backdrop-blur-[24px] backdrop-saturate-[180%] 
          border border-white/70 dark:border-white/20 
          shadow-[0_12px_32px_rgba(74,46,27,0.12),0_2px_6px_rgba(0,0,0,0.04),inset_0_1.5px_2px_rgba(255,255,255,0.95)] 
          dark:shadow-[0_16px_40px_rgba(0,0,0,0.7),inset_0_1.5px_2px_rgba(255,255,255,0.22)]
          transition-all duration-200"
      >
        {/* Navigation Items Row */}
        <div className="relative flex items-center justify-between">
          {/* Animated 3D Floating Active Indicator (Sliding Red Jewel Dome) */}
          {activeIndex >= 0 && (
            <div
              aria-hidden="true"
              className="pointer-events-none absolute top-0 left-0 w-1/5 h-full flex flex-col items-center justify-start transition-transform duration-500 ease-[cubic-bezier(0.25,1,0.5,1)] z-10"
              style={{
                transform: `translateX(${activeIndex * 100}%)`,
              }}
            >
              {/* Elevated Floating 3D Red Jewel Disc */}
              <div className="relative flex h-[38px] w-[38px] items-center justify-center rounded-full -translate-y-0.5">
                {/* Soft Cherry Ambient Glow */}
                <span
                  className="absolute inset-[-2.5px] rounded-full bg-[#B72E35]/40 blur-[4px] dark:bg-[#FF4D4D]/35 transition-opacity duration-400"
                />

                {/* 3D Convex Red Jewel Disc with layered depth */}
                <div
                  className="relative flex h-full w-full items-center justify-center rounded-full 
                    bg-gradient-to-br from-[#E23B44] via-[#B72E35] to-[#7A1318] 
                    border border-[#FFA6AB]/80 
                    shadow-[0_5px_14px_rgba(183,46,53,0.45),0_0_12px_rgba(183,46,53,0.3),inset_0_1.5px_2.5px_rgba(255,255,255,0.85),inset_0_-1.5px_3px_rgba(0,0,0,0.4)]"
                >
                  {/* Top-left Specular Gloss Arc */}
                  <span
                    className="pointer-events-none absolute top-0.5 left-2 right-2 h-2.5 rounded-t-full bg-gradient-to-b from-white/75 via-white/20 to-transparent"
                  />
                </div>
              </div>
            </div>
          )}

          {/* 5 Navigation Items */}
          {navItems.map((item, index) => {
            const active = activeIndex === index;
            return (
              <Link
                key={item.label}
                href={item.href}
                onClick={() => setActiveIndex(index)}
                className="group relative z-20 flex flex-1 flex-col items-center justify-center transition-transform duration-150 active:scale-95 touch-manipulation focus:outline-none"
              >
                {/* Icon Container: Inactive Glass Disc or Active Floating Space */}
                <div className="relative flex h-[38px] w-[38px] items-center justify-center">
                  {/* Inactive Frosted Glass Circular Lens (as seen in reference image) */}
                  <div
                    className={`absolute inset-[1px] rounded-full transition-all duration-400 ease-out ${
                      active
                        ? "opacity-0 scale-90"
                        : "opacity-100 scale-100 bg-white/45 dark:bg-white/[0.06] border border-white/60 dark:border-white/12 shadow-[inset_0_1px_1.5px_rgba(255,255,255,0.85),0_1.5px_4px_rgba(60,35,20,0.05)] group-hover:scale-105 group-hover:bg-white/60"
                    }`}
                  />

                  {/* Icon SVG */}
                  <div
                    className={`relative z-10 transition-all duration-500 ease-out ${
                      active
                        ? "text-white scale-105 -translate-y-0.5 drop-shadow-[0_1px_2px_rgba(0,0,0,0.4)]"
                        : "text-[#4A2E1B] dark:text-[#C9AE8B] scale-100 group-hover:scale-105 group-hover:text-[#2E180B] dark:group-hover:text-[#FAF4EB]"
                    }`}
                  >
                    {item.icon(active)}
                  </div>
                </div>

                {/* Small Uppercase Label Underneath */}
                <span
                  className={`mt-1 text-[8.5px] tracking-[0.12em] font-mono transition-all duration-400 leading-none ${
                    active
                      ? "font-bold text-[#B72E35] dark:text-[#FF5B52] scale-105"
                      : "font-semibold text-[#6C4B35] dark:text-[#C9AE8B] group-hover:text-[#3B2213] dark:group-hover:text-[#FAF4EB]"
                  }`}
                >
                  {item.label}
                </span>
              </Link>
            );
          })}
        </div>
      </div>
    </nav>
  );
};
