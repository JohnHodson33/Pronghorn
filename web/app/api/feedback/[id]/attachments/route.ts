// Feedback attachments (John 7/13 ~10:40 — "Tom should be able to attach
// analyses or data files"). Files live in the private Supabase Storage bucket
// `feedback-attachments` under {feedbackId}/{ts}_{name} — the prefix listing
// is the metadata, so no migration is required and threads pick attachments
// up the moment they land.
//
// GET  → attachments for a feedback item: { name, size, created_at, url }
//        (url = 1h signed download link)
// POST multipart form-data { file } → upload (15MB cap, allowlisted extensions)
import { NextResponse } from "next/server";
import { hasDb, serverDb } from "@/lib/db";

export const dynamic = "force-dynamic";

const BUCKET = "feedback-attachments";
const MAX_BYTES = 15 * 1024 * 1024;
// Tom's analyses (spreadsheets/PDFs) + bug screenshots (incl. iPhone formats)
const EXTENSIONS = ["csv", "xlsx", "xls", "pdf", "png", "jpg", "jpeg", "gif", "webp", "heic", "txt", "json", "docx", "pptx"];

const ext = (name: string) => name.split(".").pop()?.toLowerCase() ?? "";
const sanitize = (name: string) => name.replace(/[^\w.\- ]+/g, "_").slice(-120);

async function ensureBucket() {
  // idempotent: "already exists" is success
  const { error } = await serverDb().storage.createBucket(BUCKET, {
    public: false,
    fileSizeLimit: MAX_BYTES,
  });
  if (error && !/already exists|duplicate/i.test(error.message)) throw error;
}

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!hasDb()) return NextResponse.json({ error: "no db", attachments: [] }, { status: 200 });
  const { id } = await params;
  const store = serverDb().storage.from(BUCKET);
  const { data, error } = await store.list(id, { sortBy: { column: "created_at", order: "asc" } });
  // a missing bucket just means nothing was ever attached
  if (error || !data?.length) return NextResponse.json({ attachments: [] });

  const { data: signed } = await store.createSignedUrls(data.map((f) => `${id}/${f.name}`), 3600);
  const attachments = data.map((f, i) => ({
    // strip the {ts}_ upload prefix back off for display
    name: f.name.replace(/^\d{13}_/, ""),
    size: (f.metadata as { size?: number } | null)?.size ?? null,
    created_at: f.created_at,
    url: signed?.[i]?.signedUrl ?? null,
  }));
  return NextResponse.json({ attachments });
}

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!hasDb()) return NextResponse.json({ error: "no db" }, { status: 503 });
  const { id } = await params;
  const form = await req.formData().catch(() => null);
  const file = form?.get("file");
  if (!(file instanceof File)) return NextResponse.json({ error: "multipart 'file' field required" }, { status: 400 });
  if (file.size > MAX_BYTES) return NextResponse.json({ error: "file too large (15MB max)" }, { status: 400 });
  if (!EXTENSIONS.includes(ext(file.name))) {
    return NextResponse.json({ error: `file type .${ext(file.name)} not allowed (${EXTENSIONS.join(", ")})` }, { status: 400 });
  }

  try {
    await ensureBucket();
  } catch (e) {
    return NextResponse.json({ error: `storage unavailable: ${(e as Error).message}` }, { status: 503 });
  }
  const path = `${id}/${Date.now()}_${sanitize(file.name)}`;
  const { error } = await serverDb().storage.from(BUCKET)
    .upload(path, await file.arrayBuffer(), { contentType: file.type || "application/octet-stream" });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true, path });
}
