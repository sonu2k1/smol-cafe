"use server";

import { redirect } from "next/navigation";
import { setStaffSessionCookie, clearStaffSessionCookie } from "@/lib/auth/rbac";

export interface StaffLoginInput {
  role: "kitchen" | "cashier" | "admin";
  pin?: string;
  password?: string;
}

export interface StaffLoginResult {
  success: boolean;
  role?: string;
  redirectTo?: string;
  message?: string;
}

export interface RoleCredential {
  role: "admin" | "cashier" | "kitchen";
  roleName: string;
  portal: string;
  pin: string;
  password?: string;
  permissions: string;
  status: string;
}

export interface RoleCredentialsMap {
  admin: RoleCredential;
  cashier: RoleCredential;
  kitchen: RoleCredential;
}

const DEFAULT_ROLE_CREDENTIALS: RoleCredentialsMap = {
  admin: {
    role: "admin",
    roleName: "Super Admin (Owner)",
    portal: "/admin",
    pin: "9900",
    password: "smol2026",
    permissions: "Full Control, Budgets, Logs",
    status: "Active",
  },
  cashier: {
    role: "cashier",
    roleName: "Cashier / Counter Staff",
    portal: "/cashier",
    pin: "4422",
    permissions: "Order Verification, Cash Settlement",
    status: "Active",
  },
  kitchen: {
    role: "kitchen",
    roleName: "Kitchen Display (Chef/Barista)",
    portal: "/kitchen",
    pin: "7711",
    permissions: "Order Queue, Prep Status Transition",
    status: "Active",
  },
};

declare global {
  var __SMOL_ROLE_CREDENTIALS__: RoleCredentialsMap | undefined;
}

function getStoredCredentials(): RoleCredentialsMap {
  if (!globalThis.__SMOL_ROLE_CREDENTIALS__) {
    globalThis.__SMOL_ROLE_CREDENTIALS__ = {
      admin: { ...DEFAULT_ROLE_CREDENTIALS.admin },
      cashier: { ...DEFAULT_ROLE_CREDENTIALS.cashier },
      kitchen: { ...DEFAULT_ROLE_CREDENTIALS.kitchen },
    };
  }
  return globalThis.__SMOL_ROLE_CREDENTIALS__;
}

/**
 * Server Action: Returns role info (without exposing PINs) for UI display.
 */
export async function getRoleCredentialsAction(): Promise<{
  success: boolean;
  credentials: RoleCredentialsMap;
}> {
  const creds = getStoredCredentials();
  // Return a sanitized copy — never expose actual PIN values to the client
  const sanitized: RoleCredentialsMap = {
    admin: { ...creds.admin, pin: "****", password: undefined },
    cashier: { ...creds.cashier, pin: "****" },
    kitchen: { ...creds.kitchen, pin: "****" },
  };
  return { success: true, credentials: sanitized };
}

/**
 * Server Action: Updates the quick PIN and/or master password for a specific role.
 */
export async function updateRoleCredentialAction(
  role: "admin" | "cashier" | "kitchen",
  newPin: string,
  newPassword?: string
): Promise<{
  success: boolean;
  credentials?: RoleCredentialsMap;
  message: string;
}> {
  const cleanPin = newPin.trim();
  if (!cleanPin || cleanPin.length < 3) {
    return { success: false, message: "PIN must be at least 3-4 digits/characters." };
  }

  const creds = getStoredCredentials();
  if (!creds[role]) {
    return { success: false, message: "Invalid role specified." };
  }

  creds[role].pin = cleanPin;
  if (role === "admin" && newPassword !== undefined && newPassword.trim().length > 0) {
    creds[role].password = newPassword.trim();
  }

  globalThis.__SMOL_ROLE_CREDENTIALS__ = creds;

  return {
    success: true,
    credentials: creds,
    message: `${creds[role].roleName} credentials updated successfully to PIN: ${cleanPin}`,
  };
}

/**
 * Server Action: Resets role credentials to factory defaults.
 */
export async function resetRoleCredentialAction(
  role?: "admin" | "cashier" | "kitchen"
): Promise<{
  success: boolean;
  credentials: RoleCredentialsMap;
  message: string;
}> {
  if (role) {
    const creds = getStoredCredentials();
    creds[role] = { ...DEFAULT_ROLE_CREDENTIALS[role] };
    globalThis.__SMOL_ROLE_CREDENTIALS__ = creds;
    return {
      success: true,
      credentials: creds,
      message: `${DEFAULT_ROLE_CREDENTIALS[role].roleName} reset to default PIN (${DEFAULT_ROLE_CREDENTIALS[role].pin}).`,
    };
  } else {
    globalThis.__SMOL_ROLE_CREDENTIALS__ = {
      admin: { ...DEFAULT_ROLE_CREDENTIALS.admin },
      cashier: { ...DEFAULT_ROLE_CREDENTIALS.cashier },
      kitchen: { ...DEFAULT_ROLE_CREDENTIALS.kitchen },
    };
    return {
      success: true,
      credentials: globalThis.__SMOL_ROLE_CREDENTIALS__,
      message: "All staff role credentials reset to default PINs.",
    };
  }
}

/**
 * Server Action: Validates role credentials and signs in staff to the backdoor portal.
 */
export async function staffBackdoorLoginAction(
  data: StaffLoginInput
): Promise<StaffLoginResult> {
  const { role, pin, password } = data;

  // Require a non-empty PIN — no bypass allowed
  if (!pin || pin.trim().length === 0) {
    return { success: false, message: "PIN is required. Please enter your station PIN." };
  }

  const creds = getStoredCredentials();
  const currentCred = creds[role];

  if (!currentCred) {
    return { success: false, message: "Unknown staff role specified." };
  }

  const trimmedPin = pin.trim();

  // Kitchen Quick Passcode
  if (role === "kitchen") {
    if (trimmedPin !== currentCred.pin) {
      return { success: false, message: "Invalid Kitchen Station PIN. Please try again." };
    }
    await setStaffSessionCookie("kitchen");
    return {
      success: true,
      role: "kitchen",
      redirectTo: "/smol-backdoor/kitchen",
      message: "Kitchen display station unlocked!",
    };
  }

  // Cashier Quick Passcode
  if (role === "cashier") {
    if (trimmedPin !== currentCred.pin) {
      return { success: false, message: "Invalid Cashier Desk PIN. Please try again." };
    }
    await setStaffSessionCookie("cashier");
    return {
      success: true,
      role: "cashier",
      redirectTo: "/smol-backdoor/cashier",
      message: "Cashier & settlement desk unlocked!",
    };
  }

  // Admin Master Passcode — PIN or master password accepted
  if (role === "admin") {
    const pinMatches = trimmedPin === currentCred.pin;
    const passMatches = password && password.trim().length > 0 && password.trim() === currentCred.password;

    if (!pinMatches && !passMatches) {
      return { success: false, message: "Invalid Admin PIN or master password. Please try again." };
    }
    await setStaffSessionCookie("admin");
    return {
      success: true,
      role: "admin",
      redirectTo: "/smol-backdoor/admin",
      message: "Admin Control Tower unlocked!",
    };
  }

  return { success: false, message: "Unknown staff role specified." };
}

/**
 * Server Action: Signs out staff and redirects to backdoor login
 */
export async function staffBackdoorLogoutAction(): Promise<void> {
  await clearStaffSessionCookie();
  redirect("/smol-backdoor");
}
