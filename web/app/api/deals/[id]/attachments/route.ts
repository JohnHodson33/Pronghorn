// Deal document attachments (John 7/13 — CIMs/NDAs/LOIs on the deal record).
// Private bucket `deal-attachments`, prefix deal/{id}/. GET list · POST upload.
import { NextResponse } from "next/server";
import { hasDb } from "@/lib/db";
import { listAttachments, uploadAttachment, DOC_EXTENSIONS } from "@/lib/attachments-store";

export const dynamic = "force-dynamic";

const BUCKET = "deal-attachments";
const owner = (id: string) => `deal/${id}`;

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!hasDb()) return NextResponse.json({ attachments: [] });
  const { id } = await params;
  return NextResponse.json({ attachments: await listAttachments(BUCKET, owner(id)) });
}

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!hasDb()) return NextResponse.json({ error: "no db" }, { status: 503 });
  const { id } = await params;
  const form = await req.formData().catch(() => null);
  const file = form?.get("file");
  if (!(file instanceof File)) return NextResponse.json({ error: "multipart 'file' field required" }, { status: 400 });
  const err = await uploadAttachment(BUCKET, owner(id), file);
  if (err) return NextResponse.json({ error: `${err} (${DOC_EXTENSIONS.join(", ")})` }, { status: 400 });
  return NextResponse.json({ ok: true });
}
