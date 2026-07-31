// Cost aggregates for the Sidebar CostBadge + the /costs page (COST-TRACKING.md).
// Returns TWO windows (John 7/20) — `month` (current calendar month) and `ytd`
// (Jan 1 → now) — each with the same {subscriptions, variable, byService,
// byActivity, total} breakdown. Legacy top-level fields mirror `month.*` so the
// existing badge keeps working while Lane B migrates to the two-column view.
//
// Accounting rules (John caught the phantom $ 7/12 eve):
//  - Subscriptions ARE the cash cost of the services they cover (Hunter flat).
//    Usage of a subscription-covered service books $0 marginal but records
//    UNITS, surfaced as "searches used / cap" — never fake per-use dollars.
//  - variable = only true pay-per-use / invoiced spend (Claude tokens, Exa,
//    Serper, Tracerfy, the manually-logged Upwork VA…).
//  - total = subscriptions + variable. costPerContact amortizes both (MTD).
//  - YTD subscriptions = active subs × months elapsed this year (from a sub's
//    start_date if set, else assumed active since Jan 1 — disclosed in ytd.note).
import { NextResponse } from "next/server";
import { hasDb, serverDb } from "@/lib/db";
import type { SupabaseClient } from "@supabase/supabase-js";

export const dynamic = "force-dynamic";

// known monthly search caps for subscription services (for the quota display)
const QUOTA_CAPS: Record<string, number> = { hunter: 500 };

type UsageRow = { service: string; activity: string; units: number | string; cost_usd: number | string };

// Page through usage_events so a high-volume window is never silently capped
// (Supabase caps a single request at 1000 rows). Honest totals > fast totals.
async function fetchUsageSince(db: SupabaseClient, sinceIso: string): Promise<UsageRow[]> {
  const rows: UsageRow[] = [];
  const PAGE = 1000;
  for (let from = 0; ; from += PAGE) {
    const { data, error } = await db
      .from("usage_events")
      .select("service, activity, units, cost_usd")
      .gte("at", sinceIso)
      .order("at", { ascending: true })
      .range(from, from + PAGE - 1);
    if (error) throw error;
    const batch = data ?? [];
    rows.push(...(batch as UsageRow[]));
    if (batch.length < PAGE) break;
  }
  return rows;
}

const round = (n: number) => Number(n.toFixed(2));

// Roll a set of usage rows into the {variable, byService, byActivity, unitsByService} shape.
function rollup(events: UsageRow[]) {
  const byService = new Map<string, number>();
  const byActivity = new Map<string, number>();
  const unitsByService = new Map<string, number>();
  let variable = 0;
  for (const e of events) {
    const c = Number(e.cost_usd) || 0;
    variable += c;
    byService.set(e.service, (byService.get(e.service) ?? 0) + c);
    byActivity.set(e.activity, (byActivity.get(e.activity) ?? 0) + c);
    unitsByService.set(e.service, (unitsByService.get(e.service) ?? 0) + (Number(e.units) || 0));
  }
  return { variable, byService, byActivity, unitsByService };
}

const serviceArr = (m: Map<string, number>) =>
  [...m.entries()].filter(([, c]) => c > 0).map(([service, cost]) => ({ service, cost: round(cost) })).sort((a, b) => b.cost - a.cost);
const activityArr = (m: Map<string, number>) =>
  [...m.entries()].filter(([, c]) => c > 0).map(([activity, cost]) => ({ activity, cost: round(cost) })).sort((a, b) => b.cost - a.cost);

const MS_PER_MONTH = (365.25 / 12) * 24 * 3600 * 1000;

type Sub = { name: string; monthly_usd: number | string; planned?: boolean; start_date?: string | null };

// Whole-plus-fractional months a sub has been active this year (Jan 1 → now,
// clamped to its start_date). Continuous accrual so a mid-month "now" is honest.
function monthsActiveYtd(sub: Sub, jan1: Date, now: Date): number {
  const start = sub.start_date ? new Date(sub.start_date) : jan1;
  const eff = start.getTime() > jan1.getTime() ? start : jan1;
  const months = (now.getTime() - eff.getTime()) / MS_PER_MONTH;
  return months > 0 ? months : 0;
}

