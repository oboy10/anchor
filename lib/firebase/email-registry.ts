import "server-only";
import { createHash } from "node:crypto";
import { getAdminFirestore, isFirebaseAdminConfigured } from "./admin";

/**
 * The ONLY data Anchor stores server-side: a list of registered email hashes.
 * Emails are never written in plaintext — only SHA-256(lowercased email) — so
 * Firestore holds no recoverable personal data. Everything else lives in the
 * user's browser (see lib/local/db). This registry is the foundation for the
 * future end-to-end-encrypted backup that maps an email to an encrypted blob.
 */
const COLLECTION = "registeredEmails";

export function hashEmail(email: string): string {
  return createHash("sha256").update(email.trim().toLowerCase()).digest("hex");
}

export async function registerEmailHash(email: string): Promise<{ ok: boolean }> {
  if (!isFirebaseAdminConfigured()) return { ok: false };
  const hash = hashEmail(email);
  await getAdminFirestore()
    .collection(COLLECTION)
    .doc(hash)
    .set({ registeredAt: new Date().toISOString() }, { merge: true });
  return { ok: true };
}

export async function isEmailRegistered(email: string): Promise<boolean> {
  if (!isFirebaseAdminConfigured()) return false;
  const hash = hashEmail(email);
  const doc = await getAdminFirestore().collection(COLLECTION).doc(hash).get();
  return doc.exists;
}
