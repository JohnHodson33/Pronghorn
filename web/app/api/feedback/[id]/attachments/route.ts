// Feedback attachments (John 7/13 ~10:40 — "Tom should be able to attach
// analyses or data files"). Files live in the private Supabase Storage bucket
// `feedback-attachments` under {feedbackId}/{ts}_{name} — the prefix listing
// is the metadata, so no migration is required and threads pick attachments
// up the moment they land.
//
// GET  → attachments: { name, size, created_at, url } (url = 1h signed download)
// POST { filename } → mint a signed upload URL; the browser PUTs the file
//        DIRECT to storage (bypasses Vercel's 4.5MB serverless body cap).
import { NextResponse } from "next/server";
import { hasDb } from "@/lib/db";
import { listAttachments, signedUploadUrl } from "@/lib/attachments-store";

export const dynamic = "force-dynamic";

const BUCKET = "feedback-attachments";
// Tom's analyses (spreadsheets/PDFs) + bug screenshots (incl. iPhone formats)
const EXTENSIONS = ["csv", "xlsx", "xls", "pdf", "png", "jpg", "jpeg", "gif", "webp", "heic", "txt", "json", "docx", "pptx"];

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!hasDb()) return NextResponse.json({ attachments: [] });
  const { id } = await params;
  return NextResponse.json({ attachments: await listAttachments(BUCKET, id) });
}

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!hasDb()) return NextResponse.json({ error: "no db" }, { status: 503 });
  const { id } = await params;
  const { filename } = await req.json().catch(() => ({}));
  if (!filename) return NextResponse.json({ error: "filename required" }, { status: 400 });
  const res = await signedUploadUrl(BUCKET, id, String(filename), EXTENSIONS);
  if ("error" in res) return NextResponse.json(res, { status: 400 });
  return NextResponse.json(res);
}
