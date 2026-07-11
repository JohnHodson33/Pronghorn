"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

// IA per docs/DASHBOARD-VISION.md: overview layer spanning both sourcing
// prongs, then the two engines, then CRM, then outreach — reads top-to-bottom
// as criteria → engines → CRM → outreach.
const nav: { section: string; items: { label: string; href: string | null }[] }[] = [
  {
    section: "Overview",
    items: [
      { label: "Dashboard", href: "/" },
      { label: "Market Multiples", href: "/analytics" },
      { label: "Screening Criteria", href: "/criteria" },
    ],
  },
  {
    section: "Broker Sourcing",
    items: [
      { label: "Broker Listings", href: "/listings" },
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
