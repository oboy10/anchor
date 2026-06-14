/**
 * Portable binary archive for Anchor data.
 *
 * One container format holds everything: a flat sequence of length-framed
 * "packets", where each packet is a single account (encrypted vault), a single
 * signed attestation, or a single share packet. A file may carry any mix and
 * any number of them, so the same container is produced by the accounts export
 * and the attestations export alike. The seed inside an account vault is
 * AES-GCM encrypted (see ./vault), so an exported file holds no plaintext key.
 *
 * On-disk layout (all integers big-endian):
 *
 *   magic      3 bytes   0xAC 0xAC 0xAC
 *   version    1 byte    = 1
 *   count      4 bytes   uint32 packet count
 *   repeat count packets:
 *     kind     1 byte    PACKET.*
 *     length   4 bytes   uint32 payload length
 *     payload  N bytes   UTF-8 JSON object (one record)
 *
 * Cross-platform: Uint8Array + DataView + Web text codecs only, so it runs in
 * the browser and on the server alike (matching the rest of lib/crypto).
 */
import { bytesToUtf8, concatBytes, utf8ToBytes } from "./bytes";
import type { Vault } from "./vault";
import type { Attestation, SharePacket } from "@/types";

const MAGIC = Uint8Array.of(0xac, 0xac, 0xac);
const VERSION = 1;
const PREAMBLE_BYTES = MAGIC.length + 1 + 4; // magic + version + count
const PACKET_HEADER_BYTES = 5; // kind (1) + length (4)

/** The kind tag carried by each packet in the container. */
export const PACKET = {
  ACCOUNT: 1,
  ATTESTATION: 2,
  SHARE: 3,
} as const;

/**
 * Public, exportable form of a stored account. Mirrors AccountMeta — the seed
 * lives only inside the encrypted `vault`, so this is safe to write to disk.
 */
export interface PortableAccount {
  fingerprint: string;
  publicKey: string;
  label: string;
  createdAt: string;
  vault: Vault;
  verifiedEmail?: string;
  verifiedPhone?: string;
}

export interface AnchorArchive {
  accounts: PortableAccount[];
  attestations: Attestation[];
  packets: SharePacket[];
}

function jsonBytes(value: unknown): Uint8Array {
  return utf8ToBytes(JSON.stringify(value));
}

/** Encode accounts, attestations, and share packets as one packet stream. */
export function encodeArchive(archive: AnchorArchive): Uint8Array<ArrayBuffer> {
  const packets: { kind: number; data: Uint8Array }[] = [
    ...archive.accounts.map((a) => ({ kind: PACKET.ACCOUNT, data: jsonBytes(a) })),
    ...archive.attestations.map((a) => ({ kind: PACKET.ATTESTATION, data: jsonBytes(a) })),
    ...archive.packets.map((p) => ({ kind: PACKET.SHARE, data: jsonBytes(p) })),
  ];

  const preamble = new Uint8Array(PREAMBLE_BYTES);
  preamble.set(MAGIC, 0);
  const preView = new DataView(preamble.buffer);
  preView.setUint8(MAGIC.length, VERSION);
  preView.setUint32(MAGIC.length + 1, packets.length, false);

  const parts: Uint8Array[] = [preamble];
  for (const packet of packets) {
    const header = new Uint8Array(PACKET_HEADER_BYTES);
    const view = new DataView(header.buffer);
    view.setUint8(0, packet.kind);
    view.setUint32(1, packet.data.length, false);
    parts.push(header, packet.data);
  }
  return concatBytes(...parts);
}

/** Parse a packet-stream container back into its records. Throws if malformed. */
export function decodeArchive(bytes: Uint8Array): AnchorArchive {
  if (bytes.length < PREAMBLE_BYTES) {
    throw new Error("Not an Anchor archive.");
  }
  for (let i = 0; i < MAGIC.length; i++) {
    if (bytes[i] !== MAGIC[i]) throw new Error("Not an Anchor archive.");
  }

  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  let offset = MAGIC.length;
  const version = view.getUint8(offset++);
  if (version !== VERSION) {
    throw new Error(`Unsupported archive version ${version}.`);
  }
  const count = view.getUint32(offset, false);
  offset += 4;

  const out: AnchorArchive = { accounts: [], attestations: [], packets: [] };

  for (let i = 0; i < count; i++) {
    if (offset + PACKET_HEADER_BYTES > bytes.length) {
      throw new Error("Truncated Anchor archive.");
    }
    const kind = view.getUint8(offset);
    const length = view.getUint32(offset + 1, false);
    offset += PACKET_HEADER_BYTES;
    if (offset + length > bytes.length) {
      throw new Error("Truncated Anchor archive.");
    }
    const record = JSON.parse(bytesToUtf8(bytes.subarray(offset, offset + length)));
    offset += length;

    if (kind === PACKET.ACCOUNT) out.accounts.push(record);
    else if (kind === PACKET.ATTESTATION) out.attestations.push(record);
    else if (kind === PACKET.SHARE) out.packets.push(record);
  }
  return out;
}
