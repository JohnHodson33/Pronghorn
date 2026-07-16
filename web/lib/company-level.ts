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
  // The owner's ACTUAL channel values — the dots are retired platform-wide
  // (John 7/16: "I'd rather just have the actual contacts"). Aggregated as
  // the first non-null ACROSS owner contacts, matching companyCompleteness in
  // completeness.ts: a company with the phone on one owner row and the email
  // on another really is reachable both ways, and showing "—" would lie.
  contact: { phone: string | null; email: string | null; linkedin: string | null };
} {
  const owners = (contacts ?? []).filter((c) => c.role === "owner" || c.role === "seller");
  const pool = owners.length > 0 ? owners : [];
  let best: Completeness = website ? "basic" : "raw";
  for (const c of pool) {
    const lv = completeness({
      owner_name: c.name,
      owner_email: c.email,
      owner_phone: c.phone,
      owner_linkedin: c.linkedin,
      website: website ?? null,
    });
    if (LEVELS.indexOf(lv) < LEVELS.indexOf(best)) best = lv;
  }
  return {
    level: best,
    contact: {
      phone: pool.find((c) => c.phone)?.phone ?? null,
      email: pool.find((c) => c.email)?.email ?? null,
      linkedin: pool.find((c) => c.linkedin)?.linkedin ?? null,
    },
  };
}
