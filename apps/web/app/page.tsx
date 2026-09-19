"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { Sun, Moon, ArrowRight } from "lucide-react";
import { TableScannerModal } from "@/components/table/TableScannerModal";
import { StaffForkLockIcon } from "@/components/common/StaffForkLockIcon";

export default function RoleSelectionPage() {
  const router = useRouter();
  const [isScannerOpen, setIsScannerOpen] = useState(false);
  const [currentTable, setCurrentTable] = useState("01");
  const [isDark, setIsDark] = useState(false);

  useEffect(() => {
    const saved = localStorage.getItem("smol_theme");
    const active = saved === "night" || saved === "dark";
    setIsDark(active);
    applyTheme(active);
  }, []);

  const applyTheme = (dark: boolean) => {
    if (dark) {
      document.documentElement.classList.add("dark");
      document.documentElement.setAttribute("data-theme", "night");
      document.body.style.backgroundColor = "#241F1C";
      document.body.style.color = "#F3E7D3";
    } else {
      document.documentElement.classList.remove("dark");
      document.documentElement.setAttribute("data-theme", "day");
      document.body.style.backgroundColor = "#F3E7D3";
      document.body.style.color = "#241F1C";
    }
  };

  const toggleTheme = () => {
    const next = !isDark;
    setIsDark(next);
    applyTheme(next);
    localStorage.setItem("smol_theme", next ? "night" : "day");
  };

  return (
    <>
      <main
        className={`relative min-h-screen sm:h-screen ${
          isDark
            ? "ambient-bg-night text-smol-creme"
            : "ambient-bg-day text-smol-espresso"
        } transition-colors duration-300 overflow-hidden flex flex-col items-center justify-between px-4 sm:px-6 py-2 sm:py-3 font-sans selection:bg-[#B72E35] selection:text-white`}
      >
        {/* Editorial Top Border Line */}
        <div
          style={{ backgroundColor: isDark ? "rgba(201, 174, 139, 0.2)" : "rgba(201, 174, 139, 0.4)" }}
          className="absolute top-0 inset-x-0 h-px"
        />

        {/* Top Header: Modern Floating Pill Header with Live Cafe Indicator, Wordmark, and Controls */}
        <header className="relative z-20 w-full max-w-xl mx-auto pt-1 pb-1 sm:pb-2">
          <div className="flex items-center justify-between px-3.5 sm:px-4 py-1.5 rounded-full backdrop-blur-md bg-[#FAF4EB]/85 dark:bg-[#1C1714]/85 border border-[#C9AE8B]/30 dark:border-white/10 shadow-[0_4px_20px_-4px_rgba(0,0,0,0.06)] dark:shadow-[0_4px_24px_-4px_rgba(0,0,0,0.4)] transition-all duration-300">
            {/* Left: Brand Name + Live Status indicator */}
            <div className="flex items-center gap-2.5">
              <span
                style={{ color: isDark ? "#F3E7D3" : "#B72E35" }}
                className="font-serif text-lg sm:text-xl font-bold tracking-tight lowercase select-none"
              >
                smol café
              </span>
              <div className="hidden sm:flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/25">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                <span className="font-mono text-[9px] uppercase tracking-wider text-emerald-700 dark:text-emerald-400 font-medium">
                  open · tapovan
                </span>
              </div>
            </div>

            {/* Right: Controls (Day/Night Mode Switcher + Subtle Staff Lock) */}
            <div className="flex items-center gap-2">
              {/* Day / Night Toggle Pill */}
              <button
                onClick={toggleTheme}
                aria-label="Toggle day and night mode"
                className={`group flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-mono transition-all duration-200 cursor-pointer focus:outline-none ${
                  isDark ? "pill-3d-night text-[#F3E7D3]" : "pill-3d-day text-[#241F1C]"
                }`}
              >
                {isDark ? (
                  <>
                    <Moon className="h-3.5 w-3.5 text-[#754CFF] animate-pulse" />
                    <span className="lowercase text-[11px] font-medium tracking-wide">
                      night
                    </span>
                  </>
                ) : (
                  <>
                    <Sun className="h-3.5 w-3.5 text-[#B72E35]" />
                    <span className="lowercase text-[11px] font-medium tracking-wide">
                      day
                    </span>
                  </>
                )}
              </button>

              {/* Staff Lock Icon -> Direct navigation to /smol-backdoor */}
              <div className="relative group">
                <Link
                  href="/smol-backdoor"
                  aria-label="Staff Backdoor Access"
                  title="Staff Backdoor Portal"
                  style={{ color: isDark ? "#FF5B52" : "#B72E35" }}
                  className={`flex h-9 w-9 items-center justify-center rounded-full transition-all duration-200 cursor-pointer focus:outline-none hover:scale-110 active:scale-95 ${
                    isDark
                      ? "pill-3d-night border-[#B72E35]/60 shadow-[0_0_14px_rgba(183,46,53,0.4)]"
                      : "pill-3d-day border-[#B72E35]/50 hover:border-[#B72E35] shadow-[0_2px_10px_rgba(183,46,53,0.22)]"
                  }`}
                >
                  <StaffForkLockIcon
                    style={{ color: isDark ? "#FF5B52" : "#B72E35" }}
                    className="h-6 w-6 shrink-0"
                  />
                </Link>

                {/* Desktop Hover Tooltip */}
                <span className="pointer-events-none absolute -bottom-8 right-0 hidden whitespace-nowrap rounded-md bg-[#241F1C] px-2.5 py-1 text-[10px] font-mono text-[#F3E7D3] opacity-0 transition-opacity group-hover:opacity-100 sm:block dark:bg-[#FAF4EB] dark:text-[#241F1C] shadow-lg z-30 border border-white/10 dark:border-black/10">
                  Staff Backdoor
                </span>
              </div>
            </div>
          </div>
        </header>

        {/* Central Customer-First Container (Unifying Logo, Card, and Footer with tight elegant spacing) */}
        <div className="relative z-10 w-full max-w-md mx-auto flex flex-col items-center my-auto -translate-y-2 sm:-translate-y-3 py-1">

          {/* Top Hero Brand Block (Logo + Eyebrow + Headlines + Divider - shifted upwards) */}
          <div className="flex flex-col items-center -translate-y-3 sm:-translate-y-5 w-full">
            {/* Official Clean Arched Door Logo (Enlarged and prominent with ambient glow) */}
            <div className="animate-fade-in-down mb-1.5 flex flex-col items-center relative">
              {/* Ambient Reddish (Day) / Electric Violet #754CFF (Night) Aura Glow behind logo */}
              <div
                className={`absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-44 sm:w-52 h-48 sm:h-56 rounded-full blur-2xl pointer-events-none transition-all duration-500 ${
                  isDark
                    ? "bg-gradient-to-b from-[#754CFF]/50 via-[#754CFF]/35 to-transparent shadow-[0_0_40px_rgba(117,76,255,0.4)]"
                    : "bg-gradient-to-b from-[#B72E35]/35 via-[#B72E35]/25 to-transparent"
                }`}
              />

              <div className="relative h-[145px] w-[104px] sm:h-[160px] sm:w-[114px] transition-transform duration-300 hover:scale-105 animate-float cursor-pointer">
                {/* Day Mode Logo: Clean Arched Red Door with subtle reddish glow */}
                <Image
                  src="/logo-transparent.png?v=2"
                  alt="smol café"
                  fill
                  className={`object-contain transition-opacity duration-500 drop-shadow-[0_0_26px_rgba(183,46,53,0.38)] drop-shadow-[0_16px_24px_rgba(114,80,57,0.18)] ${
                    isDark ? "opacity-0 pointer-events-none scale-95" : "opacity-100 scale-100"
                  }`}
                  priority
                />
                {/* Night Mode Logo: Clean Arched Glowing Neon Electric Violet Door */}
                <Image
                  src="/logo-dark-transparent.png?v=2"
                  alt="smol café after dark"
                  fill
                  className={`object-contain transition-all duration-500 drop-shadow-[0_0_32px_rgba(117,76,255,0.85)] drop-shadow-[0_16px_24px_rgba(0,0,0,0.7)] ${
                    isDark ? "opacity-100 scale-100" : "opacity-0 pointer-events-none scale-95"
                  }`}
                  priority
                />
              </div>
              {/* Soft 3D Grounding Pedestal Shadow */}
              <div
                className={`h-2 w-22 sm:w-26 rounded-full mt-1.5 transition-all duration-300 blur-[2px] ${
                  isDark ? "bg-black/50" : "bg-[#725039]/18"
                }`}
              />
            </div>

            {/* Micro Brand Eyebrow Badge */}
            <div className="animate-fade-in-down delay-50 mb-0.5">
              <span className="font-mono text-[9.5px] uppercase tracking-[0.25em] text-[#725039]/80 dark:text-[#C9AE8B]/80 px-2.5 py-0.5 rounded-full bg-[#725039]/5 dark:bg-white/5 border border-[#725039]/15 dark:border-white/10">
                artisanal bakehouse &amp; brew
              </span>
            </div>

            {/* Main Headline — EB Garamond serif, lowercase */}
            <div className="animate-fade-in-down delay-50 text-center mb-0">
              <h1
                style={{ color: isDark ? "#F3E7D3" : "#241F1C" }}
                className="font-serif text-2xl sm:text-3xl font-medium tracking-tight lowercase transition-colors duration-300"
              >
                welcome to smol
              </h1>
            </div>

            {/* Supporting Copy — editorial italic annotation */}
            <p
              style={{ color: isDark ? "#C9AE8B" : "#725039" }}
              className="animate-fade-in-down delay-100 font-serif italic text-xs sm:text-sm mb-2 sm:mb-2.5 text-center transition-colors duration-300"
            >
              slow mornings &amp; handcrafted sips
            </p>

            {/* Thin Star Divider */}
            <div className="flex items-center gap-3 mb-1 w-full max-w-xs mx-auto animate-fade-in-up delay-100">
              <div
                style={{ backgroundColor: isDark ? "rgba(201, 174, 139, 0.25)" : "rgba(201, 174, 139, 0.45)" }}
                className="flex-1 h-px"
              />
              <span
                style={{ color: isDark ? "#754CFF" : "#B72E35" }}
                className="text-xs transition-colors duration-300"
              >
                ✦
              </span>
              <div
                style={{ backgroundColor: isDark ? "rgba(201, 174, 139, 0.25)" : "rgba(201, 174, 139, 0.45)" }}
                className="flex-1 h-px"
              />
            </div>
          </div>

          {/* ── Customer Section: Luxury Interactive Terminal Card (Brand Kit v1.0 Compliant) ── */}
          <div className="w-full max-w-sm sm:max-w-md mx-auto mt-4 sm:mt-5">
            <div
              className={`relative w-full rounded-[2rem] sm:rounded-[2.25rem] p-4 sm:p-5 pt-8 sm:pt-9 text-center transition-all duration-300 overflow-visible ${
                isDark
                  ? "bg-gradient-to-b from-[#241F1C] via-[#1A1614] to-[#120F0E] border border-white/10 shadow-[0_20px_50px_-15px_rgba(0,0,0,0.8)]"
                  : "bg-gradient-to-b from-[#FAF4EB] via-[#F6EEE2] to-[#EFE3D3] border border-[#725039]/20 shadow-[0_20px_45px_-12px_rgba(114,80,57,0.2),0_2px_6px_rgba(114,80,57,0.06),0_1px_0_rgba(255,255,255,0.9)_inset]"
              }`}
            >
              {/* Subtle top bevel hairline */}
              <div
                className={`pointer-events-none absolute inset-x-8 top-0 h-px transition-colors duration-300 ${
                  isDark
                    ? "bg-gradient-to-r from-transparent via-white/15 to-transparent"
                    : "bg-gradient-to-r from-transparent via-white/80 to-transparent"
                }`}
              />

              {/* Ambient Glow behind floating badge */}
              <div
                className={`absolute -top-12 left-1/2 -translate-x-1/2 w-36 h-16 blur-2xl pointer-events-none transition-all duration-300 ${
                  isDark ? "bg-[#754CFF]/45" : "bg-[#B72E35]/25"
                }`}
              />

              {/* Top Floating Badge (Overlapping top edge) */}
              <div className="absolute -top-7 left-1/2 -translate-x-1/2 flex items-center justify-center">
                <button
                  type="button"
                  onClick={() => setIsScannerOpen(true)}
                  aria-label="Scan Table QR"
                  className={`relative flex h-14 w-14 sm:h-15 sm:w-15 items-center justify-center rounded-[1.35rem] transition-all duration-300 hover:scale-105 active:scale-95 cursor-pointer ${
                    isDark
                      ? "bg-gradient-to-b from-[#2E2522] via-[#1C1715] to-[#120F0E] border border-[#754CFF]/40 shadow-[0_8px_25px_rgba(0,0,0,0.7),inset_0_1px_1px_rgba(255,255,255,0.15)]"
                      : "bg-gradient-to-b from-[#FAF4EB] via-[#EFE3D3] to-[#E5D5C0] border border-[#725039]/25 shadow-[0_10px_25px_rgba(114,80,57,0.18),inset_0_1.5px_2px_rgba(255,255,255,0.95)]"
                  }`}
                >
                  {/* Stylized QR glyph with scan line */}
                  <div className="relative flex items-center justify-center w-7 h-7 sm:w-7.5 sm:h-7.5">
                    <svg
                      className={`w-full h-full transition-colors duration-300 ${
                        isDark ? "text-[#9D7BFF]" : "text-[#B72E35]"
                      }`}
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="1.75"
                    >
                      {/* Top-Left QR Corner */}
                      <rect x="3" y="3" width="6.5" height="6.5" rx="2" />
                      <circle cx="6.25" cy="6.25" r="1" fill="currentColor" />

                      {/* Top-Right QR Corner */}
                      <rect x="14.5" y="3" width="6.5" height="6.5" rx="2" />
                      <circle cx="17.75" cy="6.25" r="1" fill="currentColor" />

                      {/* Bottom-Left QR Corner */}
                      <rect x="3" y="14.5" width="6.5" height="6.5" rx="2" />
                      <circle cx="6.25" cy="17.75" r="1" fill="currentColor" />

                      {/* Bottom-Right Angle Bracket with Dot */}
                      <path d="M15 15h4v4" strokeLinecap="round" strokeLinejoin="round" />
                      <circle cx="17" cy="17" r="1" fill="currentColor" />
                    </svg>

                    {/* Horizontal moving laser scan beam (animating from bottom to top) */}
                    <div
                      className={`absolute inset-x-[-4px] -translate-y-1/2 h-[2px] pointer-events-none animate-laser-scan transition-colors duration-300 ${
                        isDark
                          ? "bg-gradient-to-r from-transparent via-[#B89EFF] to-transparent shadow-[0_0_12px_#754CFF,0_0_6px_#D6C4FF] text-[#B89EFF]"
                          : "bg-gradient-to-r from-transparent via-[#B72E35] to-transparent shadow-[0_0_10px_#B72E35,0_0_4px_#D6454D] text-[#B72E35]"
                      }`}
                    />
                  </div>

                  {/* Attached mini pill indicator at TOP-RIGHT with BLINKING DOT */}
                  <div
                    className={`absolute -top-2.5 -right-2.5 flex items-center justify-center px-2 py-0.5 rounded-full border transition-colors duration-300 ${
                      isDark
                        ? "bg-[#1E1916] border-[#754CFF] shadow-[0_0_12px_rgba(117,76,255,0.7)]"
                        : "bg-gradient-to-b from-[#FFFFFF] to-[#FAF4EB] border border-[#B72E35] shadow-[0_2px_8px_rgba(183,46,53,0.25),inset_0_1px_1px_rgba(255,255,255,0.9)]"
                    }`}
                  >
                    <span className="relative flex h-2 w-2 items-center justify-center">
                      <span
                        className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-80 ${
                          isDark ? "bg-[#754CFF]" : "bg-[#B72E35]"
                        }`}
                      />
                      <span
                        className={`relative inline-flex rounded-full h-2 w-2 shadow-sm ${
                          isDark
                            ? "bg-[#9D7BFF] shadow-[0_0_8px_#754CFF]"
                            : "bg-[#B72E35] shadow-[0_0_8px_#B72E35]"
                        }`}
                      />
                    </span>
                  </div>
                </button>
              </div>

              {/* Title (EB Garamond, lowercase) */}
              <h2
                className={`font-serif text-xl sm:text-2xl font-medium tracking-tight lowercase mt-0.5 transition-colors duration-300 ${
                  isDark ? "text-[#F3E7D3]" : "text-[#241F1C]"
                }`}
              >
                login as customer
              </h2>

              {/* Description (Inter / Walnut) */}
              <p
                className={`mt-1 font-sans text-xs sm:text-[12.5px] leading-relaxed max-w-[280px] sm:max-w-xs mx-auto transition-colors duration-300 ${
                  isDark ? "text-[#C9AE8B]" : "text-[#725039]"
                }`}
              >
                Scan table QR stand to browse the seasonal menu &amp; order directly from your seat.
              </p>

              {/* Primary Action Button ("scan table QR code") with Adaptive Theme Gradient */}
              <div className="relative mt-4 sm:mt-5 w-full">
                {/* Diffuse ambient floor glow underneath button */}
                <div
                  className={`absolute inset-x-4 -bottom-2 h-8 blur-lg pointer-events-none rounded-full transition-all duration-300 ${
                    isDark ? "bg-[#754CFF]/55" : "bg-[#B72E35]/30"
                  }`}
                />
                <div
                  className={`absolute inset-x-8 -bottom-1 h-5 blur-md pointer-events-none rounded-full transition-all duration-300 ${
                    isDark ? "bg-[#754CFF]/80" : "bg-[#B72E35]/45"
                  }`}
                />

                <button
                  type="button"
                  onClick={() => setIsScannerOpen(true)}
                  className={`relative group w-full flex items-center justify-between rounded-[1.3rem] sm:rounded-[1.4rem] p-2 sm:p-2.5 pl-3.5 sm:pl-4 pr-2 sm:pr-2.5 text-white transition-all duration-300 hover:scale-[1.01] active:scale-[0.98] cursor-pointer ${
                    isDark
                      ? "bg-gradient-to-r from-[#5B34E6] via-[#754CFF] to-[#8E65FF] hover:from-[#6B42FF] hover:to-[#9F7BFF] shadow-[0_10px_28px_rgba(117,76,255,0.55),inset_0_1px_1.5px_rgba(255,255,255,0.4)]"
                      : "bg-gradient-to-r from-[#A5242A] via-[#B72E35] to-[#C93840] hover:from-[#B72E35] hover:to-[#D43D46] shadow-[0_10px_24px_rgba(183,46,53,0.4),inset_0_1px_1.5px_rgba(255,255,255,0.4)]"
                  }`}
                >
                  {/* Left rounded viewfinder icon with center target circle */}
                  <div className="flex h-9 w-9 sm:h-9.5 sm:w-9.5 shrink-0 items-center justify-center rounded-xl bg-black/20 backdrop-blur-xs text-white">
                    <svg
                      className="w-4.5 h-4.5 sm:w-5 sm:h-5 text-white"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <path d="M4 8V6a2 2 0 0 1 2-2h2" />
                      <path d="M16 4h2a2 2 0 0 1 2 2v2" />
                      <path d="M4 16v2a2 2 0 0 0 2 2h2" />
                      <path d="M16 20h2a2 2 0 0 0 2-2v-2" />
                      <circle cx="12" cy="12" r="2.5" />
                    </svg>
                  </div>

                  {/* Center text */}
                  <span className="font-sans text-sm sm:text-base font-bold tracking-normal text-white px-2 text-center flex-1 min-w-0">
                    scan table QR code
                  </span>

                  {/* Right circular button with arrow */}
                  <div className="flex h-8 w-8 sm:h-8.5 sm:w-8.5 shrink-0 items-center justify-center rounded-full bg-white/20 group-hover:bg-white/30 backdrop-blur-xs text-white shadow-inner transition-transform group-hover:translate-x-0.5">
                    <ArrowRight className="h-4 w-4 sm:h-4.5 sm:w-4.5" />
                  </div>
                </button>
              </div>

              {/* Subtle Walnut / Hairline Divider */}
              <div
                className={`w-full h-px my-3.5 sm:my-4 transition-colors duration-300 ${
                  isDark ? "bg-white/10" : "bg-[#725039]/15"
                }`}
              />

              {/* Bottom Feature Badges (Brand Kit Palette: Dusty Pool, Butter Taxi, Electric Violet) */}
              <div className="grid grid-cols-3 gap-1.5 sm:gap-2 w-full items-center">
                {/* Chip 1: Instant menu (Dusty Pool #75AFA7) */}
                <div
                  className={`min-w-0 h-9 flex items-center justify-center gap-1.5 px-2 rounded-full text-[10px] sm:text-[10.5px] font-medium transition-colors duration-300 ${
                    isDark
                      ? "bg-[#1C1715] border border-white/10 text-[#C9AE8B]"
                      : "bg-[#FAF4EB] border border-[#725039]/20 shadow-[0_2px_6px_rgba(114,80,57,0.06)] text-[#725039]"
                  }`}
                >
                  <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-[#75AFA7] shadow-[0_0_8px_#75AFA7]" />
                  <span className="whitespace-nowrap">Instant menu</span>
                </div>

                {/* Chip 2: No app needed (Butter Taxi #F2C84B in Day, Electric Violet #754CFF at Night) */}
                <div
                  className={`min-w-0 h-9 flex items-center justify-center gap-1.5 px-2 rounded-full text-[10px] sm:text-[10.5px] font-medium transition-colors duration-300 ${
                    isDark
                      ? "bg-[#1C1715] border border-white/10 text-[#C9AE8B]"
                      : "bg-[#FAF4EB] border border-[#725039]/20 shadow-[0_2px_6px_rgba(114,80,57,0.06)] text-[#725039]"
                  }`}
                >
                  <span
                    className={`h-1.5 w-1.5 shrink-0 rounded-full ${
                      isDark ? "bg-[#754CFF] shadow-[0_0_8px_#754CFF]" : "bg-[#F2C84B] shadow-[0_0_8px_#F2C84B]"
                    }`}
                  />
                  <span className="whitespace-nowrap">No app needed</span>
                </div>

                {/* Chip 3: Apple Pay & Card with Butter Taxi #F2C84B NFC waves */}
                <div
                  className={`min-w-0 h-9 flex items-center justify-center gap-1.5 px-1.5 sm:px-2 rounded-full text-[9.5px] sm:text-[10px] font-medium transition-colors duration-300 ${
                    isDark
                      ? "bg-[#1C1715] border border-white/10 text-[#C9AE8B]"
                      : "bg-[#FAF4EB] border border-[#725039]/20 shadow-[0_2px_6px_rgba(114,80,57,0.06)] text-[#725039]"
                  }`}
                >
                  <div
                    className={`flex h-3.5 w-3.5 shrink-0 items-center justify-center rounded-full ${
                      isDark
                        ? "bg-[#F2C84B]/20 text-[#F2C84B] border border-[#F2C84B]/40"
                        : "bg-[#F2C84B]/25 text-[#8A6715] border border-[#F2C84B]/60"
                    }`}
                  >
                    <svg className="h-2 w-2" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                      <path d="M8.5 16.5a5 5 0 0 1 0-9" />
                      <path d="M12 19a8.5 8.5 0 0 0 0-14" />
                      <path d="M15.5 21.5a12 12 0 0 0 0-19" />
                    </svg>
                  </div>
                  <div className="flex flex-col text-left leading-[1.1] whitespace-nowrap">
                    <span>Apple Pay &amp;</span>
                    <span
                      className={`text-[8.5px] ${
                        isDark ? "text-[#A8988B]" : "text-[#725039]/80"
                      }`}
                    >
                      Card
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Footer — Editorial annotation style (Tightly placed directly below customer card) */}
          <footer className="relative z-10 animate-fade-in-up delay-300 mt-4 sm:mt-5 text-center space-y-1 pb-1">
            <div className="flex items-center gap-3 justify-center">
              <div
                style={{ backgroundColor: isDark ? "rgba(201, 174, 139, 0.2)" : "rgba(201, 174, 139, 0.4)" }}
                className="w-8 h-px"
              />
              <span
                style={{ color: isDark ? "rgba(201, 174, 139, 0.6)" : "rgba(114, 80, 57, 0.6)" }}
                className="font-mono text-[9px] uppercase tracking-[0.2em]"
              >
                tapovan · rishikesh
              </span>
              <div
                style={{ backgroundColor: isDark ? "rgba(201, 174, 139, 0.2)" : "rgba(201, 174, 139, 0.4)" }}
                className="w-8 h-px"
              />
            </div>
            <p
              style={{ color: isDark ? "rgba(243, 231, 211, 0.45)" : "rgba(114, 80, 57, 0.5)" }}
              className="font-serif italic text-[11px]"
            >
              a table worth staying at
            </p>
          </footer>
        </div>
      </main>

      {/* QR Scanner Modal */}
      {isScannerOpen && (
        <TableScannerModal
          currentTable={currentTable}
          onClose={() => setIsScannerOpen(false)}
          onSelectTable={(tableLabel) => {
            setCurrentTable(tableLabel);
            if (typeof window !== "undefined") {
              localStorage.setItem("smol_current_table", tableLabel);
            }
            setIsScannerOpen(false);
            router.push(`/t/table-${tableLabel}`);
          }}
        />
      )}
    </>
  );
}
