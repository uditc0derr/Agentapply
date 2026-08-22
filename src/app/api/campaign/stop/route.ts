import { NextResponse } from "next/server";
import { stopCampaign } from "@/lib/campaign";

export const runtime = "nodejs";

export async function POST() {
  stopCampaign();
  return NextResponse.json({ ok: true });
}
