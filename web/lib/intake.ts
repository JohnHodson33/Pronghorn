// Self-serve data intake engine (John 7/20 — Tom uploads a file, it lands in
// the right table). Shared by /api/intake/{upload,preview,confirm}.
//
// Flow: signed-URL upload → PREVIEW (parse + Claude column-map + dedupe →
// resolved PLAN, no writes) → CONFIRM (execute the plan, provenance stamped).
//
// HARD RULES (John):
//  - uploaded values fill BLANKS on an existing record; they never silently
//    overwrite a non-blank value — every such difference is surfaced as a
//    CONFLICT in the preview so a human decides.
//  - never invent a field: we only map to columns that exist, and only write
//    values that were in the file (+ provenance metadata).
//  - no silent bulk import: nothing writes without a confirm.
//  - provenance = uploaded_by + filename + date, on every created/filled row.
import * as XLSX from "xlsx";
import { serverDb } from "./db";
import type { SupabaseClient } from "@supabase/supabase-js";

export const INTAKE_BUCKET = "intake";
export const INTAKE_EXTENSIONS = ["csv", "tsv", "xlsx", "xls"];
export const MAX_ROWS = 5000; // v1 cap; larger files report truncation

export type RecordType = "contact" | "company" | "river_guide" | "enrichment_fill";
export type FillTarget = "contact" | "company";

// Field catalogs — the ONLY columns intake may write to (never invent a field).
type Catalog = { table: string; fields: string[]; required: string[]; numeric: string[]; boolean: string[] };
export const CATALOGS: Record<Exclude<RecordType, "enrichment_fill">, Catalog> = {
  contact: {
    table: "contacts",
    fields: ["name", "email", "phone", "linkedin", "firm", "title", "role", "notes"],
    required: ["name"],
    numeric: [],
    boolean: [],
  },
  company: {
    table: "companies",
    fields: ["name", "website", "industry", "city", "state", "revenue", "ebitda", "ebitda_type", "pe_owned", "pe_owner", "notes"],
    required: ["name"],
    numeric: ["revenue", "ebitda"],
    boolean: ["pe_owned"],
  },
  river_guide: {
    table: "river_guides",
    fields: ["full_name", "their_company", "role", "acquirer", "acquirer_pe_sponsor", "acquirer_website", "deal_year", "location_city", "location_state", "company_website", "exit_status", "industry", "source_url", "source", "notes", "deal_id"],
    required: ["full_name", "their_company"],
    numeric: ["deal_year"],
    boolean: [],
  },
};

// enrichment_fill resolves to a base table + fill-only mode
export function resolveType(rt: RecordType, fillTarget?: FillTarget): { base: Exclude<RecordType, "enrichment_fill">; fillOnly: boolean } {
  if (rt === "enrichment_fill") return { base: fillTarget ?? "contact", fillOnly: true };
  return { base: rt, fillOnly: false };
}

// ---------- parsing ----------

export type ParsedFile = { headers: string[]; rows: Record<string, string>[]; truncated: boolean };

// CSV/TSV — BOM-tolerant, quote-aware (mirrors the river-guides ingest parser).
function parseDelimited(text: string, delim: string): ParsedFile {
  text = text.replace(/^﻿/, "");
  const rows: string[][] = [];
  let cur = "", inQ = false, row: string[] = [];
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (inQ) {
      if (ch === '"') { if (text[i + 1] === '"') { cur += '"'; i++; } else inQ = false; }
      else cur += ch;
    } else if (ch === '"') inQ = true;
    else if (ch === delim) { row.push(cur); cur = ""; }
    else if (ch === "\n" || ch === "\r") {
      if (cur !== "" || row.length) { row.push(cur); rows.push(row); row = []; cur = ""; }
      if (ch === "\r" && text[i + 1] === "\n") i++;
    } else cur += ch;
  }
  if (cur !== "" || row.length) { row.push(cur); rows.push(row); }
  const header = (rows.shift() ?? []).map((h) => h.trim());
  const body = rows.filter((r) => r.some((c) => c.trim() !== ""));
  const truncated = body.length > MAX_ROWS;
  const objs = body.slice(0, MAX_ROWS).map((r) => Object.fromEntries(header.map((h, i) => [h, (r[i] ?? "").trim()])));
  return { headers: header.filter(Boolean), rows: objs, truncated };
}

