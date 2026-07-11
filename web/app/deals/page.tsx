// Deals index — the CRM search surface across ALL deals, including Passed
// (the pipeline board only shows active stages; nothing is ever lost here).
import DealsTable from "@/components/DealsTable";
import { fetchDeals } from "@/lib/crm";
import { hasDb } from "@/lib/db";

export const dynamic = "force-dynamic";

export default async function DealsPage({
  searchParams,
}: {
  searchParams: Promise<{ stage?: string }>;
}) {
  const { stage } = await searchParams;
  if (!hasDb()) return <div className="p-8 text-sm text-zinc-400">Database not connected.</div>;
  const deals = (await fetchDeals()) ?? [];

  return (
    <div className="p-4 md:p-8 space-y-5">
      <header>
        <h1 className="text-2xl font-bold tracking-tight">Deals</h1>
        <p className="text-sm text-zinc-500">
          Every deal ever — active, closed, and passed. Passed deals leave the pipeline board but live
          here forever (they sometimes come back).
        </p>
      </header>
      <DealsTable deals={deals} initialStage={stage} />
    </div>
  );
}
