// Server-side Supabase access. Uses the secret key — NEVER import from a
// client component ("use client" files). Local-dev stopgap until Supabase
// Auth lands (then: publishable key + RLS + user sessions).

import { createClient, type SupabaseClient } from "@supabase/supabase-js";

let cached: SupabaseClient | null = null;

export function hasDb(): boolean {
  return !!(process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_KEY);
}

export function serverDb(): SupabaseClient {
  if (!cached) {
    cached = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_KEY!, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
  }
  return cached;
}
