/**
 * Self-contained share links.
 *
 * A share packet is encoded entirely into the URL fragment (`/verify#<payload>`).
 * The fragment carries the selected signed attestations, the issuer public keys,
 * and the resident's display info — everything a verifier needs to check
 * signatures fully client-side, with no server round-trip and nothing stored
 * anywhere but the link itself. This is what makes the data "highly portable".
 *
 * Note: because the data lives in the link, revocation is best-effort only —
 * the resident's local copy tracks a revoked state, but a link already sent
 * cannot be recalled. Expiry is encoded in the payload and honored on verify.
 */
import { base64UrlToBytes, bytesToBase64Url, utf8ToBytes } from "@/lib/crypto/bytes";
import {
  credentialFromAttestation,
  credentialsFromAttestations,
  toVerificationResult,
} from "@/lib/attestation/credential";
import { verifyAttestations } from "@/lib/crypto/attestation";
import type { Attestation, Credential, Fingerprint, SharePacket, VerificationResult } from "@/types";
import { getAttestations, getLedger, getPacket, getPublicKey, getResident } from "./db";

export interface SharePayload {
  v: 1;
  packet: {
    token: string;
    label: string;
    purpose: SharePacket["purpose"];
    intro?: string;
    createdAt: string;
    expiresAt: string;
    revokedAt?: string;
    sharedNoteCredentialIds: string[];
  };
  resident: {
    fingerprint: Fingerprint;
    displayName: string;
    pronouns?: string;
    city?: string;
  };
  /** Signed attestations for the included credentials only. */
  attestations: Attestation[];
  /** Resident notes the resident chose to include. */
  notes: { credentialId: string; note: string }[];
  /** Public keys for every issuer referenced above, so verify is self-contained. */
  issuerKeys: { fingerprint: Fingerprint; publicKey: string }[];
}

export function encodeSharePayload(payload: SharePayload): string {
  return bytesToBase64Url(utf8ToBytes(JSON.stringify(payload)));
}

export function decodeSharePayload(encoded: string): SharePayload {
  const json = new TextDecoder().decode(base64UrlToBytes(encoded));
  const payload = JSON.parse(json) as SharePayload;
  if (payload?.v !== 1 || !Array.isArray(payload.attestations)) {
    throw new Error("Unrecognized share link.");
  }
  return payload;
}

/** Assemble a self-contained payload for one of the resident's local packets. */
export async function buildSharePayload(token: string): Promise<SharePayload | undefined> {
  const packet = await getPacket(token);
  if (!packet) return undefined;
  const resident = await getResident(packet.residentFingerprint);
  if (!resident) return undefined;

  const all = await getAttestations(packet.residentFingerprint);
  const included = all.filter((a) =>
    packet.includedCredentialIds.includes(credentialFromAttestation(a).id),
  );

  const issuerFps = [...new Set(included.map((a) => a.from))];
  const issuerKeys: SharePayload["issuerKeys"] = [];
  for (const fp of issuerFps) {
    const key = await getPublicKey(fp);
    if (key) issuerKeys.push({ fingerprint: fp, publicKey: key.publicKey });
  }

  const ledger = await getLedger(packet.residentFingerprint);
  const notes = packet.sharedNoteCredentialIds
    .map((id) => {
      const note = ledger.find((c) => c.id === id)?.residentNote;
      return note ? { credentialId: id, note } : undefined;
    })
    .filter((n): n is { credentialId: string; note: string } => !!n);

  return {
    v: 1,
    packet: {
      token: packet.token,
      label: packet.label,
      purpose: packet.purpose,
      intro: packet.intro,
      createdAt: packet.createdAt,
      expiresAt: packet.expiresAt,
      revokedAt: packet.revokedAt,
      sharedNoteCredentialIds: packet.sharedNoteCredentialIds,
    },
    resident: {
      fingerprint: resident.fingerprint,
      displayName: resident.displayName,
      pronouns: resident.pronouns,
      city: resident.city,
    },
    attestations: included.map((a) => ({
      from: a.from,
      to: a.to,
      properties: a.properties,
      nonce: a.nonce,
      signature: a.signature,
    })),
    notes,
    issuerKeys,
  };
}

export interface ResolvedShare {
  credentials: Credential[];
  verification: VerificationResult;
  payload: SharePayload;
}

/** Derive credentials and verify signatures for a decoded payload. */
export async function resolveSharePayload(payload: SharePayload): Promise<ResolvedShare> {
  const noteMap = new Map(payload.notes.map((n) => [n.credentialId, n.note]));
  const credentials = credentialsFromAttestations(payload.attestations, noteMap);
  const keyByFp = new Map(payload.issuerKeys.map((k) => [k.fingerprint, k.publicKey]));
  const result = await verifyAttestations(
    payload.attestations,
    payload.resident.fingerprint,
    (from) => keyByFp.get(from),
  );
  return { credentials, verification: toVerificationResult(result), payload };
}

/** Build the full shareable URL for one of the resident's packets. */
export async function buildShareUrl(token: string, origin: string): Promise<string | undefined> {
  const payload = await buildSharePayload(token);
  if (!payload) return undefined;
  return `${origin}/verify#${encodeSharePayload(payload)}`;
}
