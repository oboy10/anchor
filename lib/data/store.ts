/**
 * In-memory attestation store.
 *
 * Core records are signed Attestations (from → to edges). Credentials are a
 * UI view derived from attestation properties. User identity is Ed25519
 * keypairs keyed by fingerprint.
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
  User,
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
import {
  seedEndorsements,
  seedIssuances,
  seedPacket,
  seedProviders,
  seedResidents,
  DEMO_KEYS,
  SLUG_TO_KEY,
} from "@/lib/demo/seed";

interface Store {
  users: Map<Fingerprint, User>;
  slugToFingerprint: Map<string, Fingerprint>;
  residents: Map<Fingerprint, Resident>;
  providers: Map<Fingerprint, Provider>;
  /** Attestations per resident (to fingerprint), oldest first. */
  attestations: Map<Fingerprint, Attestation[]>;
  /** Resident notes keyed by credentialId (not signed — resident-owned metadata). */
  residentNotes: Map<string, string>;
  /** Mutable status overrides keyed by credentialId. */
  statusOverrides: Map<string, "active" | "corrected" | "superseded">;
  endorsements: Endorsement[];
  packets: Map<string, SharePacket>;
}

const GLOBAL_KEY = "__trustwallet_store__";
type GlobalWithStore = typeof globalThis & { [GLOBAL_KEY]?: Store };

function emptyStore(): Store {
  return {
    users: new Map(),
    slugToFingerprint: new Map(),
    residents: new Map(),
    providers: new Map(),
    attestations: new Map(),
    residentNotes: new Map(),
    statusOverrides: new Map(),
    endorsements: [],
    packets: new Map(),
  };
}

function isValidStore(store: Store | undefined): store is Store {
  return !!store?.users && !!store.slugToFingerprint && !!store.attestations;
}

function getStore(): Store {
  const g = globalThis as GlobalWithStore;
  if (!isValidStore(g[GLOBAL_KEY])) {
    g[GLOBAL_KEY] = emptyStore();
    seed(g[GLOBAL_KEY]!);
  }
  return g[GLOBAL_KEY]!;
}

// ---------------------------------------------------------------------------
// Identity helpers
// ---------------------------------------------------------------------------

function registerUser(store: Store, key: keyof typeof DEMO_KEYS): User {
  const material = DEMO_KEYS[key];
  const user: User = {
    fingerprint: material.fingerprint,
    publicKey: material.publicKey,
    privateKey: material.privateKey,
  };
  store.users.set(user.fingerprint, user);
  return user;
}

/** Resolve slug or fingerprint to canonical fingerprint. */
export function resolveFingerprint(idOrSlug: string): Fingerprint | undefined {
  const store = getStore();
  if (store.users.has(idOrSlug)) return idOrSlug;
  return store.slugToFingerprint.get(idOrSlug);
}

function getUser(fingerprint: Fingerprint): User | undefined {
  return getStore().users.get(fingerprint);
}

// ---------------------------------------------------------------------------
// Seeding
// ---------------------------------------------------------------------------

function appendAttestation(
  store: Store,
  input: {
    id: string;
    residentFingerprint: Fingerprint;
    issuerFingerprint: Fingerprint;
    credentialType: CredentialType;
    issueDate: string;
    title: string;
    summary: string;
    evidence: CredentialEvidence;
    corrects?: string;
    status?: string;
  },
): Attestation {
  const issuer = store.users.get(input.issuerFingerprint);
  const provider = store.providers.get(input.issuerFingerprint);
  if (!issuer?.privateKey) throw new Error("Issuer key not found");

  const properties = buildCredentialProperties({
    credentialId: input.id,
    credentialType: input.credentialType,
    issueDate: input.issueDate,
    title: input.title,
    summary: input.summary,
    issuerName: provider?.name ?? "Unknown",
    issuerType: provider?.type ?? "shelter",
    metric: input.evidence.metric,
    periodStart: input.evidence.periodStart,
    periodEnd: input.evidence.periodEnd,
    facts: input.evidence.facts,
    corrects: input.corrects,
    status: input.status ?? "active",
  });

  const record = signAttestation(
    issuer,
    input.residentFingerprint,
    properties,
  );

  const list = store.attestations.get(input.residentFingerprint) ?? [];
  list.push(record);
  store.attestations.set(input.residentFingerprint, list);
  return record;
}

