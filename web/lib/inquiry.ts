// Inquiry draft prompt for listing pursuit (LISTING-PURSUIT-FLOW §1).
// Pure prompt-building — no secrets here. The Claude call happens in the API
// route (needs ANTHROPIC_API_KEY in web/.env.local) or scraper/draft_inquiry.js.

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

export const DRAFT_SYSTEM = `You draft short broker-inquiry emails for Pronghorn Equity Partners, a committed-capital firm doing roll-ups in essential home/property services. Voice: direct, credible, warm-professional — a real buyer writing quickly, not a template blast.

Rules:
- 120-180 words. No fluff, no "I hope this finds you well".
- Reference 2-3 SPECIFICS from the listing (industry, geography, size, revenue mix) so the broker knows it was read.
- Ask 2-3 smart diligence questions appropriate for a FIRST inquiry (revenue recurrence/mix, owner involvement, reason for sale, customer concentration — pick what the listing leaves open).
- State that Pronghorn is a committed-capital buyer active in this exact vertical; NDA-ready.
- Sign with the sender block provided.
- Output valid JSON only: {"subject": "...", "body": "..."} (body uses \\n for line breaks).`;

export function draftUserMessage(l: ListingForDraft, profile: InquiryProfile) {
  return JSON.stringify({
    listing: {
      title: l.name,
      industry: l.industry,
      location: [l.city, l.state].filter(Boolean).join(", "),
      asking_price: l.asking_price,
      cash_flow: l.cash_flow ? `${l.cash_flow} (${l.cash_flow_type ?? "SDE"})` : null,
      revenue: l.gross_revenue ?? null,
      description: (l.description ?? "").slice(0, 1500),
      source: l.source_id,
    },
    sender: profile,
  });
}
