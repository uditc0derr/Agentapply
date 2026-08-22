import nodemailer from "nodemailer";
import type { Transporter } from "nodemailer";

let cached: { user: string; pass: string; transporter: Transporter } | null = null;

export function getTransporter(user: string, appPassword: string): Transporter {
  if (cached && cached.user === user && cached.pass === appPassword) {
    return cached.transporter;
  }
  const transporter = nodemailer.createTransport({
    host: "smtp.gmail.com",
    port: 465,
    secure: true,
    auth: { user, pass: appPassword },
    connectionTimeout: 20000,
    greetingTimeout: 15000,
    socketTimeout: 45000,
  });
  cached = { user, pass: appPassword, transporter };
  return transporter;
}

export async function verifySmtp(user: string, appPassword: string): Promise<void> {
  await getTransporter(user, appPassword).verify();
}

export interface SendArgs {
  from: string;
  fromName: string;
  to: string;
  subject: string;
  body: string;
  attachmentPath?: string;
  attachmentName?: string;
}

export async function sendApplicationEmail(
  transporter: Transporter,
  args: SendArgs
): Promise<void> {
  await transporter.sendMail({
    from: args.fromName ? `"${args.fromName}" <${args.from}>` : args.from,
    to: args.to,
    subject: args.subject,
    text: args.body,
    attachments: args.attachmentPath
      ? [
          {
            path: args.attachmentPath,
            filename: args.attachmentName ?? "Resume.pdf",
          },
        ]
      : [],
  });
}
