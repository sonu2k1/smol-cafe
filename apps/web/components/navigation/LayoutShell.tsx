"use client";

import React from "react";
import { usePathname } from "next/navigation";
import { RoleSwitcherBar } from "@/components/navigation/RoleSwitcherBar";

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

  return (
    <>
      {showRoleSwitcher && <RoleSwitcherBar />}
      {children}
    </>
  );
};
