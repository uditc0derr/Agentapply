import { NextResponse } from "next/server";
import { getApplication, setStatus } from "@/lib/db";
import { campaignRunning } from "@/lib/campaign";

export const runtime = "nodejs";

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const app = getApplication(Number(id));
  if (!app) return NextResponse.json({ error: "Not found" }, { status: 404 });

  let body: { markSent?: boolean } = {};
  try {
    body = (await req.json()) as typeof body;
  } catch {
    /* empty body = plain requeue */
  }

  if (body.markSent) {
    setStatus(app.id, "sent", {
      sent_at: app.sent_at || new Date().toISOString(),
      error: "",
    });
    return NextResponse.json({ ok: true, status: "sent" });
  }

  if (["generating", "sending"].includes(app.status) && campaignRunning()) {
    return NextResponse.json({ error: "Application is in flight" }, { status: 409 });
  }
  setStatus(app.id, "pending", { error: "", attempts: app.attempts });
  return NextResponse.json({ ok: true, status: "pending" });
}
