// Company-level completeness — derives the FULL/CONTACTABLE/… level for a
// CRM company from its contacts (owner/seller preferred, best level wins).
// Interim client-side derivation until Lane C serves it; same scale as
// lib/completeness.ts so the CRM and Enrichment read identically.
import { completeness, LEVELS, type Completeness } from "./completeness";

export type CompanyContactLite = {
  role: string | null;
  name: string | null;
  email: string | null;
  phone: string | null;
  linkedin: string | null;
};

export function companyLevel(contacts: CompanyContactLite[] | null | undefined, website?: string | null): {
  level: Completeness;
  channels: [boolean, boolean, boolean]; // phone · email · linkedin (owner's)
} {
  const owners = (contacts ?? []).filter((c) => c.role === "owner" || c.role === "seller");
  const pool = owners.length > 0 ? owners : [];
  let best: Completeness = website ? "basic" : "raw";
  let channels: [boolean, boolean, boolean] = [false, false, false];
  for (const c of pool) {
    const lv = completeness({
      owner_name: c.name,
      owner_email: c.email,
      owner_phone: c.phone,
      owner_linkedin: c.linkedin,
      website: website ?? null,
    });
    if (LEVELS.indexOf(lv) < LEVELS.indexOf(best)) {
      best = lv;
      channels = [!!c.phone, !!c.email, !!c.linkedin];
    }
  }
  return { level: best, channels };
}
