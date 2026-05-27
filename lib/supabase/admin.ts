import { createClient } from "@supabase/supabase-js";
import { getSupabaseAdminConfig } from "@/lib/supabase/config";

export function createAdminClient() {
  const config = getSupabaseAdminConfig();

  if (!config) {
    throw new Error("Supabase admin environment variables are not configured.");
  }

  return createClient(config.url, config.serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}