export function parseFile(filename: string, buf: Buffer): ParsedFile {
  const ext = filename.split(".").pop()?.toLowerCase() ?? "";
  if (ext === "csv") return parseDelimited(buf.toString("utf8"), ",");
  if (ext === "tsv") return parseDelimited(buf.toString("utf8"), "\t");
  if (ext === "xlsx" || ext === "xls") {
    const wb = XLSX.read(buf, { type: "buffer" });
    const sheet = wb.Sheets[wb.SheetNames[0]];
    // header:1 → array-of-arrays so we control header trimming and blank rows
    const aoa = XLSX.utils.sheet_to_json<(string | number)[]>(sheet, { header: 1, blankrows: false, defval: "" });
    const header = (aoa.shift() ?? []).map((h) => String(h).trim());
    const body = aoa.filter((r) => r.some((c) => String(c).trim() !== ""));
    const truncated = body.length > MAX_ROWS;
    const rows = body.slice(0, MAX_ROWS).map((r) =>
      Object.fromEntries(header.map((h, i) => [h, String(r[i] ?? "").trim()])));
    return { headers: header.filter(Boolean), rows, truncated };
  }
  throw new Error(`unsupported file type .${ext} (allowed: ${INTAKE_EXTENSIONS.join(", ")})`);
}

// ---------- Claude column mapping (with a heuristic fallback) ----------

const HAIKU_IN = 0.8e-6, HAIKU_OUT = 4e-6; // haiku-4.5 per-token (scraper rates)

export type MappingResult = {
  record_type: RecordType;
  fill_target?: FillTarget;
  mapping: Record<string, string | null>; // ourField -> sourceHeader | null
  confidence: "high" | "medium" | "low";
  method: "claude" | "heuristic";
  notes?: string;
};

const norm = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, "");

// Deterministic fallback so intake still works with no ANTHROPIC_API_KEY.
function heuristicMap(headers: string[], hint?: RecordType): MappingResult {
  const rt: RecordType = hint && hint !== "enrichment_fill" ? hint
    : /email|first ?name|last ?name|phone|title|linkedin/i.test(headers.join(" ")) ? "contact"
    : /acquir|sponsor|guide|exited|deal.?year/i.test(headers.join(" ")) ? "river_guide"
    : "company";
  const { base } = resolveType(rt);
  const cat = CATALOGS[base];
  // header aliases per field (normalized contains)
  const ALIAS: Record<string, string[]> = {
    name: ["name", "fullname", "contact", "companyname", "business", "owner"],
    full_name: ["name", "fullname", "owner", "contact", "person"],
    email: ["email", "emailaddress", "mail"],
    phone: ["phone", "mobile", "cell", "tel", "phonenumber"],
    linkedin: ["linkedin", "linkedinurl", "li"],
    firm: ["firm", "company", "companyname", "business", "employer", "organization"],
    their_company: ["company", "companyname", "business", "firm"],
    title: ["title", "jobtitle", "position", "role"],
    role: ["role", "type"],
    website: ["website", "url", "domain", "site", "web"],
    company_website: ["website", "url", "domain", "site"],
    industry: ["industry", "vertical", "sector", "category"],
    city: ["city", "town"],
    location_city: ["city", "town"],
    state: ["state", "region", "province", "st"],
    location_state: ["state", "region", "st"],
    revenue: ["revenue", "sales", "turnover", "annualrevenue"],
    ebitda: ["ebitda", "cashflow", "sde", "profit"],
    ebitda_type: ["ebitdatype"],
    pe_owned: ["peowned", "pebacked", "sponsorowned", "institutional"],
    pe_owner: ["peowner", "sponsor", "owner", "acquirer"],
    acquirer: ["acquirer", "buyer", "consolidator", "parent"],
    acquirer_pe_sponsor: ["sponsor", "pesponsor", "pe"],
    deal_year: ["year", "dealyear", "acquiredyear"],
    exit_status: ["exitstatus", "status", "exited"],
    source_url: ["sourceurl", "source", "link"],
    source: ["source"],
    deal_id: ["dealid", "id"],
    notes: ["notes", "note", "comment", "comments", "description"],
  };
  const mapping: Record<string, string | null> = {};
  const usedHeaders = new Set<string>();
  for (const f of cat.fields) {
    const aliases = ALIAS[f] ?? [f];
    const hit = headers.find((h) => !usedHeaders.has(h) && aliases.some((a) => norm(h) === a))
      ?? headers.find((h) => !usedHeaders.has(h) && aliases.some((a) => norm(h).includes(a)));
    mapping[f] = hit ?? null;
    if (hit) usedHeaders.add(hit);
  }
  return { record_type: rt, mapping, confidence: "low", method: "heuristic", notes: "heuristic header match (no ANTHROPIC_API_KEY)" };
}

