import { NextResponse } from "next/server";
import { loadSettings, saveSettings } from "@/lib/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const s = loadSettings();
  // never leak the app password / api key to the client
  return NextResponse.json({
    settings: {
      ...s,
      gmailAppPassword: s.gmailAppPassword ? "••••••••" : "",
      aiApiKey: s.aiApiKey ? "••••••••" : "",
      hasGmailAppPassword: Boolean(s.gmailAppPassword),
      hasAiApiKey: Boolean(s.aiApiKey),
    },
  });
}

export async function PUT(req: Request) {
  const body = (await req.json()) as Record<string, unknown>;
  const patch: Record<string, unknown> = {};
  for (const key of [
    "gmailUser",
    "fromName",
    "aiBaseUrl",
    "aiModel",
    "name",
    "phone",
    "linkedin",
    "portfolio",
    "experienceSummary",
  ]) {
    if (typeof body[key] === "string") patch[key] = (body[key] as string).trim();
  }
  // secrets: only overwrite when the client sends a non-masked value
  for (const key of ["gmailAppPassword", "aiApiKey"]) {
    const v = body[key];
    if (typeof v === "string" && !v.includes("•")) patch[key] = v.trim();
  }
  for (const key of ["aiEnabled", "dryRun"]) {
    if (typeof body[key] === "boolean") patch[key] = body[key];
  }
  if (body.sendDelayMs !== undefined) {
    const n = Number(body.sendDelayMs);
    patch.sendDelayMs = Number.isFinite(n) ? Math.min(60000, Math.max(0, n)) : undefined;
  }
  saveSettings(patch as never);
  return NextResponse.json({ ok: true });
}
