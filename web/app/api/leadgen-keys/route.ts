// Honest key-status for the list-building sources: which API credentials are
// actually connected, server-checked. Returns BOOLEANS ONLY — never values.
// Checks process.env (Vercel / web/.env.local) and, in local dev, falls back
// to scraper/.env where the leadgen workers read their keys.
import { NextResponse } from "next/server";
import fs from "node:fs";
import path from "node:path";

export const dynamic = "force-dynamic";

const KEYS = [
  "SERPER_API_KEY",
  "GOOGLE_PLACES_API_KEY",
  "PARALLEL_API_KEY",
  "EXA_API_KEY",
  "HUNTER_API_KEY",
  "ANTHROPIC_API_KEY",
] as const;

function scraperEnvNames(): Set<string> {
  try {
    // web/ is the cwd in dev; scraper/.env sits one level up.
    const p = path.resolve(process.cwd(), "..", "scraper", ".env");
    const txt = fs.readFileSync(p, "utf8").replace(/^﻿/, "");
    const names = new Set<string>();
    for (const line of txt.split(/\r?\n/)) {
      const m = line.match(/^([A-Z0-9_]+)\s*=\s*\S/);
      if (m) names.add(m[1]);
    }
    return names;
  } catch {
    return new Set();
  }
}

export async function GET() {
  const local = scraperEnvNames();
  const status: Record<string, boolean> = {};
  for (const k of KEYS) status[k] = !!process.env[k]?.trim() || local.has(k);
  return NextResponse.json({ keys: status });
}
