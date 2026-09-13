import React from "react";
import Link from "next/link";

interface TodayBlackboardCardProps {
  title?: string;
  headline?: string;
  subline?: string;
  href?: string;
}

export const TodayBlackboardCard: React.FC<TodayBlackboardCardProps> = ({
  title = "Today's Blackboard",
  headline = "Jaggery Sea-Salt Latte",
  subline = "is our new crush.",
  href = "/smol-menu",
}) => {
  return (
    <Link
      href={href}
      className="group relative block w-full overflow-hidden rounded-[1.75rem] border-[3px] border-[#362B24] transition-all duration-300 hover:scale-[1.01] active:scale-[0.99] shadow-md select-none"
      aria-label={`${title}: ${headline} ${subline}`}
    >
      {/* Blackboard Slate Surface */}
      <div
        className="relative w-full aspect-[2.1/1] min-h-[168px] sm:min-h-[188px] flex flex-col justify-between p-4 sm:p-6 overflow-hidden"
        style={{
          backgroundColor: "#1c1917",
          backgroundImage: `
            radial-gradient(ellipse at 15% 25%, rgba(255, 255, 255, 0.05) 0%, transparent 45%),
            radial-gradient(ellipse at 85% 75%, rgba(255, 255, 255, 0.04) 0%, transparent 50%),
            radial-gradient(circle at 50% 50%, rgba(255, 255, 255, 0.025) 0%, transparent 75%),
            linear-gradient(160deg, #25201d 0%, #1b1816 55%, #151312 100%)
          `,
          boxShadow: "inset 0 0 35px rgba(0, 0, 0, 0.75), inset 0 1px 1px rgba(255, 255, 255, 0.1)",
        }}
      >
        {/* Subtle Chalk Dust Overlay / Smudge Texture */}
        <div
          className="absolute inset-0 pointer-events-none opacity-20"
          style={{
            backgroundImage: `radial-gradient(circle at 30% 60%, rgba(255, 255, 255, 0.15) 0%, transparent 35%), radial-gradient(circle at 70% 30%, rgba(255, 255, 255, 0.12) 0%, transparent 40%)`,
            filter: "blur(4px)",
          }}
        />

        {/* Top Header: "Today's Blackboard" with Chalk Underline */}
        <div className="relative z-10">
          <div className="inline-block border-b-[1.5px] border-[#F7F1E8]/75 pb-1">
            <h3
              className="font-serif text-[19px] sm:text-[22px] font-medium tracking-tight text-[#F7F1E8] leading-none"
              style={{
                textShadow: "0 0 1px rgba(255, 255, 255, 0.6), 0 0 8px rgba(255, 255, 255, 0.15)",
              }}
            >
              {title}
            </h3>
          </div>
          {/* Faint chalk dust line extending across */}
          <div className="h-[1px] w-full bg-gradient-to-r from-[#F7F1E8]/20 via-[#F7F1E8]/10 to-transparent -mt-[1px]" />
        </div>

        {/* Center/Main Chalk Message */}
        <div className="relative z-10 my-auto flex flex-col justify-center items-center text-center px-3 py-1.5">
          <div
            className="font-chalk text-[30px] sm:text-[38px] md:text-[42px] font-medium leading-[1.1] text-[#FAF5ED] tracking-wide"
            style={{
              textShadow: "0 0 1.5px rgba(255, 255, 255, 0.8), 0 0 10px rgba(255, 255, 255, 0.25)",
            }}
          >
            {headline}
          </div>

          <div
            className="font-chalk text-[26px] sm:text-[32px] md:text-[36px] font-medium leading-[1.1] text-[#FAF5ED] tracking-wide mt-1 flex items-center justify-center gap-2"
            style={{
              textShadow: "0 0 1.5px rgba(255, 255, 255, 0.8), 0 0 10px rgba(255, 255, 255, 0.25)",
            }}
          >
            <span>{subline}</span>
            {/* Hand-drawn chalk heart matching original image */}
            <svg
              viewBox="0 0 24 24"
              className="inline-block w-6 h-6 sm:w-7 sm:h-7 stroke-[#FAF5ED] fill-none -rotate-6 translate-y-0.5"
              style={{
                filter: "drop-shadow(0 0 1.5px rgba(255, 255, 255, 0.8)) drop-shadow(0 0 6px rgba(255, 255, 255, 0.2))",
              }}
              strokeWidth="2.2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M12 21 C10 19 3 13.5 3 8.2 C3 5.2 5.5 3 8.5 3 C10.4 3 11.4 4 12 4.9 C12.6 4 13.6 3 15.5 3 C18.5 3 21 5.2 21 8.2 C21 13.5 14 19 12 21 Z" />
            </svg>
          </div>
        </div>

        {/* Bottom subtle chalk dust footer hint / interactive affordance */}
        <div className="relative z-10 flex justify-end items-center opacity-40 group-hover:opacity-80 transition-opacity">
          <span className="font-mono text-[9px] uppercase tracking-widest text-[#F7F1E8]">
            Tap to explore &rarr;
          </span>
        </div>
      </div>
    </Link>
  );
};
