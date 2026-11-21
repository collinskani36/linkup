import { createClient } from "@supabase/supabase-js";

const url = import.meta.env.VITE_SUPABASE_URL;
const key = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

/** False until .env has both values; the app shows a setup notice instead of crashing. */
export const isSupabaseConfigured = Boolean(url && key);

export const supabase = createClient(url ?? "http://localhost:54321", key ?? "missing-key", {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    // We use email codes (OTP), not magic links, so there is nothing to read from the URL.
    detectSessionInUrl: false,
  },
});
