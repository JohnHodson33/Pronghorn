// Read/update the default screen profile. Server-side only.
// NOTE: no auth yet (local dev) — Supabase Auth gates this before Vercel deploy.

import { NextResponse } from "next/server";
import { hasDb, serverDb } from "@/lib/db";

export async function GET() {
  if (!hasDb()) return NextResponse.json({ error: "no db" }, { status: 503 });
  const { data, error } = await serverDb()
    .from("screen_profiles")
    .select("*")
    .eq("is_default", true)
    .limit(1)
    .single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}

export async function PUT(req: Request) {
  if (!hasDb()) return NextResponse.json({ error: "no db" }, { status: 503 });
  const body = await req.json();

  const allowed = [
    "industry_keywords_include", "industry_keywords_exclude",
    "include_states", "exclude_states", "priority_states",
    "min_asking_price", "max_asking_price", "min_cash_flow", "max_cash_flow",
    "unknown_cash_flow_min_asking_price", "keep_when_unknown", "max_multiple_flag",
  ] as const;
  const patch: Record<string, unknown> = { updated_at: new Date().toISOString() };
  for (const k of allowed) if (k in body) patch[k] = body[k];

  const { data, error } = await serverDb()
    .from("screen_profiles")
    .update(patch)
    .eq("id", body.id)
    .select()
    .single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}
