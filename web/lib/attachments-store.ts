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

// Returns an error string, or null on success.
export async function uploadAttachment(bucket: string, ownerId: string, file: File): Promise<string | null> {
  if (file.size > MAX_BYTES) return `file too large (${Math.round(MAX_BYTES / 1024 / 1024)}MB max)`;
  if (!DOC_EXTENSIONS.includes(ext(file.name))) return `file type .${ext(file.name)} not allowed`;
  try {
    await ensureBucket(bucket);
  } catch (e) {
    return `storage unavailable: ${(e as Error).message}`;
  }
  const path = `${ownerId}/${Date.now()}_${sanitize(file.name)}`;
  const { error } = await serverDb().storage.from(bucket)
    .upload(path, await file.arrayBuffer(), { contentType: file.type || "application/octet-stream" });
  return error ? error.message : null;
}
