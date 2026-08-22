import { NextResponse } from "next/server";
import { listApplications } from "@/lib/db";
import { campaignRunning } from "@/lib/campaign";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const apps = listApplications();
  const summary = {
    total: apps.length,
    sent: 0,
    failed: 0,
    skipped: 0,
    pending: 0,
    drafts: 0,
    inFlight: 0,
  };
  for (const a of apps) {
    switch (a.status) {
      case "sent":
        summary.sent++;
        break;
      case "failed":
        summary.failed++;
        break;
      case "skipped":
        summary.skipped++;
        break;
      case "draft":
        summary.drafts++;
        break;
      case "pending":
        summary.pending++;
        break;
      default:
        summary.inFlight++;
    }
  }
  return NextResponse.json({
    running: campaignRunning(),
    summary,
    applications: apps,
  });
}
