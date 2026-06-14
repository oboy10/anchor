"use client";

/**
 * Binary import/export wiring for the local-first stores.
 *
 * Bridges the crypto archive container (lib/crypto/archive) to the browser:
 * gathers records from the account + ledger stores, encodes them to a single
 * `.anchor` binary file for download, and re-imports a picked file by merging
 * its records back in. Exported account vaults stay AES-GCM encrypted.
 */
import {
  decodeArchive,
  encodeArchive,
  type AnchorArchive,
} from "@/lib/crypto/archive";
import { getAccount, importAccounts } from "./accounts";
import {
  exportActiveLedger,
  getAttestations,
  getProviderByFingerprint,
  getUserByFingerprint,
  getPacket,
  importLedger,
} from "./db";
import type { Attestation, Credential } from "@/types";

const FILE_EXT = "anchor";

function stamp(): string {
  return new Date().toISOString().slice(0, 10);
}

function downloadBytes(bytes: Uint8Array<ArrayBuffer>, filename: string): void {
  const blob = new Blob([bytes], { type: "application/octet-stream" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export async function readAnchorArchiveFile(file: File): Promise<AnchorArchive> {
  return decodeArchive(new Uint8Array(await file.arrayBuffer()));
}

export function mergeAnchorArchives(archives: AnchorArchive[]): AnchorArchive {
  const accounts = new Map<string, AnchorArchive["accounts"][number]>();
  const attestations = new Map<string, AnchorArchive["attestations"][number]>();
  const packets = new Map<string, AnchorArchive["packets"][number]>();
  const users = new Map<string, NonNullable<AnchorArchive["users"]>[number]>();
  const providers = new Map<string, NonNullable<AnchorArchive["providers"]>[number]>();

  for (const archive of archives) {
    for (const account of archive.accounts) accounts.set(account.fingerprint, account);
    for (const attestation of archive.attestations) {
      attestations.set(attestation.signature, attestation);
    }
    for (const packet of archive.packets) packets.set(packet.token, packet);
    for (const user of archive.users ?? []) {
      users.set(user.fingerprint, {
        fingerprint: user.fingerprint,
        publicKey: user.publicKey,
      });
    }
    for (const provider of archive.providers ?? []) {
      providers.set(provider.fingerprint, provider);
    }
  }

  return {
    accounts: [...accounts.values()],
    attestations: [...attestations.values()],
    packets: [...packets.values()],
    users: [...users.values()],
    providers: [...providers.values()],
  };
}

/** Download a single stored account (encrypted vault) as a binary file. */
export function exportAccountFile(fingerprint: string): void {
  const account = getAccount(fingerprint);
  if (!account) return;
  const bytes = encodeArchive({
    accounts: [account],
    attestations: [],
    packets: [],
  });
  const slug =
    account.label.replace(/[^a-z0-9]+/gi, "-").replace(/^-+|-+$/g, "").toLowerCase() ||
    account.fingerprint.slice(0, 8);
  downloadBytes(bytes, `anchor-account-${slug}-${stamp()}.${FILE_EXT}`);
}

/** Merge accounts from a picked binary file. Returns the number added. */
export async function importAccountsFile(file: File): Promise<number> {
  const archive = await readAnchorArchiveFile(file);
  return importAccounts(archive.accounts);
}

/** Download the active resident's attestations and packets as a binary file. */
export async function exportLedgerFile(): Promise<void> {
  const { attestations, packets } = await exportActiveLedger();
  const bytes = encodeArchive({ accounts: [], attestations, packets });
  downloadBytes(bytes, `anchor-attestations-${stamp()}.${FILE_EXT}`);
}

function isCredential(value: Credential | Attestation): value is Credential {
  return "attestation" in value;
}

/** Download one issued credential with public signer identity + profile. */
export async function exportCredentialFile(
  input: Credential | Attestation,
  title?: string,
): Promise<void> {
  let credential: Credential | undefined;
  let attestation: Attestation;
  let issuerFingerprint: string;
  if (isCredential(input)) {
    credential = input;
    attestation = input.attestation;
    issuerFingerprint = input.issuerFingerprint;
  } else {
    attestation = input;
    issuerFingerprint = input.from;
  }
  const [user, provider] = await Promise.all([
    getUserByFingerprint(issuerFingerprint),
    getProviderByFingerprint(issuerFingerprint),
  ]);
  const bytes = encodeArchive({
    accounts: [],
    attestations: [attestation],
    packets: [],
    users: user
      ? [{ fingerprint: user.fingerprint, publicKey: user.publicKey }]
      : [],
    providers: provider ? [provider] : [],
  });
  const filenameTitle = credential?.title ?? title ?? "";
  const slug =
    filenameTitle.replace(/[^a-z0-9]+/gi, "-").replace(/^-+|-+$/g, "").toLowerCase() ||
    credential?.id ||
    "credential";
  downloadBytes(bytes, `anchor-credential-${slug}-${stamp()}.${FILE_EXT}`);
}

/**
 * Download a single share packet plus the attestations it includes as a binary
 * file the recipient can import and verify offline.
 */
export async function exportPacketFile(token: string): Promise<void> {
  const packet = await getPacket(token);
  if (!packet) return;
  const included = new Set(packet.includedCredentialIds);
  const all = await getAttestations(packet.residentFingerprint);
  const attestations = all.filter((a) => {
    const id = (a as { credentialId?: string }).credentialId;
    return id ? included.has(id) : false;
  });
  const bytes = encodeArchive({ accounts: [], attestations, packets: [packet] });
  const slug =
    packet.label.replace(/[^a-z0-9]+/gi, "-").replace(/^-+|-+$/g, "").toLowerCase() ||
    "packet";
  downloadBytes(bytes, `anchor-packet-${slug}-${stamp()}.${FILE_EXT}`);
}

/** Merge attestations and packets from a picked binary file. */
export async function importLedgerFile(
  file: File,
): Promise<{ attestations: number; packets: number; users: number; providers: number }> {
  const archive = await readAnchorArchiveFile(file);
  return importLedger(
    archive.attestations,
    archive.packets,
    archive.users ?? [],
    archive.providers ?? [],
  );
}

/** Merge attestations, packets, and public signer metadata from many files. */
export async function importLedgerFiles(
  files: File[],
): Promise<{ attestations: number; packets: number; users: number; providers: number; archive: AnchorArchive }> {
  const archive = mergeAnchorArchives(
    await Promise.all(files.map((file) => readAnchorArchiveFile(file))),
  );
  const counts = await importLedger(
    archive.attestations,
    archive.packets,
    archive.users ?? [],
    archive.providers ?? [],
  );
  return { ...counts, archive };
}
