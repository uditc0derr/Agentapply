"use client";

import { useState } from "react";
import type { Application } from "@/lib/types";
import { api, btnDanger, btnGhost, btnPrimary, Card, StatusBadge } from "./ui";

export interface Summary {
  total: number;
  sent: number;
  failed: number;
  skipped: number;
  pending: number;
  drafts: number;
  inFlight: number;
}

interface Props {
  applications: Application[];
  summary: Summary;
  running: boolean;
  dryRun: boolean;
  onChanged: () => void;
  onViewEmail: (app: Application) => void;
}

function Stat({ label, value, cls }: { label: string; value: number | string; cls: string }) {
  return (
    <div className={`rounded-lg border bg-zinc-900/60 p-3 text-center ${cls}`}>
      <div className="text-xl font-bold">{value}</div>
      <div className="mt-0.5 text-[11px] uppercase tracking-wider text-zinc-500">{label}</div>
    </div>
  );
}

export default function CampaignPanel({
  applications,
  summary,
  running,
  dryRun,
  onChanged,
  onViewEmail,
}: Props) {
  const [dryRunLocal, setDryRunLocal] = useState(dryRun);
  const [busy, setBusy] = useState(false);

  const actionable = summary.total > 0 && !running;
  const doneCount = summary.sent + summary.failed + summary.skipped + summary.drafts;
  const pct = summary.total ? Math.round((doneCount / summary.total) * 100) : 0;

  async function start(payload?: object) {
    setBusy(true);
    try {
      await api("/api/campaign/start", { method: "POST", body: JSON.stringify(payload ?? { dryRun: dryRunLocal }) });
      onChanged();
    } catch (e) {
      alert(e instanceof Error ? e.message : "Could not start campaign");
    } finally {
      setBusy(false);
    }
  }

  async function stop() {
    await api("/api/campaign/stop", { method: "POST" }).catch(() => undefined);
    onChanged();
  }

  return (
    <div className="space-y-5">
      <Card
        title="Campaign control"
        right={
          running ? (
            <span className="flex items-center gap-2 text-xs font-medium text-emerald-400">
              <span className="h-2 w-2 animate-pulse rounded-full bg-emerald-400" />
              Running — processing queue…
            </span>
          ) : undefined
        }
      >
        <div className="grid grid-cols-3 gap-3 sm:grid-cols-6">
          <Stat label="Total" value={summary.total} cls="border-zinc-800 text-zinc-200" />
          <Stat label="Sent ✓" value={summary.sent} cls="border-emerald-900 text-emerald-400" />
          <Stat label="Failed ✗" value={summary.failed} cls="border-red-900 text-red-400" />
          <Stat label="Drafts ⊘" value={summary.drafts} cls="border-violet-900 text-violet-300" />
          <Stat label="Pending ⏳" value={summary.pending} cls="border-zinc-800 text-zinc-400" />
          <Stat label="In flight" value={summary.inFlight} cls="border-sky-900 text-sky-400" />
        </div>

        <div className="mt-4 h-1.5 overflow-hidden rounded-full bg-zinc-800">
          <div
            className={`h-full transition-all duration-500 ${running ? "animate-pulse bg-sky-500" : "bg-emerald-600"}`}
            style={{ width: `${pct}%` }}
          />
        </div>

        <div className="mt-4 flex flex-wrap items-center gap-3">
          {!running && actionable && (
            <>
              <button className={btnPrimary} disabled={busy || (!summary.pending && !summary.drafts)}
                onClick={() => void start()}>
                ▶ Start bulk application{dryRunLocal ? " (dry run)" : ""}
              </button>
              {summary.drafts > 0 && (
                <button className={btnPrimary + " !bg-violet-600 hover:!bg-violet-500"}
                  disabled={busy}
                  onClick={() => void start({ sendDrafts: true })}>
                  Send {summary.drafts} draft{summary.drafts > 1 ? "s" : ""} now
                </button>
              )}
              <label className="flex items-center gap-2 text-sm text-zinc-300">
                <input type="checkbox" checked={dryRunLocal} onChange={(e) => setDryRunLocal(e.target.checked)}
                  className="h-4 w-4 accent-violet-600" />
                Dry run (generate only)
              </label>
            </>
          )}
          {running && (
            <button className={btnDanger} onClick={stop}>
              ■ Stop after current
            </button>
          )}
          {!actionable && !running && (
            <p className="text-sm text-zinc-500">Import recipients in the Recipients tab to begin.</p>
          )}
        </div>

        <p className="mt-3 text-xs text-zinc-500">
          Emails are generated one-by-one with your resume attached and sent sequentially. Failures are
          logged and skipped automatically.
        </p>
      </Card>

      {applications.length > 0 && (
        <Card title="Queue">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-zinc-800 text-xs uppercase tracking-wider text-zinc-500">
                  <th className="py-2 pr-3">Company</th>
                  <th className="py-2 pr-3">Email</th>
                  <th className="py-2 pr-3">Position</th>
                  <th className="py-2 pr-3">Status</th>
                  <th className="py-2 pr-3">Detail</th>
                  <th className="py-2"></th>
                </tr>
              </thead>
              <tbody>
                {applications.map((a) => (
                  <tr key={a.id} className="border-b border-zinc-800/60 hover:bg-zinc-900/50">
                    <td className="py-1.5 pr-3 text-zinc-100">{a.company}</td>
                    <td className="py-1.5 pr-3 font-mono text-xs text-zinc-400">{a.email}</td>
                    <td className="py-1.5 pr-3 text-zinc-300">{a.position}</td>
                    <td className="py-1.5 pr-3"><StatusBadge status={a.status} /></td>
                    <td className="max-w-72 truncate py-1.5 pr-3 text-xs">
                      {a.error ? (
                        <span className="text-red-400" title={a.error}>{a.error}</span>
                      ) : a.subject ? (
                        <span className="text-zinc-500" title={`${a.subject}\n\n${a.body}`}>
                          {a.subject}
                        </span>
                      ) : (
                        <span className="text-zinc-700">—</span>
                      )}
                    </td>
                    <td className="whitespace-nowrap py-1.5 text-right text-xs">
                      {a.subject && (
                        <button className={btnGhost + " mr-2 !px-2 !py-0.5 !text-xs"} onClick={() => onViewEmail(a)}>
                          View email
                        </button>
                      )}
                      {a.status === "failed" && !running && (
                        <button className={btnGhost + " !px-2 !py-0.5 !text-xs"}
                          onClick={() => void api(`/api/recipients/${a.id}/retry`, { method: "POST" }).then(onChanged)}>
                          Retry
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}
    </div>
  );
}
