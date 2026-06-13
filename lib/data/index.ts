/**
 * Unified data access layer.
 * Uses Firestore when Firebase Admin is configured; otherwise in-memory demo store.
 */
import "server-only";
import { isFirebaseAdminConfigured, getAdminFirestore } from "@/lib/firebase/admin";
import { COL, META } from "./collections";
import type { CorrectionEntry } from "@/types";
import type { IssueCredentialInput, CreatePacketInput } from "./store";

export type { IssueCredentialInput, CreatePacketInput } from "./store";

let seedChecked = false;

function useFirestore(): boolean {
  return isFirebaseAdminConfigured();
}

async function ensureFirestoreSeeded(): Promise<void> {
  if (seedChecked || !useFirestore()) return;
  seedChecked = true;
  const db = getAdminFirestore();
  const meta = await db.collection(COL.meta).doc(META.demoSeed).get();
  if (!meta.exists) {
    const { seedFirestore } = await import("./seed-firestore");
    await seedFirestore(db);
  }
}

async function withStore<T>(
  firestore: (m: typeof import("./firestore-store")) => Promise<T>,
  memory: (m: typeof import("./store")) => T,
): Promise<T> {
  const useFs = useFirestore();
  // #region agent log
  fetch('http://127.0.0.1:7770/ingest/c43addfd-9145-4c13-b4b0-3d3f620110e8',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'4e4885'},body:JSON.stringify({sessionId:'4e4885',location:'data/index.ts:withStore',message:'backend branch',data:{useFs},timestamp:Date.now(),hypothesisId:'C'})}).catch(()=>{});
  // #endregion
  if (useFs) {
    await ensureFirestoreSeeded();
    return firestore(await import("./firestore-store"));
  }
  return memory(await import("./store"));
}

export async function resolveFingerprint(idOrSlug: string) {
  return withStore(
    (m) => m.resolveFingerprint(idOrSlug),
    (m) => m.resolveFingerprint(idOrSlug),
  );
}

export async function listResidents() {
  return withStore((m) => m.listResidents(), (m) => m.listResidents());
}

export async function getResident(idOrSlug: string) {
  return withStore((m) => m.getResident(idOrSlug), (m) => m.getResident(idOrSlug));
}

export async function listProviders() {
  return withStore((m) => m.listProviders(), (m) => m.listProviders());
}

export async function getProvider(idOrSlug: string) {
  return withStore((m) => m.getProvider(idOrSlug), (m) => m.getProvider(idOrSlug));
}

export async function getPublicKey(fingerprint: string) {
  return withStore(
    (m) => m.getPublicKey(fingerprint),
    (m) => m.getPublicKey(fingerprint),
  );
}

export async function getLedger(idOrSlug: string) {
  return withStore((m) => m.getLedger(idOrSlug), (m) => m.getLedger(idOrSlug));
}

export async function getCredential(idOrSlug: string, credentialId: string) {
  return withStore(
    (m) => m.getCredential(idOrSlug, credentialId),
    (m) => m.getCredential(idOrSlug, credentialId),
  );
}

export async function getEndorsements(idOrSlug: string) {
  return withStore(
    (m) => m.getEndorsements(idOrSlug),
    (m) => m.getEndorsements(idOrSlug),
  );
}

export async function getPacket(token: string) {
  return withStore((m) => m.getPacket(token), (m) => m.getPacket(token));
}

export async function listPacketsForResident(idOrSlug: string) {
  return withStore(
    (m) => m.listPacketsForResident(idOrSlug),
    (m) => m.listPacketsForResident(idOrSlug),
  );
}

export async function verifyResidentChain(idOrSlug: string) {
  return withStore(
    (m) => m.verifyResidentChain(idOrSlug),
    (m) => m.verifyResidentChain(idOrSlug),
  );
}

export async function issueCredential(input: IssueCredentialInput) {
  if (useFirestore()) await ensureFirestoreSeeded();
  return withStore(
    (m) => m.issueCredential(input),
    (m) => m.issueCredential(input),
  );
}

export async function issueCorrection(issuerId: string, correction: CorrectionEntry) {
  return withStore(
    (m) => m.issueCorrection(issuerId, correction),
    (m) => m.issueCorrection(issuerId, correction),
  );
}

export async function setResidentNote(
  idOrSlug: string,
  credentialId: string,
  note: string | undefined,
) {
  return withStore(
    (m) => m.setResidentNote(idOrSlug, credentialId, note),
    (m) => m.setResidentNote(idOrSlug, credentialId, note),
  );
}

export async function createPacket(input: CreatePacketInput) {
  if (useFirestore()) await ensureFirestoreSeeded();
  return withStore(
    (m) => m.createPacket(input),
    (m) => m.createPacket(input),
  );
}

export async function revokePacket(token: string) {
  return withStore((m) => m.revokePacket(token), (m) => m.revokePacket(token));
}

export async function reseed() {
  if (useFirestore()) seedChecked = false;
  return withStore((m) => m.reseed(), (m) => {
    m.reseed();
  });
}

export async function getAttestations(idOrSlug: string) {
  return withStore(
    (m) => m.getAttestations(idOrSlug),
    (m) => m.getAttestations(idOrSlug),
  );
}

export async function getUserByFingerprint(fingerprint: string) {
  return withStore(
    (m) => m.getUserByFingerprint(fingerprint),
    (m) => m.getUserByFingerprint(fingerprint),
  );
}

export async function getDataBackend(): Promise<"firestore" | "memory"> {
  return useFirestore() ? "firestore" : "memory";
}
