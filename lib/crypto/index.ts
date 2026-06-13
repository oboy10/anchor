/**
 * TrustWallet cryptographic exports.
 * Server-only — uses Node Ed25519.
 */
import "server-only";

export { canonicalize } from "./canonical";
export {
  clampEd25519Seed,
  fingerprintFromPublicKey,
  fingerprintFromPublicKeyHex,
  rawPrivateKeyToNode,
  rawPublicKeyToNode,
  shortHex,
  userFromPrivateSeed,
  userFromSeed,
} from "./user";
export {
  attestationBody,
  attestationId,
  buildCredentialProperties,
  canonicalAttestationBody,
  generateNonce,
  getAllProperties,
  getProperty,
  signAttestation,
  verifyAttestation,
  verifyAttestations,
} from "./attestation";

// Legacy alias used in admin UI for truncated hex display.
export { shortHex as fingerprint } from "./user";
