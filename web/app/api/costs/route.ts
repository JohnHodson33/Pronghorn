// Month-to-date cost aggregates for the Sidebar CostBadge (COST-TRACKING.md).
// GET → { monthTotal, subsMonthly, variableTotal, byService, byActivity,
//         ownerContactsAcquired, costPerContact }
// Degrades to zeros with a note until migration 0009 lands.
import { NextResponse } from "next/server";
import { hasDb, serverDb } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET() {
  if (!hasDb()) return NextResponse.json({ error: "no db" }, { status: 503 });
  const db = serverDb();
  const monthStart = new Date();
  monthStart.setUTCDate(1); monthStart.setUTCHours(0, 0, 0, 0);
  const since = monthStart.toISOString();

  const [eventsRes, subsRes, ownersRes] = await Promise.all([
    db.from("usage_events").select("service, activity, units, cost_usd").gte("at", since).limit(10000),
    db.from("subscriptions").select("name, monthly_usd").eq("active", true),
    db.from("contacts").select("id", { count: "exact", head: true }).eq("role", "owner").gte("created_at", since),
  ]);

  if (eventsRes.error) {
    return NextResponse.json({
      monthTotal: 0, subsMonthly: 0, variableTotal: 0, byService: [], byActivity: [],
      ownerContactsAcquired: ownersRes.count ?? 0, costPerContact: null,
      note: `${eventsRes.error.message} — apply migration 0009 to activate metering`,
    });
  }

  const byService = new Map<string, number>();
  const byActivity = new Map<string, number>();
  let variableTotal = 0;
  for (const e of eventsRes.data ?? []) {
    const c = Number(e.cost_usd) || 0;
    variableTotal += c;
    byService.set(e.service, (byService.get(e.service) ?? 0) + c);
    byActivity.set(e.activity, (byActivity.get(e.activity) ?? 0) + c);
  }
  const subsMonthly = (subsRes.data ?? []).reduce((s, r) => s + Number(r.monthly_usd), 0);
  const owners = ownersRes.count ?? 0;
  const round = (n: number) => Number(n.toFixed(2));

  return NextResponse.json({
    monthTotal: round(variableTotal + subsMonthly),
    subsMonthly: round(subsMonthly),
    variableTotal: round(variableTotal),
    byService: [...byService.entries()].map(([service, cost]) => ({ service, cost: round(cost) })).sort((a, b) => b.cost - a.cost),
    byActivity: [...byActivity.entries()].map(([activity, cost]) => ({ activity, cost: round(cost) })).sort((a, b) => b.cost - a.cost),
    ownerContactsAcquired: owners,
    costPerContact: owners ? round(variableTotal / owners) : null,
    subscriptions: subsRes.data ?? [],
  });
}
