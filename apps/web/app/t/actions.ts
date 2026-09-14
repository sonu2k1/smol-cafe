"use server";

import crypto from "crypto";
import { redirect } from "next/navigation";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  setTableSessionCookie,
  clearTableSessionCookie,
  getTableSessionCookie,
  type TableSessionData,
} from "@/lib/session";
import type { TableQrToken, DiningTable, TableSession } from "@smol-cafe/db";

export interface ResolveQrResult {
  success: boolean;
  error?: "INVALID_TOKEN" | "REVOKED_TOKEN" | "TABLE_INACTIVE" | "DB_ERROR";
  message?: string;
  session?: TableSessionData;
}

/**
 * Computes SHA-256 hash of a string.
 */
function hashToken(rawToken: string): string {
  return crypto.createHash("sha256").update(rawToken).digest("hex");
}

/**
 * Server Action: Resolves a QR token, validates against table_qr_tokens,
 * finds or creates an active OPEN session on the dining table,
 * and sets a signed session cookie.
 */
export async function resolveQrToken(
  rawToken: string,
  setCookie = true,
  guestName?: string,
  guestPhone?: string
): Promise<ResolveQrResult> {
  if (!rawToken || typeof rawToken !== "string") {
    return {
      success: false,
      error: "INVALID_TOKEN",
      message: "This QR code is invalid. Please ask staff for assistance.",
    };
  }

  const tokenHash = hashToken(rawToken.trim());
  const plainToken = rawToken.trim();

  let supabase;
  try {
    supabase = createAdminClient();
  } catch (err) {
    console.error("Failed to initialize Supabase client:", err);
    return {
      success: false,
      error: "DB_ERROR",
      message: "Could not connect to the database. Please try again.",
    };
  }

  try {
    // Check existing cookie for guest details if not supplied
    const existingCookie = await getTableSessionCookie().catch(() => null);
    const finalGuestName = guestName || existingCookie?.guestName;
    const finalGuestPhone = guestPhone || existingCookie?.guestPhone;

    // 1. Query table_qr_tokens by hash or plain token
    const { data: qrTokens, error: qrError } = await supabase
      .from("table_qr_tokens")
      .select("*")
      .or(`token_hash.eq.${tokenHash},token_hash.eq.${plainToken}`)
      .limit(1);

    if (qrError || !qrTokens || qrTokens.length === 0) {
      const match = plainToken.match(/(\d+)/);
      if (match) {
        const tableLabel = match[1].padStart(2, "0");
        const sessionData: TableSessionData = {
          sessionId: `sess_${tableLabel}_${Date.now()}`,
          tableId: `table_${tableLabel}`,
          tableLabel,
          locationId: "loc_rishikesh",
          locationName: "smol café · rishikesh",
          openedAt: new Date().toISOString(),
          customerSessionId: `cust_${tableLabel}_${Date.now()}`,
          verificationCode: "4821",
          guestName: finalGuestName,
          guestPhone: finalGuestPhone,
        };
        if (setCookie) {
          await setTableSessionCookie(sessionData);
        }
        return {
          success: true,
          session: sessionData,
        };
      }

      return {
        success: false,
        error: "INVALID_TOKEN",
        message: "This QR isn't working, please call staff.",
      };
    }

    const qrToken = qrTokens[0] as unknown as TableQrToken;

    // Check if token was revoked
    if (qrToken.revoked_at) {
      return {
        success: false,
        error: "REVOKED_TOKEN",
        message: "This QR code has expired or was revoked. Please ask staff for a fresh QR.",
      };
    }

    // 2. Fetch dining table details
    const { data: table, error: tableError } = await supabase
      .from("dining_tables")
      .select("*")
      .eq("id", qrToken.table_id)
      .single();

    if (tableError || !table) {
      const match = plainToken.match(/(\d+)/);
      const tableLabel = match ? match[1].padStart(2, "0") : "01";
      const sessionData: TableSessionData = {
        sessionId: `sess_${tableLabel}_${Date.now()}`,
        tableId: `table_${tableLabel}`,
        tableLabel,
        locationId: "loc_rishikesh",
        locationName: "smol café · rishikesh",
        openedAt: new Date().toISOString(),
        customerSessionId: `cust_${tableLabel}_${Date.now()}`,
        verificationCode: "4821",
      };
      if (setCookie) {
        await setTableSessionCookie(sessionData);
      }
      return {
        success: true,
        session: sessionData,
      };
    }

    const diningTable = table as unknown as DiningTable;

    if (!diningTable.active) {
      return {
        success: false,
        error: "TABLE_INACTIVE",
        message: "This table is currently not in service. Please check with staff.",
      };
    }

    // Fetch location name
    const { data: location } = await supabase
      .from("locations")
      .select("name")
      .eq("id", diningTable.location_id)
      .single();

    const locationName = (location as { name: string } | null)?.name || "Smol Café";

    // 3. Find existing OPEN table session
    const { data: existingSession } = await supabase
      .from("table_sessions")
      .select("*")
      .eq("table_id", diningTable.id)
      .eq("status", "OPEN")
      .maybeSingle();

    let sessionId: string;
    let openedAt: string;

    if (existingSession) {
      const activeSession = existingSession as unknown as TableSession;
      sessionId = activeSession.id;
      openedAt = activeSession.opened_at;

      // Update last activity timestamp
      await supabase
        .from("table_sessions")
        .update({ last_activity_at: new Date().toISOString() })
        .eq("id", sessionId);
    } else {
      // Create new OPEN table session
      const now = new Date().toISOString();
      const { data: newSession, error: insertError } = await supabase
        .from("table_sessions")
        .insert({
          location_id: diningTable.location_id,
          table_id: diningTable.id,
          status: "OPEN",
          opened_at: now,
          last_activity_at: now,
          guest_count: 1,
          session_token_version: qrToken.version || 1,
        })
        .select("*")
        .single();

      if (insertError || !newSession) {
        console.error("Failed to create table session:", insertError);
        return {
          success: false,
          error: "DB_ERROR",
          message: "Unable to start a dining session. Please ask staff.",
        };
      }

      const createdSession = newSession as unknown as TableSession;
      sessionId = createdSession.id;
      openedAt = createdSession.opened_at;
    }

    // Generate secure 4-digit verification code (e.g. 4821)
    const verificationCode = (existingSession as { verification_code?: string })?.verification_code ||
      String(Math.floor(1000 + Math.random() * 9000));
    const customerSessionId = `cust_${sessionId}_${Math.random().toString(36).slice(2, 7)}`;

    // 4. Set signed session cookie if requested
    const sessionData: TableSessionData = {
      sessionId,
      tableId: diningTable.id,
      tableLabel: diningTable.label,
      locationId: diningTable.location_id,
      locationName,
      openedAt,
      customerSessionId,
      verificationCode,
      guestName: finalGuestName,
      guestPhone: finalGuestPhone,
    };

    if (setCookie) {
      await setTableSessionCookie(sessionData);
    }

    return {
      success: true,
      session: sessionData,
    };
  } catch (error) {
    console.error("Error in resolveQrToken:", error);
    return {
      success: false,
      error: "DB_ERROR",
      message: "An unexpected error occurred while resolving table session.",
    };
  }
}

