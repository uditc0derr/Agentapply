import { NextResponse } from "next/server";
import { startCampaign, sendDraftsNow } from "@/lib/campaign";

export const runtime = "nodejs";

export async function POST(req: Request) {
  let body: { dryRun?: boolean; sendDrafts?: boolean } = {};
  try {
    body = (await req.json()) as typeof body;
  } catch {
    /* empty body is fine */
  }

  const result = body.sendDrafts
    ? sendDraftsNow()
    : await startCampaign({ dryRun: body.dryRun });

  if (!result.started) {
    return NextResponse.json({ error: result.reason }, { status: 409 });
  }
  return NextResponse.json({ ok: true });
}
