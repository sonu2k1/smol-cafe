"use client";

import React, { useState, useEffect } from "react";
import { Sun, Moon } from "lucide-react";

interface ThemeToggleProps {
  variant?: "pill" | "icon" | "minimal";
  className?: string;
}

export const ThemeToggle: React.FC<ThemeToggleProps> = ({
  variant = "pill",
  className = "",
}) => {
  const [isDark, setIsDark] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    const saved = localStorage.getItem("smol_theme");
    const active =
      saved === "night" ||
      saved === "dark" ||
      (!saved && document.documentElement.classList.contains("dark"));

    setIsDark(active);
    applyTheme(active);

    const handleCustomChange = (e: Event) => {
      const customEvent = e as CustomEvent<boolean>;
      if (typeof customEvent.detail === "boolean") {
        setIsDark(customEvent.detail);
      }
    };

    window.addEventListener("smol_theme_changed", handleCustomChange);
    return () => window.removeEventListener("smol_theme_changed", handleCustomChange);
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
    window.dispatchEvent(new CustomEvent("smol_theme_changed", { detail: next }));
  };

  if (!mounted) {
    return (
      <div
        className={`h-8 w-16 rounded-full border border-stone-700/50 bg-stone-800/40 opacity-0 ${className}`}
      />
    );
  }

  if (variant === "icon") {
    return (
      <button
        type="button"
        onClick={toggleTheme}
        className={`flex h-8 w-8 items-center justify-center rounded-full border transition cursor-pointer ${
          isDark
            ? "border-stone-700 bg-[#241F1C] text-[#F2C84B] hover:text-white hover:border-stone-600"
            : "border-[#C9AE8B]/50 bg-[#FAF4EB] text-[#B72E35] hover:text-[#241F1C] hover:border-[#B72E35]/40"
        } ${className}`}
        title={isDark ? "Switch to Light Mode" : "Switch to Dark Mode"}
        aria-label="Toggle theme"
      >
        {isDark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
      </button>
    );
  }

  return (
    <button
      type="button"
      onClick={toggleTheme}
      className={`flex items-center gap-1.5 rounded-full border px-3 py-1 font-mono text-xs transition cursor-pointer select-none shadow-xs active:scale-95 ${
        isDark
          ? "border-stone-700 bg-[#241F1C] text-[#F2C84B] hover:bg-stone-800/80 hover:text-white"
          : "border-[#C9AE8B]/50 bg-[#FAF4EB] text-[#725039] hover:bg-[#F3E7D3] hover:text-[#241F1C]"
      } ${className}`}
      title={isDark ? "Switch to Light Mode" : "Switch to Dark Mode"}
      aria-label="Toggle theme"
    >
      {isDark ? (
        <>
          <Sun className="h-3.5 w-3.5 text-[#F2C84B]" />
          <span className="font-semibold">Light</span>
        </>
      ) : (
        <>
          <Moon className="h-3.5 w-3.5 text-[#B72E35]" />
          <span className="font-semibold">Dark</span>
        </>
      )}
    </button>
  );
};
