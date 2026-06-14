"use client";

/**
 * Binary import/export wiring for the local-first stores.
 *
 * Bridges the crypto archive container (lib/crypto/archive) to the browser:
 * gathers records from the account + ledger stores, encodes them to a single
 * `.anchor` binary file for download, and re-imports a picked file by merging
 * its records back in. Exported account vaults stay AES-GCM encrypted.
 */
import { decodeArchive, encodeArchive } from "@/lib/crypto/archive";
import { getAccount, importAccounts } from "./accounts";
import {
  exportActiveLedger,
  getAttestations,
  getPacket,
  importLedger,
} from "./db";

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

async function readArchive(file: File) {
  return decodeArchive(new Uint8Array(await file.arrayBuffer()));
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
  const archive = await readArchive(file);
  return importAccounts(archive.accounts);
}

/** Download the active resident's attestations and packets as a binary file. */
export async function exportLedgerFile(): Promise<void> {
  const { attestations, packets } = await exportActiveLedger();
  const bytes = encodeArchive({ accounts: [], attestations, packets });
  downloadBytes(bytes, `anchor-attestations-${stamp()}.${FILE_EXT}`);
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
): Promise<{ attestations: number; packets: number }> {
  const archive = await readArchive(file);
  return importLedger(archive.attestations, archive.packets);
}
