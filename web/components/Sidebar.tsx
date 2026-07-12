"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";

// Month-to-date spend badge (docs/COST-TRACKING.md). Renders nothing until
// Lane C's GET /api/costs exists; then it's pinned on every tab.
type Costs = {
  monthTotal: number;
  subsMonthly: number;
  variableTotal: number;
  byService?: { service: string; cost: number }[];
  byActivity?: { activity: string; cost: number }[];
  costPerContact?: number | null;
};

function CostBadge() {
  const [costs, setCosts] = useState<Costs | null>(null);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    let alive = true;
    const load = () =>
      fetch("/api/costs", { cache: "no-store" })
        .then((r) => (r.ok ? r.json() : null))
        .then((d) => alive && d && typeof d.monthTotal === "number" && setCosts(d))
        .catch(() => {});
    load();
    const t = setInterval(load, 60_000);
    return () => { alive = false; clearInterval(t); };
  }, []);

  if (!costs) return null;
  const fmt = (n: number) => `$${n.toFixed(2)}`;

  return (
    <div className="px-3 pt-3">
      <button
        onClick={() => setOpen((o) => !o)}
        title="Month-to-date platform spend — click for breakdown"
        className="w-full rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-left hover:bg-emerald-100"
      >
        <span className="text-[10px] font-semibold uppercase tracking-wider text-emerald-700">This month</span>
        <span className="float-right text-sm font-bold tabular-nums text-emerald-900">{fmt(costs.monthTotal)}</span>
      </button>
      {open && (
        <div className="mt-1 rounded-lg border border-zinc-200 bg-white p-3 text-xs space-y-2">
          <div className="flex justify-between">
            <span className="text-zinc-500">Subscriptions (fixed)</span>
            <span className="font-medium tabular-nums">{fmt(costs.subsMonthly)}/mo</span>
          </div>
          <div className="flex justify-between">
            <span className="text-zinc-500">Usage (variable)</span>
            <span className="font-medium tabular-nums">{fmt(costs.variableTotal)}</span>
          </div>
          {(costs.byService ?? []).map((s) => (
            <div key={s.service} className="flex justify-between pl-3 text-zinc-400">
              <span>{s.service}</span>
              <span className="tabular-nums">{fmt(s.cost)}</span>
            </div>
          ))}
          {costs.costPerContact != null && (
            <div className="border-t border-zinc-100 pt-2 flex justify-between">
              <span className="text-zinc-500">Cost / owner contact</span>
              <span className="font-semibold tabular-nums text-emerald-700">{fmt(costs.costPerContact)}</span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// IA per docs/DASHBOARD-VISION.md: overview layer spanning both sourcing
// prongs, then the two engines, then CRM, then outreach — reads top-to-bottom
// as criteria → engines → CRM → outreach.
const nav: { section: string; items: { label: string; href: string | null }[] }[] = [
  {
    section: "Overview",
    items: [
      { label: "Dashboard", href: "/" },
      { label: "Market Multiples", href: "/analytics" },
    ],
  },
  {
    // Criteria lives here, not Overview: screen_profiles is consumed only by
    // the broker-scrape tiering pipeline (confirmed 7/12) — proprietary
    // sourcing has no financials to screen on.
    section: "Broker Sourcing",
    items: [
      { label: "Broker Listings", href: "/listings" },
      { label: "Scrape Criteria", href: "/criteria" },
      { label: "Scrape Sources", href: "/sources" },
    ],
  },
  {
    section: "Proprietary Sourcing",
    items: [
      { label: "Proprietary Outreach", href: "/list-building" },
      { label: "Enrichment", href: "/enrichment" },
    ],
  },
  {
    section: "CRM",
    items: [
      { label: "Pipeline", href: "/pipeline" },
      { label: "Deals", href: "/deals" },
      { label: "Companies", href: "/companies" },
      { label: "Contacts", href: "/contacts" },
      { label: "Brokers", href: "/brokers" },
    ],
  },
  {
    section: "Outreach",
    items: [
      { label: "Outbox", href: "/outbox" },
      { label: "Outreach Library", href: "/outreach" },
      { label: "Cold Calling", href: "/cold-calling" },
    ],
  },
];

export default function Sidebar() {
  const pathname = usePathname();
  return (
    <aside className="w-60 shrink-0 border-r border-zinc-200 bg-white flex flex-col">
      <div className="px-5 py-5 border-b border-zinc-200">
        <div className="text-lg font-bold tracking-tight text-emerald-800">Pronghorn</div>
        <div className="text-xs text-zinc-500">Deal Sourcing Platform</div>
      </div>
      <CostBadge />
      <nav className="flex-1 px-3 py-4 space-y-6">
        {nav.map((group) => (
          <div key={group.section}>
            <div className="px-2 mb-1.5 text-[11px] font-semibold uppercase tracking-wider text-zinc-400">
              {group.section}
            </div>
            <ul className="space-y-0.5">
              {group.items.map((item) =>
                item.href ? (
                  <li key={item.label}>
                    <Link
                      href={item.href}
                      className={`block rounded-md px-2 py-1.5 text-sm ${
                        pathname === item.href
                          ? "bg-emerald-50 font-medium text-emerald-900"
                          : "text-zinc-700 hover:bg-zinc-100"
                      }`}
                    >
                      {item.label}
                    </Link>
                  </li>
                ) : (
                  <li
                    key={item.label}
                    className="flex items-center justify-between px-2 py-1.5 text-sm text-zinc-400"
                  >
                    {item.label}
                    <span className="rounded bg-zinc-100 px-1.5 py-0.5 text-[10px] font-medium">
                      soon
                    </span>
                  </li>
                )
              )}
            </ul>
          </div>
        ))}
      </nav>
      <div className="px-5 py-4 border-t border-zinc-200 text-xs text-zinc-400">
        John Hodson · Tom Berman
      </div>
    </aside>
  );
}
