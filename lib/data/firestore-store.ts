/**
 * Firestore-backed data store (Firebase Admin SDK).
 * All writes go through the server — clients never write attestations directly.
 */
import "server-only";
import { randomBytes } from "node:crypto";
import type {
  Attestation,
  CorrectionEntry,
  Credential,
  CredentialEvidence,
  CredentialType,
  Endorsement,
  Fingerprint,
  Provider,
  Resident,
  SharePacket,
  VerificationResult,
} from "@/types";
import {
  credentialsFromAttestations,
  credentialFromAttestation,
  toVerificationResult,
} from "@/lib/attestation/credential";
import {
  buildCredentialProperties,
  signAttestation,
  verifyAttestations,
} from "@/lib/crypto/attestation";
import { getAdminFirestore } from "@/lib/firebase/admin";
import { COL } from "./collections";
import { getProviderPrivateKey } from "./provider-keys";
import type {
  IssueCredentialInput,
  CreatePacketInput,
} from "./store";

type AttestationDoc = Attestation & {
  credentialId?: string;
  issueDate?: string;
};

function db() {
  return getAdminFirestore();
}

export async function resolveFingerprint(
  idOrSlug: string,
): Promise<Fingerprint | undefined> {
  const firestore = db();
  const userDoc = await firestore.collection(COL.users).doc(idOrSlug).get();
  if (userDoc.exists) return idOrSlug;

  const slugDoc = await firestore.collection(COL.slugs).doc(idOrSlug).get();
  if (slugDoc.exists) return slugDoc.data()?.fingerprint as Fingerprint;
  return undefined;
}

export async function listResidents(): Promise<Resident[]> {
  const snap = await db().collection(COL.residents).get();
  return snap.docs.map((d) => d.data() as Resident);
}

export async function getResident(idOrSlug: string): Promise<Resident | undefined> {
  const fp = await resolveFingerprint(idOrSlug);
  if (!fp) return undefined;
  const doc = await db().collection(COL.residents).doc(fp).get();
  return doc.exists ? (doc.data() as Resident) : undefined;
}

export async function listProviders(): Promise<Provider[]> {
  const snap = await db().collection(COL.providers).get();
  return snap.docs.map((d) => d.data() as Provider);
}

export async function getProvider(idOrSlug: string): Promise<Provider | undefined> {
  const fp = await resolveFingerprint(idOrSlug);
  if (!fp) return undefined;
  const doc = await db().collection(COL.providers).doc(fp).get();
  return doc.exists ? (doc.data() as Provider) : undefined;
}

export async function getPublicKey(fingerprint: Fingerprint) {
  const doc = await db().collection(COL.users).doc(fingerprint).get();
  if (!doc.exists) return undefined;
  const data = doc.data()!;
  return { fingerprint: data.fingerprint as Fingerprint, publicKey: data.publicKey as string };
}

async function loadNotesForResident(fp: Fingerprint): Promise<Map<string, string>> {
  const snap = await db()
    .collection(COL.residentNotes)
    .where("fingerprint", "==", fp)
    .get();
  const map = new Map<string, string>();
  snap.docs.forEach((d) => {
    const { credentialId, note } = d.data();
    if (credentialId && note) map.set(credentialId, note);
  });
  return map;
}

async function loadStatusOverrides(): Promise<Map<string, "active" | "corrected" | "superseded">> {
  const snap = await db().collection(COL.statusOverrides).get();
  const map = new Map<string, "active" | "corrected" | "superseded">();
  snap.docs.forEach((d) => {
    const { credentialId, status } = d.data();
    if (credentialId && status) map.set(credentialId, status);
  });
  return map;
}

export async function getAttestations(idOrSlug: string): Promise<Attestation[]> {
  const fp = await resolveFingerprint(idOrSlug);
  if (!fp) return [];
  // Query without orderBy to avoid composite-index requirement; sort in memory.
  const snap = await db()
    .collection(COL.attestations)
    .where("to", "==", fp)
    .get();
  // #region agent log
  fetch('http://127.0.0.1:7770/ingest/c43addfd-9145-4c13-b4b0-3d3f620110e8',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'4e4885'},body:JSON.stringify({sessionId:'4e4885',location:'firestore-store.ts:getAttestations',message:'attestations query ok',data:{fp,count:snap.size},timestamp:Date.now(),hypothesisId:'A'})}).catch(()=>{});
  // #endregion
  const docs = snap.docs.map((d) => d.data() as AttestationDoc);
  docs.sort((a, b) => (a.issueDate ?? "").localeCompare(b.issueDate ?? ""));
  return docs.map((data) => ({
    from: data.from,
    to: data.to,
    properties: data.properties,
    nonce: data.nonce,
    signature: data.signature,
  }));
}

export async function getLedger(idOrSlug: string): Promise<Credential[]> {
  const fp = await resolveFingerprint(idOrSlug);
  if (!fp) return [];
  const [records, notes, overrides] = await Promise.all([
    getAttestations(idOrSlug),
    loadNotesForResident(fp),
    loadStatusOverrides(),
  ]);
  const creds = credentialsFromAttestations(records, notes);
  return creds.map((c) => ({
    ...c,
    status: overrides.get(c.id) ?? c.status,
  }));
}

export async function getCredential(
  idOrSlug: string,
  credentialId: string,
): Promise<Credential | undefined> {
  const ledger = await getLedger(idOrSlug);
  return ledger.find((c) => c.id === credentialId);
}

export async function getEndorsements(idOrSlug: string): Promise<Endorsement[]> {
  const fp = await resolveFingerprint(idOrSlug);
  if (!fp) return [];
  const snap = await db()
    .collection(COL.endorsements)
    .where("residentFingerprint", "==", fp)
    .get();
  return snap.docs.map((d) => d.data() as Endorsement);
}