export async function mapColumns(
  parsed: ParsedFile,
  hint: RecordType | undefined,
  fillTargetHint: FillTarget | undefined,
  db: SupabaseClient,
): Promise<MappingResult> {
  const key = process.env.ANTHROPIC_API_KEY?.trim();
  if (!key) return heuristicMap(parsed.headers, hint);

  const sample = parsed.rows.slice(0, 5);
  const catalogDesc = Object.entries(CATALOGS)
    .map(([rt, c]) => `${rt} → fields: ${c.fields.join(", ")}`)
    .join("\n");
  const SYSTEM = `You map an uploaded spreadsheet to a CRM's known fields for a small-business acquisition firm. You NEVER invent fields — every mapping value must be one of the provided source headers, or null if no header fits.

Record types and their allowed fields:
${catalogDesc}
enrichment_fill → the file is UPDATES to fill blanks on EXISTING records (not new records); also return "fill_target": "contact" | "company" and map to that type's fields.

Decide the record_type from the headers/sample (respect the user hint if given). Then map each allowed field of that type to the best-fitting source header, or null.
Output JSON only: {"record_type": "...", "fill_target": "contact|company (only if enrichment_fill)", "mapping": {"<ourField>": "<sourceHeader>|null", ...}, "confidence": "high|medium|low", "notes": "one line"}`;

  const userMsg = `Source headers: ${JSON.stringify(parsed.headers)}
Sample rows: ${JSON.stringify(sample)}
${hint ? `User hint — record_type: ${hint}${fillTargetHint ? `, fill_target: ${fillTargetHint}` : ""}` : "No user hint."}`;

  let data: { content?: { text?: string }[]; usage?: { input_tokens: number; output_tokens: number } };
  try {
    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: { "x-api-key": key, "anthropic-version": "2023-06-01", "content-type": "application/json" },
      body: JSON.stringify({
        model: "claude-haiku-4-5-20251001", max_tokens: 700, system: SYSTEM,
        messages: [{ role: "user", content: userMsg }],
      }),
    });
    if (!res.ok) return heuristicMap(parsed.headers, hint);
    data = await res.json();
  } catch {
    return heuristicMap(parsed.headers, hint);
  }

  // meter the paid call (best-effort; every paid call is metered per COST-TRACKING)
  if (data.usage) {
    const cost = data.usage.input_tokens * HAIKU_IN + data.usage.output_tokens * HAIKU_OUT;
    db.from("usage_events").insert({
      service: "claude", activity: "intake_mapping",
      units: data.usage.input_tokens + data.usage.output_tokens,
      cost_usd: Number(cost.toFixed(5)), meta: { source: "intake", headers: parsed.headers.length },
    }).then(() => {}, () => {});
  }

  const text = data.content?.[0]?.text ?? "";
  const m = text.match(/\{[\s\S]*\}/);
  let out: Partial<MappingResult> = {};
  try { out = JSON.parse(m?.[0] ?? ""); } catch { return heuristicMap(parsed.headers, hint); }

  const record_type = (["contact", "company", "river_guide", "enrichment_fill"].includes(out.record_type as string)
    ? out.record_type : (hint ?? "contact")) as RecordType;
  const fill_target = (out.fill_target === "company" ? "company" : out.fill_target === "contact" ? "contact" : fillTargetHint) as FillTarget | undefined;
  const { base } = resolveType(record_type, fill_target);
  const headerSet = new Set(parsed.headers);
  // VALIDATE: keep only our-fields mapped to real source headers (never invent)
  const mapping: Record<string, string | null> = {};
  for (const f of CATALOGS[base].fields) {
    const v = (out.mapping ?? {})[f];
    mapping[f] = typeof v === "string" && headerSet.has(v) ? v : null;
  }
  const confidence = (["high", "medium", "low"].includes(out.confidence as string) ? out.confidence : "medium") as MappingResult["confidence"];
  return { record_type, fill_target, mapping, confidence, method: "claude", notes: typeof out.notes === "string" ? out.notes : undefined };
}

