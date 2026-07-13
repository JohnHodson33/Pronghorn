// In-site feedback pipeline (IMPROVEMENTS-LOOP.md). Tom/John submit from the
// site; agents poll status='submitted' each loop and triage into TASK-QUEUE.
//
// GET  [?status=]        → feedback items (newest first)
// POST { author, type, page, body }  → create (status 'submitted')
// PATCH { id, status, lane?, task_ref?, shipped_ref? }  → lifecycle update
// Degrades with apply-0010 note until the migration lands.
import { NextResponse } from "next/server";
import { hasDb, serverDb } from "@/lib/db";

export const dynamic = "force-dynamic";

// 'suggestion' rows are AGENT-generated improvement ideas (the platform
// "brain", John 7/12): they start at status 'suggested'; John/Tom approve
// (→ 'approved' = build it, top-of-lane) or decline. No schema change —
// 0010's columns are plain text; these arrays are the only gate.
const TYPES = ["bug", "idea", "change", "suggestion"];
const STATUSES = ["submitted", "triaged", "building", "shipped", "verified", "suggested", "approved", "declined"];

export async function GET(req: Request) {
  if (!hasDb()) return NextResponse.json({ error: "no db" }, { status: 503 });
  const url = new URL(req.url);
  // reply_pending + comment counts land with 0011 — retry without them until applied
  const build = (withThread: boolean) => {
    let q = serverDb().from("feedback")
      .select(
        "id, created_at, author, type, page, body, status, lane, task_ref, shipped_ref, updated_at" +
          (withThread ? ", reply_pending, feedback_comments(count)" : "")
      )
      .order("created_at", { ascending: false }).limit(200);
    const status = url.searchParams.get("status");
    if (status) q = q.eq("status", status);
    return q;
  };
  let res = await build(true);
  if (res.error) res = await build(false);
  // two select shapes defeat supabase's inference — cast like lib/crm.ts does
  const data = res.data as unknown as ({ status: string } & Record<string, unknown>)[] | null;
  const error = res.error;
  if (error) return NextResponse.json({ error: `${error.message} — apply migration 0010`, items: [] }, { status: 200 });
  const counts = STATUSES.reduce<Record<string, number>>((a, s) => { a[s] = (data ?? []).filter((r) => r.status === s).length; return a; }, {});
  return NextResponse.json({ items: data, counts });
}

export async function POST(req: Request) {
  if (!hasDb()) return NextResponse.json({ error: "no db" }, { status: 503 });
  const b = await req.json();
  const body = String(b.body ?? "").trim();
  const author = String(b.author ?? "").trim();
  if (!body) return NextResponse.json({ error: "body required" }, { status: 400 });
  const type = TYPES.includes(b.type) ? b.type : "idea";
  // Humans submit feedback; agents submit 'suggestion' rows (author "Agent — <lane>").
  const isAgent = type === "suggestion" && author.startsWith("Agent");
  if (!isAgent && !["John", "Tom"].includes(author)) {
    return NextResponse.json({ error: "author must be John or Tom (or Agent — * for suggestions)" }, { status: 400 });
  }

  const { data, error } = await serverDb().from("feedback")
    .insert({ author, type, page: b.page ?? null, body, status: type === "suggestion" ? "suggested" : "submitted" })
    .select("id").single();
  if (error) return NextResponse.json({ error: `${error.message} — apply migration 0010` }, { status: 503 });
  return NextResponse.json({ ok: true, id: data.id });
}

export async function PATCH(req: Request) {
  if (!hasDb()) return NextResponse.json({ error: "no db" }, { status: 503 });
  const b = await req.json();
  if (!b.id) return NextResponse.json({ error: "id required" }, { status: 400 });
  if (b.status && !STATUSES.includes(b.status)) {
    return NextResponse.json({ error: `status must be one of ${STATUSES.join("|")}` }, { status: 400 });
  }
  const patch: Record<string, unknown> = { updated_at: new Date().toISOString() };
  for (const k of ["status", "lane", "task_ref", "shipped_ref"]) if (b[k] !== undefined) patch[k] = b[k];
  const { error } = await serverDb().from("feedback").update(patch).eq("id", b.id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  // a status change writes a status_change comment so the thread IS the audit
  // trail (0011). Tolerated if feedback_comments isn't applied yet.
  if (b.status) {
    await serverDb().from("feedback_comments").insert({
      feedback_id: b.id, author: String(b.actor ?? "PM"), kind: "status_change",
      body: `Status → ${b.status}${b.lane ? ` (lane ${b.lane})` : ""}${b.task_ref ? ` · ${b.task_ref}` : ""}`,
    });
  }
  // detail-append: John/Tom add context to a suggestion without editing history
  if (typeof b.detail === "string" && b.detail.trim()) {
    const { data: row } = await serverDb().from("feedback").select("body").eq("id", b.id).maybeSingle();
    if (row) {
      await serverDb().from("feedback")
        .update({ body: `${row.body}\n\n— ${String(b.detailAuthor ?? "John")} adds: ${b.detail.trim()}` })
        .eq("id", b.id);
    }
  }
  return NextResponse.json({ ok: true });
}
