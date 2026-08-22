import Database from "better-sqlite3";
import fs from "fs";
import path from "path";
import type { AppStatus, Application, Settings } from "./types";

const DATA_DIR = path.join(process.cwd(), "data");
const DB_PATH = path.join(DATA_DIR, "agentapply.db");

declare global {
  // eslint-disable-next-line no-var
  var __agentapplyDb: Database.Database | undefined;
}

function createDb(): Database.Database {
  fs.mkdirSync(DATA_DIR, { recursive: true });
  const db = new Database(DB_PATH);
  db.pragma("journal_mode = WAL");
  db.exec(`
    CREATE TABLE IF NOT EXISTS applications (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      company TEXT NOT NULL DEFAULT '',
      email TEXT NOT NULL,
      position TEXT NOT NULL DEFAULT '',
      status TEXT NOT NULL DEFAULT 'pending',
      subject TEXT NOT NULL DEFAULT '',
      body TEXT NOT NULL DEFAULT '',
      email_source TEXT NOT NULL DEFAULT '',
      error TEXT NOT NULL DEFAULT '',
      attempts INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL,
      sent_at TEXT NOT NULL DEFAULT ''
    );
    CREATE UNIQUE INDEX IF NOT EXISTS idx_email_lower ON applications (lower(email));
    CREATE TABLE IF NOT EXISTS settings (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS meta (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL
    );
  `);
  return db;
}

export function getDb(): Database.Database {
  if (!globalThis.__agentapplyDb) {
    globalThis.__agentapplyDb = createDb();
  }
  return globalThis.__agentapplyDb;
}

export interface ImportResult {
  added: number;
  duplicates: number;
  invalid: number;
  invalidLines: string[];
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

export function insertRecipients(
  rows: { company: string; email: string; position: string }[]
): ImportResult {
  const db = getDb();
  const now = new Date().toISOString();
  const stmt = db.prepare(
    `INSERT OR IGNORE INTO applications (company, email, position, status, created_at)
     VALUES (?, ?, ?, 'pending', ?)`
  );
  let added = 0;
  let duplicates = 0;
  for (const r of rows) {
    const res = stmt.run(r.company, r.email.toLowerCase(), r.position, now);
    if (res.changes > 0) added++;
    else duplicates++;
  }
  return { added, duplicates, invalid: 0, invalidLines: [] };
}

export function listApplications(): Application[] {
  return getDb()
    .prepare(`SELECT * FROM applications ORDER BY id`)
    .all() as Application[];
}

export function getApplication(id: number): Application | undefined {
  return getDb().prepare(`SELECT * FROM applications WHERE id = ?`).get(id) as
    | Application
    | undefined;
}

export function updateApplication(
  id: number,
  fields: Partial<Pick<Application, "company" | "email" | "position">>
) {
  const allowed: Record<string, string> = {
    company: "company",
    email: "email",
    position: "position",
  };
  const sets = Object.keys(fields)
    .filter((k) => allowed[k] && fields[k as keyof typeof fields] !== undefined)
    .map((k) => `${allowed[k]} = @${k}`);
  if (!sets.length) return;
  getDb()
    .prepare(`UPDATE applications SET ${sets.join(", ")} WHERE id = @id`)
    .run({ id, ...fields });
}

export function setStatus(id: number, status: AppStatus, extra?: Partial<Application>) {
  const db = getDb();
  const cols = ["status = @status"];
  const params: Record<string, unknown> = { id, status };
  if (extra) {
    for (const [k, v] of Object.entries(extra)) {
      cols.push(`${k} = @${k}`);
      params[k] = v;
    }
  }
  db.prepare(`UPDATE applications SET ${cols.join(", ")} WHERE id = @id`).run(params);
}

export function deleteApplication(id: number) {
  getDb().prepare(`DELETE FROM applications WHERE id = ?`).run(id);
}

export function resetAll() {
  getDb().exec(`
    DELETE FROM applications;
    DELETE FROM sqlite_sequence WHERE name='applications';
  `);
}

export function retryFailed(): number {
  const res = getDb()
    .prepare(
      `UPDATE applications SET status='pending', error='', subject='', body='', email_source=''
       WHERE status IN ('failed','draft')`
    )
    .run();
  return res.changes;
}

const SETTING_KEYS: (keyof Settings)[] = [
  "gmailUser",
  "gmailAppPassword",
  "aiEnabled",
  "aiBaseUrl",
  "aiApiKey",
  "aiModel",
  "name",
  "phone",
  "linkedin",
  "portfolio",
  "experienceSummary",
  "sendDelayMs",
  "dryRun",
  "fromName",
];

export function loadSettings(): Settings {
  const rows = getDb().prepare(`SELECT key, value FROM settings`).all() as {
    key: string;
    value: string;
  }[];
  const map = new Map(rows.map((r) => [r.key, r.value]));
  return {
    gmailUser: map.get("gmailUser") ?? "",
    gmailAppPassword: map.get("gmailAppPassword") ?? "",
    aiEnabled: (map.get("aiEnabled") ?? "true") === "true",
    aiBaseUrl: map.get("aiBaseUrl") ?? "https://api.openai.com/v1",
    aiApiKey: map.get("aiApiKey") ?? "",
    aiModel: map.get("aiModel") ?? "gpt-4o-mini",
    name: map.get("name") ?? "",
    phone: map.get("phone") ?? "",
    linkedin: map.get("linkedin") ?? "",
    portfolio: map.get("portfolio") ?? "",
    experienceSummary: map.get("experienceSummary") ?? "",
    sendDelayMs: Number(map.get("sendDelayMs") ?? 3000),
    dryRun: (map.get("dryRun") ?? "false") === "true",
    fromName: map.get("fromName") ?? "",
  };
}

export function saveSettings(patch: Partial<Settings>) {
  const db = getDb();
  const upsert = db.prepare(
    `INSERT INTO settings (key, value) VALUES (?, ?)
     ON CONFLICT(key) DO UPDATE SET value = excluded.value`
  );
  for (const key of SETTING_KEYS) {
    if (patch[key] !== undefined) {
      let v = patch[key];
      if (typeof v === "boolean") v = v ? "true" : "false";
      upsert.run(key, String(v));
    }
  }
}