// ---------- value coercion ----------

function coerce(field: string, raw: string, cat: Catalog): string | number | boolean | null {
  const v = (raw ?? "").trim();
  if (v === "") return null;
  if (cat.numeric.includes(field)) {
    const n = Number(v.replace(/[$,\s]/g, ""));
    return Number.isFinite(n) ? n : null;
  }
  if (cat.boolean.includes(field)) {
    if (/^(y|yes|true|1|pe|owned|institutional)/i.test(v)) return true;
    if (/^(n|no|false|0)/i.test(v)) return false;
    return null;
  }
  return v;
}

// ---------- dedupe + plan ----------

const nkey = (s: unknown) => String(s ?? "").toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
const domain = (s: unknown) => String(s ?? "").toLowerCase().replace(/^https?:\/\//, "").replace(/^www\./, "").split("/")[0].trim();

export type RowAction = "create" | "update" | "skip";
export type PlannedRow = {
  i: number;
  action: RowAction;
  values: Record<string, string | number | boolean>; // fields we would WRITE (creates) or FILL (updates)
  matchId?: string | number;
  conflicts: { field: string; existing: unknown; uploaded: unknown }[];
  skipReason?: string;
};
export type Plan = {
  base: Exclude<RecordType, "enrichment_fill">;
  fillOnly: boolean;
  rows: PlannedRow[];
  counts: { rows: number; create: number; update: number; skip: number; conflicts: number };
};

// Load existing rows for dedupe (paginated; current tables are small).
async function loadExisting(db: SupabaseClient, base: string): Promise<Record<string, unknown>[]> {
  const cols = base === "contacts" ? "id,name,firm,email,phone,linkedin,title,role,notes"
    : base === "companies" ? "id,name,state,website,industry,city,revenue,ebitda,ebitda_type,pe_owned,pe_owner,notes"
    : "deal_id,full_name,their_company,acquirer,acquirer_pe_sponsor,deal_year,location_city,location_state,company_website,exit_status,industry,notes";
  const out: Record<string, unknown>[] = [];
  // dynamic table name defeats supabase's typed inference — use a loose builder
  const table = db.from(base) as unknown as {
    select: (c: string) => { range: (a: number, b: number) => Promise<{ data: Record<string, unknown>[] | null; error: { message: string } | null }> };
  };
  for (let from = 0; ; from += 1000) {
    const { data, error } = await table.select(cols).range(from, from + 999);
    if (error) throw new Error(error.message);
    const batch = data ?? [];
    out.push(...batch);
    if (batch.length < 1000 || out.length >= 20000) break;
  }
  return out;
}

function findMatch(base: string, vals: Record<string, unknown>, existing: Record<string, unknown>[]): Record<string, unknown> | undefined {
  if (base === "contacts") {
    const email = String(vals.email ?? "").toLowerCase().trim();
    if (email) { const hit = existing.find((e) => String(e.email ?? "").toLowerCase().trim() === email); if (hit) return hit; }
    const name = nkey(vals.name), firm = nkey(vals.firm);
    if (name) return existing.find((e) => nkey(e.name) === name && (!firm || !e.firm || nkey(e.firm) === firm));
    return undefined;
  }
  if (base === "companies") {
    const d = domain(vals.website);
    if (d) { const hit = existing.find((e) => domain(e.website) === d); if (hit) return hit; }
    const name = nkey(vals.name), st = nkey(vals.state);
    if (name) return existing.find((e) => nkey(e.name) === name && (!st || !e.state || nkey(e.state) === st));
    return undefined;
  }
  // river_guides
  const id = String(vals.deal_id ?? "").trim();
  if (id) { const hit = existing.find((e) => String(e.deal_id ?? "").trim() === id); if (hit) return hit; }
  const name = nkey(vals.full_name), co = nkey(vals.their_company);
  if (name && co) return existing.find((e) => nkey(e.full_name) === name && nkey(e.their_company) === co);
  return undefined;
}

// Build the resolved plan. No writes.
export async function buildPlan(
  db: SupabaseClient,
  parsed: ParsedFile,
  base: Exclude<RecordType, "enrichment_fill">,
  fillOnly: boolean,
  mapping: Record<string, string | null>,
): Promise<Plan> {
  const cat = CATALOGS[base];
  const existing = await loadExisting(db, cat.table);
  const rows: PlannedRow[] = [];
  const counts = { rows: parsed.rows.length, create: 0, update: 0, skip: 0, conflicts: 0 };

  parsed.rows.forEach((srcRow, i) => {
    // pull only mapped, non-empty, coerced values (never invent a field)
    const vals: Record<string, string | number | boolean> = {};
    for (const f of cat.fields) {
      const header = mapping[f];
      if (!header) continue;
      const c = coerce(f, srcRow[header] ?? "", cat);
      if (c !== null && c !== "") vals[f] = c;
    }
    // required-field guard
    const missing = cat.required.filter((r) => vals[r] == null || vals[r] === "");
    if (missing.length) {
      counts.skip++;
      rows.push({ i, action: "skip", values: vals, conflicts: [], skipReason: `missing required: ${missing.join(", ")}` });
      return;
    }

    const match = findMatch(cat.table, vals, existing);
    if (!match) {
      if (fillOnly) {
        counts.skip++;
        rows.push({ i, action: "skip", values: vals, conflicts: [], skipReason: "enrichment-fill: no existing record to enrich" });
      } else {
        counts.create++;
        rows.push({ i, action: "create", values: vals, conflicts: [] });
      }
      return;
    }

    // existing match → fill blanks only; differing non-blank = conflict (kept)
    const fill: Record<string, string | number | boolean> = {};
    const conflicts: PlannedRow["conflicts"] = [];
    for (const [f, up] of Object.entries(vals)) {
      const cur = (match as Record<string, unknown>)[f];
      const curBlank = cur == null || String(cur).trim() === "";
      if (curBlank) fill[f] = up;
      else if (nkey(cur) !== nkey(up)) conflicts.push({ field: f, existing: cur, uploaded: up });
    }
    counts.conflicts += conflicts.length;
    const idField = cat.table === "river_guides" ? "deal_id" : "id";
    if (Object.keys(fill).length === 0) {
      counts.skip++;
      rows.push({
        i, action: "skip", values: fill, matchId: (match as Record<string, unknown>)[idField] as string | number,
        conflicts, skipReason: conflicts.length ? "match found; all fields already set (see conflicts)" : "match found; nothing new to fill",
      });
    } else {
      counts.update++;
      rows.push({ i, action: "update", values: fill, matchId: (match as Record<string, unknown>)[idField] as string | number, conflicts });
    }
  });

  return { base, fillOnly, rows, counts };
}

// ---------- confirm (execute) ----------

const slug = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 40);

