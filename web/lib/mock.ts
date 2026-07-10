// Mock data for UI iteration before Supabase is wired in.
// Deals marked real = John's actual pipeline as of 2026-07-09; "(sample)" rows
// exist to fill stages/screens so every UI state is visible.

export const STAGES = [
  "Sourced",
  "Info Requested",
  "Under Screening",
  "IOI Submitted",
  "LOI",
  "Diligence",
] as const;
export type Stage = (typeof STAGES)[number];

export type Deal = {
  id: string;
  company: string;
  industry: string;
  city: string;
  state: string;
  revenue: number | null;
  ebitda: number | null;
  ebitdaType: "EBITDA" | "SDE";
  asking: number | null;
  stage: Stage;
  broker: string;
  brokerage: string;
  nextStep: string | null;
  nextStepDue: string | null; // ISO date
  sample?: boolean;
};

export const deals: Deal[] = [
  {
    id: "d1",
    company: "Landmark Pest Management",
    industry: "Pest Control",
    city: "Schaumburg",
    state: "IL",
    revenue: 11_200_000,
    ebitda: 4_100_000,
    ebitdaType: "EBITDA",
    asking: null,
    stage: "Under Screening",
    broker: "Oliver Bogner",
    brokerage: "The Advisory Investment Bank",
    nextStep: "Submit IOI",
    nextStepDue: "2026-07-10",
  },
  {
    id: "d2",
    company: "BF Stonework LLC",
    industry: "Pool Services",
    city: "Atlanta",
    state: "GA",
    revenue: 16_100_000,
    ebitda: 3_090_000,
    ebitdaType: "EBITDA",
    asking: null,
    stage: "Info Requested",
    broker: "Ramzi Daklouche",
    brokerage: "VR Business Brokers Atlanta",
    nextStep: "Review CIM on receipt",
    nextStepDue: null,
  },
  {
    id: "d3",
    company: "Gage Tree Service",
    industry: "Tree Care",
    city: "Anchorage",
    state: "AK",
    revenue: 4_500_000,
    ebitda: 908_000,
    ebitdaType: "EBITDA",
    asking: null,
    stage: "Info Requested",
    broker: "Matt Stemmler",
    brokerage: "Principium | White Oak",
    nextStep: "Follow up with Ron Edmonds",
    nextStepDue: null,
  },
  {
    id: "d4",
    company: "Affordable Windows & Doors of Tampa Bay",
    industry: "Windows & Doors",
    city: "Tampa",
    state: "FL",
    revenue: 3_900_000,
    ebitda: 700_000,
    ebitdaType: "SDE",
    asking: 1_400_000,
    stage: "Info Requested",
    broker: "Luis Zavala",
    brokerage: "Murphy Business",
    nextStep: "Request financials",
    nextStepDue: null,
  },
  {
    id: "d5",
    company: "Desert Green Landscaping (sample)",
    industry: "Landscaping",
    city: "Phoenix",
    state: "AZ",
    revenue: 6_200_000,
    ebitda: 1_450_000,
    ebitdaType: "EBITDA",
    asking: 5_800_000,
    stage: "Sourced",
    broker: "TBD",
    brokerage: "Sunbelt",
    nextStep: "Intro call with broker",
    nextStepDue: "2026-07-15",
    sample: true,
  },
  {
    id: "d6",
    company: "Sun Valley Pool Service (sample)",
    industry: "Pool Services",
    city: "Las Vegas",
    state: "NV",
    revenue: 2_800_000,
    ebitda: 640_000,
    ebitdaType: "SDE",
    asking: 2_100_000,
    stage: "IOI Submitted",
    broker: "TBD",
    brokerage: "Transworld",
    nextStep: "Awaiting seller response",
    nextStepDue: "2026-07-18",
    sample: true,
  },
];

export type Listing = {
  id: string;
  name: string;
  source: string;
  industry: string;
  city: string | null;
  state: string;
  asking: number | null;
  cashFlow: number | null;
  cashFlowType: "SDE" | "EBITDA" | "unknown";
  revenue: number | null;
  tier: 1 | 2 | 3 | 4;
  tierReasoning: string;
  priorityState: boolean;
  firstSeen: string;
  status: "new" | "reviewed" | "pursuing" | "passed";
};

