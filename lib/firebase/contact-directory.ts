import "server-only";

import { createHash } from "node:crypto";
import { getAdminFirestore, isFirebaseAdminConfigured } from "./admin";
import type { Channel } from "@/lib/verification/server";

const COLLECTION = "contactDirectory";

/** SHA-256 of `channel:value` (lowercased email / normalized phone). */
export function contactIdentityHash(channel: Channel, value: string): string {
  return createHash("sha256")
    .update(`${channel}:${value.trim().toLowerCase()}`)
    .digest("hex");
}

const memDirectory = new Map<string, string>();

/**
 * Map a verified contact to an Anchor fingerprint so issuers can deliver
 * credentials by email instead of sharing a fingerprint manually.
 */
export async function registerContactDirectory(
  channel: Channel,
  value: string,
  fingerprint: string,
): Promise<void> {
  const hash = contactIdentityHash(channel, value);
  if (isFirebaseAdminConfigured()) {
    await getAdminFirestore()
      .collection(COLLECTION)
      .doc(hash)
      .set({ fingerprint, channel, registeredAt: new Date().toISOString() }, { merge: true });
    return;
  }
  memDirectory.set(hash, fingerprint);
}

export async function resolveFingerprintByEmail(email: string): Promise<string | null> {
  const normalized = email.trim().toLowerCase();
  const hash = contactIdentityHash("email", normalized);
  if (isFirebaseAdminConfigured()) {
    const doc = await getAdminFirestore().collection(COLLECTION).doc(hash).get();
    if (!doc.exists) return null;
    const data = doc.data() as { fingerprint?: string };
    return data.fingerprint ?? null;
  }
  return memDirectory.get(hash) ?? null;
}
