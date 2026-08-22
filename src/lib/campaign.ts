import fs from "fs";
import {
  getApplication,
  getDb,
  listApplications,
  loadSettings,
  setStatus,
} from "./db";
import { generateEmail, templateEmail } from "./generator";
import { getResumeFile, getResumeText } from "./resume";
import { getTransporter, sendApplicationEmail } from "./mailer";

interface RunnerState {
  running: boolean;
  stopping: boolean;
  currentId: number | null;
}

declare global {
  // eslint-disable-next-line no-var
  var __agentapplyRunner: RunnerState | undefined;
}

function state(): RunnerState {
  if (!globalThis.__agentapplyRunner) {
    globalThis.__agentapplyRunner = { running: false, stopping: false, currentId: null };
  }
  return globalThis.__agentapplyRunner;
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

async function processOne(id: number, dryRun: boolean): Promise<"sent" | "draft" | "failed"> {
  const app = getApplication(id);
  if (!app) return "failed";

  const settings = loadSettings();
  let haveGenerated = false;
  try {
    setStatus(id, "generating");
    const resume = getResumeFile();
    const generated =
      settings.aiEnabled && settings.aiApiKey
        ? await generateEmail(
            app,
            settings,
            await getResumeText(),
            resume?.filename ?? ""
          )
        : templateEmail(app, settings);
    haveGenerated = true;

    setStatus(id, "generating", {
      subject: generated.subject,
      body: generated.body,
      email_source: generated.source,
      attempts: app.attempts + 1,
    });

    if (dryRun) {
      setStatus(id, "draft");
      return "draft";
    }

    setStatus(id, "sending");

    if (!settings.gmailUser || !settings.gmailAppPassword) {
      throw new Error("Gmail SMTP is not configured. Add credentials in Setup.");
    }
    if (!resume) throw new Error("No resume uploaded.");

    const transporter = getTransporter(settings.gmailUser, settings.gmailAppPassword);
    await sendApplicationEmail(transporter, {
      from: settings.gmailUser,
      fromName: settings.fromName || settings.name,
      to: app.email,
      subject: generated.subject,
      body: generated.body,
      attachmentPath: resume.path,
      attachmentName: resume.filename,
    });

    setStatus(id, "sent", { sent_at: new Date().toISOString(), error: "" });
    return "sent";
  } catch (err) {
    const message =
      err instanceof Error ? err.message : typeof err === "string" ? err : JSON.stringify(err);
    // If we never got a generated email (e.g. AI config error before generation),
    // store a deterministic template so the row still has content to preview.
    if (!haveGenerated && !app.subject) {
      const fallback = templateEmail(app, settings);
      setStatus(id, "failed", { subject: fallback.subject, body: fallback.body });
    }
    setStatus(id, "failed", { error: message.slice(0, 500) });
    return "failed";
  }
}

export async function startCampaign(opts: { dryRun?: boolean } = {}): Promise<{ started: boolean; reason?: string }> {
  const s = state();
  if (s.running) return { started: false, reason: "Campaign already running" };

  const settings = loadSettings();
  const dryRun = opts.dryRun ?? settings.dryRun;

  if (!dryRun) {
    if (!settings.gmailUser || !settings.gmailAppPassword) {
      return { started: false, reason: "Configure Gmail SMTP in Setup before sending" };
    }
    if (!getResumeFile() || !fs.existsSync(getResumeFile()!.path)) {
      return { started: false, reason: "Upload a resume before starting a campaign" };
    }
  }

  const pending = listApplications().filter((a) => a.status === "pending");
  if (!pending.length) return { started: false, reason: "Nothing to do — no pending applications" };

  s.running = true;
  s.stopping = false;

  void (async () => {
    for (const app of pending) {
      if (s.stopping) break;
      s.currentId = app.id;
      let outcome = await processOne(app.id, dryRun);
      if (outcome === "failed") {
        // one retry with backoff for transient SMTP/AI errors
        await sleep(4000);
        const fresh = getApplication(app.id);
        if (fresh && fresh.status === "failed") {
          setStatus(app.id, "pending", { error: "" });
          outcome = await processOne(app.id, dryRun);
        }
      }
      if (!s.stopping) {
        const delay = Math.max(0, loadSettings().sendDelayMs);
        if (outcome === "sent") await sleep(delay);
      }
    }
    s.running = false;
    s.stopping = false;
    s.currentId = null;
  })();

  return { started: true };
}

export function sendDraftsNow(): { started: boolean; reason?: string } {
  const s = state();
  if (s.running) return { started: false, reason: "Campaign already running" };
  const settings = loadSettings();
  if (!settings.gmailUser || !settings.gmailAppPassword) {
    return { started: false, reason: "Configure Gmail SMTP in Setup before sending" };
  }

  const drafts = getDb()
    .prepare(`SELECT id FROM applications WHERE status='draft' ORDER BY id`)
    .all() as { id: number }[];
  if (!drafts.length) return { started: false, reason: "No drafts to send" };

  s.running = true;
  s.stopping = false;

  void (async () => {
    for (const d of drafts) {
      if (s.stopping) break;
      s.currentId = d.id;
      setStatus(d.id, "sending");
      try {
        const app = getApplication(d.id)!;
        const resume = getResumeFile();
        if (!resume) throw new Error("No resume uploaded.");
        const transporter = getTransporter(settings.gmailUser, settings.gmailAppPassword);
        await sendApplicationEmail(transporter, {
          from: settings.gmailUser,
          fromName: settings.fromName || settings.name,
          to: app.email,
          subject: app.subject,
          body: app.body,
          attachmentPath: resume.path,
          attachmentName: resume.filename,
        });
        setStatus(d.id, "sent", { sent_at: new Date().toISOString() });
        await sleep(Math.max(0, settings.sendDelayMs));
      } catch (err) {
        setStatus(d.id, "failed", {
          error: (err instanceof Error ? err.message : String(err)).slice(0, 500),
        });
      }
    }
    s.running = false;
    s.stopping = false;
    s.currentId = null;
  })();

  return { started: true };
}

export function stopCampaign() {
  const s = state();
  if (s.running) s.stopping = true;
}

export function campaignRunning(): boolean {
  return state().running;
}
