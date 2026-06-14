import "server-only";

import { createHash, randomBytes } from "node:crypto";
import { contactIdentityHash } from "@/lib/firebase/contact-directory";
import { getAdminFirestore, isFirebaseAdminConfigured } from "@/lib/firebase/admin";
import type { Attestation, Fingerprint, Provider, User } from "@/types";

const COLLECTION = "credentialDeliveries";
const DEFAULT_TTL_MS = 30 * 24 * 60 * 60 * 1000;

export type DeliveryStatus = "pending" | "accepted" | "expired";

export interface CredentialDeliveryRecord {
  token: string;
  recipientEmailHash: string;
  recipientFingerprint: Fingerprint;
  issuerFingerprint: Fingerprint;
  issuerName: string;
  title: string;
  summary: string;
  attestation: Attestation;
  users: User[];
  providers: Provider[];
  status: DeliveryStatus;
  createdAt: string;
  expiresAt: string;
  acceptedAt?: string;
}

const memDeliveries = new Map<string, CredentialDeliveryRecord>();

function deliveryToken(): string {
  return createHash("sha256").update(randomBytes(32)).digest("hex").slice(0, 32);
}

function hashEmail(email: string): string {
  return contactIdentityHash("email", email);
}

function normalizeStatus(record: CredentialDeliveryRecord): CredentialDeliveryRecord {
  if (record.status === "accepted") return record;
  if (new Date(record.expiresAt).getTime() <= Date.now()) {
    return { ...record, status: "expired" };
  }
  return record;
}

async function readRecord(token: string): Promise<CredentialDeliveryRecord | null> {
  if (isFirebaseAdminConfigured()) {
    const doc = await getAdminFirestore().collection(COLLECTION).doc(token).get();
    if (!doc.exists) return null;
    return normalizeStatus(doc.data() as CredentialDeliveryRecord);
  }
  const entry = memDeliveries.get(token);
  return entry ? normalizeStatus(entry) : null;
}

async function writeRecord(record: CredentialDeliveryRecord): Promise<void> {
  if (isFirebaseAdminConfigured()) {
    await getAdminFirestore().collection(COLLECTION).doc(record.token).set(record);
    return;
  }
  memDeliveries.set(record.token, record);
}

export interface CreateDeliveryInput {
  recipientEmail: string;
  recipientFingerprint: Fingerprint;
  issuerFingerprint: Fingerprint;
  issuerName: string;
  title: string;
  summary: string;
  attestation: Attestation;
  users?: User[];
  providers?: Provider[];
  expiresInDays?: number;
}

export async function createCredentialDelivery(
  input: CreateDeliveryInput,
): Promise<{ ok: true; token: string; expiresAt: string } | { ok: false; error: string }> {
  if (!isFirebaseAdminConfigured()) {
    return {
      ok: false,
      error: "Credential delivery requires Firebase Admin (server not configured).",
    };
  }

  const token = deliveryToken();
  const ttlMs = input.expiresInDays
    ? input.expiresInDays * 24 * 60 * 60 * 1000
    : DEFAULT_TTL_MS;
  const now = Date.now();
  const record: CredentialDeliveryRecord = {
    token,
    recipientEmailHash: hashEmail(input.recipientEmail),
    recipientFingerprint: input.recipientFingerprint,
    issuerFingerprint: input.issuerFingerprint,
    issuerName: input.issuerName,
    title: input.title.trim(),
    summary: input.summary.trim(),
    attestation: input.attestation,
    users: input.users ?? [],
    providers: input.providers ?? [],
    status: "pending",
    createdAt: new Date(now).toISOString(),
    expiresAt: new Date(now + ttlMs).toISOString(),
  };
  await writeRecord(record);
  return { ok: true, token, expiresAt: record.expiresAt };
}

export async function getCredentialDelivery(
  token: string,
): Promise<CredentialDeliveryRecord | null> {
  return readRecord(token);
}

export async function listPendingDeliveries(
  fingerprint: Fingerprint,
  email: string,
): Promise<CredentialDeliveryRecord[]> {
  const emailHash = hashEmail(email);
  const pending: CredentialDeliveryRecord[] = [];

  if (isFirebaseAdminConfigured()) {
    const snap = await getAdminFirestore()
      .collection(COLLECTION)
      .where("recipientFingerprint", "==", fingerprint)
      .where("status", "==", "pending")
      .get();
    for (const doc of snap.docs) {
      const record = normalizeStatus(doc.data() as CredentialDeliveryRecord);
      if (
        record.status === "pending" &&
        record.recipientEmailHash === emailHash
      ) {
        pending.push(record);
      }
    }
    return pending;
  }

  for (const record of memDeliveries.values()) {
    const normalized = normalizeStatus(record);
    if (
      normalized.status === "pending" &&
      normalized.recipientFingerprint === fingerprint &&
      normalized.recipientEmailHash === emailHash
    ) {
      pending.push(normalized);
    }
  }
  return pending;
}

export async function acceptCredentialDelivery(
  token: string,
  fingerprint: Fingerprint,
  email: string,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const record = await readRecord(token);
  if (!record) return { ok: false, error: "This delivery link is invalid." };
  if (record.status === "expired") {
    return { ok: false, error: "This delivery link has expired." };
  }
  if (record.status === "accepted") {
    return { ok: true };
  }
  if (record.recipientFingerprint !== fingerprint) {
    return { ok: false, error: "This credential is for a different Anchor identity." };
  }
  if (record.recipientEmailHash !== hashEmail(email)) {
    return { ok: false, error: "Your verified email does not match this delivery." };
  }

  const accepted: CredentialDeliveryRecord = {
    ...record,
    status: "accepted",
    acceptedAt: new Date().toISOString(),
  };
  await writeRecord(accepted);
  return { ok: true };
}

export function isCredentialDeliveryConfigured(): boolean {
  return isFirebaseAdminConfigured();
}
