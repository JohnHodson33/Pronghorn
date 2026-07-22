// Costs — what the machine actually spends (COST-TRACKING.md). Month and
// Year-to-Date side by side with the same breakdown each (John 7/20), plus the
// manual-entry form for invoiced spend no API meters (the Upwork VA).
import CostsView from "@/components/CostsView";

export const dynamic = "force-dynamic";

export default function CostsPage() {
  return (
    <div className="p-4 md:p-8 space-y-5">
      <header>
        <h1 className="text-2xl font-bold tracking-tight">Costs</h1>
        <p className="text-sm text-zinc-500">
          Subscriptions are the cash cost of the services they cover, so usage of a covered service
          books $0 marginal and shows units against its cap — never invented per-use dollars.
        </p>
      </header>
      <CostsView />
    </div>
  );
}
