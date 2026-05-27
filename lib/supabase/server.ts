import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";
import type { CookieOptions } from "@supabase/ssr";
import { getSupabasePublicConfig } from "@/lib/supabase/config";

export async function createServerSupabaseClient() {
  const config = getSupabasePublicConfig();

  if (!config) {
    throw new Error("Supabase public environment variables are not configured.");
  }

  const cookieStore = await cookies();

  return createServerClient(config.url, config.anonKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet: { name: string; value: string; options: CookieOptions }[]) {
        try {
          cookiesToSet.forEach(({ name, value, options }) => cookieStore.set(name, value, options));
        } catch {
          // Server Components cannot always set cookies; route handlers can.
        }
      },
    },
  });
}
