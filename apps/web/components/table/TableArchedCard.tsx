"use client";

import React from "react";
import { Users } from "lucide-react";

interface TableArchedCardProps {
  tableNumber: string;
  guestCount: number;
  children: React.ReactNode;
}

export const TableArchedCard: React.FC<TableArchedCardProps> = ({
  tableNumber,
  guestCount,
  children,
}) => {
  return (
    <div className="relative w-full max-w-[424px] mx-auto select-none">
      {/* Top Arched Dome SVG Frame */}
      <div className="relative w-full overflow-hidden">
        <svg
          viewBox="-1 -1 424 183"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          className="w-full h-auto block drop-shadow-[0_2px_8px_rgba(0,0,0,0.03)]"
          preserveAspectRatio="xMidYMid meet"
        >
          {/* Main Card Silhouette (Arched Dome with curved shoulders) */}
          <path
            d="M 0 181
               L 0 140
               C 0 124 14 114 31 114
               L 77 114
               C 83 114 85 104 87 94
               C 95 44 144 38 211 38
               C 278 38 327 44 335 94
               C 337 104 339 114 345 114
               L 391 114
               C 408 114 422 124 422 140
               L 422 181
               Z"
            fill="#FAF5EE"
            stroke="#D8CCBD"
            strokeWidth="1.2"
          />

          {/* Inner Decorative Fine Inset Line */}
          <path
            d="M 7 181
               L 7 141
               C 7 129 18 121 33 121
               L 76 121
               C 86 121 90 108 92 98
               C 100 52 147 46 211 46
               C 275 46 322 52 330 98
               C 332 108 336 121 346 121
               L 389 121
               C 404 121 415 129 415 141
               L 415 181"
            fill="none"
            stroke="#E4D9CC"
            strokeWidth="1"
          />

          {/* Horizontal Line separating Arch Header from Content */}
          <line
            x1="0"
            y1="181"
            x2="422"
            y2="181"
            stroke="#E5DAC9"
            strokeWidth="1.2"
          />
        </svg>

        {/* Content Positioned Inside the Arched Dome */}
        <div className="absolute inset-0 flex flex-col items-center justify-start pt-7 sm:pt-8 pointer-events-none">
          {/* "TABLE" label */}
          <span className="font-serif text-[12px] sm:text-[13px] font-semibold tracking-[0.24em] text-[#302A26] uppercase">
            TABLE
          </span>

          {/* Table Number "07" in High-Contrast Serif */}
          <span className="font-serif text-[50px] sm:text-[54px] leading-none font-bold text-[#1C1917] tracking-tight mt-0.5">
            {tableNumber}
          </span>

          {/* "2 Guests" Pill Badge */}
          <div className="mt-2 flex items-center justify-center">
            <div className="inline-flex items-center gap-1.5 rounded-full bg-[#3C5C5B] px-3.5 py-0.5 text-[11px] font-medium text-white shadow-xs">
              <Users className="w-3.5 h-3.5 text-white/95" />
              <span>{guestCount} Guests</span>
            </div>
          </div>
        </div>
      </div>

      {/* Card Body - Connected seamlessly to the SVG header */}
      <div className="w-full bg-[#FAF5EE] border-x border-b border-[#D8CCBD] rounded-b-[2rem] shadow-[0_4px_16px_rgba(0,0,0,0.03)] -mt-[1px]">
        {children}
      </div>
    </div>
  );
};
