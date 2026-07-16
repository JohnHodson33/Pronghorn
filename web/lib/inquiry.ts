// Broker-inquiry template — JOHN'S VERBATIM MESSAGE IS THE CONTRACT
// (7/13 eve, Rockwall screenshots; supersedes Claude free-drafting).
// The ONLY customization: {broker first name} (else "Hello,") and the
// {industry} phrase (natural phrasing). Everything else ships word-for-word,
// so no LLM call is needed — drafting is deterministic and $0.
// Identity comes from inquiry_profiles (774f21ce): John Hodson ·
// jhodson@pronghornequity.com · (503) 899-0058 — NEVER the gmail.

export type ListingForDraft = {
  name: string | null;
  industry: string | null;
  city: string | null;
  state: string | null;
  asking_price: number | null;
  cash_flow: number | null;
  cash_flow_type: string | null;
  gross_revenue?: number | null;
  description: string | null;
  source_id: string | null;
};

export type InquiryProfile = {
  name: string;
  email: string | null;
  phone: string | null;
  default_note: string | null;
};

// natural phrasing for the {industry} slot (John's example: "landscaping /
// lawn care") — fall back to the lowercased label
const INDUSTRY_PHRASE: Record<string, string> = {
  "Lawn Care": "landscaping / lawn care",
  "Landscaping": "landscaping / lawn care",
  "Tree Care": "tree care",
  "Pest Control": "pest control",
  "Pool Services": "pool services",
  "Lake/Pond Management": "lake and pond management",
  "HVAC": "HVAC services",
  "Plumbing": "plumbing services",
  "Electrical": "electrical services",
  "Roofing": "roofing",
  "Fencing": "fencing",
  "Irrigation": "irrigation services",
  "Cleaning/Janitorial": "commercial cleaning",
  "Restoration": "restoration services",
  "Property Maintenance": "property maintenance",
};

export function industryPhrase(industry: string | null | undefined): string {
  if (!industry) return "business services";
  return INDUSTRY_PHRASE[industry] ?? industry.toLowerCase();
}

/** First name from a broker's full name — no guessing beyond the first token. */
export function brokerFirstName(fullName: string | null | undefined): string | null {
  const first = String(fullName ?? "").trim().split(/\s+/)[0] ?? "";
  return /^[A-Za-z][A-Za-z'.-]*$/.test(first) ? first : null;
}

/** John's verbatim broker-inquiry message. */
export function buildBrokerInquiry(l: ListingForDraft, opts?: { brokerName?: string | null }): { subject: string; body: string } {
  const first = brokerFirstName(opts?.brokerName);
  const greeting = first ? `Hi ${first},` : "Hello,";
  const industry = industryPhrase(l.industry);
  const body = [
    greeting,
    "",
    `My name is John Hodson, and I am a Managing Director at Pronghorn Equity Partners. We are a lower middle market private equity fund that focuses on business services assets across the US. We are spending a lot of time in the ${industry} space and would love to get some additional information on the below listing.`,
    "",
    "Are you able to share the NDA and any initial materials? It would also be helpful to hop on an introductory call to learn more and introduce myself.",
    "",
    "Looking forward to it.",
    "",
    "Best,",
    "John Hodson",
  ].join("\n");
  const ref = l.name ?? l.source_id ?? "your listing";
  return { subject: `Inquiry: ${ref}`, body };
}

/** Form variant (BizBuySell-style inquiry boxes): the same verbatim message
 *  minus greeting and signature — the form carries separate contact fields. */
export function buildBrokerInquiryFormNote(l: ListingForDraft): string {
  const industry = industryPhrase(l.industry);
  return [
    `My name is John Hodson, and I am a Managing Director at Pronghorn Equity Partners. We are a lower middle market private equity fund that focuses on business services assets across the US. We are spending a lot of time in the ${industry} space and would love to get some additional information on the below listing.`,
    "",
    "Are you able to share the NDA and any initial materials? It would also be helpful to hop on an introductory call to learn more and introduce myself.",
    "",
    "Looking forward to it.",
  ].join("\n");
}

// ---------------------------------------------------------------------------
// Legacy exports (Claude free-drafting) — RETIRED. Kept as throwing stubs so
// any missed caller fails loudly instead of silently reverting to old copy.
// ---------------------------------------------------------------------------
export const DRAFT_SYSTEM = "__RETIRED__ broker inquiries use buildBrokerInquiry (John's verbatim template)";
export function draftUserMessage(_l: ListingForDraft, _profile: InquiryProfile): never {
  throw new Error("draftUserMessage retired — use buildBrokerInquiry (John's verbatim template)");
}
