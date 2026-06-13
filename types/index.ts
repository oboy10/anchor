import type { Attestation, Fingerprint } from "./primitives";

export type {
  Attestation,
  AttestationBody,
  AttestationProperty,
  AttestationVerificationResult,
  Fingerprint,
  PrivateKeyHex,
  PublicKeyHex,
  User,
} from "./primitives";
export { PROP } from "./primitives";

export type IssuerType =
  | "shelter"
  | "transitional_housing"
  | "landlord"
  | "employer"
  | "workforce_program"
  | "caseworker";

export type CredentialType =
  | "on_time_payment"
  | "housing_good_standing"
  | "landlord_reference"
  | "employer_reference"
  | "program_participation"
  | "job_training_completion"
  | "caseworker_endorsement";

export type CredentialStatus = "active" | "corrected" | "superseded";

/**
 * Resident profile layered on a User identity (Ed25519 fingerprint).
 * `slug` is a human-friendly URL alias; `fingerprint` is the canonical id.
 */
export interface Resident {
  fingerprint: Fingerprint;
  slug: string;
  displayName: string;
  preferredIntro?: string;
  pronouns?: string;
  recordSince: string;
  city?: string;
}

/** Provider profile layered on a User identity. */
export interface Provider {
  fingerprint: Fingerprint;
  slug: string;
  name: string;
  type: IssuerType;
  location?: string;
  contactEmail?: string;
  verified: boolean;
}

export interface CredentialEvidence {
  metric?: string;
  facts?: { label: string; value: string }[];
  periodStart?: string;
  periodEnd?: string;
}

/**
 * UI-facing credential view derived from a signed Attestation.
 * The attestation is the source of truth; this type denormalizes for display.
 */
export interface Credential {
  id: string;
  /** Resident fingerprint (attestation `to`). */
  residentFingerprint: Fingerprint;
  /** Issuer fingerprint (attestation `from`). */
  issuerFingerprint: Fingerprint;
  issuerName: string;
  issuerType: IssuerType;
  credentialType: CredentialType;
  issueDate: string;
  title: string;
  summary: string;
  evidence: CredentialEvidence;
  residentNote?: string;
  status: CredentialStatus;
  corrects?: string;
  /** Underlying signed attestation record. */
  attestation: Attestation;
}

export interface Endorsement {
  id: string;
  residentFingerprint: Fingerprint;
  fromFingerprint: Fingerprint;
  fromProviderName: string;
  message: string;
  date: string;
}

export interface CorrectionEntry {
  residentFingerprint: Fingerprint;
  corrects: string;
  reason: string;
  summary: string;
}

export interface SharePacket {
  token: string;
  residentFingerprint: Fingerprint;
  label: string;
  purpose: "housing" | "employment" | "services" | "other";
  includedCredentialIds: string[];
  sharedNoteCredentialIds: string[];
  createdAt: string;
  expiresAt: string;
  revokedAt?: string;
  intro?: string;
}

/** @deprecated Use AttestationVerificationResult — kept for UI compatibility. */
export interface VerificationResult {
  chainValid: boolean;
  signaturesValid: boolean;
  entriesChecked: number;
  entries: {
    id: string;
    hashValid: boolean;
    linkValid: boolean;
    signatureValid: boolean;
  }[];
  brokenAt?: string;
}

export const CREDENTIAL_TYPE_LABELS: Record<CredentialType, string> = {
  on_time_payment: "On-time payment",
  housing_good_standing: "Housing good standing",
  landlord_reference: "Landlord reference",
  employer_reference: "Employer reference",
  program_participation: "Program participation",
  job_training_completion: "Job training completion",
  caseworker_endorsement: "Caseworker endorsement",
};

export const ISSUER_TYPE_LABELS: Record<IssuerType, string> = {
  shelter: "Shelter",
  transitional_housing: "Transitional housing",
  landlord: "Landlord",
  employer: "Employer",
  workforce_program: "Workforce program",
  caseworker: "Caseworker",
};

export const PACKET_PURPOSE_LABELS: Record<SharePacket["purpose"], string> = {
  housing: "Housing application",
  employment: "Job application",
  services: "Services & support",
  other: "General",
};

export const REFERENCE_TYPES: CredentialType[] = [
  "landlord_reference",
  "caseworker_endorsement",
];

export const WORK_TYPES: CredentialType[] = [
  "employer_reference",
  "job_training_completion",
  "program_participation",
];

export const HOUSING_TYPES: CredentialType[] = [
  "on_time_payment",
  "housing_good_standing",
];
