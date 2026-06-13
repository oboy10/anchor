"use server";

import { revalidatePath } from "next/cache";
import {
  createPacket,
  getResident,
  issueCredential,
  reseed,
  revokePacket,
  setResidentNote,
} from "@/lib/data";
import {
  getAppBaseUrl,
  isValidEmail,
  sendSharePacketEmail,
} from "@/lib/email/share-packet";
import {
  isValidPhoneNumber,
  normalizePhoneNumber,
  sendSharePacketSms,
} from "@/lib/sms/twilio";
import type { CredentialType, SharePacket } from "@/types";

function revalidatePathAfterMutation(path: string) {
  try {
    revalidatePath(path);
  } catch (error) {
    if (
      process.env.NODE_ENV === "test" &&
      error instanceof Error &&
      error.message.includes("static generation store missing")
    ) {
      return;
    }
    throw error;
  }
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

  revalidatePathAfterMutation(`/resident/${input.residentId}`);
  revalidatePathAfterMutation("/provider");
  revalidatePathAfterMutation("/admin");
  return { ok: true as const, credentialId: credential.id };
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

  let emailSent = false;
  let emailError: string | undefined;
  let smsSent = false;
  let smsError: string | undefined;
  const normalizedReviewerPhone = reviewerPhone
    ? normalizePhoneNumber(reviewerPhone) ?? undefined
    : undefined;

  if (deliveryMethod === "email" && reviewerEmail) {
    const resident = await getResident(input.residentId);
    const senderName = resident?.displayName ?? "Someone";
    const verifyUrl = `${getAppBaseUrl()}/verify/${packet.token}`;
    const emailResult = await sendSharePacketEmail({
      to: reviewerEmail,
      senderName,
      packetLabel: packet.label,
      verifyUrl,
      expiresInDays: input.expiresInDays,
      intro: packet.intro,
    });

    if (emailResult.ok) {
      emailSent = true;
    } else {
      emailError = emailResult.error;
    }
  }

  if (deliveryMethod === "sms" && normalizedReviewerPhone) {
    const resident = await getResident(input.residentId);
    const senderName = resident?.displayName ?? "Someone";
    const verifyUrl = `${getAppBaseUrl()}/verify/${packet.token}`;
    const smsResult = await sendSharePacketSms({
      to: normalizedReviewerPhone,
      senderName,
      packetLabel: packet.label,
      verifyUrl,
      expiresInDays: input.expiresInDays,
    });

    if (smsResult.ok) {
      smsSent = true;
    } else {
      smsError = smsResult.error;
    }
  }

  revalidatePathAfterMutation(`/resident/${input.residentId}`);
  return {
    ok: true as const,
    token: packet.token,
    emailSent,
    emailError,
    reviewerEmail: deliveryMethod === "email" ? reviewerEmail || undefined : undefined,
    smsSent,
    smsError,
    reviewerPhone: deliveryMethod === "sms" ? normalizedReviewerPhone : undefined,
  };
}

export async function revokePacketAction(residentId: string, token: string) {
  await revokePacket(token);
  revalidatePathAfterMutation(`/resident/${residentId}`);
  revalidatePathAfterMutation(`/verify/${token}`);
  return { ok: true as const };
}

export async function setResidentNoteAction(
  residentId: string,
  credentialId: string,
  note: string,
) {
  await setResidentNote(residentId, credentialId, note);
  revalidatePathAfterMutation(`/resident/${residentId}`);
  return { ok: true as const };
}

export async function reseedAction() {
  await reseed();
  revalidatePathAfterMutation("/admin");
  revalidatePathAfterMutation("/resident/r_marcus");
  revalidatePathAfterMutation("/provider");
  return { ok: true as const };
}
