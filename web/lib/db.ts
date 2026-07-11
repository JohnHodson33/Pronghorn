// Server-side Supabase access. Uses the secret key — NEVER import from a
// client component ("use client" files). Local-dev stopgap until Supabase
// Auth lands (then: publishable key + RLS + user sessions).

import { createClient, type SupabaseClient } from "@supabase/supabase-js";

let cached: SupabaseClient | null = null;

// Env values set via `vercel env add` (piped) can carry a trailing newline —
// trim so a stray \n never corrupts the URL/key and breaks the client.
const url = process.env.SUPABASE_URL?.trim();
const key = process.env.SUPABASE_SERVICE_KEY?.trim();

export function hasDb(): boolean {
  return !!(url && key);
}

export function serverDb(): SupabaseClient {
  if (!cached) {
    if (!url || !key) throw new Error("SUPABASE_URL / SUPABASE_SERVICE_KEY not set");
    cached = createClient(url, key, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
  }
  return cached;
}
