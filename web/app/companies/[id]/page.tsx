// Company profile — the CRM hub. Rendering lives in CompanyDetailV2:
// editable key fields + deal stage, contacts, listing history with events,
// market-multiple check, and the shared activity feed.
import CompanyDetailV2 from "@/components/CompanyDetailV2";
import { hasDb } from "@/lib/db";

export const dynamic = "force-dynamic";

export default async function CompanyPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!hasDb()) return <div className="p-8 text-sm text-zinc-400">Database not connected.</div>;
  return <CompanyDetailV2 id={id} />;
}
