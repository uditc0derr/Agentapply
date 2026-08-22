const SPLIT_RE = /[|,\t;]+/;
const EMAIL_TOKEN_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

export interface ParsedRow {
  company: string;
  email: string;
  position: string;
}

function titleCaseFromDomain(domain: string): string {
  const base = domain.split(".")[0] || domain;
  return base
    .split(/[-_]+/)
    .filter(Boolean)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
}

export interface ParseOutcome {
  rows: ParsedRow[];
  invalid: string[];
}

/**
 * Parses pasted recipient lists. Accepted per line:
 *   hr@abc.com
 *   ABC Tech | hr@abc.com | React Developer
 *   ABC Tech, hr@abc.com, React Developer
 *   Tab/semicolon separated columns also work.
 * A header row (company/email/position...) is skipped.
 */
export function parseRecipientList(text: string): ParseOutcome {
  const rows: ParsedRow[] = [];
  const invalid: string[] = [];
  const seen = new Set<string>();

  for (const rawLine of text.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line) continue;

    const tokens = line
      .split(SPLIT_RE)
      .map((t) => t.trim())
      .filter(Boolean);

    if (!tokens.length) continue;

    const lowerTokens = tokens.map((t) => t.toLowerCase());
    if (
      lowerTokens.includes("company") ||
      lowerTokens.includes("email") ||
      lowerTokens.includes("position")
    ) {
      continue;
    }

    const emailIdx = tokens.findIndex((t) => EMAIL_TOKEN_RE.test(t));
    if (emailIdx === -1) {
      invalid.push(line);
      continue;
    }
    const email = tokens[emailIdx].toLowerCase();
    if (seen.has(email)) continue;
    seen.add(email);

    const rest = tokens.filter((_, i) => i !== emailIdx);
    let company = "";
    let position = "";
    if (rest.length === 0) {
      company = titleCaseFromDomain(email.split("@")[1] ?? "");
    } else if (rest.length === 1) {
      company = rest[0];
    } else {
      company = rest[0];
      position = rest.slice(1).join(" ");
    }

    rows.push({ company: company.trim(), email, position: position.trim() });
  }

  return { rows, invalid };
}
