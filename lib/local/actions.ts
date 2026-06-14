"use client";

/**
 * Client-side action layer. Replaces the former server actions (app/actions.ts):
 * all reads and writes now happen against the local-first store in the browser.
 * The only network calls are best-effort reviewer email/SMS, which carry the
 * self-contained verify URL and store nothing server-side.
 */
import {
  createPacket,
  getResident,
  issueCredential,
  resetData,
  revokePacket,
  setResidentNote,
  setSelfVouch,
} from "./db";
import { getActiveAccount, getUnlockedUser } from "./accounts";
import { buildShareUrl } from "./share-link";
import { buildCredentialProperties, signAttestation } from "@/lib/crypto/attestation";
import { bytesToHex, randomBytes } from "@/lib/crypto/bytes";
import type {
  Attestation,
  AttestationProperty,
  CredentialType,
  IssuerType,
  SharePacket,
} from "@/types";

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
function isValidEmail(value: string): boolean {
  return EMAIL_PATTERN.test(value.trim());
}

// Loose client check; the /api/sms route normalizes and validates strictly.
function isValidPhoneNumber(value: string): boolean {
  const compact = value.replace(/[\s().-]/g, "");
  if (/^\+[1-9]\d{7,14}$/.test(compact)) return true;
  const digits = compact.replace(/\D/g, "");
  return digits.length === 10 || (digits.length === 11 && digits.startsWith("1"));
}

export interface IssueCredentialActionInput {
  residentId: string;
  issuerId: string;
  credentialType: CredentialType;
  title: string;
  summary: string;
  metric?: string;
  periodStart?: string;
  periodEnd?: string;
  facts?: { label: string; value: string }[];
}

export async function issueCredentialAction(input: IssueCredentialActionInput) {
  if (!input.residentId || !input.issuerId || !input.title.trim()) {
    return { ok: false as const, error: "Missing required fields." };
  }
  try {
    const credential = await issueCredential({
      residentId: input.residentId,
      issuerId: input.issuerId,
      credentialType: input.credentialType,
      title: input.title.trim(),
      summary: input.summary.trim(),
      evidence: {
        metric: input.metric?.trim() || undefined,
        periodStart: input.periodStart || undefined,
        periodEnd: input.periodEnd || undefined,
        facts: (input.facts ?? []).filter((f) => f.label.trim() && f.value.trim()),
      },
    });
    return { ok: true as const, credentialId: credential.id };
  } catch (e) {
    return { ok: false as const, error: e instanceof Error ? e.message : "Could not issue credential." };
  }
}

export interface CreatePacketActionInput {
  residentId: string;
  label: string;
  purpose: SharePacket["purpose"];
  includedCredentialIds: string[];
  sharedNoteCredentialIds: string[];
  intro?: string;
  expiresInDays: number;
  deliveryMethod?: "email" | "sms" | "copy";
  reviewerEmail?: string;
  reviewerPhone?: string;
}

export async function createPacketAction(input: CreatePacketActionInput) {
  if (!input.label.trim()) {
    return { ok: false as const, error: "Give the packet a name." };
  }
  if (input.includedCredentialIds.length === 0) {
    return { ok: false as const, error: "Choose at least one credential to share." };
  }
  const reviewerEmail = input.reviewerEmail?.trim();
  const reviewerPhone = input.reviewerPhone?.trim();
  const deliveryMethod =
    input.deliveryMethod ?? (reviewerEmail ? "email" : "copy");

  if (deliveryMethod === "email" && !reviewerEmail) {
    return { ok: false as const, error: "Enter a reviewer email address." };
  }
  if (deliveryMethod === "email" && reviewerEmail && !isValidEmail(reviewerEmail)) {
    return { ok: false as const, error: "Enter a valid reviewer email address." };
  }
  if (deliveryMethod === "sms" && !reviewerPhone) {
    return { ok: false as const, error: "Enter a reviewer phone number." };
  }
  if (deliveryMethod === "sms" && reviewerPhone && !isValidPhoneNumber(reviewerPhone)) {
    return { ok: false as const, error: "Enter a valid reviewer phone number." };
  }

  const packet = await createPacket({
    residentId: input.residentId,
    label: input.label.trim(),
    purpose: input.purpose,
    includedCredentialIds: input.includedCredentialIds,
    sharedNoteCredentialIds: input.sharedNoteCredentialIds,
    intro: input.intro?.trim() || undefined,
    expiresInDays: input.expiresInDays,
  });

  const origin = typeof window !== "undefined" ? window.location.origin : "";
  const shareUrl = (await buildShareUrl(packet.token, origin)) ?? "";

  let emailSent = false;
  let emailError: string | undefined;
  let smsSent = false;
  let smsError: string | undefined;
  let sentToPhone: string | undefined;

  if (deliveryMethod === "email" && reviewerEmail) {
    const resident = await getResident(input.residentId);
    try {
      const res = await fetch("/api/share", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          to: reviewerEmail,
          senderName: resident?.displayName ?? "Someone",
          packetLabel: packet.label,
          verifyUrl: shareUrl,
          expiresInDays: input.expiresInDays,
          intro: packet.intro,
        }),
      });
      const data = (await res.json()) as { ok?: boolean; error?: string };
      if (res.ok && data.ok) emailSent = true;
      else emailError = data.error ?? "Failed to send email.";
    } catch {
      emailError = "Failed to send email.";
    }
  }

  if (deliveryMethod === "sms" && reviewerPhone) {
    const resident = await getResident(input.residentId);
    try {
      const res = await fetch("/api/sms", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          to: reviewerPhone,
          senderName: resident?.displayName ?? "Someone",
          packetLabel: packet.label,
          verifyUrl: shareUrl,
          expiresInDays: input.expiresInDays,
        }),
      });
      const data = (await res.json()) as { ok?: boolean; error?: string; phone?: string };
      if (res.ok && data.ok) {
        smsSent = true;
        sentToPhone = data.phone ?? reviewerPhone;
      } else {
        smsError = data.error ?? "Failed to send text.";
      }
    } catch {
      smsError = "Failed to send text.";
    }
  }

  return {
    ok: true as const,
    token: packet.token,
    shareUrl,
    emailSent,
    emailError,
    reviewerEmail: deliveryMethod === "email" ? reviewerEmail || undefined : undefined,
    smsSent,
    smsError,
    reviewerPhone: deliveryMethod === "sms" ? sentToPhone : undefined,
  };
}

