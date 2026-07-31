// Intake step 1 — mint a signed direct-to-storage upload URL (the browser PUTs
// the file straight to Supabase Storage, bypassing Vercel's 4.5MB body cap).
// POST { filename, uploaded_by } → { signedUrl, path }
// Then the browser uploads, and POSTs { path, filename, uploaded_by } to
// /api/intake/preview.
import { NextResponse } from "next/server";
import { hasDb } from "@/lib/db";
import { signedUploadUrl } from "@/lib/attachments-store";
import { INTAKE_BUCKET, INTAKE_EXTENSIONS } from "@/lib/intake";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  if (!hasDb()) return NextResponse.json({ error: "no db" }, { status: 503 });
  const b = await req.json().catch(() => ({}));
  const filename = String(b.filename ?? "").trim();
  const uploadedBy = String(b.uploaded_by ?? "").trim();
  if (!filename) return NextResponse.json({ error: "filename required" }, { status: 400 });
  if (!["John", "Tom"].includes(uploadedBy)) {
    return NextResponse.json({ error: "uploaded_by must be John or Tom" }, { status: 400 });
  }
  const out = await signedUploadUrl(INTAKE_BUCKET, uploadedBy, filename, INTAKE_EXTENSIONS);
  if ("error" in out) return NextResponse.json({ error: out.error }, { status: 400 });
  return NextResponse.json({ signedUrl: out.signedUrl, path: out.path });
}
