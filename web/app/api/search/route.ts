// Global search across companies, contacts, deals, and listings.
// Small grouped result sets, ilike matching — fast enough at this scale.
import { NextResponse } from "next/server";
import { hasDb, serverDb } from "@/lib/db";

export type SearchHit = { id: string; label: string; sub: string; href: string };

export async function GET(req: Request) {
  if (!hasDb()) return NextResponse.json({ error: "no db" }, { status: 503 });
  const q = new URL(req.url).searchParams.get("q")?.trim() ?? "";
  if (q.length < 2) return NextResponse.json({ companies: [], contacts: [], deals: [], listings: [] });

  const db = serverDb();
  const like = `%${q}%`;

  const [companies, contacts, deals, listings] = await Promise.all([
    db
      .from("companies")
      .select("id, name, industry, city, state")
      .or(`name.ilike.${like},industry.ilike.${like},city.ilike.${like}`)
      .limit(5),
    db
      .from("contacts")
      .select("id, name, role, email, company_id, companies(name)")
      .or(`name.ilike.${like},email.ilike.${like}`)
      .limit(5),
    db.from("deals").select("id, name, stage").ilike("name", like).limit(5),
    db
      .from("listings")
      .select("id, name, industry, city, state, tier")
      .is("duplicate_of", null)
      .ilike("name", like)
      .order("tier", { ascending: true, nullsFirst: false })
      .limit(8),
  ]);

  const hits = {
    companies: (companies.data ?? []).map((c) => ({
      id: c.id,
      label: c.name,
      sub: [c.industry, [c.city, c.state].filter(Boolean).join(", ")].filter(Boolean).join(" · "),
      href: `/companies/${c.id}`,
    })),
    contacts: ((contacts.data ?? []) as {
      id: string; name: string | null; role: string | null; email: string | null;
      company_id: string | null; companies: { name: string } | { name: string }[] | null;
    }[]).map((p) => {
      const co = Array.isArray(p.companies) ? p.companies[0] : p.companies;
      return {
        id: p.id,
        label: p.name ?? p.email ?? "(unnamed)",
        sub: [p.role, co?.name].filter(Boolean).join(" · "),
        href: p.company_id ? `/companies/${p.company_id}` : "/contacts",
      };
    }),
    deals: (deals.data ?? []).map((d) => ({
      id: d.id,
      label: d.name,
      sub: d.stage,
      href: `/deals/${d.id}`,
    })),
    listings: (listings.data ?? []).map((l) => ({
      id: l.id,
      label: l.name ?? "(unnamed)",
      sub: [l.tier ? `Tier ${l.tier}` : null, l.industry, [l.city, l.state].filter(Boolean).join(", ")]
        .filter(Boolean)
        .join(" · "),
      href: `/listings/${l.id}`,
    })),
  };
  return NextResponse.json(hits);
}
