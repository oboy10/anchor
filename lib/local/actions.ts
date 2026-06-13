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
  reseed,
  revokePacket,
  setResidentNote,
} from "./db";
import { buildShareUrl } from "./share-link";
import type { CredentialType, SharePacket } from "@/types";

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

export async function reseedAction() {
  await reseed();
  return { ok: true as const };
}
