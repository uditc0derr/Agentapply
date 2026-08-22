"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { Application, Settings } from "@/lib/types";
import type { ResumeInfo } from "@/lib/resume";
import SetupPanel from "@/components/SetupPanel";
import ResumePanel from "@/components/ResumePanel";
import RecipientsPanel from "@/components/RecipientsPanel";
import CampaignPanel, { type Summary } from "@/components/CampaignPanel";
import { Toast } from "@/components/ui";

type Tab = "setup" | "resume" | "recipients" | "campaign";

const TABS: { id: Tab; label: string }[] = [
  { id: "setup", label: "1 · Setup" },
  { id: "resume", label: "2 · Resume" },
  { id: "recipients", label: "3 · Recipients" },
  { id: "campaign", label: "4 · Campaign" },
];

const EMPTY_SUMMARY: Summary = {
  total: 0, sent: 0, failed: 0, skipped: 0, pending: 0, drafts: 0, inFlight: 0,
};

export default function Home() {
  const [tab, setTab] = useState<Tab>("setup");
  const [settings, setSettings] = useState<
    (Settings & { hasGmailAppPassword: boolean; hasAiApiKey: boolean }) | null
  >(null);
  const [resume, setResume] = useState<ResumeInfo | null>(null);
  const [applications, setApplications] = useState<Application[]>([]);
  const [summary, setSummary] = useState<Summary>(EMPTY_SUMMARY);
  const [running, setRunning] = useState(false);
  const [toast, setToast] = useState<{ msg: string; kind: "ok" | "err" } | null>(null);
  const [viewApp, setViewApp] = useState<Application | null>(null);
  const runningRef = useRef(false);
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const notify = useCallback((msg: string, kind: "ok" | "err") => {
    setToast({ msg, kind });
    if (toastTimer.current) clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToast(null), 4000);
  }, []);

  const refreshStatus = useCallback(async () => {
    try {
      const res = await fetch("/api/campaign/status", { cache: "no-store" });
      const data = await res.json();
      setApplications(data.applications ?? []);
      setSummary(data.summary ?? EMPTY_SUMMARY);
      const wasRunning = runningRef.current;
      setRunning(Boolean(data.running));
      runningRef.current = Boolean(data.running);
      if (wasRunning && !data.running) notify("Campaign finished", "ok");
    } catch {
      /* server restarting */
    }
  }, [notify]);

  const refreshMeta = useCallback(async () => {
    try {
      const [s, r] = await Promise.all([
        fetch("/api/settings", { cache: "no-store" }).then((x) => x.json()),
        fetch("/api/resume", { cache: "no-store" }).then((x) => x.json()),
      ]);
      setSettings(s.settings);
      setResume(r.resume ?? null);
    } catch {
      /* ignore */
    }
  }, []);

  useEffect(() => {
    void refreshMeta();
    void refreshStatus();
  }, [refreshMeta, refreshStatus]);

  useEffect(() => {
    const t = setInterval(() => void refreshStatus(), 2000);
    return () => clearInterval(t);
  }, [refreshStatus]);

  useEffect(() => {
    const handler = (e: Event) => {
      const id = (e as CustomEvent<number>).detail;
      const app = applications.find((a) => a.id === id);
      if (app) setViewApp(app);
    };
    window.addEventListener("view-email", handler);
    return () => window.removeEventListener("view-email", handler);
  }, [applications]);

  const ready = settings !== null;

  return (
    <main className="mx-auto max-w-5xl px-4 py-8">
      <header className="mb-8">
        <h1 className="text-2xl font-bold tracking-tight text-white">
          Agent<span className="text-emerald-500">Apply</span>
        </h1>
        <p className="mt-1 text-sm text-zinc-400">
          Bulk job application agent — resume + recipient list → personalized emails, sent and
          tracked.
        </p>
      </header>

      <nav className="mb-6 flex gap-1 rounded-lg border border-zinc-800 bg-zinc-900/60 p-1">
        {TABS.map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`flex-1 rounded-md px-3 py-2 text-sm font-medium transition ${
              tab === t.id ? "bg-emerald-600 text-white" : "text-zinc-400 hover:bg-zinc-800 hover:text-zinc-200"
            }`}
          >
            {t.label}
            {t.id === "recipients" && summary.total > 0 && (
              <span className="ml-2 rounded bg-zinc-950/60 px-1.5 py-0.5 text-xs">{summary.total}</span>
            )}
          </button>
        ))}
      </nav>

      {!ready ? (
        <p className="py-20 text-center text-zinc-500">Loading…</p>
      ) : (
        <>
          {tab === "setup" && settings && (
            <SetupPanel settings={settings} onSaved={refreshMeta} notify={notify} />
          )}
          {tab === "resume" && (
            <ResumePanel resume={resume} onChanged={refreshMeta} notify={notify} />
          )}
          {tab === "recipients" && (
            <RecipientsPanel applications={applications} onChanged={refreshStatus} notify={notify} />
          )}
          {tab === "campaign" && settings && (
            <CampaignPanel
              applications={applications}
              summary={summary}
              running={running}
              dryRun={settings.dryRun}
              onChanged={refreshStatus}
              onViewEmail={setViewApp}
            />
          )}
        </>
      )}

      {viewApp && (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/70 p-4"
          onClick={() => setViewApp(null)}>
          <div className="max-h-[80vh] w-full max-w-2xl overflow-y-auto rounded-lg border border-zinc-700 bg-zinc-900 p-6"
            onClick={(e) => e.stopPropagation()}>
            <div className="mb-3 flex items-start justify-between gap-4">
              <div>
                <p className="text-xs uppercase tracking-wider text-zinc-500">
                  Generated email — sent to {viewApp.email}
                </p>
                <p className="mt-1 font-semibold text-zinc-100">{viewApp.subject || "(no subject)"}</p>
              </div>
              <button onClick={() => setViewApp(null)} className="text-zinc-500 hover:text-white">✕</button>
            </div>
            <pre className="whitespace-pre-wrap rounded-md border border-zinc-800 bg-zinc-950 p-4 font-mono text-xs leading-relaxed text-zinc-300">
              {viewApp.body || "(nothing generated yet)"}
            </pre>
            {viewApp.email_source && (
              <p className="mt-2 text-xs text-zinc-500">
                Source: {viewApp.email_source === "ai" ? `AI (${settings?.aiModel})` : "template"}
              </p>
            )}
          </div>
        </div>
      )}

      {toast && <Toast msg={toast.msg} kind={toast.kind} />}
    </main>
  );
}
