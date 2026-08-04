// Serper credit-runway sentinel (John 8/4: prepaid packs only, NO auto-recharge,
// credits EXPIRE 6 months after purchase — the 7/22 outage must never repeat
// via silent depletion OR silent expiry). PM/John set app_config keys
// serper_pack_credits + serper_pack_purchased_at on each top-up; balance =
// pack - SUM(usage_events.units, service='serper', at >= purchase).
//
// Used by /api/costs (runway line) and the dashboard (alert Key Actions).
import type { SupabaseClient } from "@supabase/supabase-js";

const PACK_MONTHS_TO_EXPIRY = 6;
const LOW_BALANCE = 5000;
const EXPIRY_WARN_DAYS = 30;
const RUNAWAY_PER_DAY = 500;
const RUNAWAY_PER_MONTH = 15000;

export type SerperRunway = {
  configured: boolean;
  packCredits?: number;
  purchasedAt?: string;
  expiresAt?: string;
  used?: number;
  remaining?: number;
  burnPerDay?: number;       // average since purchase
  usedLast24h?: number;
  usedThisMonth?: number;
  runwayNote?: string;       // the /costs line, human-ready
  alerts: { kind: "serper_low" | "serper_runaway"; title: string; detail: string }[];
};

async function sumUnits(db: SupabaseClient, sinceIso: string): Promise<number> {
  let total = 0;
  for (let from = 0; ; from += 1000) {
    const { data, error } = await db.from("usage_events").select("units")
      .eq("service", "serper").gte("at", sinceIso).range(from, from + 999);
    if (error) throw error;
    total += (data ?? []).reduce((s, r) => s + (Number(r.units) || 0), 0);
    if ((data ?? []).length < 1000) break;
  }
  return total;
}

export async function fetchSerperRunway(db: SupabaseClient): Promise<SerperRunway> {
  const out: SerperRunway = { configured: false, alerts: [] };
  try {
    const { data: cfg } = await db.from("app_config").select("key, value")
      .in("key", ["serper_pack_credits", "serper_pack_purchased_at"]);
    const get = (k: string) => {
      const v = (cfg ?? []).find((r) => r.key === k)?.value;
      return typeof v === "string" ? v.replace(/^"|"$/g, "") : v == null ? null : String(v);
    };
    const pack = Number(get("serper_pack_credits"));
    const purchased = get("serper_pack_purchased_at");
    if (!Number.isFinite(pack) || pack <= 0 || !purchased) return out; // not configured — no fabricated runway

    const purchasedMs = new Date(purchased).getTime();
    if (isNaN(purchasedMs)) return out;
    const expires = new Date(purchasedMs);
    expires.setMonth(expires.getMonth() + PACK_MONTHS_TO_EXPIRY);

    const now = Date.now();
    const [used, usedLast24h, usedThisMonth] = await Promise.all([
      sumUnits(db, new Date(purchasedMs).toISOString()),
      sumUnits(db, new Date(now - 86400e3).toISOString()),
      sumUnits(db, new Date(new Date(now).getUTCFullYear(), new Date(now).getUTCMonth(), 1).toISOString()),
    ]);

    const remaining = Math.max(0, pack - used);
    const daysSince = Math.max(1, (now - purchasedMs) / 86400e3);
    const burnPerDay = used / daysSince;
    const daysToExpiry = Math.round((expires.getTime() - now) / 86400e3);
    const monthsAtBurn = burnPerDay > 0 ? remaining / burnPerDay / 30 : null;

    out.configured = true;
    out.packCredits = pack;
    out.purchasedAt = new Date(purchasedMs).toISOString().slice(0, 10);
    out.expiresAt = expires.toISOString().slice(0, 10);
    out.used = used;
    out.remaining = remaining;
    out.burnPerDay = Math.round(burnPerDay * 10) / 10;
    out.usedLast24h = usedLast24h;
    out.usedThisMonth = usedThisMonth;
    out.runwayNote = `Serper: ~${remaining.toLocaleString()} credits left` +
      (monthsAtBurn != null ? ` · ~${monthsAtBurn >= 12 ? "12+" : monthsAtBurn.toFixed(1)} mo at current burn` : " · no burn yet") +
      ` · expires ${out.expiresAt}`;

    if (remaining < LOW_BALANCE || daysToExpiry < EXPIRY_WARN_DAYS) {
      out.alerts.push({
        kind: "serper_low",
        title: remaining < LOW_BALANCE ? "Serper credits running low" : "Serper credits expire soon",
        detail: `${remaining.toLocaleString()} left, expires ${out.expiresAt} (${daysToExpiry}d) — top up at serper.dev ($50/50k; prepaid, no auto-recharge)`,
      });
    }
    if (usedLast24h > RUNAWAY_PER_DAY || usedThisMonth > RUNAWAY_PER_MONTH) {
      out.alerts.push({
        kind: "serper_runaway",
        title: "Serper burn is anomalously high",
        detail: `${usedLast24h.toLocaleString()} credits in 24h / ${usedThisMonth.toLocaleString()} this month (guard: ${RUNAWAY_PER_DAY}/day, ${RUNAWAY_PER_MONTH.toLocaleString()}/mo) — check for a looping worker before it drains the pack`,
      });
    }
  } catch { /* pre-0018 app_config or usage table absent — stay unconfigured */ }
  return out;
}
