import OpenAI from "openai";
import type { Application, Settings } from "./types";

export interface GeneratedEmail {
  subject: string;
  body: string;
  source: "ai" | "template";
}

const MAX_RESUME_CHARS = 8000;

function signatureBlock(s: Settings): string {
  const lines = [
    s.name ? `Best regards,\n${s.name}` : "Best regards",
  ];
  if (s.phone) lines.push(`Phone: ${s.phone}`);
  if (s.linkedin) lines.push(`LinkedIn: ${s.linkedin}`);
  if (s.portfolio) lines.push(`Portfolio: ${s.portfolio}`);
  return lines.join("\n");
}

export function templateEmail(
  app: Pick<Application, "company" | "position">,
  s: Settings
): GeneratedEmail {
  const company = app.company || "your team";
  const position = app.position || "open roles";
  const subject = `Application for ${position} at ${company}${s.name ? ` – ${s.name}` : ""}`;
  const experience = s.experienceSummary
    ? `\n\n${s.experienceSummary}`
    : "";
  const body = [
    `Dear Hiring Manager at ${company},`,
    "",
    `I am writing to apply for the ${position} role at ${company}. After reviewing the opportunity, I am confident that my skills and experience align well with what your team is looking for.${experience}`,
    "",
    "I have attached my resume for your review. I would welcome the chance to discuss how I can contribute to your team.",
    "",
    "Thank you for your time and consideration. I look forward to hearing from you.",
    "",
    signatureBlock(s),
  ].join("\n");
  return { subject, body, source: "template" };
}

function extractJson(raw: string): { subject?: string; body?: string } {
  const fenced = raw.match(/```(?:json)?\s*([\s\S]*?)```/);
  const candidate = fenced ? fenced[1] : raw;
  const start = candidate.indexOf("{");
  const end = candidate.lastIndexOf("}");
  if (start !== -1 && end !== -1 && end > start) {
    try {
      return JSON.parse(candidate.slice(start, end + 1));
    } catch {
      /* fall through */
    }
  }
  return {};
}

export async function generateEmail(
  app: Pick<Application, "company" | "position">,
  settings: Settings,
  resumeText: string,
  resumeFilename: string
): Promise<GeneratedEmail> {
  if (!settings.aiEnabled || !settings.aiApiKey) {
    return templateEmail(app, settings);
  }

  const client = new OpenAI({
    apiKey: settings.aiApiKey,
    baseURL: settings.aiBaseUrl || undefined,
    timeout: 60000,
    maxRetries: 1,
  });

  const position = app.position || "a suitable open role";
  const company = app.company || "the company";
  const resumeSnippet = resumeText
    ? `\n\nCANDIDATE RESUME (truncated):\n"""\n${resumeText.slice(0, MAX_RESUME_CHARS)}\n"""`
    : "";

  const systemPrompt = [
    "You are an expert job-application assistant.",
    "Write a concise, professional job application email in plain text (no markdown).",
    "Rules:",
    "- 120 to 200 words for the body.",
    "- Open with a specific greeting; use 'Dear Hiring Manager' only if no name is known.",
    "- Reference the company by name and the position by name.",
    "- Highlight 2-3 relevant strengths drawn from the resume provided.",
    "- Mention that the resume is attached",
    resumeFilename ? `(attached as "${resumeFilename}").` : "(attached).",
    "- Confident but never arrogant; no generic fluff like 'I am the perfect fit'.",
    "- End with a short signature block using the candidate details below.",
    "- Do not invent facts not present in the resume or profile.",
    'Respond with STRICT JSON only: {"subject": "...", "body": "..."}',
  ].join(" ");

  const userPrompt = [
    `COMPANY: ${company}`,
    `POSITION: ${position}`,
    "",
    "CANDIDATE PROFILE:",
    `- Name: ${settings.name || "(unknown)"}`,
    `- Phone: ${settings.phone || "(not given)"}`,
    `- LinkedIn: ${settings.linkedin || "(none)"}`,
    `- Portfolio: ${settings.portfolio || "(none)"}`,
    `- Summary: ${settings.experienceSummary || "(see resume)"}`,
    resumeSnippet,
  ].join("\n");

  const messages = [
    { role: "system" as const, content: systemPrompt },
    { role: "user" as const, content: userPrompt },
  ];

  try {
    let raw = "";
    try {
      const completion = await client.chat.completions.create({
        model: settings.aiModel || "gpt-4o-mini",
        temperature: 0.7,
        messages,
        response_format: { type: "json_object" },
      });
      raw = completion.choices[0]?.message?.content ?? "";
    } catch {
      // Some OpenAI-compatible endpoints (e.g. Gemini) may reject
      // response_format — retry once in plain text mode.
      const completion = await client.chat.completions.create({
        model: settings.aiModel || "gpt-4o-mini",
        temperature: 0.7,
        messages,
      });
      raw = completion.choices[0]?.message?.content ?? "";
    }

    const parsed = extractJson(raw);
    if (parsed.subject && parsed.body) {
      let body = parsed.body.trim();
      if (settings.name && !body.includes(settings.name)) {
        body += `\n\n${signatureBlock(settings)}`;
      }
      return {
        subject: parsed.subject.trim().slice(0, 200),
        body,
        source: "ai",
      };
    }
  } catch {
    /* fall through to template */
  }
  return templateEmail(app, settings);
}
