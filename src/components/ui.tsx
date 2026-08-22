"use client";

import type { AppStatus } from "@/lib/types";

export async function api<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, {
    ...init,
    headers: init?.body instanceof FormData ? init?.headers : { "Content-Type": "application/json", ...init?.headers },
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error((data as { error?: string }).error || `Request failed (${res.status})`);
  return data as T;
}

export const STATUS_META: Record<AppStatus, { label: string; cls: string }> = {
  pending: { label: "Pending", cls: "bg-zinc-700/60 text-zinc-300 border-zinc-600" },
  generating: { label: "Generating", cls: "bg-amber-500/15 text-amber-400 border-amber-500/40 animate-pulse" },
  sending: { label: "Sending", cls: "bg-sky-500/15 text-sky-400 border-sky-500/40 animate-pulse" },
  draft: { label: "Draft", cls: "bg-violet-500/15 text-violet-300 border-violet-500/40" },
  sent: { label: "Sent", cls: "bg-emerald-500/15 text-emerald-400 border-emerald-500/40" },
  failed: { label: "Failed", cls: "bg-red-500/15 text-red-400 border-red-500/40" },
  skipped: { label: "Skipped", cls: "bg-yellow-500/15 text-yellow-500 border-yellow-500/40" },
};

export function StatusBadge({ status }: { status: AppStatus }) {
  const meta = STATUS_META[status] ?? STATUS_META.pending;
  return (
    <span className={`inline-block rounded border px-2 py-0.5 text-xs font-medium ${meta.cls}`}>
      {meta.label}
    </span>
  );
}

export function Card({ title, children, right }: { title: string; children: React.ReactNode; right?: React.ReactNode }) {
  return (
    <section className="rounded-lg border border-zinc-800 bg-zinc-900/60 p-5">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-sm font-semibold uppercase tracking-wider text-zinc-400">{title}</h2>
        {right}
      </div>
      {children}
    </section>
  );
}

export function Field({
  label,
  children,
  hint,
}: {
  label: string;
  children: React.ReactNode;
  hint?: string;
}) {
  return (
    <label className="block">
      <span className="mb-1 block text-xs font-medium text-zinc-400">{label}</span>
      {children}
      {hint && <span className="mt-1 block text-[11px] text-zinc-500">{hint}</span>}
    </label>
  );
}

export const inputCls =
  "w-full rounded-md border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm text-zinc-100 placeholder-zinc-600 outline-none focus:border-emerald-500/70";

export const btnPrimary =
  "rounded-md bg-emerald-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-emerald-500 disabled:cursor-not-allowed disabled:opacity-50";

export const btnGhost =
  "rounded-md border border-zinc-700 px-3 py-2 text-sm text-zinc-300 transition hover:border-zinc-500 hover:text-white disabled:cursor-not-allowed disabled:opacity-50";

export const btnDanger =
  "rounded-md border border-red-900 px-3 py-2 text-sm text-red-400 transition hover:bg-red-950/50 disabled:cursor-not-allowed disabled:opacity-50";

export function Toast({ msg, kind }: { msg: string; kind: "ok" | "err" }) {
  return (
    <div
      className={`fixed bottom-6 right-6 z-50 max-w-md rounded-md border px-4 py-3 text-sm shadow-xl ${
        kind === "ok"
          ? "border-emerald-500/50 bg-emerald-950/90 text-emerald-200"
          : "border-red-500/50 bg-red-950/90 text-red-200"
      }`}
    >
      {msg}
    </div>
  );
}
