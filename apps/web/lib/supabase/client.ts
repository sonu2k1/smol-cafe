import { createBrowserClient } from "@supabase/ssr";
import type { Database } from "@smol-cafe/db";
import { MockSupabaseClient } from "@/lib/mock-db";

/**
 * Creates a typed Supabase client for use in Client Components (browser-side).
 */
export function createClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  const isPlaceholder =
    !supabaseUrl ||
    !supabaseAnonKey ||
    supabaseUrl.includes("placeholder") ||
    supabaseAnonKey.includes("placeholder") ||
    (!supabaseUrl.startsWith("http://") && !supabaseUrl.startsWith("https://"));

  if (isPlaceholder) {
    if (process.env.NODE_ENV === "production") {
      throw new Error(
        "Production Error: Missing required Supabase environment variables (NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY). Mock database fallback is disabled in production."
      );
    }
    return new MockSupabaseClient() as unknown as ReturnType<typeof createBrowserClient<Database>>;
  }

  return createBrowserClient<Database>(supabaseUrl, supabaseAnonKey);
}

