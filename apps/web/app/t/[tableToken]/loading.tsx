import React from "react";

export default function TableTokenLoading() {
  return (
    <div className="min-h-screen bg-[#F3E7D3] dark:bg-[#151110] text-[#241F1C] dark:text-[#FAF4EB] flex flex-col items-center justify-center px-6 py-12 animate-fade-in">
      <div className="w-full max-w-sm flex flex-col items-center space-y-5 text-center">
        {/* Logo Door Skeleton */}
        <div className="h-24 w-20 rounded-t-full bg-[#E5D7C3] dark:bg-stone-800 animate-pulse" />

        {/* Door Frame Skeleton */}
        <div className="relative w-full max-w-[280px] aspect-[4/3.5] rounded-t-[5rem] border-2 border-[#C9AE8B]/30 dark:border-white/10 bg-[#EAE0D2] dark:bg-[#1E1916] flex flex-col items-center justify-center p-4 animate-pulse">
          <div className="h-3 w-16 rounded bg-[#D8C7AF] dark:bg-stone-700 mb-2" />
          <div className="h-8 w-16 rounded-lg bg-[#D8C7AF] dark:bg-stone-700" />
        </div>

        {/* Heading Skeleton */}
        <div className="space-y-2 w-full flex flex-col items-center">
          <div className="h-6 w-48 rounded-lg bg-[#E5D7C3] dark:bg-stone-800 animate-pulse" />
          <div className="h-3.5 w-32 rounded bg-[#E5D7C3]/70 dark:bg-stone-800/70 animate-pulse" />
        </div>

        {/* Form Skeleton */}
        <div className="w-full space-y-3 pt-2">
          <div className="h-12 w-full rounded-2xl bg-[#EAE0D2] dark:bg-[#201A18] animate-pulse" />
          <div className="h-12 w-full rounded-2xl bg-[#B72E35]/40 animate-pulse" />
        </div>
      </div>
    </div>
  );
}