export async function getPacket(token: string): Promise<SharePacket | undefined> {
  const doc = await db().collection(COL.sharePackets).doc(token).get();
  return doc.exists ? (doc.data() as SharePacket) : undefined;
}

export async function listPacketsForResident(idOrSlug: string): Promise<SharePacket[]> {
  const fp = await resolveFingerprint(idOrSlug);
  if (!fp) return [];
  const snap = await db()
    .collection(COL.sharePackets)
    .where("residentFingerprint", "==", fp)
    .get();
  return snap.docs
    .map((d) => d.data() as SharePacket)
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

export async function verifyResidentChain(idOrSlug: string): Promise<VerificationResult> {
  const fp = await resolveFingerprint(idOrSlug);
  if (!fp) {
    return { chainValid: false, signaturesValid: false, entriesChecked: 0, entries: [] };
  }
  const records = await getAttestations(idOrSlug);
  const publicKeys = new Map<Fingerprint, string>();
  for (const r of records) {
    if (!publicKeys.has(r.from)) {
      const pub = await getPublicKey(r.from);
      if (pub) publicKeys.set(r.from, pub.publicKey);
    }
  }
  const result = await verifyAttestations(records, fp, (from) => publicKeys.get(from));
  return toVerificationResult(result);
}

export async function issueCredential(input: IssueCredentialInput): Promise<Credential> {
  const residentFp = await resolveFingerprint(input.residentId);
  const issuerFp = await resolveFingerprint(input.issuerId);
  if (!residentFp || !issuerFp) throw new Error("Unknown resident or issuer");

  const provider = await getProvider(input.issuerId);
  const privateKey = getProviderPrivateKey(issuerFp);
  if (!privateKey) throw new Error("Issuer signing key not configured");

  const id = `c_${randomBytes(4).toString("hex")}`;
  const issueDate = input.issueDate ?? new Date().toISOString();

  const properties = buildCredentialProperties({
    credentialId: id,
    credentialType: input.credentialType,
    issueDate,
    title: input.title,
    summary: input.summary,
    issuerName: provider?.name ?? "Unknown",
    issuerType: provider?.type ?? "shelter",
    metric: input.evidence.metric,
    periodStart: input.evidence.periodStart,
    periodEnd: input.evidence.periodEnd,
    facts: input.evidence.facts,
    corrects: input.corrects,
  });

  const record = await signAttestation(
    { fingerprint: issuerFp, privateKey },
    residentFp,
    properties,
  );

  await db().collection(COL.attestations).doc(record.nonce).set({
    ...record,
    credentialId: id,
    issueDate,
  });

  return credentialFromAttestation(record);
}

export async function issueCorrection(
  issuerId: string,
  correction: CorrectionEntry,
): Promise<Credential> {
  const issuerFp = await resolveFingerprint(issuerId);
  if (!issuerFp) throw new Error("Unknown issuer");

  const ledger = await getLedger(correction.residentFingerprint);
  const original = ledger.find((c) => c.id === correction.corrects);
  if (!original) throw new Error("Cannot correct an entry that does not exist");

  await db().collection(COL.statusOverrides).doc(correction.corrects).set({
    credentialId: correction.corrects,
    residentFingerprint: correction.residentFingerprint,
    status: "corrected",
  });

  return issueCredential({
    residentId: correction.residentFingerprint,
    issuerId,
    credentialType: original.credentialType,
    title: `Correction: ${original.title}`,
    summary: correction.summary,
    evidence: {
      metric: "Correction entry",
      facts: [{ label: "Reason", value: correction.reason }],
    },
    corrects: correction.corrects,
  });
}

export async function setResidentNote(
  idOrSlug: string,
  credentialId: string,
  note: string | undefined,
): Promise<void> {
  const fp = await resolveFingerprint(idOrSlug);
  if (!fp) throw new Error("Resident not found");
  const ref = db().collection(COL.residentNotes).doc(`${fp}_${credentialId}`);
  if (note?.trim()) {
    await ref.set({ fingerprint: fp, credentialId, note: note.trim() });
  } else {
    await ref.delete();
  }
}

export async function createPacket(input: CreatePacketInput): Promise<SharePacket> {
  const fp = await resolveFingerprint(input.residentId);
  if (!fp) throw new Error("Resident not found");

  const token = `pk_${randomBytes(9).toString("base64url")}`;
  const now = Date.now();
  const packet: SharePacket = {
    token,
    residentFingerprint: fp,
    label: input.label,
    purpose: input.purpose,
    includedCredentialIds: input.includedCredentialIds,
    sharedNoteCredentialIds: input.sharedNoteCredentialIds ?? [],
    intro: input.intro,
    createdAt: new Date(now).toISOString(),
    expiresAt: new Date(now + input.expiresInDays * 24 * 60 * 60 * 1000).toISOString(),
  };
  await db().collection(COL.sharePackets).doc(token).set(packet);
  return packet;
}

export async function revokePacket(token: string): Promise<void> {
  const ref = db().collection(COL.sharePackets).doc(token);
  const doc = await ref.get();
  if (doc.exists && !doc.data()?.revokedAt) {
    await ref.update({ revokedAt: new Date().toISOString() });
  }
}

export async function reseed(): Promise<void> {
  const { reseedFirestore } = await import("./seed-firestore");
  await reseedFirestore();
}

export async function getUserByFingerprint(fingerprint: Fingerprint) {
  const doc = await db().collection(COL.users).doc(fingerprint).get();
  if (!doc.exists) return undefined;
  const data = doc.data()!;
  return {
    fingerprint: data.fingerprint as Fingerprint,
    publicKey: data.publicKey as string,
  };
}