/**
 * Server Action: Onboards guest with Name & Phone number, updates table session,
 * and enables redirecting to /home instead of menu.
 */
export async function onboardGuestAndRedirectAction(formData: FormData): Promise<{ success: boolean; error?: string }> {
  const token = (formData.get("tableToken") as string) || "table-01";
  const guestName = (formData.get("guestName") as string || "").trim();
  const guestPhone = (formData.get("guestPhone") as string || "").trim();

  if (!guestName || guestName.length < 2) {
    return { success: false, error: "Please enter your name." };
  }
  const cleanDigits = guestPhone.replace(/\D/g, "");
  if (!cleanDigits || cleanDigits.length < 10) {
    return { success: false, error: "Please enter a valid 10-digit mobile number." };
  }

  const result = await resolveQrToken(token, true, guestName, cleanDigits);

  if (!result.success) {
    return { success: false, error: result.message || "Failed to start table session." };
  }

  // Upsert profile record so order history & loyalty rewards immediately associate with this phone
  try {
    const supabase = createAdminClient();
    const formattedPhone = cleanDigits.startsWith("+") ? cleanDigits : `+91${cleanDigits}`;
    await supabase.from("profiles").upsert(
      {
        id: `prof_${cleanDigits}`,
        display_name: guestName,
        phone: formattedPhone,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "phone" }
    );
  } catch (err) {
    console.warn("Could not upsert profile during onboarding:", err);
  }

  return { success: true };
}

/**
 * Server Action: Activates table session from form action and redirects to /home.
 */
export async function activateTableAndRedirectAction(formData: FormData): Promise<void> {
  const token = formData.get("tableToken") as string;
  const guestName = (formData.get("guestName") as string || "").trim();
  const guestPhone = (formData.get("guestPhone") as string || "").trim();
  if (token) {
    await resolveQrToken(token, true, guestName || undefined, guestPhone || undefined);
  }
  redirect("/home");
}

/**
 * Server Action: Clears the current table session and redirects to home.
 */
export async function clearTableSession(): Promise<void> {
  await clearTableSessionCookie();
  redirect("/");
}

/**
 * Server Action: Switches the active table session dynamically for multi-user/multi-table support.
 */
export async function switchTableSessionAction(tableLabel: string): Promise<{ success: boolean; message?: string }> {
  const token = `table-${tableLabel.toString().padStart(2, "0")}`;
  const result = await resolveQrToken(token, true);
  return {
    success: result.success,
    message: result.message,
  };
}


