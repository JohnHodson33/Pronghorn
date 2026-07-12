// Outbox item actions: PATCH edits a queued draft; POST {action} executes:
//   cancel → withdrawn
//   draft  → creates a DRAFT in John's Outlook Drafts folder (Graph
//            POST /me/messages). NOTHING IS SENT — John reviews in Outlook
//            and presses send himself. Authorized by John IN CHAT 2026-07-12
//            ("Yes — build drafts": draft creation only; auto-send remains
//            forbidden). Outbox status → 'drafted_to_outlook'.
//
// There is intentionally NO send action — sending is John's press in Outlook.
// Activation requires John's own device-code consent (`node auth_email.js`,
// scopes staged) + GRAPH_* env vars in web/.env.local + Vercel; until then
// this returns 503 with instructions, and the scope check refuses tokens
// that don't carry Mail.ReadWrite.
import { NextResponse } from "next/server";
import { hasDb, serverDb } from "@/lib/db";

export const dynamic = "force-dynamic";

const ARM_HINT =
  "Drafts not armed yet. Steps: (1) John runs `node auth_email.js` in scraper/ (one device-code consent — scopes staged), (2) copy GRAPH_CLIENT_ID/GRAPH_TENANT_ID/GRAPH_REFRESH_TOKEN into web/.env.local and Vercel env.";

async function graphDraftToken(): Promise<string | null> {
  const { GRAPH_CLIENT_ID, GRAPH_TENANT_ID, GRAPH_REFRESH_TOKEN } = process.env;
  if (!GRAPH_CLIENT_ID || !GRAPH_TENANT_ID || !GRAPH_REFRESH_TOKEN) return null;
  const res = await fetch(`https://login.microsoftonline.com/${GRAPH_TENANT_ID}/oauth2/v2.0/token`, {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "refresh_token",
      client_id: GRAPH_CLIENT_ID,
      refresh_token: GRAPH_REFRESH_TOKEN,
      scope: "Mail.ReadWrite User.Read offline_access", // drafts only — NOT Mail.Send
    }),
  });
  if (!res.ok) return null;
  const data = await res.json();
  if (!String(data.scope ?? "").toLowerCase().includes("mail.readwrite")) return null;
  return data.access_token as string;
}

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!hasDb()) return NextResponse.json({ error: "no db" }, { status: 503 });
  const { id } = await params;
  const b = await req.json();
  const patch: Record<string, string> = {};
  if (typeof b.subject === "string") patch.subject = b.subject;
  if (typeof b.body === "string") patch.body = b.body;
  if (!Object.keys(patch).length) return NextResponse.json({ error: "nothing to update" }, { status: 400 });
  const { error } = await serverDb().from("outbox_emails").update(patch).eq("id", id).eq("status", "queued");
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!hasDb()) return NextResponse.json({ error: "no db" }, { status: 503 });
  const { id } = await params;
  const { action } = await req.json();

  if (action === "cancel") {
    const { error } = await serverDb()
      .from("outbox_emails").update({ status: "cancelled" }).eq("id", id).eq("status", "queued");
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ ok: true, status: "cancelled" });
  }

  if (action === "draft") {
    const db = serverDb();
    const { data: email } = await db.from("outbox_emails").select("*").eq("id", id).maybeSingle();
    if (!email) return NextResponse.json({ error: "not found" }, { status: 404 });
    if (email.status !== "queued") return NextResponse.json({ error: `already ${email.status}` }, { status: 409 });

    const token = await graphDraftToken();
    if (!token) return NextResponse.json({ error: ARM_HINT }, { status: 503 });

    // Creates a message in the Drafts folder. This endpoint cannot send.
    const res = await fetch("https://graph.microsoft.com/v1.0/me/messages", {
      method: "POST",
      headers: { authorization: `Bearer ${token}`, "content-type": "application/json" },
      body: JSON.stringify({
        subject: email.subject,
        body: { contentType: "Text", content: email.body },
        toRecipients: [{ emailAddress: { address: email.to_email, name: email.to_name ?? undefined } }],
      }),
    });
    if (!res.ok) return NextResponse.json({ error: `Graph draft failed (${res.status})` }, { status: 502 });
    const draft = await res.json();

    const now = new Date().toISOString();
    await db.from("outbox_emails").update({ status: "drafted_to_outlook", sent_at: null }).eq("id", id);
    if (email.listing_id) {
      await db.from("listing_events").insert({
        listing_id: email.listing_id, event_type: "inquiry_drafted_to_outlook",
        detail: { outbox_id: id, to: email.to_email, graph_id: draft.id, at: now },
      });
    }
    return NextResponse.json({ ok: true, status: "drafted_to_outlook", note: "Draft is in John's Outlook Drafts — he reviews and sends it there." });
  }

  if (action === "send") {
    return NextResponse.json({
      error: "Auto-send is forbidden (John 7/12: drafts only). Use action:'draft' — John sends from Outlook himself.",
    }, { status: 403 });
  }
  return NextResponse.json({ error: "action must be 'draft' or 'cancel'" }, { status: 400 });
}
