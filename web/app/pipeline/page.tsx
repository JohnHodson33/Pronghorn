import Link from "next/link";
import { deals as mockDeals, money, STAGES } from "@/lib/mock";
import { fetchDeals } from "@/lib/crm";

export const dynamic = "force-dynamic";

type Card = {
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
  broker?: string;
  brokerage?: string;
  nextStep: string | null;
  nextStepDue: string | null;
};

export default async function Pipeline() {
  const live = await fetchDeals();
  const isLive = live !== null && live.length > 0;
  const cards: Card[] = isLive
    ? live!
    : mockDeals
        .filter((d) => !d.passed)
        .map((d) => ({ ...d, industry: d.industry as string | null, city: d.city, state: d.state }));
  const passedCount = isLive ? 0 : mockDeals.filter((d) => d.passed).length;

  return (
    <div className="flex h-full flex-col p-4 md:p-8">
      <header className="mb-6 flex items-end justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Deal Pipeline</h1>
          <p className="text-sm text-zinc-500">
            Sourced through Closed. Passed deals keep their record but leave the board.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span
            className={`rounded-full px-3 py-1 text-xs font-semibold ${
              isLive ? "bg-emerald-100 text-emerald-800" : "bg-amber-100 text-amber-800"
            }`}
          >
            {isLive ? "● LIVE DATA" : "sample data — promote a listing to go live"}
          </span>
          <span className="rounded-full bg-zinc-100 px-3 py-1 text-xs font-medium text-zinc-500">
            Passed deals: {passedCount}
          </span>
        </div>
      </header>

      <div className="flex min-h-0 flex-1 gap-4 overflow-x-auto pb-4">
        {STAGES.map((stage) => {
          const inStage = cards.filter((d) => d.stage === stage);
          const totRev = inStage.reduce((s, d) => s + (d.revenue ?? 0), 0);
          const totEbitda = inStage.reduce((s, d) => s + (d.ebitda ?? 0), 0);
          return (
            <div key={stage} className="flex w-72 shrink-0 flex-col rounded-xl bg-zinc-100/80">
              <div className="px-4 py-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-semibold">{stage}</span>
                  <span className="rounded-full bg-white px-2 py-0.5 text-xs font-medium text-zinc-600">
                    {inStage.length}
                  </span>
                </div>
                <div className="mt-1 text-xs text-zinc-500 tabular-nums">
                  {money(totRev)} rev · <span className="font-semibold text-emerald-800">{money(totEbitda)} EBITDA</span>
                </div>
              </div>
              <div className="flex-1 space-y-3 overflow-y-auto px-3 pb-3">
                {inStage.map((d) => (
                  <Link
                    key={d.id}
                    href={isLive ? `/deals/${d.id}` : "#"}
                    className="block rounded-lg border border-zinc-200 bg-white p-4 shadow-sm transition hover:border-emerald-500 hover:shadow-md"
                  >
                    <div className="font-semibold leading-snug">{d.company}</div>
                    <div className="mt-0.5 text-xs text-zinc-500">
                      {[d.industry, [d.city, d.state].filter(Boolean).join(", ")].filter(Boolean).join(" · ")}
                    </div>
                    <dl className="mt-3 space-y-1 text-sm tabular-nums">
                      <div className="flex justify-between">
                        <dt className="text-zinc-500">Revenue</dt>
                        <dd className="font-medium">{money(d.revenue)}</dd>
                      </div>
                      <div className="flex justify-between">
                        <dt className="font-medium text-emerald-800">{d.ebitdaType}</dt>
                        <dd className="font-bold text-emerald-800">{money(d.ebitda)}</dd>
                      </div>
                      {d.asking !== null && (
                        <div className="flex justify-between">
                          <dt className="text-zinc-500">Asking</dt>
                          <dd className="font-medium">{money(d.asking)}</dd>
                        </div>
                      )}
                    </dl>
                    {d.broker && (
                      <div className="mt-3 border-t border-zinc-100 pt-2 text-xs text-zinc-600">
                        <span className="font-medium text-zinc-400">Broker · </span>
                        {d.broker}
                        {d.brokerage ? `, ${d.brokerage}` : ""}
                      </div>
                    )}
                    {d.nextStep && (
                      <div className="mt-2 flex items-center justify-between rounded-md bg-amber-50 px-2 py-1.5 text-xs">
                        <span className="truncate font-medium text-amber-900">{d.nextStep}</span>
                        {d.nextStepDue && (
                          <span className="ml-2 shrink-0 font-semibold text-amber-700">
                            {d.nextStepDue.slice(5, 10).replace("-", "/")}
                          </span>
                        )}
                      </div>
                    )}
                  </Link>
                ))}
                {inStage.length === 0 && (
                  <div className="rounded-lg border border-dashed border-zinc-300 px-3 py-6 text-center text-xs text-zinc-400">
                    No deals
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
