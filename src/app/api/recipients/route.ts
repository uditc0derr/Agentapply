import { NextResponse } from "next/server";
import { insertRecipients, listApplications, resetAll } from "@/lib/db";
import { parseRecipientList } from "@/lib/parser";
import { campaignRunning } from "@/lib/campaign";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const apps = listApplications();
  return NextResponse.json({ applications: apps });
}

export async function POST(req: Request) {
  if (campaignRunning()) {
    return NextResponse.json(
      { error: "Cannot modify list while campaign is running" },
      { status: 409 }
    );
  }
  const body = (await req.json()) as { text?: string };
  if (!body.text || !body.text.trim()) {
    return NextResponse.json({ error: "Paste a recipient list first" }, { status: 400 });
  }
  const { rows, invalid } = parseRecipientList(body.text);
  if (!rows.length) {
    return NextResponse.json(
      {
        error: `No valid recipients found.${invalid.length ? ` Example of an unparsed line: "${invalid[0]}"` : ""}`,
      },
      { status: 400 }
    );
  }
  const result = insertRecipients(rows);
  return NextResponse.json({
    added: result.added,
    duplicates: result.duplicates + rows.length - result.added,
    invalid,
  });
}

export async function DELETE() {
  if (campaignRunning()) {
    return NextResponse.json(
      { error: "Cannot clear while campaign is running" },
      { status: 409 }
    );
  }
  resetAll();
  return NextResponse.json({ ok: true });
}