// river_guides has NOT NULL + enum-checked columns; normalize so an intake row
// can never violate a constraint (which would error the whole row).
const RG_INDUSTRIES = ["LANDSCAPE", "LAWN_CARE", "TREE_CARE", "POOL_SERVICES", "FENCING", "COMMERCIAL_KITCHEN_SERVICE", "PEST", "OTHER"];
function rgIndustry(v: unknown): string {
  const s = String(v ?? "").toUpperCase().replace(/[^A-Z]+/g, "_");
  if (RG_INDUSTRIES.includes(s)) return s;
  const l = String(v ?? "").toLowerCase();
  if (/tree/.test(l)) return "TREE_CARE";
  if (/lawn/.test(l)) return "LAWN_CARE";
  if (/landscap|resi/.test(l)) return "LANDSCAPE";
  if (/pool/.test(l)) return "POOL_SERVICES";
  if (/fenc/.test(l)) return "FENCING";
  if (/pest/.test(l)) return "PEST";
  return "OTHER";
}
function normalizeRiverGuideCreate(row: Record<string, unknown>) {
  row.industry = rgIndustry(row.industry);
  const exit = String(row.exit_status ?? "").toUpperCase();
  row.exit_status = ["EXITED", "EMPLOYED", "UNKNOWN"].includes(exit) ? exit : "UNKNOWN";
  // enum-or-null columns: drop anything that wouldn't validate
  if (row.company_website_status && !["LIVE", "REDIRECTS", "DEFUNCT", "NOT_FOUND"].includes(String(row.company_website_status).toUpperCase())) delete row.company_website_status;
  const conf = String(row.source_confidence ?? "").toUpperCase();
  row.source_confidence = ["HIGH", "MEDIUM", "LOW"].includes(conf) ? conf : null;
  row.name_status = "RESOLVED";
  row.enrichment_status = row.enrichment_status ?? "PENDING_T1";
}

