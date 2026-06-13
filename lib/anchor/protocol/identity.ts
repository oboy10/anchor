import {
  createHash,
  createPrivateKey,
  createPublicKey,
  randomBytes,
  type KeyObject,
} from "node:crypto";
import { base64UrlDecode, base64UrlEncode, isLowerHex } from "./encoding";
import type { AnchorEntityType, AnchorIdentity, Base64Url, Fingerprint } from "./types";

const PKCS8_ED25519_PREFIX = Buffer.from("302e020100300506032b657004220420", "hex");
const SPKI_ED25519_PREFIX = Buffer.from("302a300506032b6570032100", "hex");

export interface AnchorKeypair {
  identity: AnchorIdentity;
  privateKey: Base64Url;
}

export function generateIdentity(input: {
  entityType: AnchorEntityType;
  displayName?: string;
  seed?: Buffer | Uint8Array;
}): AnchorKeypair {
  const privateSeed = input.seed ? Buffer.from(input.seed) : randomBytes(32);
  if (privateSeed.length !== 32) throw new Error("Ed25519 private seed must be 32 bytes");
  const publicKey = publicKeyFromPrivateSeed(privateSeed);
  const identity: AnchorIdentity = {
    alg: "Ed25519",
    publicKey: base64UrlEncode(publicKey),
    fingerprint: deriveFingerprint(publicKey),
    entityType: input.entityType,
  };
  if (input.displayName) identity.displayName = input.displayName;
  return { identity, privateKey: base64UrlEncode(privateSeed) };
}

export function importPublicKey(rawOrEncoded: Buffer | Uint8Array | string): Buffer {
  if (typeof rawOrEncoded === "string") {
    return base64UrlDecode(rawOrEncoded, 32);
  }
  const raw = Buffer.from(rawOrEncoded);
  if (raw.length !== 32) throw new Error("Ed25519 public key must be 32 bytes");
  return raw;
}

export function exportPublicKey(raw: Buffer | Uint8Array): Base64Url {
  const publicKey = importPublicKey(raw);
  return base64UrlEncode(publicKey);
}

export function deriveFingerprint(publicKey: Buffer | Uint8Array | string): Fingerprint {
  const raw = typeof publicKey === "string" ? importPublicKey(publicKey) : Buffer.from(publicKey);
  if (raw.length !== 32) throw new Error("Ed25519 public key must be 32 bytes");
  return createHash("sha512").update(raw).digest().subarray(0, 8).toString("hex");
}

export function validateIdentity(identity: AnchorIdentity): boolean {
  try {
    if (identity.alg !== "Ed25519") return false;
    if (!["person", "org", "service"].includes(identity.entityType)) return false;
    if (!isLowerHex(identity.fingerprint, 8)) return false;
    return deriveFingerprint(identity.publicKey) === identity.fingerprint;
  } catch {
    return false;
  }
}

export function rawPrivateKeyToNode(privateSeed: Buffer | Uint8Array | string): KeyObject {
  const seed =
    typeof privateSeed === "string" ? base64UrlDecode(privateSeed, 32) : Buffer.from(privateSeed);
  if (seed.length !== 32) throw new Error("Ed25519 private seed must be 32 bytes");
  return createPrivateKey({
    key: Buffer.concat([PKCS8_ED25519_PREFIX, seed]),
    format: "der",
    type: "pkcs8",
  });
}

export function rawPublicKeyToNode(publicKey: Buffer | Uint8Array | string): KeyObject {
  const raw = typeof publicKey === "string" ? importPublicKey(publicKey) : Buffer.from(publicKey);
  return createPublicKey({
    key: Buffer.concat([SPKI_ED25519_PREFIX, raw]),
    format: "der",
    type: "spki",
  });
}

export function publicKeyFromPrivateSeed(privateSeed: Buffer | Uint8Array | string): Buffer {
  const privateKey = rawPrivateKeyToNode(privateSeed);
  const der = createPublicKey(privateKey).export({ type: "spki", format: "der" });
  return Buffer.from(der).subarray(Buffer.from(der).length - 32);
}
