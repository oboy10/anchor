import { createPrivateKey } from "node:crypto";

/** Normalize FIREBASE_PRIVATE_KEY from .env / Vercel (quotes, escaped newlines). */
export function normalizePrivateKey(raw: string): string {
  let key = raw.trim();

  if (
    (key.startsWith('"') && key.endsWith('"')) ||
    (key.startsWith("'") && key.endsWith("'"))
  ) {
    key = key.slice(1, -1);
  }

  return key.replace(/\\n/g, "\n").trim();
}

export function isPrivateKeyFormatValid(raw: string): boolean {
  const key = normalizePrivateKey(raw);
  if (!key.includes("BEGIN PRIVATE KEY") || !key.includes("END PRIVATE KEY")) {
    return false;
  }

  try {
    createPrivateKey(key);
    return true;
  } catch {
    return false;
  }
}