function seed(store: Store) {
  for (const key of Object.keys(DEMO_KEYS) as (keyof typeof DEMO_KEYS)[]) {
    registerUser(store, key);
  }

  for (const r of seedResidents) {
    store.residents.set(r.fingerprint, { ...r });
    store.slugToFingerprint.set(r.slug, r.fingerprint);
  }
  for (const p of seedProviders) {
    store.providers.set(p.fingerprint, { ...p });
    store.slugToFingerprint.set(p.slug, p.fingerprint);
  }

  for (const issuance of seedIssuances) {
    const residentFp = store.slugToFingerprint.get(issuance.residentSlug)!;
    const issuerFp = store.slugToFingerprint.get(issuance.issuerSlug)!;
    appendAttestation(store, {
      id: issuance.id,
      residentFingerprint: residentFp,
      issuerFingerprint: issuerFp,
      credentialType: issuance.credentialType,
      issueDate: issuance.issueDate,
      title: issuance.title,
      summary: issuance.summary,
      evidence: issuance.evidence,
    });
    if (issuance.residentNote) {
      store.residentNotes.set(issuance.id, issuance.residentNote);
    }
  }

  store.endorsements = seedEndorsements.map((e) => ({ ...e }));

  const residentFp = store.slugToFingerprint.get(seedPacket.residentSlug)!;
  const now = Date.now();
  const day = 24 * 60 * 60 * 1000;
  store.packets.set(seedPacket.token, {
    token: seedPacket.token,
    residentFingerprint: residentFp,
    label: seedPacket.label,
    purpose: seedPacket.purpose,
    intro: seedPacket.intro,
    includedCredentialIds: [...seedPacket.includedCredentialIds],
    sharedNoteCredentialIds: [...seedPacket.sharedNoteCredentialIds],
    createdAt: new Date(now + seedPacket.createdOffsetDays * day).toISOString(),
    expiresAt: new Date(now + seedPacket.expiresOffsetDays * day).toISOString(),
  });
}

export function reseed(): void {
  const g = globalThis as GlobalWithStore;
  g[GLOBAL_KEY] = emptyStore();
  seed(g[GLOBAL_KEY]!);
}

// ---------------------------------------------------------------------------
// Read API
// ---------------------------------------------------------------------------

export function listResidents(): Resident[] {
  return [...getStore().residents.values()];
}

export function getResident(idOrSlug: string): Resident | undefined {
  const fp = resolveFingerprint(idOrSlug);
  return fp ? getStore().residents.get(fp) : undefined;
}

export function listProviders(): Provider[] {
  return [...getStore().providers.values()];
}

export function getProvider(idOrSlug: string): Provider | undefined {
  const fp = resolveFingerprint(idOrSlug);
  return fp ? getStore().providers.get(fp) : undefined;
}

export function getPublicKey(fingerprint: Fingerprint) {
  const u = getUser(fingerprint);
  if (!u) return undefined;
  return { fingerprint: u.fingerprint, publicKey: u.publicKey };
}

function attestationsToCredentials(
  store: Store,
  residentFingerprint: Fingerprint,
): Credential[] {
  const records = store.attestations.get(residentFingerprint) ?? [];
  const creds = credentialsFromAttestations(records, store.residentNotes);
  return creds.map((c) => ({
    ...c,
    status: store.statusOverrides.get(c.id) ?? c.status,
  }));
}

export function getLedger(idOrSlug: string): Credential[] {
  const fp = resolveFingerprint(idOrSlug);
  if (!fp) return [];
  return attestationsToCredentials(getStore(), fp);
}

export function getCredential(
  idOrSlug: string,
  credentialId: string,
): Credential | undefined {
  return getLedger(idOrSlug).find((c) => c.id === credentialId);
}

export function getEndorsements(idOrSlug: string): Endorsement[] {
  const fp = resolveFingerprint(idOrSlug);
  if (!fp) return [];
  return getStore().endorsements.filter((e) => e.residentFingerprint === fp);
}

export function getPacket(token: string): SharePacket | undefined {
  return getStore().packets.get(token);
}

