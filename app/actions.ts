"use server";

import { revalidatePath } from "next/cache";
import {
  createPacket,
  issueCredential,
  reseed,
  revokePacket,
  setResidentNote,
} from "@/lib/data/store";
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

  const credential = issueCredential({
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
}

export async function createPacketAction(input: CreatePacketActionInput) {
  if (!input.label.trim()) {
    return { ok: false as const, error: "Give the packet a name." };
  }
  if (input.includedCredentialIds.length === 0) {
    return { ok: false as const, error: "Choose at least one credential to share." };
  }

  const packet = createPacket({
    residentId: input.residentId,
    label: input.label.trim(),
    purpose: input.purpose,
    includedCredentialIds: input.includedCredentialIds,
    sharedNoteCredentialIds: input.sharedNoteCredentialIds,
    intro: input.intro?.trim() || undefined,
    expiresInDays: input.expiresInDays,
  });

  revalidatePath(`/resident/${input.residentId}`);
  return { ok: true as const, token: packet.token };
}

export async function revokePacketAction(residentId: string, token: string) {
  revokePacket(token);
  revalidatePath(`/resident/${residentId}`);
  revalidatePath(`/verify/${token}`);
  return { ok: true as const };
}

export async function setResidentNoteAction(
  residentId: string,
  credentialId: string,
  note: string,
) {
  setResidentNote(residentId, credentialId, note);
  revalidatePath(`/resident/${residentId}`);
  return { ok: true as const };
}

export async function reseedAction() {
  reseed();
  revalidatePath("/admin");
  revalidatePath("/resident/r_marcus");
  revalidatePath("/provider");
  return { ok: true as const };
}
