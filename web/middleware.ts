// Site-wide password gate for the deployed app. Until full Supabase Auth
// (per-user logins for John & Tom) lands, this keeps the public Vercel URL
// private with a single shared password via HTTP Basic Auth.
//
// Controlled by the GATE_PASSWORD env var:
//   - set on Vercel  → the deployed site prompts for a password
//   - unset locally  → localhost is open (no prompt during development)
//
// Runs on the Edge runtime, so use atob (not Buffer).

import { NextRequest, NextResponse } from "next/server";

export const config = {
  // Protect everything except Next internals and the favicon.
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};

export function middleware(req: NextRequest) {
  const password = process.env.GATE_PASSWORD?.trim();
  if (!password) return NextResponse.next(); // no gate configured (local dev)

  const auth = req.headers.get("authorization");
  if (auth?.startsWith("Basic ")) {
    try {
      const decoded = atob(auth.slice(6)); // "user:pass"
      const pass = decoded.slice(decoded.indexOf(":") + 1).trim();
      if (pass === password) return NextResponse.next();
    } catch {
      // fall through to challenge
    }
  }

  return new NextResponse("Authentication required.", {
    status: 401,
    headers: { "WWW-Authenticate": 'Basic realm="Pronghorn Platform"' },
  });
}