export const listings: Listing[] = [
  { id: "l1", name: "Commercial Landscape Maintenance Co., 85% Recurring", source: "bizbuysell", industry: "Landscaping", city: "Dallas", state: "TX", asking: 4_950_000, cashFlow: 1_320_000, cashFlowType: "EBITDA", revenue: 7_800_000, tier: 1, tierReasoning: "Recurring commercial contracts, priority state, platform-size EBITDA.", priorityState: true, firstSeen: "2026-07-08", status: "new" },
  { id: "l2", name: "Established Pest Control Route — 2,400 Recurring Accounts", source: "bizbuysell", industry: "Pest Control", city: "Tucson", state: "AZ", asking: 1_850_000, cashFlow: 610_000, cashFlowType: "SDE", revenue: 1_900_000, tier: 1, tierReasoning: "Route-based recurring revenue, priority state, tuck-in size.", priorityState: true, firstSeen: "2026-07-08", status: "new" },
  { id: "l3", name: "Full-Service Tree Care Company w/ Crane Fleet", source: "bizbuysell", industry: "Tree Care", city: "Charlotte", state: "NC", asking: 3_200_000, cashFlow: 880_000, cashFlowType: "SDE", revenue: 4_100_000, tier: 1, tierReasoning: "Priority state, strong equipment base, repeat municipal contracts.", priorityState: true, firstSeen: "2026-07-07", status: "reviewed" },
  { id: "l4", name: "HVAC Service & Repair — 70% Service Revenue", source: "bizbuysell", industry: "HVAC", city: "Nashville", state: "TN", asking: 5_500_000, cashFlow: 1_600_000, cashFlowType: "EBITDA", revenue: 9_200_000, tier: 2, tierReasoning: "Strong service mix but 30% new-construction exposure.", priorityState: true, firstSeen: "2026-07-07", status: "new" },
  { id: "l5", name: "Pool Cleaning & Maintenance Route, Owner Retiring", source: "bizbuysell", industry: "Pool Services", city: "Scottsdale", state: "AZ", asking: 950_000, cashFlow: 340_000, cashFlowType: "SDE", revenue: 780_000, tier: 2, tierReasoning: "Recurring route, priority state; below tuck-in floor on disclosed SDE but seller-financed.", priorityState: true, firstSeen: "2026-07-06", status: "new" },
  { id: "l6", name: "Lawn Fertilization & Weed Control — 3 Territories", source: "bizbuysell", industry: "Lawn Care", city: "Denver", state: "CO", asking: 2_700_000, cashFlow: 725_000, cashFlowType: "EBITDA", revenue: 3_300_000, tier: 1, tierReasoning: "Chemical lawn care with 90% renewal rate, priority state.", priorityState: true, firstSeen: "2026-07-05", status: "pursuing" },
  { id: "l7", name: "Commercial Janitorial Services, Government Contracts", source: "bizbuysell", industry: "Cleaning/Janitorial", city: "Albuquerque", state: "NM", asking: 3_900_000, cashFlow: 1_050_000, cashFlowType: "EBITDA", revenue: 6_500_000, tier: 2, tierReasoning: "Recurring contracts but single-customer concentration ~30% (dealbreaker threshold).", priorityState: true, firstSeen: "2026-07-05", status: "new" },
  { id: "l8", name: "Custom Home Builder — Luxury Market", source: "bizbuysell", industry: "Other", city: "Boise", state: "ID", asking: 8_900_000, cashFlow: 2_400_000, cashFlowType: "EBITDA", revenue: 22_000_000, tier: 4, tierReasoning: "Project-based new construction — outside mandate, cyclical.", priorityState: false, firstSeen: "2026-07-04", status: "passed" },
  { id: "l9", name: "Plumbing Service Company, 12 Vans", source: "bizbuysell", industry: "Plumbing", city: "Salt Lake City", state: "UT", asking: 4_200_000, cashFlow: null, cashFlowType: "unknown", revenue: 5_600_000, tier: 2, tierReasoning: "Service/repair focus, priority state; cash flow undisclosed — plausible size from asking.", priorityState: true, firstSeen: "2026-07-03", status: "new" },
  { id: "l10", name: "Roofing Contractor — Storm Restoration Focus", source: "bizbuysell", industry: "Roofing", city: "Oklahoma City", state: "OK", asking: 2_950_000, cashFlow: 990_000, cashFlowType: "SDE", revenue: 6_100_000, tier: 3, tierReasoning: "Storm-driven revenue is episodic, weak recurring base.", priorityState: false, firstSeen: "2026-07-02", status: "reviewed" },
  { id: "l11", name: "Lake & Pond Management Services — 400 HOA Contracts", source: "bizbuysell", industry: "Lake/Pond Management", city: "Orlando", state: "FL", asking: 3_600_000, cashFlow: 940_000, cashFlowType: "EBITDA", revenue: 3_900_000, tier: 1, tierReasoning: "Recurring HOA contracts in fragmented niche vertical.", priorityState: false, firstSeen: "2026-07-01", status: "new" },
  { id: "l12", name: "Garage Door Installation & Repair", source: "bizbuysell", industry: "Windows & Doors", city: "Atlanta", state: "GA", asking: 1_750_000, cashFlow: 520_000, cashFlowType: "SDE", revenue: 2_400_000, tier: 2, tierReasoning: "60/40 repair-to-install mix, priority state.", priorityState: true, firstSeen: "2026-06-30", status: "new" },
];

export function money(n: number | null): string {
  if (n === null) return "—";
  if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(n % 1_000_000 === 0 ? 0 : 1)}M`;
  if (n >= 1_000) return `$${Math.round(n / 1_000)}K`;
  return `$${n}`;
}
