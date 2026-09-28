const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** Parses free-form pasted text or a CSV/TXT file's contents into a
 * deduplicated list of syntactically valid email addresses, tolerating
 * commas, semicolons, newlines, and a header row containing "email". */
export function extractRecipients(raw: string): { valid: string[]; invalid: string[] } {
  const tokens = raw
    .split(/[\n,;]+/)
    .map((t) => t.trim())
    .filter(Boolean)
    .filter((t) => t.toLowerCase() !== "email" && t.toLowerCase() !== "recipient");

  const valid = new Set<string>();
  const invalid: string[] = [];

  for (const token of tokens) {
    if (EMAIL_RE.test(token)) valid.add(token.toLowerCase());
    else invalid.push(token);
  }

  return { valid: Array.from(valid), invalid };
}
