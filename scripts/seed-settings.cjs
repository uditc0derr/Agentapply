/* One-off seed: writes provided credentials into data/agentapply.db (gitignored). */
const Database = require("better-sqlite3");
const fs = require("fs");
const path = require("path");

const DATA_DIR = path.join(__dirname, "..", "data");
fs.mkdirSync(DATA_DIR, { recursive: true });
const db = new Database(path.join(DATA_DIR, "agentapply.db"));
db.pragma("journal_mode = WAL");
db.exec(`CREATE TABLE IF NOT EXISTS settings (key TEXT PRIMARY KEY, value TEXT NOT NULL);`);

const upsert = db.prepare(
  `INSERT INTO settings (key, value) VALUES (?, ?)
   ON CONFLICT(key) DO UPDATE SET value = excluded.value`
);

const [gmailUser, gmailAppPassword, aiApiKey] = process.argv.slice(2);
upsert.run("gmailUser", gmailUser || "");
upsert.run("gmailAppPassword", gmailAppPassword || "");
upsert.run("aiEnabled", "true");
upsert.run("aiBaseUrl", "https://generativelanguage.googleapis.com/v1beta/openai");
upsert.run("aiModel", "gemini-2.5-flash");
if (aiApiKey && !aiApiKey.includes("\u2022")) upsert.run("aiApiKey", aiApiKey);
upsert.run("fromName", gmailUser ? gmailUser.split("@")[0] : "");

console.log("Seeded settings for", gmailUser);
db.close();
