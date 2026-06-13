import "server-only";

/**
 * Server-side state for contact verification.
 *
 * Pending codes are stored only as SHA-256 hashes, short-lived, so no plaintext
 * contact ever lands in Firestore:
 *  - pending codes: hash(channel:value) → { codeHash, expiresAt }
 *
 * Registered identities are never recorded in Firestore. Uniqueness (one
 * phone/email → one account, no double registration) is enforced through a
 * hashtable of SHA-256 identity hashes, persisted to a local JSON file on disk
 * so the guarantee survives restarts. The file holds only opaque hashes — no
 * plaintext contact and no identity for who registered.
 *
 * When Firebase Admin is unconfigured (local dev), an in-memory fallback keeps
 * the pending-code flow working within a single server process.
 */
import { createHash, randomInt } from "node:crypto";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { getAdminFirestore, isFirebaseAdminConfigured } from "@/lib/firebase/admin";

export type Channel = "email" | "phone";

const PENDING_COLLECTION = "pendingVerifications";
const CODE_TTL_MS = 10 * 60 * 1000;
const REGISTERED_HASHES_PATH =
  process.env.REGISTERED_HASHES_PATH ??
  join(process.cwd(), ".data", "registered-hashes.json");

function identityHash(channel: Channel, value: string): string {
  return createHash("sha256")
    .update(`${channel}:${value.trim().toLowerCase()}`)
    .digest("hex");
}

function codeHash(code: string): string {
  return createHash("sha256").update(code).digest("hex");
}

export function generateCode(): string {
  return String(randomInt(0, 1_000_000)).padStart(6, "0");
}

// In-memory fallback for pending codes (single process only).
const memPending = new Map<string, { codeHash: string; expiresAt: number }>();

// Hashtable guaranteeing uniqueness of registered phone/email hashes, backed by
// a JSON file on disk so it survives restarts. Lazily loaded on first use.
let registeredHashes: Set<string> | null = null;

function loadRegisteredHashes(): Set<string> {
  if (registeredHashes) return registeredHashes;
  try {
    const raw = readFileSync(REGISTERED_HASHES_PATH, "utf8");
    const parsed = JSON.parse(raw) as unknown;
    registeredHashes = new Set(Array.isArray(parsed) ? (parsed as string[]) : []);
  } catch {
    // Missing or unreadable file → start empty.
    registeredHashes = new Set<string>();
  }
  return registeredHashes;
}

function persistRegisteredHashes(): void {
  mkdirSync(dirname(REGISTERED_HASHES_PATH), { recursive: true });
  writeFileSync(
    REGISTERED_HASHES_PATH,
    JSON.stringify([...loadRegisteredHashes()]),
    "utf8",
  );
}

export async function isRegistered(
  channel: Channel,
  value: string,
): Promise<boolean> {
  return loadRegisteredHashes().has(identityHash(channel, value));
}

export async function createPendingCode(
  channel: Channel,
  value: string,
): Promise<string> {
  const code = generateCode();
  const entry = { codeHash: codeHash(code), expiresAt: Date.now() + CODE_TTL_MS };
  const h = identityHash(channel, value);
  if (isFirebaseAdminConfigured()) {
    await getAdminFirestore().collection(PENDING_COLLECTION).doc(h).set(entry);
  } else {
    memPending.set(h, entry);
  }
  return code;
}

/** Verify and consume a code. Returns false on missing/expired/mismatched. */
export async function consumeCode(
  channel: Channel,
  value: string,
  code: string,
): Promise<boolean> {
  const h = identityHash(channel, value);
  const expected = codeHash(code);
  if (isFirebaseAdminConfigured()) {
    const ref = getAdminFirestore().collection(PENDING_COLLECTION).doc(h);
    const doc = await ref.get();
    if (!doc.exists) return false;
    const data = doc.data() as { codeHash: string; expiresAt: number };
    if (data.expiresAt < Date.now() || data.codeHash !== expected) return false;
    await ref.delete();
    return true;
  }
  const entry = memPending.get(h);
  if (!entry) return false;
  if (entry.expiresAt < Date.now() || entry.codeHash !== expected) return false;
  memPending.delete(h);
  return true;
}

export async function recordRegistered(
  channel: Channel,
  value: string,
): Promise<void> {
  // Track in the on-disk hashtable only — never written to Firestore, so the
  // server records no identity for who has registered.
  loadRegisteredHashes().add(identityHash(channel, value));
  persistRegisteredHashes();
}
