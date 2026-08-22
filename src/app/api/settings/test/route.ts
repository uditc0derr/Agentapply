import { NextResponse } from "next/server";
import { loadSettings } from "@/lib/db";
import { getTransporter } from "@/lib/mailer";

export const runtime = "nodejs";

export async function POST() {
  const s = loadSettings();
  if (!s.gmailUser || !s.gmailAppPassword) {
    return NextResponse.json(
      { ok: false, error: "Gmail credentials not configured" },
      { status: 400 }
    );
  }
  try {
    const transporter = getTransporter(s.gmailUser, s.gmailAppPassword);
    await transporter.sendMail({
      from: s.fromName || s.name ? `"${s.fromName || s.name}" <${s.gmailUser}>` : s.gmailUser,
      to: s.gmailUser,
      subject: "AgentApply test email",
      text: "SMTP is working. You are ready to launch campaigns.",
    });
    return NextResponse.json({ ok: true });
  } catch (err) {
    return NextResponse.json(
      {
        ok: false,
        error:
          err instanceof Error
            ? err.message
            : "Failed to send test email (check Gmail App Password)",
      },
      { status: 400 }
    );
  }
}
