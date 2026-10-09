import { createClient, type SupabaseClient } from '@supabase/supabase-js';

let instance: SupabaseClient | null = null;

export function getSupabase(): SupabaseClient {
  const url = import.meta.env.VITE_SUPABASE_URL;
  const key = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;
  if (!url || !key || url.includes('YOUR-PROJECT') || key.includes('REPLACE_ME')) {
    throw new Error('Online-Spiel ist noch nicht konfiguriert. Bitte die öffentlichen Supabase-Werte in .env.local setzen.');
  }
  // POC RPCs grant EXECUTE to anon, not authenticated. Do not import SPP auth here.
  if (!instance) instance = createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
  });
  return instance;
}