export async function GET() {
  if (!hasDb()) return NextResponse.json({ error: "no db" }, { status: 503 });
  const db = serverDb();
  const now = new Date();
  const monthStart = new Date();
  monthStart.setUTCDate(1); monthStart.setUTCHours(0, 0, 0, 0);
  const jan1 = new Date(Date.UTC(now.getUTCFullYear(), 0, 1, 0, 0, 0, 0));

  let ytdEvents: UsageRow[];
  let monthEvents: UsageRow[];
  let subs: Sub[];
  let owners: number;
  try {
    const [ytd, month, subsRes, ownersRes] = await Promise.all([
      fetchUsageSince(db, jan1.toISOString()),
      fetchUsageSince(db, monthStart.toISOString()),
      // select('*') so a missing optional column can't error the whole query
      db.from("subscriptions").select("*").eq("active", true),
      db.from("contacts").select("id", { count: "exact", head: true }).eq("role", "owner").gte("created_at", monthStart.toISOString()),
    ]);
    ytdEvents = ytd;
    monthEvents = month;
    subs = (subsRes.data as Sub[]) ?? [];
    owners = ownersRes.count ?? 0;
  } catch (err) {
    const msg = (err as Error).message;
    return NextResponse.json({
      monthTotal: 0, subsMonthly: 0, variableTotal: 0, byService: [], byActivity: [], quotas: [],
      ownerContactsAcquired: 0, costPerContact: null,
      month: null, ytd: null,
      note: `${msg} — apply migration 0009 to activate metering`,
    });
  }

  const monthRoll = rollup(monthEvents);
  const ytdRoll = rollup(ytdEvents);

  // --- subscriptions: monthly floor, and YTD accrual ---
  const subsMonthly = subs.reduce((s, r) => s + Number(r.monthly_usd || 0), 0);
  let subsYtd = 0;
  const assumedJan1: string[] = [];
  for (const s of subs) {
    const m = monthsActiveYtd(s, jan1, now);
    subsYtd += Number(s.monthly_usd || 0) * m;
    if (!s.start_date) assumedJan1.push(s.name);
  }

  // quota rows (searches used / cap) — from the CURRENT MONTH's units
  const quotas = Object.entries(QUOTA_CAPS)
    .filter(([svc]) => monthRoll.unitsByService.has(svc))
    .map(([svc, cap]) => ({ service: svc, used: monthRoll.unitsByService.get(svc) ?? 0, cap }));

  const monthTotal = round(monthRoll.variable + subsMonthly);
  const ytdTotal = round(ytdRoll.variable + subsYtd);

  const monthWindow = {
    label: now.toLocaleDateString("en-US", { month: "long", year: "numeric", timeZone: "UTC" }),
    subscriptions: round(subsMonthly),
    variable: round(monthRoll.variable),
    byService: serviceArr(monthRoll.byService),
    byActivity: activityArr(monthRoll.byActivity),
    total: monthTotal,
  };
  const ytdWindow = {
    label: `YTD ${now.getUTCFullYear()}`,
    subscriptions: round(subsYtd),
    variable: round(ytdRoll.variable),
    byService: serviceArr(ytdRoll.byService),
    byActivity: activityArr(ytdRoll.byActivity),
    total: ytdTotal,
    // disclose the assumption so YTD subs is never a silent fabrication
    note: assumedJan1.length
      ? `YTD subscriptions assume active since Jan 1 for: ${assumedJan1.join(", ")}. Set start_date (0020) to make exact.`
      : null,
  };

  return NextResponse.json({
    // NEW: two windows, same breakdown each
    month: monthWindow,
    ytd: ytdWindow,
    // shared context
    quotas,
    ownerContactsAcquired: owners,
    // amortized + honest: whole monthly spend ÷ owner contacts acquired (MTD)
    costPerContact: owners ? round(monthTotal / owners) : null,
    subscriptions: subs.map((s) => ({
      name: s.name, monthly_usd: Number(s.monthly_usd),
      planned: (s as { planned?: boolean }).planned ?? /planned/i.test(s.name),
      start_date: s.start_date ?? null,
    })),
    // BACKWARD-COMPAT (existing Sidebar badge reads these) — mirror month.*
    monthTotal,
    subsMonthly: round(subsMonthly),
    variableTotal: round(monthRoll.variable),
    byService: monthWindow.byService,
    byActivity: monthWindow.byActivity,
  });
}