export async function executePlan(
  db: SupabaseClient,
  plan: Plan,
  provenance: { uploaded_by: string; filename: string },
): Promise<{ created: number; updated: number; skipped: number; errors: number; errorSamples: string[] }> {
  const cat = CATALOGS[plan.base];
  const stamp = `[intake: ${provenance.filename} by ${provenance.uploaded_by} on ${new Date().toISOString().slice(0, 10)}]`;
  const idField = cat.table === "river_guides" ? "deal_id" : "id";
  const res = { created: 0, updated: 0, skipped: 0, errors: 0, errorSamples: [] as string[] };

  for (const r of plan.rows) {
    if (r.action === "skip") { res.skipped++; continue; }
    try {
      if (r.action === "create") {
        const row: Record<string, unknown> = { ...r.values };
        // provenance: origin + a notes line (never clobbers a mapped notes value)
        if (cat.table === "contacts" || cat.table === "companies") row.origin = "intake";
        row.notes = [r.values.notes, stamp].filter(Boolean).join(" ");
        if (cat.table === "river_guides") {
          if (!row.deal_id) row.deal_id = `INTAKE-${slug(String(r.values.full_name))}-${slug(String(r.values.their_company))}`;
          normalizeRiverGuideCreate(row);
          const { error } = await db.from("river_guides").upsert(row, { onConflict: "deal_id" });
          if (error) throw error;
        } else {
          const { error } = await db.from(cat.table).insert(row);
          if (error) throw error;
        }
        res.created++;
      } else {
        // update: fill blank data fields + append the provenance stamp once
        const patch: Record<string, unknown> = {};
        for (const [f, v] of Object.entries(r.values)) if (f !== "notes") patch[f] = v;
        const { data: cur } = await db.from(cat.table).select("notes").eq(idField, r.matchId!).maybeSingle();
        const curNotes = String((cur as { notes?: string } | null)?.notes ?? "").trim();
        const filledNote = typeof r.values.notes === "string" ? r.values.notes : "";
        const parts = [curNotes, filledNote].filter(Boolean);
        if (!parts.join(" ").includes(stamp)) parts.push(stamp);
        patch.notes = parts.join(" ");
        const { error } = await db.from(cat.table).update(patch).eq(idField, r.matchId!);
        if (error) throw error;
        res.updated++;
      }
    } catch (e) {
      res.errors++;
      if (res.errorSamples.length < 5) res.errorSamples.push(`row ${r.i + 1}: ${(e as Error).message}`);
    }
  }
  return res;
}

// convenience for the routes
export { serverDb };
