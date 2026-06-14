import "server-only";

import { createHash, randomBytes } from "node:crypto";
import { contactIdentityHash } from "@/lib/firebase/contact-directory";
import { getAdminFirestore, isFirebaseAdminConfigured } from "@/lib/firebase/admin";
import type { Fingerprint } from "@/types";

const COLLECTION = "credentialRequests";
const DEFAULT_TTL_MS = 14 * 24 * 60 * 60 * 1000;

export type RequestStatus = "pending" | "fulfilled" | "expired";

export interface CredentialRequestRecord {
  token: string;
  requesterFingerprint: Fingerprint;
  requesterEmail: string;
  requesterEmailHash: string;
  requesterName: string;
  issuerEmail: string;
  issuerEmailHash: string;
  message?: string;
  status: RequestStatus;
  createdAt: string;
  expiresAt: string;
  fulfilledAt?: string;
  deliveryToken?: string;
}

const memRequests = new Map<string, CredentialRequestRecord>();

function requestToken(): string {
  return createHash("sha256").update(randomBytes(32)).digest("hex").slice(0, 32);
}

function hashEmail(email: string): string {
  return contactIdentityHash("email", email);
}

function normalizeStatus(record: CredentialRequestRecord): CredentialRequestRecord {
  if (record.status === "fulfilled") return record;
  if (new Date(record.expiresAt).getTime() <= Date.now()) {
    return { ...record, status: "expired" };
  }
  return record;
}

async function readRequest(token: string): Promise<CredentialRequestRecord | null> {
  if (isFirebaseAdminConfigured()) {
    const doc = await getAdminFirestore().collection(COLLECTION).doc(token).get();
    if (!doc.exists) return null;
    return normalizeStatus(doc.data() as CredentialRequestRecord);
  }
  const entry = memRequests.get(token);
  return entry ? normalizeStatus(entry) : null;
}

async function writeRequest(record: CredentialRequestRecord): Promise<void> {
  if (isFirebaseAdminConfigured()) {
    await getAdminFirestore().collection(COLLECTION).doc(record.token).set(record);
    return;
  }
  memRequests.set(record.token, record);
}

export interface CreateCredentialRequestInput {
  requesterFingerprint: Fingerprint;
  requesterEmail: string;
  requesterName: string;
  issuerEmail: string;
  message?: string;
  expiresInDays?: number;
}

export async function createCredentialRequest(
  input: CreateCredentialRequestInput,
): Promise<{ ok: true; token: string; expiresAt: string } | { ok: false; error: string }> {
  if (!isFirebaseAdminConfigured()) {
    return {
      ok: false,
      error: "Credential requests require Firebase Admin (server not configured).",
    };
  }

  const requesterEmail = input.requesterEmail.trim().toLowerCase();
  const issuerEmail = input.issuerEmail.trim().toLowerCase();
  const token = requestToken();
  const ttlMs = (input.expiresInDays ?? 14) * 24 * 60 * 60 * 1000;
  const now = Date.now();

  const trimmedMessage = input.message?.trim();
  const record: CredentialRequestRecord = {
    token,
    requesterFingerprint: input.requesterFingerprint,
    requesterEmail,
    requesterEmailHash: hashEmail(requesterEmail),
    requesterName: input.requesterName.trim() || "A resident",
    issuerEmail,
    issuerEmailHash: hashEmail(issuerEmail),
    status: "pending",
    createdAt: new Date(now).toISOString(),
    expiresAt: new Date(now + ttlMs).toISOString(),
    ...(trimmedMessage ? { message: trimmedMessage } : {}),
  };

  await writeRequest(record);
  return { ok: true, token, expiresAt: record.expiresAt };
}

export async function getCredentialRequest(
  token: string,
): Promise<CredentialRequestRecord | null> {
  return readRequest(token);
}

export async function fulfillCredentialRequest(
  token: string,
  deliveryToken: string,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const record = await readRequest(token);
  if (!record) return { ok: false, error: "This request link is invalid." };
  if (record.status === "expired") {
    return { ok: false, error: "This credential request has expired." };
  }
  if (record.status === "fulfilled") {
    return { ok: true };
  }

  const fulfilled: CredentialRequestRecord = {
    ...record,
    status: "fulfilled",
    fulfilledAt: new Date().toISOString(),
    deliveryToken,
  };
  await writeRequest(fulfilled);
  return { ok: true };
}

export function isCredentialRequestConfigured(): boolean {
  return isFirebaseAdminConfigured();
}
