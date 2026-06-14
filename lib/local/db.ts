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
    credentialFromAttestation,
    credentialsFromAttestations,
    toVerificationResult,
} from "@/lib/attestation/credential";
import {
    buildCredentialProperties,
    signAttestation,
    verifyAttestations,
} from "@/lib/crypto/attestation";
import {
    bytesToBase64Url,
    bytesToHex,
    randomBytes,
} from "@/lib/crypto/bytes";
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
export const ACTIVE_KEY = "anchor.activeResident";
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
  /**
   * Identity vouches keyed by subject (`to`) fingerprint. These are signed by
   * the Anchor verifier and carry `a.id:*` attributes (see spec.md §4). Kept
   * separate from credential attestations so they never appear in the timeline.
   */
  vouches: Map<Fingerprint, Attestation[]>;
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
  vouches: Attestation[];
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
    vouches: new Map(),
    residentNotes: new Map(),
    statusOverrides: new Map(),
    endorsements: [],
    packets: new Map(),
  };
}

function serialize(store: Store): PersistedStore {
  const attestations: AttestationDoc[] = [];
  for (const list of store.attestations.values()) attestations.push(...list);
  const vouches: Attestation[] = [];
  for (const list of store.vouches.values()) vouches.push(...list);
  return {
    v: STORE_VERSION,
    users: [...store.users.values()],
    residents: [...store.residents.values()],
    providers: [...store.providers.values()],
    attestations,
    vouches,
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
  for (const v of data.vouches ?? []) {
    const list = store.vouches.get(v.to) ?? [];
    list.push(v);
    store.vouches.set(v.to, list);
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
// Attestation writer (signs client-side via WebCrypto)
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
        store = emptyStore();
        persist(store);
      }
    } else {
      store = emptyStore();
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

/**
 * The wallet shown at /wallet. The "active" identity is chosen locally and
 * persisted in the browser — it is never sent to or known by the server, so no
 * resident name or slug is needed in the URL or in any server record.
 */
export async function getActiveResident(): Promise<Resident | undefined> {
  const store = await load();
  const stored = isBrowser() ? localStorage.getItem(ACTIVE_KEY) : null;
  if (stored) {
    const fp = store.residents.has(stored)
      ? stored
      : store.slugToFingerprint.get(stored);
    if (fp && store.residents.has(fp)) return store.residents.get(fp);
  }
  return store.residents.values().next().value;
}

export async function setActiveResident(idOrSlug: string): Promise<void> {
  const fp = await resolveFingerprint(idOrSlug);
  if (!fp) return;
  if (isBrowser()) localStorage.setItem(ACTIVE_KEY, fp);
  emit();
}

/**
 * Register a locally-created keypair identity as a resident so it appears as a
 * wallet. Only the public key is added to the ledger — the private key stays in
 * the password-protected vault (see lib/local/accounts) and is never persisted
 * here. Idempotent: re-registering an existing fingerprint only updates the name.
 */
export async function registerLocalIdentity(
  user: Pick<User, "fingerprint" | "publicKey">,
  displayName: string,
): Promise<Resident> {
  const store = await load();
  store.users.set(user.fingerprint, {
    fingerprint: user.fingerprint,
    publicKey: user.publicKey,
  });
  const existing = store.residents.get(user.fingerprint);
  const slug = existing?.slug ?? `r_${user.fingerprint.slice(0, 8)}`;
  const resident: Resident = {
    fingerprint: user.fingerprint,
    slug,
    displayName: displayName.trim() || existing?.displayName || "You",
    recordSince: existing?.recordSince ?? new Date().toISOString(),
    preferredIntro: existing?.preferredIntro,
    pronouns: existing?.pronouns,
    city: existing?.city,
  };
  store.residents.set(user.fingerprint, resident);
  store.slugToFingerprint.set(slug, user.fingerprint);
  await commit(store);
  return resident;
}

/**
 * Store an identity vouch (a signed `a.id:*` attestation from the Anchor
 * verifier). The verifier's public key is recorded so the signature can be
 * checked locally. De-duplicated by signature.
 */
export async function addVouch(
  residentFingerprint: Fingerprint,
  attestation: Attestation,
  verifier: { fingerprint: Fingerprint; publicKey: string },
): Promise<void> {
  const store = await load();
  store.users.set(verifier.fingerprint, {
    fingerprint: verifier.fingerprint,
    publicKey: verifier.publicKey,
  });
  const list = store.vouches.get(residentFingerprint) ?? [];
  if (!list.some((v) => v.signature === attestation.signature)) {
    list.push(attestation);
  }
  store.vouches.set(residentFingerprint, list);
  await commit(store);
}

/**
 * Store a self-signed profile vouch (from === to === the user). Replaces any
 * previous self-vouch so only the latest profile values are kept; vouches
 * signed by other parties (e.g. the Anchor verifier for email/phone) are left
 * untouched. The user's public key is already in the ledger, so it verifies.
 */
export async function setSelfVouch(
  fingerprint: Fingerprint,
  attestation: Attestation,
): Promise<void> {
  const store = await load();
  const list = (store.vouches.get(fingerprint) ?? []).filter(
    (v) => v.from !== fingerprint,
  );
  list.push(attestation);
  store.vouches.set(fingerprint, list);
  await commit(store);
}

export async function getVouches(idOrSlug: string): Promise<Attestation[]> {
  const fp = await resolveFingerprint(idOrSlug);
  if (!fp) return [];
  return [...((await load()).vouches.get(fp) ?? [])];
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

export async function getProviderByFingerprint(
  fingerprint: Fingerprint,
): Promise<Provider | undefined> {
  return (await load()).providers.get(fingerprint);
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
// Portability: reset / export / import
// ---------------------------------------------------------------------------

/** Wipe the local store back to empty. */
export async function resetData(): Promise<void> {
  const store = emptyStore();
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

/** The active resident's signed attestations and share packets, for export. */
export async function exportActiveLedger(): Promise<{
  attestations: Attestation[];
  packets: SharePacket[];
}> {
  const resident = await getActiveResident();
  if (!resident) return { attestations: [], packets: [] };
  const store = await load();
  const attestations = [...(store.attestations.get(resident.fingerprint) ?? [])];
  const packets = [...store.packets.values()].filter(
    (p) => p.residentFingerprint === resident.fingerprint,
  );
  return { attestations, packets };
}

/**
 * Merge imported attestations and packets into the local store, de-duplicated
 * by signature / token. Existing records are left untouched. Returns counts of
 * newly added records.
 */
export async function importLedger(
  attestations: Attestation[],
  packets: SharePacket[],
  users: User[] = [],
  providers: Provider[] = [],
): Promise<{ attestations: number; packets: number; users: number; providers: number }> {
  const store = await load();
  let addedAttestations = 0;
  let addedPackets = 0;
  let addedUsers = 0;
  let addedProviders = 0;

  for (const user of users) {
    if (!user?.fingerprint || !user.publicKey) continue;
    const existing = store.users.get(user.fingerprint);
    if (existing) {
      store.users.set(user.fingerprint, {
        ...user,
        privateKey: existing.privateKey,
      });
      continue;
    }
    store.users.set(user.fingerprint, {
      fingerprint: user.fingerprint,
      publicKey: user.publicKey,
    });
    addedUsers++;
  }

  for (const provider of providers) {
    if (!provider?.fingerprint || !provider.name) continue;
    if (!store.providers.has(provider.fingerprint)) addedProviders++;
    store.providers.set(provider.fingerprint, provider);
    store.slugToFingerprint.set(provider.slug, provider.fingerprint);
  }

  for (const record of attestations) {
    if (!record?.signature || !record.to) continue;
    const list = store.attestations.get(record.to) ?? [];
    if (list.some((a) => a.signature === record.signature)) continue;
    list.push(record as AttestationDoc);
    store.attestations.set(record.to, list);
    addedAttestations++;
  }

  for (const packet of packets) {
    if (!packet?.token || store.packets.has(packet.token)) continue;
    store.packets.set(packet.token, packet);
    addedPackets++;
  }

  await commit(store);
  return {
    attestations: addedAttestations,
    packets: addedPackets,
    users: addedUsers,
    providers: addedProviders,
  };
}
