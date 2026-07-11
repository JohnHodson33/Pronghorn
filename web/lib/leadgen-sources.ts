// The off-market list-building source stack (from docs/LEADGEN-SOURCES.md).
// cost: free | paid | rescue (rescue = only fires when primaries miss target).
// needsKey: which API credential must be connected before it can run.

export type LeadGenSource = {
  id: string;
  name: string;
  cost: "free" | "paid" | "rescue";
  needsKey: string | null;
  desc: string;
  defaultOn: boolean;
};

export const LEADGEN_SOURCES: LeadGenSource[] = [
  { id: "serper_local", name: "Google Local (Serper)", cost: "paid", needsKey: "SERPER_API_KEY", desc: "Local-pack — best per-lead signal: rating + phone + address", defaultOn: true },
  { id: "serper_maps", name: "Google Maps (Serper)", cost: "paid", needsKey: "SERPER_API_KEY", desc: "Maps engine — places not in the local pack", defaultOn: true },
  { id: "serper_web", name: "Google Web (Serper)", cost: "paid", needsKey: "SERPER_API_KEY", desc: "Organic results — company sites that don't show in Maps", defaultOn: true },
  { id: "google_places", name: "Google Places (official)", cost: "rescue", needsKey: "GOOGLE_PLACES_API_KEY", desc: "Structured source; fires when core sources fall short. Free $200/mo credit", defaultOn: true },
  { id: "osm", name: "OpenStreetMap (Overpass)", cost: "free", needsKey: null, desc: "Long-tail; best for trades with strong OSM coverage. No key needed", defaultOn: true },
  { id: "bbb", name: "Better Business Bureau", cost: "free", needsKey: null, desc: "Category listings + A+/A/B accreditation grade (quality signal)", defaultOn: true },
  { id: "state_license", name: "State license boards", cost: "free", needsKey: null, desc: "Pest/contractor registries (AZ, TX, GA, NC, SC, TN, FL…) — complete legal-operator lists", defaultOn: true },
  { id: "trade_assoc", name: "Trade associations", cost: "free", needsKey: null, desc: "NALP (landscape), TCIA (tree), NPMA (pest), PHTA (pool), ACCA (HVAC)", defaultOn: true },
  { id: "sos", name: "Secretary of State registries", cost: "free", needsKey: null, desc: "Owner names + entity age BEFORE the VA step (cuts enrichment cost)", defaultOn: true },
  { id: "parallel", name: "Parallel (AI company search)", cost: "rescue", needsKey: "PARALLEL_API_KEY", desc: "Entity search in plain language; strongest in thin markets", defaultOn: true },
  { id: "exa", name: "Exa (AI search)", cost: "rescue", needsKey: "EXA_API_KEY", desc: "Fires only when other sources come up short", defaultOn: true },
];
