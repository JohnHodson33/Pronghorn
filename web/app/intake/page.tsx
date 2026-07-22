// Data intake — Tom drops a spreadsheet in and it lands in the CRM, with a
// preview of exactly what WOULD happen before anything is written. No agent
// involvement required (John 7/20).
import IntakePortal from "@/components/IntakePortal";

export const dynamic = "force-dynamic";

export default function IntakePage() {
  return (
    <div className="p-4 md:p-8 space-y-5">
      <header>
        <h1 className="text-2xl font-bold tracking-tight">Data intake</h1>
        <p className="text-sm text-zinc-500">
          Drop in a contacts, companies or river-guides spreadsheet. We read the columns, match
          against what&apos;s already here, and show you the plan — nothing is written until you
          confirm.
        </p>
      </header>
      <IntakePortal />
    </div>
  );
}
