// Meeting-note tag suggestions (John 7/13 — "paste a link and confirm tags in
// two clicks"). Deterministic name-matching against companies/contacts/deals:
// transparent, free, and instant — the Claude-confidence path belongs to Lane
// C's Notion sweep; this serves the interactive "+ Add note" UI.
//
// POST { text?, notionUrl? } →
//   { text, source?, suggestions: [{ kind, id, label, sub, confidence, reason }] }
// When only a Notion URL is given, the page text is fetched via NOTION_TOKEN;
// without the token we degrade with an explicit ask-for-paste message.
import { NextResponse } from "next/server";
import { hasDb, serverDb } from "@/lib/db";

export const dynamic = "force-dynamic";

type Suggestion = {
  kind: "company" | "contact" | "deal";
  id: string;
  label: string;
  sub: string;
  confidence: "high" | "medium";
  reason: string;
};

const STOPWORDS = new Set([
  "the", "and", "of", "for", "inc", "llc", "ltd", "corp", "company", "co",
  "services", "service", "group", "management", "solutions", "care", "llp",
]);

const norm = (s: string) => s.toLowerCase().replace(/[^a-z0-9 ]+/g, " ").replace(/\s+/g, " ").trim();

// name → confidence against the normalized note text, or null when no match
function match(name: string, text: string): { confidence: "high" | "medium"; reason: string } | null {
  const n = norm(name);
  if (n.length < 4) return null;
  if (text.includes(` ${n} `)) return { confidence: "high", reason: "full name appears in the note" };
  const tokens = n.split(" ").filter((t) => t.length >= 3 && !STOPWORDS.has(t));
  if (!tokens.length) return null;
  const hits = tokens.filter((t) => text.includes(` ${t} `) || text.includes(` ${t}s `));
  if (tokens.length >= 2 && hits.length === tokens.length)
    return { confidence: "medium", reason: `all name words appear (${hits.join(", ")})` };
  if (tokens.length === 1 && tokens[0].length >= 5 && hits.length === 1)
    return { confidence: "medium", reason: `"${hits[0]}" appears in the note` };
  return null;
}

// Notion page → plain text (top-level blocks are enough for tagging)
async function fetchNotionText(url: string): Promise<{ text?: string; error?: string }> {
  const token = process.env.NOTION_TOKEN?.trim();
  if (!token)
    return { error: "Notion fetch needs NOTION_TOKEN in the web env — paste the note text below instead (the link still saves with the note)." };
  const idMatch = url.replace(/[?#].*$/, "").match(/([0-9a-f]{32})|([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})/i);
  if (!idMatch) return { error: "That doesn't look like a Notion page link — paste the note text instead." };
  const pageId = idMatch[0].replace(/-/g, "");
  const res = await fetch(`https://api.notion.com/v1/blocks/${pageId}/children?page_size=100`, {
    headers: { Authorization: `Bearer ${token}`, "Notion-Version": "2022-06-28" },
  });
  if (!res.ok)
    return { error: `Notion API ${res.status} — is the page shared with the integration? Paste the text instead.` };
  const j = (await res.json()) as { results?: { [k: string]: { rich_text?: { plain_text: string }[] } & unknown }[] };
  const text = (j.results ?? [])
    .map((b) => {
      const block = Object.values(b).find((v) => v && typeof v === "object" && Array.isArray((v as { rich_text?: unknown }).rich_text));
      return ((block as { rich_text: { plain_text: string }[] } | undefined)?.rich_text ?? []).map((r) => r.plain_text).join("");
    })
    .filter(Boolean)
    .join("\n");
  return text ? { text } : { error: "The Notion page came back empty — paste the note text instead." };
}

export async function POST(req: Request) {
  if (!hasDb()) return NextResponse.json({ error: "no db" }, { status: 503 });
  const b = await req.json().catch(() => ({}));
  let text = String(b.text ?? "").trim();
  let source: string | undefined;

  if (!text && b.notionUrl) {
    const fetched = await fetchNotionText(String(b.notionUrl));
    if (fetched.error) return NextResponse.json({ error: fetched.error }, { status: 200 });
    text = fetched.text!;
    source = "notion";
  }
  if (!text) return NextResponse.json({ error: "paste note text or a Notion link" }, { status: 400 });

  const db = serverDb();
  const [companies, contacts, deals] = await Promise.all([
    db.from("companies").select("id, name, industry, city, state").limit(1000),
    db.from("contacts").select("id, name, role, companies(name)").limit(1000),
    db.from("deals").select("id, name, stage").limit(500),
  ]);

  const haystack = ` ${norm(text)} `;
  const suggestions: Suggestion[] = [];

  for (const c of companies.data ?? []) {
    const m = c.name && match(c.name, haystack);
    if (m) suggestions.push({
      kind: "company", id: c.id, label: c.name,
      sub: [c.industry, [c.city, c.state].filter(Boolean).join(", ")].filter(Boolean).join(" · "),
      ...m,
    });
  }
  for (const p of contacts.data ?? []) {
    const m = p.name && match(p.name, haystack);
    const co = Array.isArray(p.companies) ? p.companies[0] : p.companies;
    if (m) suggestions.push({
      kind: "contact", id: p.id, label: p.name!,
      sub: [p.role, (co as { name: string } | null)?.name].filter(Boolean).join(" · "),
      ...m,
    });
  }
  for (const d of deals.data ?? []) {
    const m = d.name && match(d.name, haystack);
    if (m) suggestions.push({ kind: "deal", id: d.id, label: d.name, sub: d.stage, ...m });
  }

  // a generically-named record ("Tree Care") shouldn't ride along when its
  // name is contained in a longer match ("Sage Tree Care") of the same kind
  const kept = suggestions.filter((s) => {
    const n = norm(s.label);
    return !suggestions.some((o) => o !== s && o.kind === s.kind && norm(o.label) !== n && norm(o.label).includes(n));
  });
  kept.sort((a, z) => (a.confidence === z.confidence ? 0 : a.confidence === "high" ? -1 : 1));
  return NextResponse.json({ text, source, suggestions: kept.slice(0, 10) });
}
