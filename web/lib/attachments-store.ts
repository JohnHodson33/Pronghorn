// Shared attachment storage helper — the deal/company document store (John
// 7/13: CIMs/NDAs/LOIs attach to their records), same private-bucket + prefix
// design as feedback attachments. Files live under {ownerId}/{ts}_{name};
// the prefix listing IS the metadata, so no migration is required.
import { serverDb } from "./db";

export const MAX_BYTES = 25 * 1024 * 1024; // deal docs (CIMs) run larger than feedback files
// deal documents + analyses + the occasional screenshot
export const DOC_EXTENSIONS = ["pdf", "docx", "doc", "xlsx", "xls", "csv", "pptx", "ppt", "png", "jpg", "jpeg", "gif", "webp", "heic", "txt", "json", "zip"];

export const ext = (name: string) => name.split(".").pop()?.toLowerCase() ?? "";
export const sanitize = (name: string) => name.replace(/[^\w.\- ]+/g, "_").slice(-120);

export async function ensureBucket(bucket: string) {
  const { error } = await serverDb().storage.createBucket(bucket, { public: false, fileSizeLimit: MAX_BYTES });
  if (error && !/already exists|duplicate/i.test(error.message)) throw error;
}

export type StoredAttachment = { name: string; size: number | null; created_at?: string | null; url: string | null };

export async function listAttachments(bucket: string, ownerId: string): Promise<StoredAttachment[]> {
  const store = serverDb().storage.from(bucket);
  const { data, error } = await store.list(ownerId, { sortBy: { column: "created_at", order: "asc" } });
  if (error || !data?.length) return [];
  const { data: signed } = await store.createSignedUrls(data.map((f) => `${ownerId}/${f.name}`), 3600);
  return data.map((f, i) => ({
    name: f.name.replace(/^\d{13}_/, ""),
    size: (f.metadata as { size?: number } | null)?.size ?? null,
    created_at: f.created_at,
    url: signed?.[i]?.signedUrl ?? null,
  }));
}

// Mint a direct-to-storage signed upload URL. The browser PUTs the file
// straight to Supabase, bypassing Vercel's 4.5MB serverless body cap (a 22MB
// CIM bounced off the old server-side upload — PM flag 7/14). The API route
// only validates the name/type and mints the URL; the bucket's fileSizeLimit
// still enforces the max at the storage layer. Extensions validated here so a
// bad name never gets a URL.
export async function signedUploadUrl(
  bucket: string,
  ownerId: string,
  filename: string,
  extensions: string[] = DOC_EXTENSIONS,
): Promise<{ signedUrl: string; path: string } | { error: string }> {
  if (!extensions.includes(ext(filename))) return { error: `file type .${ext(filename)} not allowed (${extensions.join(", ")})` };
  try {
    await ensureBucket(bucket);
  } catch (e) {
    return { error: `storage unavailable: ${(e as Error).message}` };
  }
  const path = `${ownerId}/${Date.now()}_${sanitize(filename)}`;
  const { data, error } = await serverDb().storage.from(bucket).createSignedUploadUrl(path);
  if (error || !data) return { error: error?.message ?? "could not mint upload url" };
  return { signedUrl: data.signedUrl, path };
}
