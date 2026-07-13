// Outreach draft rules (John 7/13 — "too broad… I don't trust to click
// send"). Drafting is allowlist-only: auto_draft_owners.js drafts a lead ONLY
// when an enabled rule matches. Zero rules = zero drafts, pre- and post-0013.
//
// GET    → { rules, note? }   (note explains the 0013 degrade)
// POST   { name?, industries[], states[], minCompleteness?, nightlyCap? }
// PATCH  { id, enabled }      → toggle a rule
// DELETE ?id=                 → remove a rule
import { NextResponse } from "next/server";
import { hasDb, serverDb } from "@/lib/db";

export const dynamic = "force-dynamic";

const APPLY_NOTE = "outreach_rules table not present — rules save once migration 0013 is applied (until then the drafter is inert: zero rules = zero drafts)";

export async function GET() {
  if (!hasDb()) return NextResponse.json({ error: "no db", rules: [] }, { status: 200 });
  const { data, error } = await serverDb()
    .from("outreach_rules")
    .select("id, name, enabled, industries, states, min_completeness, min_size_tier, nightly_cap, created_at")
    .order("created_at", { ascending: true });
  if (error) return NextResponse.json({ rules: [], note: APPLY_NOTE });
  return NextResponse.json({ rules: data });
}

export async function POST(req: Request) {
  if (!hasDb()) return NextResponse.json({ error: "no db" }, { status: 503 });
  const b = await req.json().catch(() => ({}));
  const industries: string[] = Array.isArray(b.industries) ? b.industries.filter(Boolean) : [];
  const states: string[] = Array.isArray(b.states) ? b.states.filter(Boolean) : [];
  if (!industries.length)
    return NextResponse.json({ error: "pick at least one industry — rules are allowlists, an empty rule would match nothing" }, { status: 400 });
  const minCompleteness = ["contactable", "full"].includes(b.minCompleteness) ? b.minCompleteness : "contactable";
  const nightlyCap = Math.min(Math.max(Number(b.nightlyCap) || 5, 1), 50);
  const name = String(b.name ?? "").trim() ||
    `${industries.join("+")} · ${states.length ? states.join("+") : "any state"} · ${minCompleteness} · cap ${nightlyCap}`;

  const { data, error } = await serverDb()
    .from("outreach_rules")
    .insert({ name, industries, states, min_completeness: minCompleteness, nightly_cap: nightlyCap })
    .select("id")
    .single();
  if (error) return NextResponse.json({ error: `${error.message} — apply migration 0013` }, { status: 503 });
  return NextResponse.json({ ok: true, id: data.id, name });
}

export async function PATCH(req: Request) {
  if (!hasDb()) return NextResponse.json({ error: "no db" }, { status: 503 });
  const b = await req.json().catch(() => ({}));
  if (!b.id || typeof b.enabled !== "boolean")
    return NextResponse.json({ error: "id and enabled required" }, { status: 400 });
  const { error } = await serverDb().from("outreach_rules").update({ enabled: b.enabled }).eq("id", b.id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}

export async function DELETE(req: Request) {
  if (!hasDb()) return NextResponse.json({ error: "no db" }, { status: 503 });
  const id = new URL(req.url).searchParams.get("id");
  if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });
  const { error } = await serverDb().from("outreach_rules").delete().eq("id", id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
