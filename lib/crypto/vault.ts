/**
 * Password-protected vault for a 32-byte Ed25519 private seed.
 *
 * The seed is encrypted with AES-GCM under a key derived from the user's
 * password via PBKDF2 (SHA-256). Only the salt, IV, and ciphertext are stored
 * — never the password or the plaintext seed. Decryption fails (throws) on the
 * wrong password because AES-GCM authentication fails.
 *
 * Cross-platform: WebCrypto + Uint8Array only, so this runs in the browser.
 */
import {
  base64UrlToBytes,
  bytesToBase64Url,
  bytesToHex,
  hexToBytes,
  randomBytes,
  subtle,
  utf8ToBytes,
} from "./bytes";

/** Encrypted private seed. All fields are base64url-encoded bytes. */
export interface Vault {
  v: 1;
  /** PBKDF2 salt (16 bytes). */
  salt: string;
  /** AES-GCM IV (12 bytes). */
  iv: string;
  /** AES-GCM ciphertext of the 32-byte seed (+ 16-byte tag). */
  ct: string;
}

// OWASP-recommended floor for PBKDF2-HMAC-SHA256 (2023).
const PBKDF2_ITERATIONS = 210_000;

async function deriveAesKey(
  password: string,
  salt: Uint8Array,
): Promise<CryptoKey> {
  const baseKey = await subtle.importKey(
    "raw",
    utf8ToBytes(password) as BufferSource,
    "PBKDF2",
    false,
    ["deriveKey"],
  );
  return subtle.deriveKey(
    {
      name: "PBKDF2",
      salt: salt as BufferSource,
      iterations: PBKDF2_ITERATIONS,
      hash: "SHA-256",
    },
    baseKey,
    { name: "AES-GCM", length: 256 },
    false,
    ["encrypt", "decrypt"],
  );
}

/** Encrypt a hex-encoded private seed under a password. */
export async function encryptSeed(
  seedHex: string,
  password: string,
): Promise<Vault> {
  const salt = randomBytes(16);
  const iv = randomBytes(12);
  const key = await deriveAesKey(password, salt);
  const ct = await subtle.encrypt(
    { name: "AES-GCM", iv: iv as BufferSource },
    key,
    hexToBytes(seedHex) as BufferSource,
  );
  return {
    v: 1,
    salt: bytesToBase64Url(salt),
    iv: bytesToBase64Url(iv),
    ct: bytesToBase64Url(new Uint8Array(ct)),
  };
}

/** Decrypt a vault back to the hex seed. Throws on an incorrect password. */
export async function decryptSeed(
  vault: Vault,
  password: string,
): Promise<string> {
  const key = await deriveAesKey(password, base64UrlToBytes(vault.salt));
  try {
    const pt = await subtle.decrypt(
      { name: "AES-GCM", iv: base64UrlToBytes(vault.iv) as BufferSource },
      key,
      base64UrlToBytes(vault.ct) as BufferSource,
    );
    return bytesToHex(new Uint8Array(pt));
  } catch {
    throw new Error("Incorrect password.");
  }
}
