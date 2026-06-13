import { createCipheriv, createDecipheriv, randomBytes, scrypt as nodeScrypt } from "node:crypto";
import { base64UrlDecode, base64UrlEncode } from "./encoding";
import type { WalletEnvelope, WalletPlaintext } from "./types";

const KDF = {
  cost: 16384,
  blockSize: 8,
  parallelization: 1,
  keyBytes: 32,
} as const;

export async function encryptWalletEnvelope(
  plaintextWallet: WalletPlaintext,
  passphrase: string,
  now = new Date(),
): Promise<WalletEnvelope> {
  assertPassphrase(passphrase);
  const salt = randomBytes(16);
  const nonce = randomBytes(12);
  const key = await deriveKey(passphrase, salt);
  const cipher = createCipheriv("aes-256-gcm", key, nonce);
  const plaintext = Buffer.from(JSON.stringify(plaintextWallet), "utf8");
  const ciphertext = Buffer.concat([cipher.update(plaintext), cipher.final()]);
  const tag = cipher.getAuthTag();
  const timestamp = now.toISOString();

  return {
    v: 1,
    alg: "scrypt+aes-256-gcm",
    kdf: {
      name: "scrypt",
      salt: base64UrlEncode(salt),
      keyBytes: KDF.keyBytes,
      cost: KDF.cost,
      blockSize: KDF.blockSize,
      parallelization: KDF.parallelization,
    },
    nonce: base64UrlEncode(nonce),
    tag: base64UrlEncode(tag),
    ciphertext: base64UrlEncode(ciphertext),
    createdAt: timestamp,
    updatedAt: timestamp,
  };
}

export async function decryptWalletEnvelope(
  envelope: WalletEnvelope,
  passphrase: string,
): Promise<WalletPlaintext> {
  assertPassphrase(passphrase);
  if (envelope.v !== 1 || envelope.alg !== "scrypt+aes-256-gcm") {
    throw new Error("Unsupported wallet envelope");
  }
  const key = await deriveKey(passphrase, base64UrlDecode(envelope.kdf.salt, 16), envelope.kdf);
  const decipher = createDecipheriv("aes-256-gcm", key, base64UrlDecode(envelope.nonce, 12));
  decipher.setAuthTag(base64UrlDecode(envelope.tag, 16));
  const plaintext = Buffer.concat([
    decipher.update(base64UrlDecode(envelope.ciphertext)),
    decipher.final(),
  ]);
  return JSON.parse(plaintext.toString("utf8")) as WalletPlaintext;
}

export async function rekeyWalletEnvelope(
  envelope: WalletEnvelope,
  oldPassphrase: string,
  newPassphrase: string,
): Promise<WalletEnvelope> {
  const plaintext = await decryptWalletEnvelope(envelope, oldPassphrase);
  const next = await encryptWalletEnvelope(plaintext, newPassphrase);
  return { ...next, createdAt: envelope.createdAt };
}

async function deriveKey(
  passphrase: string,
  salt: Buffer,
  params: {
    cost: number;
    blockSize: number;
    parallelization: number;
    keyBytes: number;
  } = KDF,
): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    nodeScrypt(
      passphrase,
      salt,
      params.keyBytes,
      {
        N: params.cost,
        r: params.blockSize,
        p: params.parallelization,
      },
      (error, key) => {
        if (error) reject(error);
        else resolve(Buffer.from(key));
      },
    );
  });
}

function assertPassphrase(passphrase: string): void {
  if (typeof passphrase !== "string" || passphrase.length < 8) {
    throw new Error("Wallet passphrase must be at least 8 characters");
  }
}
