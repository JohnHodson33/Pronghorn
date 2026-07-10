// Live CRM loaders — deals with company detail, and the companies list.
import { hasDb, serverDb } from "./db";

export type LiveDeal = {
  id: string;
  company: string;
  industry: string | null;
  city: string | null;
  state: string | null;
  revenue: number | null;
  ebitda: number | null;
  ebitdaType: string;
  asking: number | null;
  stage: string;
  nextStep: string | null;
  nextStepDue: string | null;
};

type DealRow = {
  id: string;
  name: string;
  stage: string;
  asking_price: number | string | null;
  next_step: string | null;
  next_step_due: string | null;
  companies: {
    name: string;
    industry: string | null;
    city: string | null;
    state: string | null;
    revenue: number | string | null;
    ebitda: number | string | null;
    ebitda_type: string | null;
  } | null;
};

const num = (v: number | string | null) => (v === null || v === undefined ? null : Number(v));

export async function fetchDeals(): Promise<LiveDeal[] | null> {
  if (!hasDb()) return null;
  const { data, error } = await serverDb()
    .from("deals")
    .select(
      "id, name, stage, asking_price, next_step, next_step_due, companies(name, industry, city, state, revenue, ebitda, ebitda_type)"
    )
    .order("created_at", { ascending: false });
  if (error) {
    console.error("fetchDeals failed:", error.message);
    return null;
  }
  return (data as unknown as DealRow[]).map((d) => ({
    id: d.id,
    company: d.companies?.name ?? d.name,
    industry: d.companies?.industry ?? null,
    city: d.companies?.city ?? null,
    state: d.companies?.state ?? null,
    revenue: num(d.companies?.revenue ?? null),
    ebitda: num(d.companies?.ebitda ?? null),
    ebitdaType: d.companies?.ebitda_type === "SDE" ? "SDE" : "EBITDA",
    asking: num(d.asking_price),
    stage: d.stage,
    nextStep: d.next_step,
    nextStepDue: d.next_step_due,
  }));
}

export type CompanyRow = {
  id: string;
  name: string;
  industry: string | null;
  city: string | null;
  state: string | null;
  revenue: number | string | null;
  ebitda: number | string | null;
  ebitda_type: string | null;
  origin: string | null;
  created_at: string;
  deals: { stage: string }[];
};

export async function fetchCompanies(): Promise<CompanyRow[] | null> {
  if (!hasDb()) return null;
  const { data, error } = await serverDb()
    .from("companies")
    .select("id, name, industry, city, state, revenue, ebitda, ebitda_type, origin, created_at, deals(stage)")
    .order("created_at", { ascending: false });
  if (error) {
    console.error("fetchCompanies failed:", error.message);
    return null;
  }
  return data as unknown as CompanyRow[];
}
