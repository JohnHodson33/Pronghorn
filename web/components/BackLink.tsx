"use client";

// Back control that returns John to WHERE HE CAME FROM (browser history →
// filters/scroll intact) instead of a hardcoded index. Falls back to the
// index route when the page was opened cold (no in-app history).
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense } from "react";

function Inner({ fallback, fallbackLabel }: { fallback: string; fallbackLabel: string }) {
  const router = useRouter();
  const sp = useSearchParams();
  const from = sp.get("from");

  if (from) {
    return (
      <button
        onClick={() => router.back()}
        className="text-sm text-emerald-700 hover:underline"
        title="Back to where you came from (filters kept)"
      >
        ← Back to {from}
      </button>
    );
  }
  return (
    <Link href={fallback} className="text-sm text-emerald-700 hover:underline">
      ← {fallbackLabel}
    </Link>
  );
}

export default function BackLink(props: { fallback: string; fallbackLabel: string }) {
  return (
    <Suspense fallback={<Link href={props.fallback} className="text-sm text-emerald-700 hover:underline">← {props.fallbackLabel}</Link>}>
      <Inner {...props} />
    </Suspense>
  );
}
