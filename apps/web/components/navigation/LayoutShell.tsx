"use client";

import React from "react";
import { usePathname } from "next/navigation";
import { RoleSwitcherBar } from "@/components/navigation/RoleSwitcherBar";
import { InstallAppPrompt } from "@/components/common/InstallAppPrompt";

interface LayoutShellProps {
  children: React.ReactNode;
}

/**
 * Wraps children and conditionally renders the RoleSwitcherBar.
 * Hidden on the landing/role-selection page ("/") to keep the gateway clean.
 */
export const LayoutShell: React.FC<LayoutShellProps> = ({ children }) => {
  const pathname = usePathname();

  // The RoleSwitcherBar is an internal staff development/operations bar.
  // It must NEVER be shown to customers (not on landing "/", not on table routes "/t/...",
  // nor on customer menu, cart, orders, or bill).
  const isCustomerFacingRoute =
    pathname === "/" ||
    pathname === "/home" ||
    pathname?.startsWith("/home") ||
    pathname?.startsWith("/t/") ||
    pathname === "/t" ||
    pathname?.startsWith("/smol-menu") ||
    pathname?.startsWith("/menu") ||
    pathname?.startsWith("/orders") ||
    pathname?.startsWith("/bill") ||
    pathname?.startsWith("/cart") ||
    pathname === "/table" ||
    pathname?.startsWith("/table") ||
    pathname?.startsWith("/profile");

  const isStaffWorkspace =
    pathname?.startsWith("/kitchen") ||
    pathname?.startsWith("/admin") ||
    pathname?.startsWith("/cashier");

  const showRoleSwitcher = !isCustomerFacingRoute && isStaffWorkspace;

  // Real-time synchronization of mobile status bar color (<meta name="theme-color">)
  React.useEffect(() => {
    const updateMetaThemeColor = () => {
      const isDark = document.documentElement.classList.contains("dark");
      const targetColor = isDark ? "#151110" : "#F3E7D3";

      let meta = document.querySelector('meta[name="theme-color"]');
      if (!meta) {
        meta = document.createElement("meta");
        meta.setAttribute("name", "theme-color");
        document.head.appendChild(meta);
      }
      meta.setAttribute("content", targetColor);
    };

    updateMetaThemeColor();

    const observer = new MutationObserver(() => {
      updateMetaThemeColor();
    });

    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["class", "data-theme"],
    });

    window.addEventListener("smol_theme_changed", updateMetaThemeColor);

    return () => {
      observer.disconnect();
      window.removeEventListener("smol_theme_changed", updateMetaThemeColor);
    };
  }, []);

  return (
    <>
      {showRoleSwitcher && <RoleSwitcherBar />}
      {children}
      <InstallAppPrompt />
    </>
  );
};
