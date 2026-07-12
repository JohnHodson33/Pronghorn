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
};

export function completeness(l: LeadChannels): Completeness {
  const channels = [l.owner_email, l.owner_phone, l.owner_linkedin].filter(Boolean).length;
  if (l.owner_name && l.owner_email && (l.owner_phone || l.owner_linkedin)) return "full";
  if (l.owner_name && channels >= 1) return "contactable";
  if (l.owner_name) return "identified";
  if (l.website || l.city) return "basic";
  return "raw";
}

export const LEVEL_META: Record<Completeness, { dot: string; label: string }> = {
  full: { dot: "●", label: "Full — owner + email + phone/LinkedIn" },
  contactable: { dot: "◕", label: "Contactable — owner + 1 channel" },
  identified: { dot: "◑", label: "Identified — owner name only" },
  basic: { dot: "◔", label: "Basic — website/location only" },
  raw: { dot: "○", label: "Raw — nothing yet" },
};
