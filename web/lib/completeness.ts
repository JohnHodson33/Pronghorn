// Lead completeness levels — the single source of truth (John 7/12 ~16:05:
// binary "enriched" reads as nothing happened; the demarcation that matters
// is how REACHABLE the owner is). Shared by the API, Lane B's chips/dots,
// and the KPI. Order matters: most complete first for default sorting.

export const LEVELS = ["full", "contactable", "identified", "basic", "raw"] as const;
export type Completeness = (typeof LEVELS)[number];

export type LeadChannels = {
  owner_name?: string | null;
  owner_email?: string | null;
  owner_phone?: string | null;
  owner_linkedin?: string | null;
  website?: string | null;
  city?: string | null;
  // John 7/15 ("wrong > none"): a LinkedIn link counts as an owner channel
  // ONLY when it passed 2-corroboration verification. Unverified links stay
  // visible but greyed, and never advance completeness or outreach eligibility.
  enrichment?: { linkedin_verified?: boolean | null } | null;
};

export function completeness(l: LeadChannels): Completeness {
  const linkedin = l.owner_linkedin && l.enrichment?.linkedin_verified === true ? l.owner_linkedin : null;
  const channels = [l.owner_email, l.owner_phone, linkedin].filter(Boolean).length;
  if (l.owner_name && l.owner_email && (l.owner_phone || linkedin)) return "full";
  if (l.owner_name && channels >= 1) return "contactable";
  if (l.owner_name) return "identified";
  if (l.website || l.city) return "basic";
  return "raw";
}

// Company-level completeness — same ladder, computed from the company's OWNER
// contact channels (role='owner'). Kept in this module so the lead ladder and
// the company ladder can never drift (John 7/12: "count of CONTACTABLE owners
// in tree care across the whole company DB" must be one consistent number).
export type OwnerContact = {
  role?: string | null;
  name?: string | null;
  email?: string | null;
  phone?: string | null;
  linkedin?: string | null;
};

export function companyCompleteness(company: { contacts?: OwnerContact[] | null; website?: string | null; city?: string | null }): Completeness {
  const owners = (company.contacts ?? []).filter((c) => (c.role ?? "").toLowerCase() === "owner");
  // aggregate the best signal across all owner contacts
  const l: LeadChannels = {
    owner_name: owners.find((o) => o.name)?.name ?? null,
    owner_email: owners.find((o) => o.email)?.email ?? null,
    owner_phone: owners.find((o) => o.phone)?.phone ?? null,
    owner_linkedin: owners.find((o) => o.linkedin)?.linkedin ?? null,
    website: company.website,
    city: company.city,
  };
  return completeness(l);
}

export const LEVEL_META: Record<Completeness, { dot: string; label: string }> = {
  full: { dot: "●", label: "Full — owner + email + phone/LinkedIn" },
  contactable: { dot: "◕", label: "Contactable — owner + 1 channel" },
  identified: { dot: "◑", label: "Identified — owner name only" },
  basic: { dot: "◔", label: "Basic — website/location only" },
  raw: { dot: "○", label: "Raw — nothing yet" },
};
