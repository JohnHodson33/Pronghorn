// Log an activity (meeting note, call, general note) against a company.
import { NextResponse } from "next/server";
import { hasDb, serverDb } from "@/lib/db";

export async function POST(req: Request) {
  if (!hasDb()) return NextResponse.json({ error: "no db" }, { status: 503 });
  const { companyId, kind, body, docUrl } = await req.json();
  if (!companyId || !String(body ?? "").trim())
    return NextResponse.json({ error: "companyId and body required" }, { status: 400 });

  const db = serverDb();
  // attach to the company's most recent deal too, if one exists
  const { data: deal } = await db
    .from("deals")
    .select("id")
    .eq("company_id", companyId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  const { error } = await db.from("activities").insert({
    company_id: companyId,
    deal_id: deal?.id ?? null,
    kind: ["meeting", "call", "email", "note", "task", "doc"].includes(kind) ? kind : "note",
    body: String(body).trim(),
    doc_url: docUrl || null,
  });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
