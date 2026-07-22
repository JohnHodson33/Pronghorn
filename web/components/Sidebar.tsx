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
        className="w-full rounded-lg px-3 py-1.5 text-left"
        style={{ background: "rgba(237,231,212,0.08)", border: "1px solid rgba(237,231,212,0.18)" }}
      >
        <span className="text-[10px] font-semibold uppercase tracking-wider" style={{ color: "#C9BD96" }}>This month</span>
        <span className="float-right text-sm font-bold tabular-nums" style={{ color: "#EDE7D4" }}>{fmt(costs.monthTotal)}</span>
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
      { label: "River Guides", href: "/river-guides" },
      { label: "Enrichment", href: "/enrichment" },
      { label: "Size Estimation", href: "/size-estimation" },
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
  {
    section: "Platform",
    items: [
      { label: "Improvements", href: "/improvements" },
      { label: "Data Intake", href: "/intake" },
      { label: "Costs", href: "/costs" },
    ],
  },
];

// Brand palette from pronghornequity.com/styles.css (7/12): navy-deep #17301F,
// navy #1E3A30, ivory #EDE7D4, paper #FBF9F2, gold #C9BD96 / #A89A6F.
export default function Sidebar() {
  const pathname = usePathname();
  // h-screen + sticky so the nav's overflow-y-auto actually scrolls. Without a
  // height cap the aside grew with the page and everything below "Contacts"
  // (Brokers, Outreach, Improvements, Data Intake, Costs) sat below the fold
  // with no way to reach it — John couldn't find the Costs page at all (7/21).
  return (
    <aside className="w-60 shrink-0 flex flex-col h-screen sticky top-0" style={{ background: "#17301F", borderRight: "1px solid rgba(237,231,212,0.14)" }}>
      <div className="px-5 py-5 flex items-center gap-3" style={{ borderBottom: "1px solid rgba(237,231,212,0.14)" }}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/pronghorn-logo.png" alt="Pronghorn" className="h-11 w-auto" />
        <div>
          <div className="text-lg font-bold tracking-wide" style={{ color: "#EDE7D4", fontFamily: "'Playfair Display', Georgia, serif" }}>
            PRONGHORN
          </div>
          <div className="text-[10px] uppercase tracking-[0.18em]" style={{ color: "#C9BD96" }}>
            Equity Partners
          </div>
        </div>
      </div>
      <CostBadge />
      <nav className="flex-1 px-3 py-4 space-y-6 overflow-y-auto">
        {nav.map((group) => (
          <div key={group.section}>
            <div className="px-2 mb-1.5 text-[11px] font-semibold uppercase tracking-wider" style={{ color: "#A89A6F" }}>
              {group.section}
            </div>
            <ul className="space-y-0.5">
              {group.items.map((item) =>
                item.href ? (
                  <li key={item.label}>
                    <Link
                      href={item.href}
                      className="block rounded-md px-2 py-1.5 text-sm transition-colors"
                      style={
                        pathname === item.href
                          ? { background: "#2C5A43", color: "#EDE7D4", fontWeight: 600 }
                          : { color: "rgba(237,231,212,0.74)" }
                      }
                    >
                      {item.label}
                    </Link>
                  </li>
                ) : (
                  <li key={item.label} className="flex items-center justify-between px-2 py-1.5 text-sm" style={{ color: "rgba(237,231,212,0.45)" }}>
                    {item.label}
                    <span className="rounded px-1.5 py-0.5 text-[10px] font-medium" style={{ background: "rgba(237,231,212,0.1)" }}>
                      soon
                    </span>
                  </li>
                )
              )}
            </ul>
          </div>
        ))}
      </nav>
      <div className="px-5 py-4 text-xs" style={{ borderTop: "1px solid rgba(237,231,212,0.14)", color: "#A89A6F" }}>
        John Hodson · Tom Berman
      </div>
    </aside>
  );
}
