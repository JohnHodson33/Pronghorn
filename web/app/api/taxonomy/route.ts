// Industry taxonomy for the list-build typeahead (ENRICHMENT-UX §1).
// DB-backed once migration 0008 lands; identical hardcoded seed until then so
// Lane B can ship the typeahead TODAY. Geography stays static/client-side.
import { NextResponse } from "next/server";
import { hasDb, serverDb } from "@/lib/db";

export const dynamic = "force-dynamic";

const SEED = [
  { id: "pest-control", label: "Pest Control", aliases: ["pest", "exterminator", "termite", "wildlife control"], thesis_core: true },
  { id: "tree-care", label: "Tree Care", aliases: ["tree service", "arborist", "tree removal", "tree surgery"], thesis_core: true },
  { id: "landscaping", label: "Landscaping", aliases: ["landscape", "landscaping services", "hardscape"], thesis_core: true },
  { id: "lawn-care", label: "Lawn Care", aliases: ["chemical lawn", "lawn maintenance", "fertilization", "mowing"], thesis_core: true },
  { id: "lake-pond-management", label: "Lake/Pond Management", aliases: ["lake management", "pond", "aquatic", "water management"], thesis_core: true },
  { id: "pool-services", label: "Pool Services", aliases: ["pool", "pool cleaning", "pool maintenance", "pool repair"], thesis_core: true },
  { id: "irrigation", label: "Irrigation", aliases: ["sprinkler", "irrigation systems"], thesis_core: true },
  { id: "hvac", label: "HVAC", aliases: ["heating", "cooling", "air conditioning", "ac repair", "a/c"], thesis_core: false },
  { id: "plumbing", label: "Plumbing", aliases: ["plumber", "drain", "water heater"], thesis_core: false },
  { id: "electrical", label: "Electrical", aliases: ["electrician", "electrical contractor"], thesis_core: false },
  { id: "roofing", label: "Roofing", aliases: ["roofer", "roof repair", "roof replacement"], thesis_core: false },
  { id: "windows-doors", label: "Windows & Doors", aliases: ["window replacement", "door installation"], thesis_core: false },
  { id: "cleaning-janitorial", label: "Cleaning/Janitorial", aliases: ["janitorial", "commercial cleaning", "maid"], thesis_core: false },
  { id: "restoration", label: "Restoration", aliases: ["water damage", "fire damage", "mold remediation"], thesis_core: false },
  { id: "property-maintenance", label: "Property Maintenance", aliases: ["handyman", "facilities", "building maintenance"], thesis_core: false },
];

export async function GET() {
  if (hasDb()) {
    const { data, error } = await serverDb().from("industry_taxonomy").select("id, label, aliases, thesis_core").order("thesis_core", { ascending: false });
    if (!error && data?.length) return NextResponse.json({ industries: data, source: "db" });
  }
  return NextResponse.json({ industries: SEED, source: "seed (apply migration 0008 to edit in DB)" });
}

// Add a new industry as a first-class subsector chip (John 7/13: type one
// industry name on the criteria page, agents brainstorm the keywords — the
// new subsector persists here so it survives reloads and the enrichment
// classifier can snap to it).
export async function POST(req: Request) {
  if (!hasDb()) return NextResponse.json({ error: "no db — apply migration 0008" }, { status: 503 });
  const b = await req.json();
  const label = String(b.label ?? "").trim();
  if (!label) return NextResponse.json({ error: "label required" }, { status: 400 });
  const id = label.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
  const aliases: string[] = Array.isArray(b.aliases)
    ? b.aliases.map((a: unknown) => String(a).trim()).filter((a: string) => a && a.toLowerCase() !== label.toLowerCase())
    : [];
  const row = { id, label, aliases, thesis_core: !!b.thesis_core };
  const { data, error } = await serverDb().from("industry_taxonomy")
    .upsert(row, { onConflict: "id" }).select("id, label, aliases, thesis_core").single();
  if (error) return NextResponse.json({ error: `${error.message} — apply migration 0008` }, { status: 503 });
  return NextResponse.json({ ok: true, industry: data });
}
