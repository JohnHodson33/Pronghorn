// Feedback thread comments (migration 0011). The conversation John has with the
// agent before approving — and where build plans + completion summaries land.
//
// GET  → all comments for a feedback item, oldest first
// POST { author, body, kind? } → add a comment. A human comment sets the
//        parent's reply_pending=true (the owning lane must answer before build);
//        an agent comment clears it.
import { NextResponse } from "next/server";
import { hasDb, serverDb } from "@/lib/db";

export const dynamic = "force-dynamic";

const KINDS = ["comment", "status_change", "build_plan", "completion_summary"];
const isAgent = (a: string) => /^(agent|pm)\b/i.test(a);

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!hasDb()) return NextResponse.json({ error: "no db" }, { status: 503 });
  const { id } = await params;
  const { data, error } = await serverDb()
    .from("feedback_comments")
    .select("id, author, body, kind, created_at")
    .eq("feedback_id", id)
    .order("created_at", { ascending: true });
  if (error) return NextResponse.json({ error: `${error.message} — apply migration 0011`, comments: [] }, { status: 200 });
  return NextResponse.json({ comments: data });
}

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!hasDb()) return NextResponse.json({ error: "no db" }, { status: 503 });
  const db = serverDb();
  const { id } = await params;
  const b = await req.json();
  const author = String(b.author ?? "").trim();
  const body = String(b.body ?? "").trim();
  if (!author || !body) return NextResponse.json({ error: "author and body required" }, { status: 400 });
  const kind = KINDS.includes(b.kind) ? b.kind : "comment";

  const { data, error } = await db
    .from("feedback_comments")
    .insert({ feedback_id: id, author, body, kind })
    .select("id")
    .single();
  if (error) return NextResponse.json({ error: `${error.message} — apply migration 0011` }, { status: 503 });

  // reply_pending: human comment → owing lane must answer; agent reply clears it
  await db.from("feedback").update({ reply_pending: !isAgent(author), updated_at: new Date().toISOString() }).eq("id", id);
  return NextResponse.json({ ok: true, id: data.id });
}
