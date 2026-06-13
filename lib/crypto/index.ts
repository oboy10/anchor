/**
 * Anchor cryptographic exports.
 * Cross-platform — WebCrypto Ed25519, runs in browser and on the server.
 */

export { canonicalize } from "./canonical";
export {
  base64UrlToBytes,
  bytesToHex,
  concatBytes,
  hexToBytes,
  randomBytes,
  subtle,
  utf8ToBytes,
} from "./bytes";
export {
  clampEd25519Seed,
  fingerprintFromPublicKey,
  fingerprintFromPublicKeyHex,
  importPrivateKey,
  importPublicKey,
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
