import { createClient, type SupabaseClient } from "@supabase/supabase-js";

// Read-only connection to the CRM Supabase project
// Lazy init so the app builds without env vars set
let _client: SupabaseClient | null = null;

export function getSupabase(): SupabaseClient | null {
  if (_client) return _client;
  const url = process.env.CRM_SUPABASE_URL;
  const key = process.env.CRM_SUPABASE_ANON_KEY;
  if (!url || !key) return null;
  _client = createClient(url, key);
  return _client;
}
