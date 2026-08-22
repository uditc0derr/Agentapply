"use client";

import { useState } from "react";
import type { Settings } from "@/lib/types";
import { api, btnGhost, btnPrimary, Card, Field, inputCls } from "./ui";

interface Props {
  settings: Settings & { hasGmailAppPassword: boolean; hasAiApiKey: boolean };
  onSaved: () => void;
  notify: (msg: string, kind: "ok" | "err") => void;
}

const PRESETS = [
  { label: "Gemini", baseUrl: "https://generativelanguage.googleapis.com/v1beta/openai", model: "gemini-2.5-flash" },
  { label: "OpenAI", baseUrl: "https://api.openai.com/v1", model: "gpt-4o-mini" },
  { label: "Groq", baseUrl: "https://api.groq.com/openai/v1", model: "openai/gpt-oss-120b" },
  { label: "OpenRouter", baseUrl: "https://openrouter.ai/api/v1", model: "" },
  { label: "Ollama", baseUrl: "http://localhost:11434/v1", model: "" },
];

export default function SetupPanel({ settings, onSaved, notify }: Props) {
  const [form, setForm] = useState(settings);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);

  const set = (k: keyof typeof form, v: string | boolean | number) =>
    setForm((f) => ({ ...f, [k]: v }));

  async function save() {
    setSaving(true);
    try {
      await api("/api/settings", { method: "PUT", body: JSON.stringify(form) });
      notify("Settings saved", "ok");
      onSaved();
    } catch (e) {
      notify(e instanceof Error ? e.message : "Save failed", "err");
    } finally {
      setSaving(false);
    }
  }

  async function testSmtp() {
    setTesting(true);
    try {
      await api("/api/settings", { method: "PUT", body: JSON.stringify(form) });
      await api("/api/settings/test", { method: "POST" });
      notify("Test email sent — check your inbox", "ok");
      onSaved();
    } catch (e) {
      notify(e instanceof Error ? e.message : "SMTP test failed", "err");
    } finally {
      setTesting(false);
    }
  }

  return (
    <div className="space-y-5">
      <Card
        title="1 · Gmail SMTP"
        right={
          <button className={btnGhost} onClick={testSmtp} disabled={testing}>
            {testing ? "Sending…" : "Send test email"}
          </button>
        }
      >
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <Field label="Gmail address (sender)">
            <input className={inputCls} placeholder="you@gmail.com" value={form.gmailUser}
              onChange={(e) => set("gmailUser", e.target.value)} />
          </Field>
          <Field label="Gmail App Password" hint={
            settings.hasGmailAppPassword
              ? "Configured — type a new value to replace it"
              : "Create at myaccount.google.com → Security → App passwords"
          }>
            <input className={inputCls} type="password" placeholder="16-character app password"
              value={form.gmailAppPassword} onChange={(e) => set("gmailAppPassword", e.target.value)} />
          </Field>
          <Field label="From name (optional)">
            <input className={inputCls} placeholder="Udit Pandey" value={form.fromName}
              onChange={(e) => set("fromName", e.target.value)} />
          </Field>
          <Field label="Delay between emails (ms)" hint="3–5s recommended to stay under Gmail rate limits">
            <input className={inputCls} type="number" min={0} step={500} value={form.sendDelayMs}
              onChange={(e) => set("sendDelayMs", Number(e.target.value))} />
          </Field>
        </div>
      </Card>

      <Card title="2 · AI email generation">
        <div className="mb-4 flex flex-wrap items-center gap-2">
          <input id="aiEnabled" type="checkbox" checked={form.aiEnabled}
            onChange={(e) => set("aiEnabled", e.target.checked)}
            className="h-4 w-4 accent-emerald-600" />
          <label htmlFor="aiEnabled" className="text-sm text-zinc-300">
            Personalize each application with an LLM
            <span className="ml-2 text-xs text-zinc-500">(off = template mode)</span>
          </label>
          <span className="ml-auto flex gap-1">
            {PRESETS.map((p) => (
              <button key={p.label}
                onClick={() => { set("aiBaseUrl", p.baseUrl); if (p.model) set("aiModel", p.model); }}
                className={`rounded border px-2 py-0.5 text-[11px] transition ${
                  form.aiBaseUrl === p.baseUrl
                    ? "border-emerald-500 text-emerald-400"
                    : "border-zinc-700 text-zinc-400 hover:border-zinc-500 hover:text-zinc-200"
                }`}>
                {p.label}
              </button>
            ))}
          </span>
        </div>
        <div className="grid grid-cols-1 gap-4 opacity-100 md:grid-cols-2">
          <Field label="API base URL" hint="OpenAI-compatible. Try Groq, OpenRouter or a local Ollama.">
            <input className={inputCls} placeholder="https://api.openai.com/v1" value={form.aiBaseUrl}
              onChange={(e) => set("aiBaseUrl", e.target.value)} disabled={!form.aiEnabled} />
          </Field>
          <Field label="Model">
            <input className={inputCls} placeholder="gpt-4o-mini" value={form.aiModel}
              onChange={(e) => set("aiModel", e.target.value)} disabled={!form.aiEnabled} />
          </Field>
          <Field label="API key" hint={settings.hasAiApiKey ? "Configured — type a new value to replace it" : undefined}>
            <input className={inputCls} type="password" placeholder="sk-…" value={form.aiApiKey}
              onChange={(e) => set("aiApiKey", e.target.value)} disabled={!form.aiEnabled} />
          </Field>
        </div>
      </Card>

      <Card title="3 · Your profile">
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <Field label="Full name">
            <input className={inputCls} value={form.name} onChange={(e) => set("name", e.target.value)} />
          </Field>
          <Field label="Phone">
            <input className={inputCls} value={form.phone} onChange={(e) => set("phone", e.target.value)} />
          </Field>
          <Field label="LinkedIn">
            <input className={inputCls} placeholder="linkedin.com/in/…" value={form.linkedin}
              onChange={(e) => set("linkedin", e.target.value)} />
          </Field>
          <Field label="Portfolio / GitHub">
            <input className={inputCls} placeholder="github.com/…" value={form.portfolio}
              onChange={(e) => set("portfolio", e.target.value)} />
          </Field>
        </div>
        <div className="mt-4">
          <Field label="Experience summary (short pitch for the AI)" hint="2–3 sentences: role, years, key stack and achievements.">
            <textarea className={`${inputCls} min-h-24`} value={form.experienceSummary}
              onChange={(e) => set("experienceSummary", e.target.value)} />
          </Field>
        </div>
      </Card>

      <div className="flex items-center justify-between rounded-lg border border-zinc-800 bg-zinc-900/60 p-5">
        <label className="flex items-center gap-2 text-sm text-zinc-300">
          <input type="checkbox" checked={form.dryRun} onChange={(e) => set("dryRun", e.target.checked)}
            className="h-4 w-4 accent-violet-600" />
          Dry-run mode by default (generate drafts, don&apos;t send)
        </label>
        <button className={btnPrimary} onClick={save} disabled={saving}>
          {saving ? "Saving…" : "Save settings"}
        </button>
      </div>
    </div>
  );
}
