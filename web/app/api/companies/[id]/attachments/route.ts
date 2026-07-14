// Company document attachments (John 7/13 — CIMs/NDAs/LOIs attach to their
// records). Private bucket `deal-attachments`, prefix company/{id}/ so a
// company and its deal never collide. GET signed-URL list · POST multipart.
import { NextResponse } from "next/server";
import { hasDb } from "@/lib/db";
import { listAttachments, signedUploadUrl } from "@/lib/attachments-store";

export const dynamic = "force-dynamic";

const BUCKET = "deal-attachments";
const owner = (id: string) => `company/${id}`;

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!hasDb()) return NextResponse.json({ attachments: [] });
  const { id } = await params;
  return NextResponse.json({ attachments: await listAttachments(BUCKET, owner(id)) });
}

// Mints a signed upload URL; the browser uploads DIRECT to storage (bypasses
// Vercel's 4.5MB body cap — a 22MB CIM bounced off the old server-side path).
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!hasDb()) return NextResponse.json({ error: "no db" }, { status: 503 });
  const { id } = await params;
  const { filename } = await req.json().catch(() => ({}));
  if (!filename) return NextResponse.json({ error: "filename required" }, { status: 400 });
  const res = await signedUploadUrl(BUCKET, owner(id), String(filename));
  if ("error" in res) return NextResponse.json(res, { status: 400 });
  return NextResponse.json(res);
}
