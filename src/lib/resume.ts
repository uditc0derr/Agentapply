import fs from "fs";
import path from "path";
import { extractText, getDocumentProxy } from "unpdf";

const UPLOADS_DIR = path.join(process.cwd(), "uploads");
const RESUME_META_KEY = "resumeMeta";

export interface ResumeInfo {
  filename: string;
  size: number;
  uploadedAt: string;
  textChars: number;
}

export function resumePath(filename: string): string {
  return path.join(UPLOADS_DIR, filename);
}

function metaStore(): Map<string, string> {
  const store = globalThis as unknown as {
    __resumeMeta?: Map<string, string>;
  };
  if (!store.__resumeMeta) store.__resumeMeta = new Map();
  return store.__resumeMeta;
}

export async function saveResume(file: File): Promise<ResumeInfo> {
  fs.mkdirSync(UPLOADS_DIR, { recursive: true });
  const safeName = file.name.replace(/[^\w.\- ]+/g, "_");
  const dest = path.join(UPLOADS_DIR, safeName);

  for (const f of listResumeFiles()) fs.rmSync(path.join(UPLOADS_DIR, f), { force: true });

  const buf = Buffer.from(await file.arrayBuffer());
  fs.writeFileSync(dest, buf);

  let chars = 0;
  try {
    const text = await extractResumeText(dest);
    chars = text.length;
    metaStore().set("resumeText", text.slice(0, 20000));
  } catch {
    metaStore().set("resumeText", "");
  }

  const info: ResumeInfo = {
    filename: safeName,
    size: buf.length,
    uploadedAt: new Date().toISOString(),
    textChars: chars,
  };
  metaStore().set(RESUME_META_KEY, JSON.stringify(info));
  return info;
}

export function getResumeInfo(): ResumeInfo | null {
  const raw = metaStore().get(RESUME_META_KEY);
  if (raw && fs.existsSync(resumePath(JSON.parse(raw).filename))) {
    return JSON.parse(raw);
  }
  const files = listResumeFiles();
  if (!files.length) return null;
  const p = resumePath(files[0]);
  const stat = fs.statSync(p);
  return {
    filename: files[0],
    size: stat.size,
    uploadedAt: stat.mtime.toISOString(),
    textChars: 0,
  };
}

export function getResumeFile(): { path: string; filename: string } | null {
  const info = getResumeInfo();
  if (!info) return null;
  return { path: resumePath(info.filename), filename: info.filename };
}

export function getCachedResumeText(): string {
  return metaStore().get("resumeText") ?? "";
}

export function deleteResume() {
  for (const f of listResumeFiles()) fs.rmSync(resumePath(f), { force: true });
  metaStore().clear();
}

function listResumeFiles(): string[] {
  if (!fs.existsSync(UPLOADS_DIR)) return [];
  return fs
    .readdirSync(UPLOADS_DIR)
    .filter((f) => /\.(pdf|docx?|md|txt)$/i.test(f));
}

export async function extractResumeText(filePath: string): Promise<string> {
  const buf = fs.readFileSync(filePath);
  if (/\.pdf$/i.test(filePath)) {
    const pdf = await getDocumentProxy(new Uint8Array(buf));
    const { text } = await extractText(pdf, { mergePages: true });
    return (Array.isArray(text) ? text.join("\n") : text)
      .replace(/\u0000/g, "")
      .trim();
  }
  return buf.toString("utf8").replace(/\u0000/g, "").trim();
}
