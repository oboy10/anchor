/**
 * Local-first data store.
 *
 * ALL application data lives in the browser (localStorage) as portable JSON.
 * Nothing here is sent to or stored on a server — the only server-side state
 * is a hash list of registered emails (see lib/firebase/email-registry).
 *
 * Core records are signed Attestations (from → to edges); credentials are a
 * derived view. Signing/verifying uses WebCrypto (lib/crypto), which runs in
 * the browser, so the whole ledger is self-contained and portable.
 */
import {
  bytesToBase64Url,
  bytesToHex,
  randomBytes,
} from "@/lib/crypto/bytes";
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
} from "@/lib/demo/seed";
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

export const STORAGE_KEY = "anchor.store.v1";
export const STORE_VERSION = 1;

type AttestationDoc = Attestation & {
  credentialId?: string;
  issueDate?: string;
};

interface Store {
  users: Map<Fingerprint, User>;
  slugToFingerprint: Map<string, Fingerprint>;
  residents: Map<Fingerprint, Resident>;
  providers: Map<Fingerprint, Provider>;
  /** Attestations keyed by resident (`to`) fingerprint, oldest first. */
  attestations: Map<Fingerprint, AttestationDoc[]>;
  /** Resident notes keyed by credentialId (not signed — resident-owned). */
  residentNotes: Map<string, string>;
  statusOverrides: Map<string, "active" | "corrected" | "superseded">;
  endorsements: Endorsement[];
  packets: Map<string, SharePacket>;
}

/** Portable on-disk shape. Plain JSON arrays — easy to export/import. */
export interface PersistedStore {
  v: number;
  users: User[];
  residents: Resident[];
  providers: Provider[];
  attestations: AttestationDoc[];
  residentNotes: { credentialId: string; note: string }[];
  statusOverrides: { credentialId: string; status: string }[];
  endorsements: Endorsement[];
  packets: SharePacket[];
}

// ---------------------------------------------------------------------------
// Serialization
// ---------------------------------------------------------------------------

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

function serialize(store: Store): PersistedStore {
  const attestations: AttestationDoc[] = [];
  for (const list of store.attestations.values()) attestations.push(...list);
  return {
    v: STORE_VERSION,
    users: [...store.users.values()],
    residents: [...store.residents.values()],
    providers: [...store.providers.values()],
    attestations,
    residentNotes: [...store.residentNotes.entries()].map(([credentialId, note]) => ({
      credentialId,
      note,
    })),
    statusOverrides: [...store.statusOverrides.entries()].map(([credentialId, status]) => ({
      credentialId,
      status,
    })),
    endorsements: store.endorsements,
    packets: [...store.packets.values()],
  };
}

function deserialize(data: PersistedStore): Store {
  const store = emptyStore();
  for (const u of data.users) store.users.set(u.fingerprint, u);
  for (const r of data.residents) {
    store.residents.set(r.fingerprint, r);
    store.slugToFingerprint.set(r.slug, r.fingerprint);
  }
  for (const p of data.providers) {
    store.providers.set(p.fingerprint, p);
    store.slugToFingerprint.set(p.slug, p.fingerprint);
  }
  for (const a of data.attestations) {
    const list = store.attestations.get(a.to) ?? [];
    list.push(a);
    store.attestations.set(a.to, list);
  }
  for (const { credentialId, note } of data.residentNotes) {
    store.residentNotes.set(credentialId, note);
  }
  for (const { credentialId, status } of data.statusOverrides) {
    store.statusOverrides.set(
      credentialId,
      status as "active" | "corrected" | "superseded",
    );
  }
  store.endorsements = data.endorsements ?? [];
  for (const p of data.packets) store.packets.set(p.token, p);
  return store;
}

// ---------------------------------------------------------------------------
// Seeding (deterministic demo data, signed client-side)
// ---------------------------------------------------------------------------

async function appendAttestation(
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
): Promise<Attestation> {
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

  const record = await signAttestation(
    issuer,
    input.residentFingerprint,
    properties,
  );
  const doc: AttestationDoc = {
    ...record,
    credentialId: input.id,
    issueDate: input.issueDate,
  };
  const list = store.attestations.get(input.residentFingerprint) ?? [];
  list.push(doc);
  store.attestations.set(input.residentFingerprint, list);
  return record;
}

