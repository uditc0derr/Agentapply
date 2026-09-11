# AgentApply

AgentApply is a self-hosted bulk job application agent. Upload your resume, import a list of recruiter/hiring emails with the positions you're targeting, and it generates personalized application emails — using AI or a template — and sends them via Gmail SMTP with your resume attached. Every application is tracked in a built-in queue with retries and a dry-run mode.

> Use responsibly. Only email companies and recruiters who have advertised the position you are applying for.

## Features

- **4-step workflow** — Setup → Resume → Recipients → Campaign
- **AI-generated emails** — works with any OpenAI-compatible API (defaults to OpenAI); falls back to a clean deterministic template on failure, no API key, or when AI is disabled
- **Template mode** — zero-config personalized email generation without any AI API
- **Bulk sending** — processes all pending applications with a configurable per-email delay
- **Dry-run / preview** — generate emails without sending, then review drafts and send the good ones manually
- **Resume parsing** — upload a PDF, DOCX, MD, or TXT resume; text is extracted and used to personalize emails, and the file is attached to every application
- **Flexible recipient input** — paste one `email` per line or `Company | email | Position` (comma, tab, and semicolon separators also supported; duplicates and invalid lines are skipped)
- **Automatic tracking** — every application gets a status: `pending`, `generating`, `sending`, `draft`, `sent`, `failed`, or `skipped`
- **Retries** — failed applications get one automatic retry with backoff
- **SQLite storage** — applications, settings, and campaign state persist across restarts

## Tech stack

- [Next.js 15](https://nextjs.org/) (App Router) + React 19 + TypeScript
- [Tailwind CSS v4](https://tailwindcss.com/)
- [better-sqlite3](https://github.com/WiseLibs/better-sqlite3) for persistence
- [OpenAI SDK](https://github.com/openai/openai-node) (OpenAI-compatible) for email generation
- [nodemailer](https://nodemailer.com/) for Gmail SMTP sending
- [unpdf](https://github.com/unjs/unpdf) for PDF text extraction

## Getting started

### Prerequisites

- Node.js 18.18+ (Next.js 15 requirement)
- A Gmail account configured with an [App Password](https://support.google.com/accounts/answer/185833) (2-factor authentication required)
- Optional: an OpenAI API key (or any OpenAI-compatible provider such as Ollama, LM Studio, Groq, etc.)

### Install and run

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000). The app is ready to use — all configuration happens through the UI, so no environment variables are required.

### Production

```bash
npm run build
npm start
```

## Usage

1. **Setup** — Provide your Gmail address and App Password, your name and contact details, and (optionally) an AI base URL, API key, and model. Toggle **dry-run** to generate drafts without sending. Set a delay between sends to stay gentle on recipients.
2. **Resume** — Upload your resume (PDF, DOCX, MD, or TXT). Its text is used to personalize each email and the file is attached to every application.
3. **Recipients** — Paste your list of hiring contacts and import. Format options per line:

   ```
   hr@acme.com
   Acme Corp | hr@acme.com | Senior Frontend Engineer
   Acme Corp, hr@acme.com, Senior Frontend Engineer
   ```

   Header rows, duplicates, and invalid lines are handled automatically.
4. **Campaign** — Review the generated emails, then **Start campaign**. Each pending application is generated, emailed with your resume attached, and tracked live. In dry-run mode, generated drafts can be reviewed and sent with **Send drafts now**. Failed applications can be retried.

## How it works

- **Email generation** — When AI is enabled, the agent prompts the model to write a short, natural, factual application email based only on your profile and resume (2–5 relevant skills, 120–170 words, no invented details). The subject line and your contact signature are always produced by the app — never by AI — and any AI-generated contact info is stripped. Any failure falls back to the built-in template.
- **Sending** — Emails are sent through Gmail's SMTP server (`smtp.gmail.com`) via nodemailer, one at a time, with your resume attached.
- **Persistence** — Everything is stored in a local SQLite database at `data/agentapply.db`; uploads live in `uploads/`. Both are git-ignored.

## Project structure

```
src/
  app/               Next.js App Router, pages, and API routes
  components/        UI panels (Setup, Resume, Recipients, Campaign)
  lib/
    db.ts            SQLite storage for applications and settings
    parser.ts        Recipient list parsing
    resume.ts        Resume upload and text extraction
    generator.ts     AI + template email generation
    mailer.ts        Gmail SMTP sending
    campaign.ts      Campaign runner (queue, retries, stops)
    types.ts         Shared types
```

## Security notes

- Gmail App Password and AI API key are stored locally in the SQLite database and are never returned by the API (only a presence flag is exposed to the client).
- This is a local, self-hosted tool. Do not deploy it publicly without adding authentication.

## Disclaimer

This project is for automating the *manual* work of writing and sending job applications to positions you are legitimately applying to. It is not a spam tool. Misuse can result in account bans and harm your reputation. You are responsible for how you use it.