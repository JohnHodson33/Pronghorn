// Shared UI types. UiListing is the shape both live (Supabase) and mock data
// present to components.

export type UiListing = {
  id: string;
  name: string;
  source: string;
  industry: string;
  city: string | null;
  state: string | null;
  asking: number | null;
  cashFlow: number | null;
  cashFlowType: "SDE" | "EBITDA" | "CF" | "unknown";
  revenue: number | null;
  tier: 1 | 2 | 3 | 4 | null; // null = not screened (filtered out pre-screen)
  tierReasoning: string;
  priorityState: boolean;
  firstSeen: string; // YYYY-MM-DD
  // Pursuit lifecycle (LISTING-PURSUIT-FLOW.md) + legacy review values.
  status:
    | "new"
    | "interested"
    | "info_requested"
    | "nda_signed"
    | "cim_received"
    | "promoted"
    | "passed"
    | "reviewed"
    | "pursuing"
    | "pushed_to_crm";
  relevant: boolean; // passed the screen-profile relevance filter
  url: string | null; // source listing page
};
