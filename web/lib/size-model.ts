// Loads the editable size model (benchmarks + tier thresholds) from the DB,
// falling back to the seeded defaults pre-0014. Shared by /api/size-model,
// /api/leads and /api/companies so an edit in the Size Estimation tab
// cascades into every tier chip on the next read.
import { serverDb } from "@/lib/db";
import seedBenchmarks from "@/lib/size-benchmarks.json";
import { DEFAULT_THRESHOLDS, type Bench, type Thresholds } from "@/lib/size";

export async function loadSizeModel(): Promise<{
  benchmarks: Record<string, Bench>;
  thresholds: Thresholds;
  source: "db" | "seed";
}> {
  const db = serverDb();
  const [benchRes, thrRes] = await Promise.all([
    db.from("size_benchmarks").select("*"),
    db.from("size_thresholds").select("*").maybeSingle(),
  ]);
  if (benchRes.error || thrRes.error || !(benchRes.data ?? []).length) {
    const { _comment, ...seeds } = seedBenchmarks as Record<string, unknown>;
    return { benchmarks: seeds as unknown as Record<string, Bench>, thresholds: DEFAULT_THRESHOLDS, source: "seed" };
  }
  const benchmarks: Record<string, Bench> = {};
  for (const r of benchRes.data ?? []) {
    benchmarks[r.industry as string] = {
      revenue_per_employee: Number(r.revenue_per_employee),
      ebitda_margin: [Number(r.ebitda_margin_low), Number(r.ebitda_margin_high)],
    };
  }
  const t = thrRes.data;
  const thresholds: Thresholds = t ? {
    platform_min_ebitda: Number(t.platform_min_ebitda),
    platform_min_revenue: t.platform_min_revenue == null ? null : Number(t.platform_min_revenue),
    toosmall_max_ebitda: Number(t.toosmall_max_ebitda),
    toosmall_max_revenue: t.toosmall_max_revenue == null ? null : Number(t.toosmall_max_revenue),
  } : DEFAULT_THRESHOLDS;
  return { benchmarks, thresholds, source: "db" };
}