async function seed(): Promise<Store> {
  const store = emptyStore();

  for (const key of Object.keys(DEMO_KEYS) as (keyof typeof DEMO_KEYS)[]) {
    const m = DEMO_KEYS[key];
    store.users.set(m.fingerprint, {
      fingerprint: m.fingerprint,
      publicKey: m.publicKey,
      privateKey: m.privateKey,
    });
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
    await appendAttestation(store, {
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

  return store;
}

// ---------------------------------------------------------------------------
// Load / persist / subscribe
// ---------------------------------------------------------------------------

let cache: Store | undefined;
let loadPromise: Promise<Store> | undefined;
const subscribers = new Set<() => void>();

function isBrowser(): boolean {
  return typeof window !== "undefined" && typeof localStorage !== "undefined";
}

function persist(store: Store): void {
  if (!isBrowser()) return;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(serialize(store)));
}

function emit(): void {
  for (const cb of subscribers) cb();
}

async function load(): Promise<Store> {
  if (cache) return cache;
  if (loadPromise) return loadPromise;
  loadPromise = (async () => {
    let store: Store;
    const raw = isBrowser() ? localStorage.getItem(STORAGE_KEY) : null;
    if (raw) {
      try {
        store = deserialize(JSON.parse(raw) as PersistedStore);
      } catch {
        store = await seed();
        persist(store);
      }
    } else {
      store = await seed();
      persist(store);
    }
    cache = store;
    return store;
  })();
  return loadPromise;
}

/** Subscribe to store mutations (for React). Returns an unsubscribe fn. */
export function subscribe(cb: () => void): () => void {
  subscribers.add(cb);
  return () => subscribers.delete(cb);
}

/** Resolve the store once it is loaded (used by hooks for readiness). */
export async function ready(): Promise<void> {
  await load();
}

async function commit(store: Store): Promise<void> {
  persist(store);
  emit();
}

// ---------------------------------------------------------------------------
// Read API
// ---------------------------------------------------------------------------

export async function resolveFingerprint(
  idOrSlug: string,
): Promise<Fingerprint | undefined> {
  const store = await load();
  if (store.users.has(idOrSlug)) return idOrSlug;
  return store.slugToFingerprint.get(idOrSlug);
}

export async function listResidents(): Promise<Resident[]> {
  return [...(await load()).residents.values()];
}

export async function getResident(idOrSlug: string): Promise<Resident | undefined> {
  const fp = await resolveFingerprint(idOrSlug);
  return fp ? (await load()).residents.get(fp) : undefined;
}

export async function listProviders(): Promise<Provider[]> {
  return [...(await load()).providers.values()];
}

export async function getProvider(idOrSlug: string): Promise<Provider | undefined> {
  const fp = await resolveFingerprint(idOrSlug);
  return fp ? (await load()).providers.get(fp) : undefined;
}

export async function getPublicKey(fingerprint: Fingerprint) {
  const u = (await load()).users.get(fingerprint);
  return u ? { fingerprint: u.fingerprint, publicKey: u.publicKey } : undefined;
}

export async function getUserByFingerprint(
  fingerprint: Fingerprint,
): Promise<User | undefined> {
  return (await load()).users.get(fingerprint);
}

function ledgerFor(store: Store, fp: Fingerprint): Credential[] {
  const records = store.attestations.get(fp) ?? [];
  const creds = credentialsFromAttestations(records, store.residentNotes);
  return creds.map((c) => ({
    ...c,
    status: store.statusOverrides.get(c.id) ?? c.status,
  }));
}

export async function getLedger(idOrSlug: string): Promise<Credential[]> {
  const store = await load();
  const fp = await resolveFingerprint(idOrSlug);
  return fp ? ledgerFor(store, fp) : [];
}

export async function getCredential(
  idOrSlug: string,
  credentialId: string,
): Promise<Credential | undefined> {
  return (await getLedger(idOrSlug)).find((c) => c.id === credentialId);
}

export async function getEndorsements(idOrSlug: string): Promise<Endorsement[]> {
  const fp = await resolveFingerprint(idOrSlug);
  if (!fp) return [];
  return (await load()).endorsements.filter((e) => e.residentFingerprint === fp);
}

export async function getPacket(token: string): Promise<SharePacket | undefined> {
  return (await load()).packets.get(token);
}

export async function listPacketsForResident(
  idOrSlug: string,
): Promise<SharePacket[]> {
  const fp = await resolveFingerprint(idOrSlug);
  if (!fp) return [];
  return [...(await load()).packets.values()]
    .filter((p) => p.residentFingerprint === fp)
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

export async function getAttestations(idOrSlug: string): Promise<Attestation[]> {
  const fp = await resolveFingerprint(idOrSlug);
  if (!fp) return [];
  return [...((await load()).attestations.get(fp) ?? [])];
}

export async function verifyResidentChain(
  idOrSlug: string,
): Promise<VerificationResult> {
  const store = await load();
  const fp = await resolveFingerprint(idOrSlug);
  if (!fp) {
    return { chainValid: false, signaturesValid: false, entriesChecked: 0, entries: [] };
  }
  const records = store.attestations.get(fp) ?? [];
  const result = await verifyAttestations(records, fp, (from) =>
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

export async function issueCredential(
  input: IssueCredentialInput,
): Promise<Credential> {
  const store = await load();
  const residentFp = await resolveFingerprint(input.residentId);
  const issuerFp = await resolveFingerprint(input.issuerId);
  if (!residentFp || !issuerFp) throw new Error("Unknown resident or issuer");

  const id = `c_${bytesToHex(randomBytes(4))}`;
  const record = await appendAttestation(store, {
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
  await commit(store);
  return credentialFromAttestation(record);
}

export async function issueCorrection(
  issuerId: string,
  correction: CorrectionEntry,
): Promise<Credential> {
  const store = await load();
  const issuerFp = await resolveFingerprint(issuerId);
  const residentFp = correction.residentFingerprint;
  if (!issuerFp) throw new Error("Unknown issuer");

  const original = ledgerFor(store, residentFp).find(
    (c) => c.id === correction.corrects,
  );
  if (!original) throw new Error("Cannot correct an entry that does not exist");

  store.statusOverrides.set(correction.corrects, "corrected");
  const record = await appendAttestation(store, {
    id: `c_${bytesToHex(randomBytes(4))}`,
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
  await commit(store);
  return credentialFromAttestation(record);
}

export async function setResidentNote(
  idOrSlug: string,
  credentialId: string,
  note: string | undefined,
): Promise<void> {
  const store = await load();
  const fp = await resolveFingerprint(idOrSlug);
  if (!fp) throw new Error("Resident not found");
  if (note?.trim()) store.residentNotes.set(credentialId, note.trim());
  else store.residentNotes.delete(credentialId);
  await commit(store);
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

export async function createPacket(input: CreatePacketInput): Promise<SharePacket> {
  const store = await load();
  const fp = await resolveFingerprint(input.residentId);
  if (!fp) throw new Error("Resident not found");

  const token = `pk_${bytesToBase64Url(randomBytes(9))}`;
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
  await commit(store);
  return packet;
}

export async function revokePacket(token: string): Promise<void> {
  const store = await load();
  const packet = store.packets.get(token);
  if (packet && !packet.revokedAt) {
    packet.revokedAt = new Date().toISOString();
    await commit(store);
  }
}

// ---------------------------------------------------------------------------
// Portability: reseed / export / import
// ---------------------------------------------------------------------------

export async function reseed(): Promise<void> {
  const store = await seed();
  cache = store;
  loadPromise = Promise.resolve(store);
  await commit(store);
}

/** Export the entire local store as portable, pretty-printed JSON. */
export async function exportData(): Promise<string> {
  return JSON.stringify(serialize(await load()), null, 2);
}

/** Replace the local store with imported JSON. Throws on malformed input. */
export async function importData(json: string): Promise<void> {
  const parsed = JSON.parse(json) as PersistedStore;
  if (!parsed || typeof parsed !== "object" || !Array.isArray(parsed.users)) {
    throw new Error("Not a valid Anchor export.");
  }
  const store = deserialize(parsed);
  cache = store;
  loadPromise = Promise.resolve(store);
  await commit(store);
}
