export type Base64Url = string;
export type Fingerprint = string;

export type AnchorEntityType = "person" | "org" | "service";

export interface AnchorIdentity {
  alg: "Ed25519";
  publicKey: Base64Url;
  fingerprint: Fingerprint;
  entityType: AnchorEntityType;
  displayName?: string;
  services?: AnchorServiceEndpoint[];
}

export interface AnchorServiceEndpoint {
  type: string;
  url: string;
  verified?: boolean;
}

export type AnchorPrimitiveValue = string | boolean | null | number;
export type AnchorValue =
  | AnchorPrimitiveValue
  | AnchorValue[]
  | { [key: string]: AnchorValue };

export interface AnchorPayloadEntry {
  k: string;
  v: AnchorValue;
}

export interface AnchorMessageBody {
  v: 1;
  from: Fingerprint;
  to: Fingerprint;
  nonce: Base64Url;
  payload: AnchorPayloadEntry[];
}

export interface AnchorSignedMessage {
  body: AnchorMessageBody;
  fp: Fingerprint;
  sig: Base64Url;
  signerPk: Base64Url;
}

export type AnchorMessageType =
  | "identity"
  | "reference"
  | "rent_history"
  | "payment_history"
  | "organization_support"
  | "outcome"
  | "revocation"
  | "dispute";

export interface AnchorPresentationBundle {
  v: 1;
  purpose: "housing_application" | "support_verification" | "demo";
  disclosedAt: string;
  subject: {
    fingerprint: Fingerprint;
    publicKey: Base64Url;
  };
  messages: AnchorSignedMessage[];
  relatedKeys?: AnchorIdentity[];
  note?: string;
}

export type VerificationCheckName =
  | "signer_public_key_decodes"
  | "signer_fingerprint_matches"
  | "canonical_body_valid"
  | "message_fingerprint_matches"
  | "signature_valid"
  | "schema_valid"
  | "subject_identity_valid";

export interface VerificationCheck {
  name: VerificationCheckName | string;
  ok: boolean;
  severity: "info" | "warning" | "error";
  message: string;
}

export type SignerChainStatus =
  | "standalone"
  | "healthy"
  | "partial"
  | "orphaned"
  | "forked"
  | "cyclic"
  | "tampered";

export interface SignerChainState {
  signer: Fingerprint;
  status: SignerChainStatus;
  messageCount: number;
  flags: string[];
  messageStates: {
    fp: Fingerprint;
    prev?: Fingerprint;
    status: SignerChainStatus;
  }[];
}

export interface MetricSummary {
  score: number;
  band: "low" | "developing" | "solid" | "strong";
  reasons: string[];
  flags: string[];
}

export interface TrustSummary {
  metrics: {
    identityAssurance: MetricSummary;
    evidenceStrength: MetricSummary;
    housingReliability: MetricSummary;
    referenceStrength: MetricSummary;
    recommenderCredibility: MetricSummary;
    chainIntegrity: MetricSummary;
    freshnessAndStanding: MetricSummary;
  };
}

export interface ParsedMessageView {
  fp: Fingerprint;
  type?: AnchorMessageType;
  from: Fingerprint;
  to: Fingerprint;
  timestamp?: string;
  payload: AnchorPayloadEntry[];
  revoked: boolean;
  disputed: boolean;
  flags: string[];
}

export interface PresentationVerificationResult {
  valid: boolean;
  checks: VerificationCheck[];
  signerChainStates: SignerChainState[];
  trustSummary: TrustSummary;
  notableAttestations: ParsedMessageView[];
  flags: string[];
  parsedMessageViews: ParsedMessageView[];
}

export interface TypedMessageInput {
  from: Fingerprint;
  to: Fingerprint;
  payload: AnchorPayloadEntry[];
  signerPrivateKey: Base64Url;
  nonce?: Base64Url;
  previous?: AnchorSignedMessage | Fingerprint | null;
}

export interface MessageVerificationResult {
  valid: boolean;
  checks: VerificationCheck[];
  canonical?: string;
}

export interface AnchorProtocolContext {
  identities?: AnchorIdentity[];
  verifierConfirmedServices?: Fingerprint[];
  partialContext?: boolean;
}

export interface WalletPlaintext {
  identities?: Array<AnchorIdentity & { privateKey?: Base64Url }>;
  messages?: AnchorSignedMessage[];
  presentationHistory?: AnchorPresentationBundle[];
  metadata?: Record<string, AnchorValue>;
}

export interface WalletEnvelope {
  v: 1;
  alg: "scrypt+aes-256-gcm";
  kdf: {
    name: "scrypt";
    salt: Base64Url;
    keyBytes: 32;
    cost: number;
    blockSize: number;
    parallelization: number;
  };
  nonce: Base64Url;
  tag: Base64Url;
  ciphertext: Base64Url;
  createdAt: string;
  updatedAt: string;
}
