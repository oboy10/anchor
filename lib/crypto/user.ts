/**
 * Ed25519 user identity: keypair generation, fingerprint derivation.
 *
 * Fingerprint = SHA-512(public_key)[0:8] → 16 hex chars.
 * Server-only.
 */
import "server-only";
import { createHash, createPrivateKey, createPublicKey } from "node:crypto";
import type { Fingerprint, PrivateKeyHex, PublicKeyHex, User } from "@/types/primitives";

const PKCS8_ED25519_PREFIX = Buffer.from(
  "302e020100300506032b657004220420",
  "hex",
);
const SPKI_ED25519_PREFIX = Buffer.from("302a300506032b6570032100", "hex");

/** RFC 8032-style clamping for a 32-byte Ed25519 seed. */
export function clampEd25519Seed(seed: Buffer): Buffer {
  const h = createHash("sha512").update(seed).digest();
  const s = Buffer.from(h.subarray(0, 32));
  s[0] &= 248;
  s[31] &= 127;
  s[31] |= 64;
  return s;
}

/** Derive a deterministic demo keypair from a label (stable across reseeds). */
export function userFromSeed(label: string): User {
  const privateSeed = clampEd25519Seed(
    Buffer.from(`trustwallet:v1:${label}`, "utf8"),
  );
  return userFromPrivateSeed(privateSeed);
}

export function userFromPrivateSeed(privateSeed: Buffer): User {
  const privateKeyHex = privateSeed.toString("hex") as PrivateKeyHex;
  const publicKeyHex = publicKeyFromPrivateSeed(privateSeed);
  const fingerprint = fingerprintFromPublicKeyHex(publicKeyHex);
  return { fingerprint, publicKey: publicKeyHex, privateKey: privateKeyHex };
}

export function publicKeyFromPrivateSeed(privateSeed: Buffer): PublicKeyHex {
  const priv = rawPrivateKeyToNode(privateSeed);
  const pubDer = createPublicKey(priv).export({ type: "spki", format: "der" });
  return pubDer.subarray(pubDer.length - 32).toString("hex") as PublicKeyHex;
}

/** SHA-512(public_key)[0:8] as 16 lowercase hex chars. */
export function fingerprintFromPublicKey(publicKey: Buffer): Fingerprint {
  return createHash("sha512")
    .update(publicKey)
    .digest()
    .subarray(0, 8)
    .toString("hex");
}

export function fingerprintFromPublicKeyHex(publicKeyHex: PublicKeyHex): Fingerprint {
  return fingerprintFromPublicKey(Buffer.from(publicKeyHex, "hex"));
}

export function rawPrivateKeyToNode(privateSeed: Buffer) {
  return createPrivateKey({
    key: Buffer.concat([PKCS8_ED25519_PREFIX, privateSeed]),
    format: "der",
    type: "pkcs8",
  });
}

export function rawPublicKeyToNode(publicKeyHex: PublicKeyHex) {
  return createPublicKey({
    key: Buffer.concat([
      SPKI_ED25519_PREFIX,
      Buffer.from(publicKeyHex, "hex"),
    ]),
    format: "der",
    type: "spki",
  });
}

/** Short display form for any hex string (e.g. a4f1…9c2b). */
export function shortHex(hex: string): string {
  if (hex.length <= 8) return hex;
  return `${hex.slice(0, 4)}…${hex.slice(-4)}`;
}
