import React from "react";

export default function MenuLoading() {
  return (
    <div className="min-h-screen bg-[#F3E7D3] dark:bg-[#151110] text-[#241F1C] dark:text-[#FAF4EB] pb-32 animate-fade-in transition-colors">
      {/* Top Header Bar Skeleton */}
      <header className="sticky top-0 z-30 bg-[#F3E7D3]/90 dark:bg-[#151110]/90 backdrop-blur-md border-b border-[#C9AE8B]/30 dark:border-white/10 px-4 py-3">
        <div className="mx-auto flex max-w-lg items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="h-8 w-24 rounded-lg bg-[#E5D7C3] dark:bg-stone-800 animate-pulse" />
          </div>
          <div className="flex items-center gap-2">
            <div className="h-7 w-20 rounded-full bg-[#E5D7C3] dark:bg-stone-800 animate-pulse" />
            <div className="h-8 w-8 rounded-full bg-[#E5D7C3] dark:bg-stone-800 animate-pulse" />
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-lg px-4 pt-4 space-y-4">
        {/* Search Bar Skeleton */}
        <div className="h-11 w-full rounded-2xl bg-[#EAE0D2] dark:bg-[#201A18] border border-[#C9AE8B]/20 dark:border-white/5 animate-pulse" />

        {/* Category Pills Skeleton */}
        <div className="flex gap-2 overflow-x-hidden py-1">
          {["All Items", "Coffee", "All-Day Brews", "Treats", "Breakfast"].map((_, i) => (
            <div
              key={i}
              className="h-8 w-24 shrink-0 rounded-full bg-[#E5D7C3] dark:bg-[#221C1A] animate-pulse"
              style={{ animationDelay: `${i * 100}ms` }}
            />
          ))}
        </div>

        {/* Category Heading Skeleton */}
        <div className="pt-2 flex items-center justify-between">
          <div className="h-6 w-36 rounded-md bg-[#E5D7C3] dark:bg-stone-800 animate-pulse" />
          <div className="h-4 w-12 rounded-md bg-[#E5D7C3]/60 dark:bg-stone-800/60 animate-pulse" />
        </div>

        {/* Food Items Cards Skeleton */}
        <div className="grid grid-cols-2 gap-3 sm:gap-4">
          {[1, 2, 3, 4, 5, 6].map((idx) => (
            <div
              key={idx}
              className="rounded-3xl border border-[#E2D7C7] dark:border-stone-800/80 bg-[#FAF4EB] dark:bg-[#1C1715] p-3 space-y-2.5 shadow-2xs animate-pulse"
              style={{ animationDelay: `${idx * 80}ms` }}
            >
              {/* Arched image skeleton */}
              <div className="aspect-[4/3.5] w-full rounded-t-2xl rounded-b-lg bg-[#EAE0D2] dark:bg-[#28211E]" />
              <div className="space-y-1.5 pt-1">
                <div className="h-3.5 w-4/5 rounded bg-[#E5D7C3] dark:bg-stone-800" />
                <div className="h-2.5 w-full rounded bg-[#E5D7C3]/70 dark:bg-stone-800/70" />
                <div className="h-2.5 w-3/4 rounded bg-[#E5D7C3]/70 dark:bg-stone-800/70" />
              </div>
              <div className="flex items-center justify-between pt-1 border-t border-[#E2D7C7]/60 dark:border-stone-800/60">
                <div className="h-4 w-12 rounded bg-[#E5D7C3] dark:bg-stone-800" />
                <div className="h-7 w-7 rounded-full bg-[#B72E35]/30 dark:bg-[#B72E35]/40" />
              </div>
            </div>
          ))}
        </div>
      </main>
    </div>
  );
}
