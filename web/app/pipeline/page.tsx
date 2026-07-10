import { deals, money, STAGES } from "@/lib/mock";

export default function Pipeline() {
  return (
    <div className="flex h-screen flex-col p-8">
      <header className="mb-6">
        <h1 className="text-2xl font-bold tracking-tight">Deal Pipeline</h1>
        <p className="text-sm text-zinc-500">
          EBITDA-forward deal cards. Drag-and-drop and stage editing come with the live build.
        </p>
      </header>

      <div className="flex min-h-0 flex-1 gap-4 overflow-x-auto pb-4">
        {STAGES.map((stage) => {
          const inStage = deals.filter((d) => d.stage === stage);
          return (
            <div key={stage} className="flex w-72 shrink-0 flex-col rounded-xl bg-zinc-100/80">
              <div className="flex items-center justify-between px-4 py-3">
                <span className="text-sm font-semibold">{stage}</span>
                <span className="rounded-full bg-white px-2 py-0.5 text-xs font-medium text-zinc-600">
                  {inStage.length}
                </span>
              </div>
              <div className="flex-1 space-y-3 overflow-y-auto px-3 pb-3">
                {inStage.map((d) => (
                  <div key={d.id} className="rounded-lg border border-zinc-200 bg-white p-4 shadow-sm">
                    <div className="font-semibold leading-snug">{d.company}</div>
                    <div className="mt-0.5 text-xs text-zinc-500">
                      {d.industry} · {d.city}, {d.state}
                    </div>
                    <div className="mt-3 flex items-baseline gap-2">
                      <span className="text-xl font-bold tabular-nums text-emerald-800">
                        {money(d.ebitda)}
                      </span>
                      <span className="text-xs text-zinc-500">{d.ebitdaType}</span>
                    </div>
                    <div className="mt-1 text-xs text-zinc-500 tabular-nums">
                      rev {money(d.revenue)}
                      {d.asking !== null && <> · ask {money(d.asking)}</>}
                    </div>
                    <div className="mt-3 border-t border-zinc-100 pt-2 text-xs text-zinc-600">
                      {d.broker} · {d.brokerage}
                    </div>
                    {d.nextStep && (
                      <div className="mt-2 flex items-center justify-between rounded-md bg-amber-50 px-2 py-1.5 text-xs">
                        <span className="truncate font-medium text-amber-900">{d.nextStep}</span>
                        {d.nextStepDue && (
                          <span className="ml-2 shrink-0 font-semibold text-amber-700">
                            {d.nextStepDue.slice(5).replace("-", "/")}
                          </span>
                        )}
                      </div>
                    )}
                  </div>
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
