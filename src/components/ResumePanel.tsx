"use client";

import { useRef, useState } from "react";
import type { ResumeInfo } from "@/lib/resume";
import { api, btnDanger, btnPrimary, Card } from "./ui";

interface Props {
  resume: ResumeInfo | null;
  onChanged: () => void;
  notify: (msg: string, kind: "ok" | "err") => void;
}

export default function ResumePanel({ resume, onChanged, notify }: Props) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [dragOver, setDragOver] = useState(false);

  async function upload(file: File) {
    setBusy(true);
    try {
      const fd = new FormData();
      fd.append("file", file);
      await api("/api/resume", { method: "POST", body: fd });
      notify(`Resume uploaded: ${file.name}`, "ok");
      onChanged();
    } catch (e) {
      notify(e instanceof Error ? e.message : "Upload failed", "err");
    } finally {
      setBusy(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  }

  async function remove() {
    setBusy(true);
    try {
      await api("/api/resume", { method: "DELETE" });
      notify("Resume removed", "ok");
      onChanged();
    } catch (e) {
      notify(e instanceof Error ? e.message : "Delete failed", "err");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Card title="Resume">
      {!resume ? (
        <div
          onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
          onDragLeave={() => setDragOver(false)}
          onDrop={(e) => {
            e.preventDefault();
            setDragOver(false);
            const f = e.dataTransfer.files?.[0];
            if (f) void upload(f);
          }}
          onClick={() => fileRef.current?.click()}
          className={`flex cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed p-10 text-center transition ${
            dragOver ? "border-emerald-500 bg-emerald-500/5" : "border-zinc-700 hover:border-zinc-500"
          }`}
        >
          <p className="text-sm text-zinc-300">Drop your resume here or click to browse</p>
          <p className="mt-1 text-xs text-zinc-500">PDF recommended · DOCX / MD / TXT also work · max 15MB</p>
        </div>
      ) : (
        <div className="flex items-center justify-between rounded-lg border border-zinc-700 bg-zinc-950 px-4 py-3">
          <div>
            <p className="text-sm font-medium text-zinc-100">📎 {resume.filename}</p>
            <p className="mt-0.5 text-xs text-zinc-500">
              {(resume.size / 1024).toFixed(0)} KB ·{" "}
              {resume.textChars > 0
                ? `text extracted (${resume.textChars.toLocaleString()} chars feed the AI)`
                : "no text extracted — AI will rely on your profile only"}
            </p>
          </div>
          <div className="flex gap-2">
            <button className={btnPrimary} disabled={busy} onClick={() => fileRef.current?.click()}>
              Replace
            </button>
            <button className={btnDanger} disabled={busy} onClick={remove}>
              Remove
            </button>
          </div>
        </div>
      )}
      <input
        ref={fileRef}
        type="file"
        accept=".pdf,.doc,.docx,.md,.txt"
        hidden
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) void upload(f);
        }}
      />
    </Card>
  );
}
