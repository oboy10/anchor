/**
 * Core cryptographic primitives for Anchor.
 *
 * Identity is an Ed25519 keypair. Attestations are signed directed edges
 * between user fingerprints. No central registry is required.
 */

/** 32-byte Ed25519 public key, hex-encoded (64 chars). */
export type PublicKeyHex = string;

/** 32-byte Ed25519 private key seed, hex-encoded. Server-side only. */
export type PrivateKeyHex = string;

/**
 * Short stable identifier: SHA-512(public_key)[0:8] → 16 hex chars.
 * Convenience reference only — full public keys must be used for verification.
 */
export type Fingerprint = string;

/** A user is defined entirely by their Ed25519 keypair. */
export interface User {
  fingerprint: Fingerprint;
  publicKey: PublicKeyHex;
  /** Present server-side only; never sent to the client. */
  privateKey?: PrivateKeyHex;
}

/** Arbitrary metadata on an attestation. Duplicate keys are allowed. */
export interface AttestationProperty {
  key: string;
  value: string;
}

/**
 * An attestation is a signed, directed edge from one user to another.
 * Signature covers the canonical message body (everything except signature).
 */
export interface Attestation {
  from: Fingerprint;
  to: Fingerprint;
  properties: AttestationProperty[];
  /** 16 random bytes, hex-encoded (32 chars). Prevents duplicate messages. */
  nonce: string;
  /** Ed25519 signature, 64 bytes hex-encoded (128 chars). */
  signature: string;
}

/** Message body signed by the issuer. Signature field is excluded. */
export interface AttestationBody {
  from: Fingerprint;
  to: Fingerprint;
  properties: AttestationProperty[];
  nonce: string;
}

/** Result of verifying a set of attestations for one resident. */
export interface AttestationVerificationResult {
  /** All attestations have valid signatures from known issuers. */
  signaturesValid: boolean;
  /** Every attestation targets the expected resident fingerprint. */
  targetsValid: boolean;
  entriesChecked: number;
  entries: {
    /** Stable id extracted from properties, or nonce prefix. */
    id: string;
    signatureValid: boolean;
    targetValid: boolean;
    from: Fingerprint;
  }[];
  brokenAt?: string;
}

/** Well-known property keys used to encode Anchor credentials. */
export const PROP = {
  CREDENTIAL_ID: "credentialId",
  TYPE: "type",
  TITLE: "title",
  SUMMARY: "summary",
  ISSUE_DATE: "issueDate",
  ISSUER_NAME: "issuerName",
  ISSUER_TYPE: "issuerType",
  METRIC: "metric",
  PERIOD_START: "periodStart",
  PERIOD_END: "periodEnd",
  FACT: "fact",
  CORRECTS: "corrects",
  STATUS: "status",
} as const;
