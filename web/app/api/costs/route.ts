// Month-to-date cost aggregates for the Sidebar CostBadge (COST-TRACKING.md).
// GET → { monthTotal, subsMonthly, variableTotal, byService, byActivity,
//         quotas, ownerContactsAcquired, costPerContact, subscriptions }
//
// Accounting rules (John caught the phantom $ 7/12 eve):
//  - Subscriptions ARE the cash cost of the services they cover (Hunter flat).
//    Usage of a subscription-covered service books $0 marginal but records
//    UNITS, surfaced as "searches used / cap" — never fake per-use dollars.
//  - variableTotal = only true pay-per-use spend (Claude tokens, Exa, Serper…).
//  - monthTotal = subsMonthly + variableTotal. costPerContact amortizes both.
import { NextResponse } from "next/server";
import { hasDb, serverDb } from "@/lib/db";

export const dynamic = "force-dynamic";

// known monthly search caps for subscription services (for the quota display)
const QUOTA_CAPS: Record<string, number> = { hunter: 500 };

export async function GET() {
  if (!hasDb()) return NextResponse.json({ error: "no db" }, { status: 503 });
  const db = serverDb();
  const monthStart = new Date();
  monthStart.setUTCDate(1); monthStart.setUTCHours(0, 0, 0, 0);
  const since = monthStart.toISOString();

  const [eventsRes, subsRes, ownersRes] = await Promise.all([
    db.from("usage_events").select("service, activity, units, cost_usd").gte("at", since).limit(10000),
    // select('*') so a missing optional column ('planned') can't error the
    // whole query and zero out subsMonthly (the regression John saw)
    db.from("subscriptions").select("*").eq("active", true),
    db.from("contacts").select("id", { count: "exact", head: true }).eq("role", "owner").gte("created_at", since),
  ]);

  if (eventsRes.error) {
    return NextResponse.json({
      monthTotal: 0, subsMonthly: 0, variableTotal: 0, byService: [], byActivity: [], quotas: [],
      ownerContactsAcquired: ownersRes.count ?? 0, costPerContact: null,
      note: `${eventsRes.error.message} — apply migration 0009 to activate metering`,
    });
  }

  const byService = new Map<string, number>();
  const byActivity = new Map<string, number>();
  const unitsByService = new Map<string, number>();
  let variableTotal = 0;
  for (const e of eventsRes.data ?? []) {
    const c = Number(e.cost_usd) || 0;
    variableTotal += c;
    byService.set(e.service, (byService.get(e.service) ?? 0) + c);
    byActivity.set(e.activity, (byActivity.get(e.activity) ?? 0) + c);
    unitsByService.set(e.service, (unitsByService.get(e.service) ?? 0) + (Number(e.units) || 0));
  }

  const subs = subsRes.data ?? [];
  const subsMonthly = subs.reduce((s, r) => s + Number(r.monthly_usd || 0), 0);
  const owners = ownersRes.count ?? 0;
  const round = (n: number) => Number(n.toFixed(2));

  // quota rows for subscription-covered services (searches used / cap)
  const quotas = Object.entries(QUOTA_CAPS)
    .filter(([svc]) => unitsByService.has(svc))
    .map(([svc, cap]) => ({ service: svc, used: unitsByService.get(svc) ?? 0, cap }));

  const monthTotal = round(variableTotal + subsMonthly);
  return NextResponse.json({
    monthTotal,
    subsMonthly: round(subsMonthly),
    variableTotal: round(variableTotal),
    // only services with real pay-per-use dollars appear here (Hunter now $0)
    byService: [...byService.entries()].filter(([, c]) => c > 0).map(([service, cost]) => ({ service, cost: round(cost) })).sort((a, b) => b.cost - a.cost),
    byActivity: [...byActivity.entries()].filter(([, c]) => c > 0).map(([activity, cost]) => ({ activity, cost: round(cost) })).sort((a, b) => b.cost - a.cost),
    quotas,
    ownerContactsAcquired: owners,
    // amortized + honest: whole monthly spend ÷ owner contacts acquired
    costPerContact: owners ? round(monthTotal / owners) : null,
    subscriptions: subs.map((s) => ({ name: s.name, monthly_usd: Number(s.monthly_usd), planned: s.planned ?? /planned/i.test(s.name) })),
  });
}
