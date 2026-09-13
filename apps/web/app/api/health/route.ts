import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

/**
 * Health check endpoint for uptime monitors and client graceful degradation probes.
 */
export async function GET() {
  const timestamp = new Date().toISOString();
  const supabase = createAdminClient();

  try {
    const startTime = performance.now();
    // Quick query to check database connectivity
    const { error } = await supabase.from("locations").select("id").limit(1);
    const dbLatencyMs = Math.round(performance.now() - startTime);

    if (error) {
      console.warn("Health check DB query error:", error);
      return NextResponse.json(
        {
          status: "degraded",
          dbConnected: false,
          dbLatencyMs,
          timestamp,
          message: "Database connection degraded.",
        },
        { status: 503 }
      );
    }

    return NextResponse.json(
      {
        status: "ok",
        dbConnected: true,
        dbLatencyMs,
        environment: process.env.NODE_ENV || "development",
        paymentEngine: "direct_upi",
        upiVpa: process.env.NEXT_PUBLIC_UPI_ID || "sanidhyadwivedi2004@okicici",
        timestamp,
        version: "0.1.0",
      },
      { status: 200 }
    );
  } catch (err) {
    console.error("Health check unexpected error:", err);
    return NextResponse.json(
      {
        status: "offline",
        dbConnected: false,
        timestamp,
        message: "Backend unreachable.",
      },
      { status: 503 }
    );
  }
}
