import { NextResponse } from "next/server";
import { deleteResume, getResumeInfo, saveResume } from "@/lib/resume";

export const runtime = "nodejs";

const MAX_SIZE = 15 * 1024 * 1024;

export async function GET() {
  return NextResponse.json({ resume: getResumeInfo() });
}

export async function POST(req: Request) {
  try {
    const form = await req.formData();
    const file = form.get("file");
    if (!(file instanceof File)) {
      return NextResponse.json({ error: "No file uploaded" }, { status: 400 });
    }
    if (file.size > MAX_SIZE) {
      return NextResponse.json({ error: "File too large (max 15MB)" }, { status: 400 });
    }
    if (!/\.(pdf|docx?|md|txt)$/i.test(file.name)) {
      return NextResponse.json(
        { error: "Unsupported file type. Use PDF, DOCX, MD or TXT." },
        { status: 400 }
      );
    }
    const info = await saveResume(file);
    return NextResponse.json({ resume: info });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Upload failed" },
      { status: 500 }
    );
  }
}

export async function DELETE() {
  deleteResume();
  return NextResponse.json({ ok: true });
}
