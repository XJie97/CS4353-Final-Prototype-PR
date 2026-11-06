import { createClient } from "@supabase/supabase-js";

const url = import.meta.env.VITE_SUPABASE_URL;
const key = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

export const configured = Boolean(url && key && !key.includes("YOUR_"));
export const supabase = configured ? createClient(url, key) : null;

export function db() {
  // Report missing Supabase configuration before returning the shared client.
  if (!supabase)
    throw new Error(
      "Add your Supabase URL and publishable key to .env, then restart the app.",
    );
  return supabase;
}