export async function revokePacketAction(_residentId: string, token: string) {
  await revokePacket(token);
  return { ok: true as const };
}

export async function setResidentNoteAction(
  residentId: string,
  credentialId: string,
  note: string,
) {
  await setResidentNote(residentId, credentialId, note);
  return { ok: true as const };
}

export async function resetDataAction() {
  await resetData();
  return { ok: true as const };
}

/** Property keys for self-signed profile attributes. */
export const PROFILE_PROP = {
  NAME: "a.id:name",
  DESCRIPTION: "a.id:description",
} as const;

export interface SaveProfileActionInput {
  name: string;
  description: string;
}

/**
 * Save the active identity's display name and description as a self-signed
 * vouch (from === to === the user), proving the values were set by the key
 * holder. Re-signing replaces the previous self-vouch.
 */
export async function saveProfileAction(input: SaveProfileActionInput) {
  const account = getActiveAccount();
  if (!account) {
    return { ok: false as const, error: "Sign in to edit your profile." };
  }
  const user = getUnlockedUser(account.fingerprint);
  if (!user?.privateKey) {
    return { ok: false as const, error: "Your account is locked." };
  }

  const properties: AttestationProperty[] = [];
  const name = input.name.trim();
  const description = input.description.trim();
  if (name) properties.push({ key: PROFILE_PROP.NAME, value: name });
  if (description) properties.push({ key: PROFILE_PROP.DESCRIPTION, value: description });

  const attestation = await signAttestation(user, user.fingerprint, properties);
  await setSelfVouch(user.fingerprint, attestation);
  return { ok: true as const };
}

const FINGERPRINT_PATTERN = /^[0-9a-f]{16}$/;

export interface SignCredentialActionInput {
  /** Recipient (subject) identity fingerprint — 16 hex chars. */
  toFingerprint: string;
  issuerName: string;
  issuerType: IssuerType;
  credentialType: CredentialType;
  title: string;
  summary: string;
  metric?: string;
  facts?: { label: string; value: string }[];
}

/**
 * Sign a credential for an arbitrary fingerprint using the active account's
 * unlocked key. The result is a standalone signed attestation — it is NOT added
 * to any local ledger here; the caller exports it as a file for the recipient
 * to import. Anyone holding the issuer's public key can verify it offline.
 */
export async function signCredentialAction(input: SignCredentialActionInput) {
  const to = input.toFingerprint.trim().toLowerCase();
  if (!FINGERPRINT_PATTERN.test(to)) {
    return { ok: false as const, error: "Enter a valid 16-character fingerprint." };
  }
  if (!input.title.trim() || !input.summary.trim()) {
    return { ok: false as const, error: "Title and summary are required." };
  }
  const account = getActiveAccount();
  if (!account) {
    return { ok: false as const, error: "Sign in to an account to sign credentials." };
  }
  const issuer = getUnlockedUser(account.fingerprint);
  if (!issuer?.privateKey) {
    return { ok: false as const, error: "Your account is locked." };
  }

  const credentialId = `c_${bytesToHex(randomBytes(4))}`;
  const issueDate = new Date().toISOString();
  const properties = buildCredentialProperties({
    credentialId,
    credentialType: input.credentialType,
    issueDate,
    title: input.title.trim(),
    summary: input.summary.trim(),
    issuerName: input.issuerName.trim() || account.label,
    issuerType: input.issuerType,
    metric: input.metric?.trim() || undefined,
    facts: (input.facts ?? []).filter((f) => f.label.trim() && f.value.trim()),
  });

  const signed = await signAttestation(issuer, to, properties);
  // Carry the denormalized fields the ledger stores, so an import round-trips.
  const attestation: Attestation = { ...signed, credentialId, issueDate } as Attestation;
  return { ok: true as const, attestation, credentialId };
}
