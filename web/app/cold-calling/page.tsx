// Cold Calling — call list + company info + script on one screen (Jake's
// smile-and-dial pattern). Server component loads dialable leads; the client
// CallScreen handles selection and script editing.
import CallScreen from "@/components/CallScreen";
import { fetchCallList } from "@/lib/call-list";
import { hasDb } from "@/lib/db";
import Link from "next/link";

export const dynamic = "force-dynamic";

export default async function ColdCalling() {
  if (!hasDb()) return <div className="p-8 text-sm text-zinc-400">Database not connected.</div>;
  const leads = (await fetchCallList()) ?? [];

  return (
    <div className="max-w-6xl p-8 space-y-6">
      <header>
        <h1 className="text-2xl font-bold tracking-tight">Cold Calling</h1>
        <p className="text-sm text-zinc-500">
          Everything for a call block on one screen: the list, the company&apos;s numbers and signals, and the
          script filled with that company&apos;s details. Leads get here from{" "}
          <Link href="/enrichment" className="text-emerald-700 hover:underline">Enrichment</Link> once a phone
          number is on record.
        </p>
      </header>

      <CallScreen leads={leads} />

      <p className="rounded-md bg-amber-50 px-3 py-2 text-xs text-amber-800">
        Scaffold: script edits save in this browser (localStorage). Call-outcome logging (connected /
        voicemail / not interested → lead status + activity) and reply.io call-task sync are the next build;
        Nooks parallel-dialer evaluation is on John&apos;s decision list.
      </p>
    </div>
  );
}