export function listPacketsForResident(idOrSlug: string): SharePacket[] {
  const fp = resolveFingerprint(idOrSlug);
  if (!fp) return [];
  return [...getStore().packets.values()]
    .filter((p) => p.residentFingerprint === fp)
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

export function verifyResidentChain(idOrSlug: string): VerificationResult {
  const store = getStore();
  const fp = resolveFingerprint(idOrSlug);
  if (!fp) {
    return {
      chainValid: false,
      signaturesValid: false,
      entriesChecked: 0,
      entries: [],
    };
  }
  const records = store.attestations.get(fp) ?? [];
  const result = verifyAttestations(records, fp, (from) =>
    store.users.get(from)?.publicKey,
  );
  return toVerificationResult(result);
}

// ---------------------------------------------------------------------------
// Write API
// ---------------------------------------------------------------------------

export interface IssueCredentialInput {
  residentId: string;
  issuerId: string;
  credentialType: CredentialType;
  issueDate?: string;
  title: string;
  summary: string;
  evidence: CredentialEvidence;
  corrects?: string;
}

export function issueCredential(input: IssueCredentialInput): Credential {
  const store = getStore();
  const residentFp = resolveFingerprint(input.residentId);
  const issuerFp = resolveFingerprint(input.issuerId);
  if (!residentFp || !issuerFp) throw new Error("Unknown resident or issuer");

  const id = `c_${randomBytes(4).toString("hex")}`;
  const record = appendAttestation(store, {
    id,
    residentFingerprint: residentFp,
    issuerFingerprint: issuerFp,
    credentialType: input.credentialType,
    issueDate: input.issueDate ?? new Date().toISOString(),
    title: input.title,
    summary: input.summary,
    evidence: input.evidence,
    corrects: input.corrects,
  });

  return credentialFromAttestation(record);
}

export function issueCorrection(
  issuerId: string,
  correction: CorrectionEntry,
): Credential {
  const store = getStore();
  const issuerFp = resolveFingerprint(issuerId);
  const residentFp = correction.residentFingerprint;
  if (!issuerFp) throw new Error("Unknown issuer");

  const ledger = attestationsToCredentials(store, residentFp);
  const original = ledger.find((c) => c.id === correction.corrects);
  if (!original) throw new Error("Cannot correct an entry that does not exist");

  store.statusOverrides.set(correction.corrects, "corrected");

  const record = appendAttestation(store, {
    id: `c_${randomBytes(4).toString("hex")}`,
    residentFingerprint: residentFp,
    issuerFingerprint: issuerFp,
    credentialType: original.credentialType,
    issueDate: new Date().toISOString(),
    title: `Correction: ${original.title}`,
    summary: correction.summary,
    evidence: {
      metric: "Correction entry",
      facts: [{ label: "Reason", value: correction.reason }],
    },
    corrects: correction.corrects,
  });

  return credentialFromAttestation(record);
}

export function setResidentNote(
  idOrSlug: string,
  credentialId: string,
  note: string | undefined,
): void {
  const fp = resolveFingerprint(idOrSlug);
  if (!fp) throw new Error("Resident not found");
  const store = getStore();
  if (note?.trim()) store.residentNotes.set(credentialId, note.trim());
  else store.residentNotes.delete(credentialId);
}

export interface CreatePacketInput {
  residentId: string;
  label: string;
  purpose: SharePacket["purpose"];
  includedCredentialIds: string[];
  sharedNoteCredentialIds?: string[];
  intro?: string;
  expiresInDays: number;
}

export function createPacket(input: CreatePacketInput): SharePacket {
  const store = getStore();
  const fp = resolveFingerprint(input.residentId);
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
  store.packets.set(token, packet);
  return packet;
}

export function revokePacket(token: string): void {
  const packet = getStore().packets.get(token);
  if (packet && !packet.revokedAt) packet.revokedAt = new Date().toISOString();
}

/** Export raw attestations for admin inspection. */
export function getAttestations(idOrSlug: string): Attestation[] {
  const fp = resolveFingerprint(idOrSlug);
  if (!fp) return [];
  return [...(getStore().attestations.get(fp) ?? [])];
}

export function getUserByFingerprint(fingerprint: Fingerprint): User | undefined {
  return getUser(fingerprint);
}
