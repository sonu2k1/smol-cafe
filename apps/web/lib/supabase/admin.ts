import { createClient as createSupabaseClient, type SupabaseClient } from "@supabase/supabase-js";
import { MockSupabaseClient } from "@/lib/mock-db";

/**
 * Creates an admin/service-role Supabase client for backend operations
 * that require bypassing Row Level Security (RLS).
 * Falls back seamlessly to in-memory MockSupabaseClient if credentials are placeholder.
 */
const DEFAULT_FALLBACK_SERVICE_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNzaXdvY3RpdHljdnFxZXl3dW9xIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4OTI3MDc1OSwiZXhwIjoyMTA0ODQ2NzU5fQ.FHlom1_AU20prBBxNNStwDV9g_WfjA3ZgXnYDjV5wkU";

export function isMockDatabase(): boolean {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "https://csiwoctitycvqqeywuoq.supabase.co";
  const serviceRoleKey =
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    DEFAULT_FALLBACK_SERVICE_KEY;

  return (
    !supabaseUrl ||
    !serviceRoleKey ||
    supabaseUrl.includes("placeholder") ||
    serviceRoleKey.includes("placeholder") ||
    (!supabaseUrl.startsWith("http://") && !supabaseUrl.startsWith("https://"))
  );
}

export function createAdminClient(): SupabaseClient {
  const supabaseUrl =
    process.env.NEXT_PUBLIC_SUPABASE_URL || "https://csiwoctitycvqqeywuoq.supabase.co";
  const serviceRoleKey =
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    DEFAULT_FALLBACK_SERVICE_KEY;

  return createSupabaseClient(supabaseUrl, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}

