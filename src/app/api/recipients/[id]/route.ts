import { NextResponse } from "next/server";
import { deleteApplication, getApplication, updateApplication } from "@/lib/db";

export const runtime = "nodejs";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const numId = Number(id);
  const app = getApplication(numId);
  if (!app) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (["generating", "sending"].includes(app.status)) {
    return NextResponse.json({ error: "Application is in flight" }, { status: 409 });
  }
  const body = (await req.json()) as {
    company?: string;
    email?: string;
    position?: string;
  };
  if (body.email !== undefined && !EMAIL_RE.test(body.email.trim())) {
    return NextResponse.json({ error: "Invalid email" }, { status: 400 });
  }
  updateApplication(numId, {
    company: body.company?.trim(),
    email: body.email?.trim().toLowerCase(),
    position: body.position?.trim(),
  });
  return NextResponse.json({ application: getApplication(numId) });
}

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  deleteApplication(Number(id));
  return NextResponse.json({ ok: true });
}
