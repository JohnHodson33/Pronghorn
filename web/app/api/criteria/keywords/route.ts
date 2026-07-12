// Keyword generation for Scrape Criteria (John 7/12: LinkedIn-search style —
// he types an industry, we generate the keyword set as removable tag chips;
// he prunes, never brainstorms). POST { industry } → { include, exclude }.
import { NextResponse } from "next/server";
import { hasDb } from "@/lib/db";

export const dynamic = "force-dynamic";

const SYSTEM = `You generate scrape-screening keyword sets for a small-business acquisition firm's broker-listing tiering engine. Given an industry/service phrase, output the terms that catch listings in that business (include) and the near-miss terms that cause false positives (exclude — e.g. retail/supply/equipment-dealer variants of a services industry, franchises-for-sale of a different kind, or unrelated industries whose names collide).

Rules: lowercase, 1-3 words per term, 8-15 include terms, 3-8 exclude terms, no duplicates, terms a broker listing title/description would actually contain.
Output JSON only: {"include": ["...", ...], "exclude": ["...", ...]}`;

export async function POST(req: Request) {
  if (!hasDb()) return NextResponse.json({ error: "no db" }, { status: 503 });
  const { industry } = await req.json();
  if (!industry || typeof industry !== "string") {
    return NextResponse.json({ error: "industry required" }, { status: 400 });
  }
  const key = process.env.ANTHROPIC_API_KEY;
  if (!key) {
    return NextResponse.json({ error: "ANTHROPIC_API_KEY not set in web env — John adds it (Vercel + web/.env.local) to enable keyword generation" }, { status: 503 });
  }
  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: { "x-api-key": key, "anthropic-version": "2023-06-01", "content-type": "application/json" },
    body: JSON.stringify({
      model: "claude-haiku-4-5-20251001", max_tokens: 400, system: SYSTEM,
      messages: [{ role: "user", content: industry.slice(0, 200) }],
    }),
  });
  if (!res.ok) return NextResponse.json({ error: `Claude API ${res.status}` }, { status: 502 });
  const data = await res.json();
  const m = (data.content?.[0]?.text ?? "").match(/\{[\s\S]*\}/);
  try {
    const out = JSON.parse(m?.[0] ?? "");
    return NextResponse.json({ industry, include: out.include ?? [], exclude: out.exclude ?? [] });
  } catch {
    return NextResponse.json({ error: "unparseable keyword output" }, { status: 502 });
  }
}
