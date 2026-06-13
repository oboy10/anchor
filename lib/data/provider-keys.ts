/**
 * Provider Ed25519 private keys for server-side attestation signing.
 * Never store private keys in Firestore — load from env or demo seed only.
 */
import "server-only";
import { DEMO_KEYS } from "@/lib/demo/seed";
import type { Fingerprint, PrivateKeyHex } from "@/types/primitives";

let cache: Map<Fingerprint, PrivateKeyHex> | null = null;

function loadFromEnv(): Map<Fingerprint, PrivateKeyHex> {
  const map = new Map<Fingerprint, PrivateKeyHex>();
  const raw =
    process.env.ANCHOR_PROVIDER_KEYS ?? process.env.TRUSTWALLET_PROVIDER_KEYS;
  if (raw) {
    try {
      const parsed = JSON.parse(raw) as Record<string, string>;
      for (const [fp, key] of Object.entries(parsed)) {
        map.set(fp, key as PrivateKeyHex);
      }
    } catch {
      console.warn("ANCHOR_PROVIDER_KEYS is not valid JSON");
    }
  }
  return map;
}

function loadFromDemoKeys(): Map<Fingerprint, PrivateKeyHex> {
  const map = new Map<Fingerprint, PrivateKeyHex>();
  for (const material of Object.values(DEMO_KEYS)) {
    map.set(material.fingerprint, material.privateKey as PrivateKeyHex);
  }
  return map;
}

export function getProviderPrivateKeys(): Map<Fingerprint, PrivateKeyHex> {
  if (!cache) {
    cache = loadFromEnv();
    if (cache.size === 0) cache = loadFromDemoKeys();
  }
  return cache;
}

export function getProviderPrivateKey(
  fingerprint: Fingerprint,
): PrivateKeyHex | undefined {
  return getProviderPrivateKeys().get(fingerprint);
}

export function getIssuerUser(fingerprint: Fingerprint) {
  const privateKey = getProviderPrivateKey(fingerprint);
  if (!privateKey) return undefined;
  for (const material of Object.values(DEMO_KEYS)) {
    if (material.fingerprint === fingerprint) {
      return {
        fingerprint,
        publicKey: material.publicKey,
        privateKey,
      };
    }
  }
  return { fingerprint, publicKey: "", privateKey };
}
