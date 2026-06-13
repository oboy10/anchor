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
import type { CredentialType, SharePacket } from "@/types";

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

  revalidatePath(`/resident/${input.residentId}`);
  revalidatePath("/provider");
  revalidatePath("/admin");
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
  reviewerEmail?: string;
}

export async function createPacketAction(input: CreatePacketActionInput) {
  if (!input.label.trim()) {
    return { ok: false as const, error: "Give the packet a name." };
  }
  if (input.includedCredentialIds.length === 0) {
    return { ok: false as const, error: "Choose at least one credential to share." };
  }

  const reviewerEmail = input.reviewerEmail?.trim();
  if (reviewerEmail && !isValidEmail(reviewerEmail)) {
    return { ok: false as const, error: "Enter a valid reviewer email address." };
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

  if (reviewerEmail) {
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

  revalidatePath(`/resident/${input.residentId}`);
  return {
    ok: true as const,
    token: packet.token,
    emailSent,
    emailError,
    reviewerEmail: reviewerEmail || undefined,
  };
}

export async function revokePacketAction(residentId: string, token: string) {
  await revokePacket(token);
  revalidatePath(`/resident/${residentId}`);
  revalidatePath(`/verify/${token}`);
  return { ok: true as const };
}

export async function setResidentNoteAction(
  residentId: string,
  credentialId: string,
  note: string,
) {
  await setResidentNote(residentId, credentialId, note);
  revalidatePath(`/resident/${residentId}`);
  return { ok: true as const };
}

export async function reseedAction() {
  await reseed();
  revalidatePath("/admin");
  revalidatePath("/resident/r_marcus");
  revalidatePath("/provider");
  return { ok: true as const };
}
