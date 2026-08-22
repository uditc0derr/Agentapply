"use client";

import { useState } from "react";
import type { Application } from "@/lib/types";
import { api, btnDanger, btnGhost, btnPrimary, Card, StatusBadge } from "./ui";

const PLACEHOLDER = `ABC Tech | hr@abc.com | React Developer
XYZ Solutions, jobs@xyz.com, Frontend Developer
careers@companyx.com`;

interface Props {
  applications: Application[];
  onChanged: () => void;
  notify: (msg: string, kind: "ok" | "err") => void;
}

export default function RecipientsPanel({ applications, onChanged, notify }: Props) {
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [draft, setDraft] = useState({ company: "", email: "", position: "" });

  async function importList() {
    setBusy(true);
    try {
      const res = await api<{ added: number; duplicates: number; invalid: string[] }>(
        "/api/recipients",
        { method: "POST", body: JSON.stringify({ text }) }
      );
      notify(
        `Added ${res.added} · duplicates skipped: ${res.duplicates}` +
          (res.invalid.length ? ` · ${res.invalid.length} invalid line(s)` : ""),
        "ok"
      );
      setText("");
      onChanged();
    } catch (e) {
      notify(e instanceof Error ? e.message : "Import failed", "err");
    } finally {
      setBusy(false);
    }
  }

  async function clearAll() {
    setBusy(true);
    try {
      await api("/api/recipients", { method: "DELETE" });
      notify("Recipient list cleared", "ok");
      onChanged();
    } catch (e) {
      notify(e instanceof Error ? e.message : "Clear failed", "err");
    } finally {
      setBusy(false);
    }
  }

  async function saveEdit(id: number) {
    try {
      await api(`/api/recipients/${id}`, { method: "PATCH", body: JSON.stringify(draft) });
      setEditingId(null);
      onChanged();
    } catch (e) {
      notify(e instanceof Error ? e.message : "Update failed", "err");
    }
  }

  async function removeRow(id: number) {
    try {
      await api(`/api/recipients/${id}`, { method: "DELETE" });
      onChanged();
    } catch (e) {
      notify(e instanceof Error ? e.message : "Delete failed", "err");
    }
  }

  return (
    <div className="space-y-5">
      <Card title="Import recipients">
        <textarea
          className="min-h-40 w-full rounded-md border border-zinc-700 bg-zinc-950 p-3 font-mono text-sm text-zinc-100 placeholder-zinc-600 outline-none focus:border-emerald-500/70"
          placeholder={PLACEHOLDER}
          value={text}
          onChange={(e) => setText(e.target.value)}
        />
        <p className="mt-2 text-xs text-zinc-500">
          One application per line. Separator can be <code className="text-zinc-400">|</code>,{" "}
          <code className="text-zinc-400">,</code> or tab. Format:{" "}
          <code className="text-zinc-400">Company | email | Position</code>. Email-only lines get the
          company name from the domain.
        </p>
        <div className="mt-4 flex gap-2">
          <button className={btnPrimary} onClick={importList} disabled={busy || !text.trim()}>
            Parse & add
          </button>
          <button className={btnDanger} onClick={clearAll} disabled={busy || !applications.length}>
            Clear list
          </button>
        </div>
      </Card>

      {applications.length > 0 && (
        <Card title={`Recipients (${applications.length})`}>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-zinc-800 text-xs uppercase tracking-wider text-zinc-500">
                  <th className="py-2 pr-3">#</th>
                  <th className="py-2 pr-3">Company</th>
                  <th className="py-2 pr-3">Email</th>
                  <th className="py-2 pr-3">Position</th>
                  <th className="py-2 pr-3">Status</th>
                  <th className="py-2"></th>
                </tr>
              </thead>
              <tbody>
                {applications.map((a, i) =>
                  editingId === a.id ? (
                    <tr key={a.id} className="border-b border-zinc-800/60">
                      <td className="py-1.5 pr-3 text-zinc-600">{i + 1}</td>
                      <td className="py-1.5 pr-2">
                        <input autoFocus className="w-full rounded border border-emerald-700 bg-zinc-950 px-2 py-1"
                          value={draft.company}
                          onChange={(e) => setDraft((d) => ({ ...d, company: e.target.value }))} />
                      </td>
                      <td className="py-1.5 pr-2">
                        <input className="w-full rounded border border-emerald-700 bg-zinc-950 px-2 py-1"
                          value={draft.email}
                          onChange={(e) => setDraft((d) => ({ ...d, email: e.target.value }))} />
                      </td>
                      <td className="py-1.5 pr-2">
                        <input className="w-full rounded border border-emerald-700 bg-zinc-950 px-2 py-1"
                          value={draft.position}
                          onChange={(e) => setDraft((d) => ({ ...d, position: e.target.value }))} />
                      </td>
                      <td className="py-1.5 pr-3"><StatusBadge status={a.status} /></td>
                      <td className="whitespace-nowrap py-1.5 text-right">
                        <button className="mr-2 text-xs font-semibold text-emerald-400 hover:text-emerald-300"
                          onClick={() => void saveEdit(a.id)}>Save</button>
                        <button className="text-xs text-zinc-500 hover:text-zinc-300"
                          onClick={() => setEditingId(null)}>Cancel</button>
                      </td>
                    </tr>
                  ) : (
                    <tr key={a.id} className="border-b border-zinc-800/60 hover:bg-zinc-900/50">
                      <td className="py-1.5 pr-3 text-zinc-600">{i + 1}</td>
                      <td className="py-1.5 pr-3 text-zinc-100">{a.company || <span className="text-zinc-600">—</span>}</td>
                      <td className="py-1.5 pr-3 font-mono text-xs text-zinc-300">{a.email}</td>
                      <td className="py-1.5 pr-3 text-zinc-300">{a.position || <span className="text-zinc-600">any role</span>}</td>
                      <td className="py-1.5 pr-3"><StatusBadge status={a.status} /></td>
                      <td className="whitespace-nowrap py-1.5 text-right text-xs">
                        {["pending", "failed", "draft"].includes(a.status) && (
                          <>
                            <button
                              className="mr-2 text-sky-400 hover:text-sky-300"
                              onClick={() => {
                                setEditingId(a.id);
                                setDraft({ company: a.company, email: a.email, position: a.position });
                              }}
                            >
                              Edit
                            </button>
                            <button className="mr-2 text-red-400 hover:text-red-300" onClick={() => void removeRow(a.id)}>
                              Delete
                            </button>
                          </>
                        )}
                        {(a.subject || a.error) && (
                          <button className={btnGhost + " !px-2 !py-0.5 !text-xs"} onClick={() => {
                            window.dispatchEvent(new CustomEvent("view-email", { detail: a.id }));
                          }}>
                            View
                          </button>
                        )}
                      </td>
                    </tr>
                  )
                )}
              </tbody>
            </table>
          </div>
        </Card>
      )}
    </div>
  );
}
