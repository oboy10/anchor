import "server-only";

/**
 * The Anchor verifier wallet.
 *
 * After a successful out-of-band check (email/phone confirmation code), the
 * server issues a signed identity attestation from this wallet to the user,
 * enshrining the verified attribute as `a.id:*` properties (see spec.md §4).
 *
 * The private seed comes from ANCHOR_VERIFIER_PRIVATE_KEY (32-byte hex). When
 * unset, a deterministic demo wallet is derived so local dev works out of the
 * box. Never commit a production seed.
 */
import { hexToBytes } from "@/lib/crypto/bytes";
import { signAttestation } from "@/lib/crypto/attestation";
import { userFromPrivateSeed, userFromSeed } from "@/lib/crypto/user";
import type { Attestation, Fingerprint, PublicKeyHex, User } from "@/types";

let cached: User | undefined;

export async function getVerifier(): Promise<User> {
  if (cached) return cached;
  const raw = process.env.ANCHOR_VERIFIER_PRIVATE_KEY?.trim();
  cached =
    raw && /^[0-9a-f]{64}$/i.test(raw)
      ? await userFromPrivateSeed(hexToBytes(raw.toLowerCase()))
      : await userFromSeed("anchor-verifier");
  return cached;
}

export interface IdentityVouch {
  attestation: Attestation;
  verifier: { fingerprint: Fingerprint; publicKey: PublicKeyHex };
}

/**
 * Sign an identity vouch attesting that `subject` controls a verified contact.
 * Follows spec.md: `a.id:email` (official) / `a.id:phone` (extension), plus the
 * general `a:msg` and `a:ts` properties.
 */
export async function issueIdentityVouch(
  subject: Fingerprint,
  attrs: { email?: string; phone?: string },
): Promise<IdentityVouch> {
  const verifier = await getVerifier();
  const properties: { key: string; value: string }[] = [];
  if (attrs.email) properties.push({ key: "a.id:email", value: attrs.email });
  if (attrs.phone) properties.push({ key: "a.id:phone", value: attrs.phone });
  properties.push({
    key: "a:msg",
    value: "Contact verified by Anchor",
  });
  properties.push({ key: "a:ts", value: new Date().toISOString() });

  const attestation = await signAttestation(
    { fingerprint: verifier.fingerprint, privateKey: verifier.privateKey },
    subject,
    properties,
  );
  return {
    attestation,
    verifier: {
      fingerprint: verifier.fingerprint,
      publicKey: verifier.publicKey,
    },
  };
}
