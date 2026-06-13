/**
 * Ed25519 user identity: keypair generation, fingerprint derivation.
 *
 * Fingerprint = SHA-512(public_key)[0:8] → 16 hex chars.
 *
 * Cross-platform: uses WebCrypto (SubtleCrypto) + Uint8Array only, so this
 * runs in the browser, edge runtimes, and Node alike — no node:crypto, no
 * server-only. All key operations are async because SubtleCrypto is async.
 */
import {
  base64UrlToBytes,
  bytesToHex,
  concatBytes,
  hexToBytes,
  subtle,
  utf8ToBytes,
} from "./bytes";
import type {
  Fingerprint,
  PrivateKeyHex,
  PublicKeyHex,
  User,
} from "@/types/primitives";

// DER prefixes for wrapping a raw 32-byte Ed25519 seed (RFC 8410).
const PKCS8_ED25519_PREFIX = hexToBytes("302e020100300506032b657004220420");

async function sha512(data: Uint8Array): Promise<Uint8Array<ArrayBuffer>> {
  return new Uint8Array(await subtle.digest("SHA-512", data as BufferSource));
}

/** RFC 8032-style clamping for a 32-byte Ed25519 seed. */
export async function clampEd25519Seed(seed: Uint8Array): Promise<Uint8Array> {
  const h = await sha512(seed);
  const s = h.slice(0, 32);
  s[0] &= 248;
  s[31] &= 127;
  s[31] |= 64;
  return s;
}

/** Derive a deterministic demo keypair from a label (stable across reseeds). */
export async function userFromSeed(label: string): Promise<User> {
  const privateSeed = await clampEd25519Seed(
    // Legacy namespace — keep stable so existing demo ledger fingerprints match.
    utf8ToBytes(`trustwallet:v1:${label}`),
  );
  return userFromPrivateSeed(privateSeed);
}

export async function userFromPrivateSeed(privateSeed: Uint8Array): Promise<User> {
  const privateKeyHex = bytesToHex(privateSeed) as PrivateKeyHex;
  const publicKeyHex = await publicKeyFromPrivateSeed(privateSeed);
  const fingerprint = await fingerprintFromPublicKeyHex(publicKeyHex);
  return { fingerprint, publicKey: publicKeyHex, privateKey: privateKeyHex };
}

export async function publicKeyFromPrivateSeed(
  privateSeed: Uint8Array,
): Promise<PublicKeyHex> {
  const priv = await importPrivateKey(privateSeed);
  // The JWK of an Ed25519 private key carries the public key in `x`.
  const jwk = await subtle.exportKey("jwk", priv);
  return bytesToHex(base64UrlToBytes(jwk.x as string)) as PublicKeyHex;
}

/** SHA-512(public_key)[0:8] as 16 lowercase hex chars. */
export async function fingerprintFromPublicKey(
  publicKey: Uint8Array,
): Promise<Fingerprint> {
  const digest = await sha512(publicKey);
  return bytesToHex(digest.slice(0, 8));
}

export async function fingerprintFromPublicKeyHex(
  publicKeyHex: PublicKeyHex,
): Promise<Fingerprint> {
  return fingerprintFromPublicKey(hexToBytes(publicKeyHex));
}

/** Import a raw 32-byte Ed25519 seed as a signing CryptoKey. */
export async function importPrivateKey(
  privateSeed: Uint8Array,
): Promise<CryptoKey> {
  const der = concatBytes(PKCS8_ED25519_PREFIX, privateSeed);
  return subtle.importKey("pkcs8", der, "Ed25519", true, ["sign"]);
}

/** Import a raw 32-byte Ed25519 public key (hex) as a verifying CryptoKey. */
export async function importPublicKey(
  publicKeyHex: PublicKeyHex,
): Promise<CryptoKey> {
  return subtle.importKey(
    "raw",
    hexToBytes(publicKeyHex),
    "Ed25519",
    false,
    ["verify"],
  );
}

/** Short display form for any hex string (e.g. a4f1…9c2b). */
export function shortHex(hex: string): string {
  if (hex.length <= 8) return hex;
  return `${hex.slice(0, 4)}…${hex.slice(-4)}`;
}
