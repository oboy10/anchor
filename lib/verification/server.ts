import "server-only";

/**
 * Server-side state for contact verification.
 *
 * Two pieces of data, both stored only as SHA-256 hashes so no plaintext
 * contact ever lands in Firestore:
 *  - pending codes: hash(channel:value) → { codeHash, expiresAt }, short-lived
 *  - registered identities: hash(channel:value) → registeredAt, to prevent the
 *    same email/phone being verified onto two accounts (double registration)
 *
 * When Firebase Admin is unconfigured (local dev), an in-memory fallback keeps
 * the flow working within a single server process.
 */
import { createHash, randomInt } from "node:crypto";
import { getAdminFirestore, isFirebaseAdminConfigured } from "@/lib/firebase/admin";

export type Channel = "email" | "phone";

const PENDING_COLLECTION = "pendingVerifications";
const REGISTERED_COLLECTION = "registeredIdentities";
const CODE_TTL_MS = 10 * 60 * 1000;

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

// In-memory fallback (single process only).
const memPending = new Map<string, { codeHash: string; expiresAt: number }>();
const memRegistered = new Set<string>();

export async function isRegistered(
  channel: Channel,
  value: string,
): Promise<boolean> {
  const h = identityHash(channel, value);
  if (!isFirebaseAdminConfigured()) return memRegistered.has(h);
  const doc = await getAdminFirestore().collection(REGISTERED_COLLECTION).doc(h).get();
  return doc.exists;
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
  const h = identityHash(channel, value);
  if (isFirebaseAdminConfigured()) {
    await getAdminFirestore()
      .collection(REGISTERED_COLLECTION)
      .doc(h)
      .set({ registeredAt: new Date().toISOString() }, { merge: true });
  } else {
    memRegistered.add(h);
  }
}
