export type AppStatus =
  | "pending"
  | "generating"
  | "sending"
  | "draft"
  | "sent"
  | "failed"
  | "skipped";

export interface Application {
  id: number;
  company: string;
  email: string;
  position: string;
  status: AppStatus;
  subject: string;
  body: string;
  email_source: "" | "ai" | "template";
  error: string;
  attempts: number;
  created_at: string;
  sent_at: string;
}

export interface Profile {
  name: string;
  phone: string;
  linkedin: string;
  portfolio: string;
  experienceSummary: string;
}

export interface SmtpConfig {
  gmailUser: string;
  gmailAppPassword: string;
}

export interface AiConfig {
  aiEnabled: boolean;
  aiBaseUrl: string;
  aiApiKey: string;
  aiModel: string;
}

export interface Settings extends SmtpConfig, AiConfig, Profile {
  sendDelayMs: number;
  dryRun: boolean;
  fromName: string;
}
