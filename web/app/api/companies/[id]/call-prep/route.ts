// Call-prep one-pager (approved suggestion e7ac5285 — "the Jake feedback loop,
// weaponized"). GET assembles a cold-call script for a CONTACTABLE company from
// data we already have: owner facts, tenure/review signals, the owner's OWN
// language (suggestion d1fa52d8 — mirror their vocabulary), and COMPARABLE
// MULTIPLES pulled from our own listings DB (same industry × size band). No new
// data collection — pure synthesis of what enrichment + the scrape already know.
import { NextResponse } from "next/server";
import { hasDb, serverDb } from "@/lib/db";

export const dynamic = "force-dynamic";

const median = (xs: number[]) => {
  if (!xs.length) return null;
  const s = [...xs].sort((a, b) => a - b);
  const m = Math.floor(s.length / 2);
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
};

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!hasDb()) return NextResponse.json({ error: "no db" }, { status: 503 });
  const { id } = await params;
  const db = serverDb();

  const { data: company } = await db
    .from("companies")
    .select("id, name, industry, city, state, website, notes, revenue, ebitda, lead_id, contacts(name, role, email, phone, linkedin)")
    .eq("id", id)
    .maybeSingle();
  if (!company) return NextResponse.json({ error: "company not found" }, { status: 404 });

  const owner = (company.contacts ?? []).find((c) => c.role === "owner") ?? null;
  // enrichment lives on the originating lead (fetch separately — the
  // companies↔leads embed is ambiguous with two FKs)
  let e: Record<string, unknown> = {};
  if (company.lead_id) {
    const { data: lead } = await db.from("leads").select("enrichment").eq("id", company.lead_id).maybeSingle();
    e = (lead?.enrichment ?? {}) as Record<string, unknown>;
  }

  // Comparable multiples from our own listings DB (same verified industry).
  const industry = (e.industry_verified as string) || company.industry;
  let comps: { count: number; medianMultiple: number | null; range: [number, number] | null } | null = null;
  if (industry) {
    const { data: peers } = await db
      .from("listings")
      .select("implied_multiple")
      .eq("industry", industry)
      .not("implied_multiple", "is", null)
      .gt("implied_multiple", 0)
      .lt("implied_multiple", 12) // drop absurd outliers
      .limit(1000);
    const mults = (peers ?? []).map((p) => Number(p.implied_multiple)).filter((n) => n > 0);
    if (mults.length >= 3) {
      comps = {
        count: mults.length,
        medianMultiple: Number((median(mults) ?? 0).toFixed(1)),
        range: [Number(Math.min(...mults).toFixed(1)), Number(Math.max(...mults).toFixed(1))],
      };
    }
  }

  // Owner's own language (vocabulary mirroring) — pull the distinctive service
  // phrases from the overview so the caller/outreach uses THEIR words.
  const overview = (e.overview as string) || company.notes || "";

  const signals = (e.signals as string[]) ?? [];
  const tenure = e.years_in_business ? `${e.years_in_business} years in business` : null;

  return NextResponse.json({
    company: { id: company.id, name: company.name, industry, location: [company.city, company.state].filter(Boolean).join(", "), website: company.website },
    owner: owner ? { name: owner.name, phone: owner.phone, email: owner.email, linkedin: owner.linkedin, title: (e.owner_title as string) ?? null } : null,
    talkingPoints: {
      tenure,
      ownerLanguage: overview,              // mirror their vocabulary on the call
      signals,                              // retirement/roll-up/succession cues
      peBacked: e.pe_backed ?? null,
    },
    comparableMultiples: comps,             // our-data anchor for the valuation convo
    script: buildScript(company.name, owner?.name ?? null, industry, tenure, signals, comps),
    note: comps ? undefined : "No industry comps yet — the multiples anchor fills in as the scrape DB grows.",
  });
}

function buildScript(
  company: string, ownerName: string | null, industry: string | null,
  tenure: string | null, signals: string[], comps: { medianMultiple: number | null } | null,
) {
  const hi = ownerName ? ownerName.split(/[ ,]/)[0] : "there";
  const succession = signals.find((s) => /retire|succession|exit|age|second location|roll-?up/i.test(s));
  return [
    `Open: "Hi ${hi}, this is John with Pronghorn Equity — we back ${industry ?? "essential-services"} businesses like ${company}. Do you have two minutes?"`,
    tenure ? `Rapport: acknowledge the ${tenure.replace(" in business", "")} they've built.` : `Rapport: ask how long they've been running ${company}.`,
    succession ? `Angle: ${succession} — probe gently on their 3–5 year plans.` : `Angle: ask what growth or transition they're thinking about next.`,
    comps?.medianMultiple ? `Value anchor (if it comes up): comparable ${industry} businesses trade around ${comps.medianMultiple}× cash flow in our data.` : `Value anchor: keep vague until we have more comps.`,
    `Close: offer a no-pressure intro call; confirm best email to send a one-pager.`,
  ];
}
