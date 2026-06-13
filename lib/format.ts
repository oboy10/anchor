/** Formatting helpers. Pure and isomorphic (safe in client or server). */

const longDate = new Intl.DateTimeFormat("en-US", {
  year: "numeric",
  month: "long",
  day: "numeric",
});

const monthYear = new Intl.DateTimeFormat("en-US", {
  year: "numeric",
  month: "short",
});

export function formatDate(iso: string): string {
  return longDate.format(new Date(iso));
}

export function formatMonthYear(iso: string): string {
  return monthYear.format(new Date(iso));
}

/** "in 12 days", "in about 3 hours", or "expired". */
export function formatRelativeExpiry(iso: string, now = Date.now()): string {
  const diff = new Date(iso).getTime() - now;
  if (diff <= 0) return "expired";
  const days = Math.floor(diff / (24 * 60 * 60 * 1000));
  if (days >= 1) return `in ${days} day${days === 1 ? "" : "s"}`;
  const hours = Math.max(1, Math.floor(diff / (60 * 60 * 1000)));
  return `in about ${hours} hour${hours === 1 ? "" : "s"}`;
}

/** Display form for a 16-char fingerprint (e.g. 0fb4…264f). */
export function shortFingerprint(fingerprint: string): string {
  if (fingerprint.length <= 8) return fingerprint;
  return `${fingerprint.slice(0, 4)}…${fingerprint.slice(-4)}`;
}
