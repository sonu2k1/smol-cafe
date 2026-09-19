"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";

export const BottomNavBar: React.FC = () => {
  const pathname = usePathname();

  const getActiveIndex = React.useCallback(() => {
    if (pathname === "/home" || pathname === "/") return 0;
    if (pathname.startsWith("/smol-menu") || pathname.startsWith("/menu")) return 1;
    if (pathname.startsWith("/orders") || pathname.startsWith("/order-status")) return 2;
    if (pathname.startsWith("/profile") || pathname.startsWith("/account")) return 3;
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
      icon: (_active: boolean) => (
        <svg
          className="h-[26px] w-[26px]"
          viewBox="0 0 24 24"
        >
          <mask id="restaurant-dining-home-mask">
            {/* White base */}
            <rect width="24" height="24" fill="white" />

            {/* Left Fork cutout */}
            <path
              d="M5.4 11.2v3.0a1.1 1.1 0 0 0 1.1 1.1v4.8a.75.75 0 0 0 1.5 0v-4.8a1.1 1.1 0 0 0 1.1-1.1v-3.0"
              stroke="black"
              strokeWidth="1.1"
              strokeLinecap="round"
              strokeLinejoin="round"
              fill="none"
            />
            <line x1="6.5" y1="11.2" x2="6.5" y2="14.2" stroke="black" strokeWidth="1.1" strokeLinecap="round" />

            {/* Center Plate (Double Concentric Circles) cutout */}
            <circle cx="12.0" cy="15.5" r="3.7" stroke="black" strokeWidth="1.2" fill="none" />
            <circle cx="12.0" cy="15.5" r="2.2" stroke="black" strokeWidth="1.2" fill="none" />

            {/* Right Knife cutout */}
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

          {/* Left Chimney */}
          <rect x="5.4" y="4.5" width="2.4" height="4.5" rx="0.4" fill="currentColor" />

          {/* House Silhouette (Gable Roof + Body) */}
          <path
            d="M12 3.5L2.2 10.8h1.8v9.4a1.8 1.8 0 0 0 1.8 1.8h12.4a1.8 1.8 0 0 0 1.8-1.8v-9.4h1.8L12 3.5z"
            fill="currentColor"
            mask="url(#restaurant-dining-home-mask)"
          />
        </svg>
      ),
    },
    {
      label: "MENU",
      href: "/smol-menu",
      icon: (_active: boolean) => (
        <svg
          className="h-[26px] w-[26px]"
          viewBox="0 0 24 24"
        >
          <mask id="restaurant-menu-mask">
            {/* White base allows everything to be drawn */}
            <rect width="24" height="24" fill="white" />

            {/* Right Leaf 4 horizontal lines cutout */}
            <line x1="14.2" y1="8.2" x2="18.8" y2="8.2" stroke="black" strokeWidth="1.2" strokeLinecap="round" />
            <line x1="14.2" y1="10.7" x2="18.8" y2="10.7" stroke="black" strokeWidth="1.2" strokeLinecap="round" />
            <line x1="14.2" y1="13.2" x2="18.8" y2="13.2" stroke="black" strokeWidth="1.2" strokeLinecap="round" />
            <line x1="14.2" y1="15.7" x2="18.8" y2="15.7" stroke="black" strokeWidth="1.2" strokeLinecap="round" />

            {/* Chef Hat outline cutout on left leaf */}
            <path
              d="M6.6 11.5c-.7 0-1.3-.6-1.3-1.3 0-.7.5-1.3 1.2-1.4.1-.9.9-1.6 1.8-1.6.9 0 1.7.7 1.8 1.6.7.1 1.2.7 1.2 1.4 0 .7-.6 1.3-1.3 1.3"
              fill="none"
              stroke="black"
              strokeWidth="1.2"
              strokeLinecap="round"
            />
            {/* Chef Hat Band */}
            <path
              d="M6.8 11.8h4.4v1.3H6.8z"
              fill="none"
              stroke="black"
              strokeWidth="1.1"
              strokeLinejoin="round"
            />
            {/* Chef Hat button */}
            <circle cx="9.0" cy="12.45" r="0.5" fill="black" />

            {/* Front Leaf 3 text lines cutout */}
            <line x1="6.0" y1="14.8" x2="12.0" y2="14.8" stroke="black" strokeWidth="1.2" strokeLinecap="round" />
            <line x1="7.0" y1="16.8" x2="11.0" y2="16.8" stroke="black" strokeWidth="1.2" strokeLinecap="round" />
            <line x1="7.4" y1="18.8" x2="10.6" y2="18.8" stroke="black" strokeWidth="1.2" strokeLinecap="round" />
          </mask>

          {/* Tri-fold Top Crease Lines */}
          <path
            d="M8.2 6.8 L 12.2 4.2 L 16.0 5.8 L 12.2 7.2"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.4"
            strokeLinecap="round"
            strokeLinejoin="round"
          />

          {/* Back Right Menu Leaf */}
          <rect
            x="12.2"
            y="5.0"
            width="8.8"
            height="14.8"
            rx="1.5"
            fill="currentColor"
            mask="url(#restaurant-menu-mask)"
          />

          {/* Front Left Menu Leaf */}
          <rect
            x="4.0"
            y="6.8"
            width="10.0"
            height="14.4"
            rx="1.5"
            fill="currentColor"
            mask="url(#restaurant-menu-mask)"
          />
        </svg>
      ),
    },
    {
      label: "ORDERS",
      href: "/orders",
      icon: (_active: boolean) => (
        <svg
          className="h-[26px] w-[26px]"
          viewBox="0 0 24 24"
          fill="currentColor"
        >
          {/* Top Knob Handle */}
          <path d="M12 2.5a1.75 1.75 0 0 1 1.75 1.75c0 .44-.16.84-.43 1.15.44.33.73.85.73 1.44v.36a9.5 9.5 0 0 0-4.1 0v-.36c0-.59.29-1.11.73-1.44A1.74 1.74 0 0 1 10.25 4.25 1.75 1.75 0 0 1 12 2.5Z" />
          {/* Cloche Dome with Specular Highlight Cutout */}
          <path
            fillRule="evenodd"
            clipRule="evenodd"
            d="M12 7.75c-4.83 0-8.75 3.92-8.75 8.75h17.5c0-4.83-3.92-8.75-8.75-8.75Zm2.2 1.85c.42-.38 1.07-.3 1.42.15 1.25 1.48 1.9 3.02 1.98 4.2.04.55-.4.98-.95.92-.5-.06-.85-.52-.9-1.02-.07-.9-.58-2.15-1.65-3.32-.38-.42-.32-1.05.1-1.43Z"
          />
          {/* Bottom Platter Base */}
          <path d="M2.5 18h19c.69 0 1.25.56 1.25 1.25s-.56 1.25-1.25 1.25h-19c-.69 0-1.25-.56-1.25-1.25S1.81 18 2.5 18Z" />
        </svg>
      ),
    },
    {
      label: "PROFILE",
      href: "/profile",
      icon: (_active: boolean) => (
        <svg
          className="h-[26px] w-[26px]"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          {/* Head */}
          <circle cx="12" cy="5.2" r="3.2" strokeWidth="1.7" />

          {/* Shoulders & Body */}
          <path
            d="M4.6 15.8C4.6 11.6 7.8 9.8 12 9.8s7.4 1.8 7.4 6.0"
            strokeWidth="1.7"
          />

          {/* Body Torso Lines */}
          <path d="M7.4 15.8v2.4M16.6 15.8v2.4" strokeWidth="1.7" />

          {/* Left Hand / Arm Rest */}
          <rect x="1.8" y="15.8" width="5.2" height="3.2" rx="1.6" strokeWidth="1.7" />

          {/* Right Hand / Arm Rest */}
          <rect x="17.0" y="15.8" width="5.2" height="3.2" rx="1.6" strokeWidth="1.7" />

          {/* Fork in Left Hand */}
          <path
            d="M4.4 15.8V12.8M3.0 9.8v2.0a1.4 1.4 0 0 0 2.8 0V9.8M4.4 9.8v2.8"
            strokeWidth="1.6"
          />

          {/* Knife in Right Hand */}
          <path
            d="M19.6 15.8v-3.2c0-1.8-.8-2.8-1.8-2.8v6.0"
            strokeWidth="1.6"
          />

          {/* Dining Plate in Front */}
          <ellipse cx="12" cy="20.0" rx="5.4" ry="2.0" strokeWidth="1.8" />
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
        className="relative pointer-events-auto mx-auto w-[calc(100%-12px)] max-w-[325px] rounded-full p-2 
          bg-white/60 dark:bg-white/[0.08] 
          backdrop-blur-[24px] backdrop-saturate-[180%] 
          border border-white/70 dark:border-white/20 
          shadow-[0_12px_32px_rgba(74,46,27,0.12),0_2px_6px_rgba(0,0,0,0.04),inset_0_1.5px_2px_rgba(255,255,255,0.95)] 
          dark:shadow-[0_16px_40px_rgba(0,0,0,0.7),inset_0_1.5px_2px_rgba(255,255,255,0.22)]
          transition-all duration-200"
      >
        {/* Navigation Items Row */}
        <div className="relative flex items-center justify-between">
          {/* Animated 3D Floating Active Indicator (Sliding Red Jewel Dome - Large & Prominent) */}
          {activeIndex >= 0 && (
            <div
              aria-hidden="true"
              className="pointer-events-none absolute top-0 left-0 w-1/4 h-full flex items-center justify-center transition-transform duration-500 ease-[cubic-bezier(0.25,1,0.5,1)] z-10"
              style={{
                transform: `translateX(${activeIndex * 100}%)`,
              }}
            >
              {/* Elevated Floating 3D Red Jewel Disc (Enlarged to 52px) */}
              <div className="relative flex h-[52px] w-[52px] items-center justify-center rounded-full -translate-y-2 transition-all duration-300">
                {/* Soft Cherry Ambient Glow */}
                <span
                  className="absolute inset-[-5px] rounded-full bg-[#B72E35]/50 blur-[8px] dark:bg-[#FF4D4D]/45 transition-opacity duration-400"
                />

                {/* 3D Convex Red Jewel Disc with layered depth */}
                <div
                  className="relative flex h-full w-full items-center justify-center rounded-full 
                    bg-gradient-to-br from-[#E23B44] via-[#B72E35] to-[#7A1318] 
                    border border-[#FFA6AB]/90 
                    shadow-[0_10px_24px_rgba(183,46,53,0.55),0_0_18px_rgba(183,46,53,0.4),inset_0_2px_3.5px_rgba(255,255,255,0.9),inset_0_-2px_4px_rgba(0,0,0,0.4)]"
                >
                  {/* Top-left Specular Gloss Arc */}
                  <span
                    className="pointer-events-none absolute top-0.5 left-3 right-3 h-3.5 rounded-t-full bg-gradient-to-b from-white/85 via-white/30 to-transparent"
                  />
                </div>
              </div>
            </div>
          )}

          {/* 4 Navigation Items */}
          {navItems.map((item, index) => {
            const active = activeIndex === index;
            return (
              <Link
                key={item.label}
                href={item.href}
                prefetch={true}
                aria-label={item.label}
                onClick={() => setActiveIndex(index)}
                className="group relative z-20 flex flex-1 items-center justify-center transition-transform duration-150 active:scale-95 touch-manipulation focus:outline-none py-1"
              >
                {/* Icon Container */}
                <div className="relative flex h-[44px] w-[44px] items-center justify-center">
                  {/* Icon SVG */}
                  <div
                    className={`relative z-10 transition-all duration-300 ease-out flex items-center justify-center ${
                      active
                        ? "text-white scale-120 -translate-y-2 drop-shadow-[0_2px_4px_rgba(0,0,0,0.5)]"
                        : "text-[#4A2E1B] dark:text-[#C9AE8B] scale-100 group-hover:scale-110 group-hover:text-[#2E180B] dark:group-hover:text-[#FAF4EB]"
                    }`}
                  >
                    {item.icon(active)}
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
