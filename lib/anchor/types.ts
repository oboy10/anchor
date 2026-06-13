export type AnchorEntityType = "person" | "org" | "service";
export type AnchorPurpose = "housing_application" | "support_verification" | "demo";
export type AnchorMessageType =
  | "identity"
  | "reference"
  | "rent_history"
  | "payment_history"
  | "organization_support"
  | "outcome"
  | "revocation"
  | "dispute";
export type AnchorRequestStatus = "pending" | "fulfilled" | "rejected" | "expired";
export type AnchorChainState =
  | "standalone"
  | "healthy"
  | "partial"
  | "orphaned"
  | "forked"
  | "cyclic"
  | "tampered";
export type AnchorMetricName =
  | "identityAssurance"
  | "evidenceStrength"
  | "housingReliability"
  | "referenceStrength"
  | "recommenderCredibility"
  | "chainIntegrity"
  | "freshnessAndStanding";

export type AnchorValue =
  | string
  | boolean
  | null
  | number
  | AnchorValue[]
  | { [key: string]: AnchorValue };

export interface AnchorServiceEndpoint {
  type: "resolver" | "website" | "email" | "phone" | "other";
  value: string;
  verifierConfirmed?: boolean;
}

export interface AnchorIdentity {
  alg: "Ed25519";
  publicKey: string;
  fingerprint: string;
  entityType: AnchorEntityType;
  displayName?: string;
  services?: AnchorServiceEndpoint[];
}

export interface AnchorPayloadEntry {
  k: string;
  v: AnchorValue;
}

export interface AnchorMessageBody {
  v: 1;
  from: string;
  to: string;
  nonce: string;
  payload: AnchorPayloadEntry[];
}

export interface AnchorSignedMessage {
  body: AnchorMessageBody;
  fp: string;
  sig: string;
  signerPk: string;
}

export interface AnchorPresentationBundle {
  v: 1;
  purpose: AnchorPurpose;
  disclosedAt: string;
  subject: {
    fingerprint: string;
    publicKey: string;
  };
  messages: AnchorSignedMessage[];
  relatedKeys?: AnchorIdentity[];
  note?: string;
}

export interface MetricSummary {
  score: number;
  band: "low" | "developing" | "solid" | "strong";
  reasons: string[];
  flags: string[];
}

export type TrustSummaryView = {
  metrics: Record<AnchorMetricName, MetricSummary>;
};

export interface IdentityRegistrationRequest {
  identity: AnchorIdentity;
  displayLabel?: string;
  organization?: {
    legalName?: string;
    relationship?: string;
    verified?: boolean;
  };
}

export interface IdentityRegistrationResponse {
  identity: IssuerDirectoryEntry;
  created: boolean;
}

export interface IssuerDirectoryEntry {
  fingerprint: string;
  publicKey: string;
  entityType: AnchorEntityType;
  displayLabel?: string;
  services: AnchorServiceEndpoint[];
  organization?: {
    legalName?: string;
    relationship?: string;
    verified?: boolean;
  };
  createdAt: string;
  updatedAt: string;
}

export interface AttestationRequestCreate {
  subjectFingerprint: string;
  issuerFingerprint?: string;
  externalContact?: AnchorServiceEndpoint;
  requestedType: AnchorMessageType;
  requestedFields: string[];
  note?: string;
}

export interface AttestationRequestView extends AttestationRequestCreate {
  id: string;
  status: AnchorRequestStatus;
  linkedPresentationId?: string;
  issuedMessageFingerprint?: string;
  createdAt: string;
  updatedAt: string;
}

export interface AttestationRequestList {
  requests: AttestationRequestView[];
}

export interface IssuedMessageView {
  id: string;
  messageFingerprint: string;
  issuerFingerprint: string;
  subjectFingerprint: string;
  type: AnchorMessageType;
  requestId?: string;
  demoConsented: boolean;
  signedMessage?: AnchorSignedMessage;
  createdAt: string;
}

export interface IssuanceIntent {
  requestId?: string;
  issuerFingerprint: string;
  subjectFingerprint: string;
  type: AnchorMessageType;
  payload: AnchorPayloadEntry[];
  previousMessageFp?: string;
  persistDemoCopy?: boolean;
}

export interface PresentationPrepareRequest {
  purpose: AnchorPurpose;
  subjectFingerprint: string;
  messages: AnchorSignedMessage[];
  relatedKeys?: AnchorIdentity[];
  note?: string;
}

export interface PresentationPrepareResponse {
  bundle: AnchorPresentationBundle;
}

export interface PresentationVerifyRequest {
  bundle: AnchorPresentationBundle;
}

export interface ParsedMessageView {
  fp: string;
  type?: AnchorMessageType;
  from: string;
  to: string;
  issuedAt?: string;
  labels: string[];
}

export interface PresentationVerifyResponse {
  valid: boolean;
  checks: { name: string; ok: boolean; detail?: string }[];
  signerChainStates: Record<string, AnchorChainState>;
  trustSummary: TrustSummaryView;
  notableAttestations: string[];
  flags: string[];
  parsedMessageViews: ParsedMessageView[];
}

export interface PublicAnchorContext {
  issuers: IssuerDirectoryEntry[];
  identities: IssuerDirectoryEntry[];
  organizationRelationships: {
    sourceFingerprint: string;
    targetFingerprint: string;
    relationship: string;
  }[];
  cachedChainHeads: { signerFingerprint: string; messageFingerprint: string }[];
  demoOutcomes: {
    id: string;
    relatedFingerprint: string;
    kind: string;
    result: string;
    effectiveAt: string;
  }[];
}

export interface DemoSeedDescriptor {
  subjectFingerprint: string;
  verifierFingerprint: string;
  issuerFingerprints: string[];
  requestIds: string[];
  issuedMessageFingerprints: string[];
  presentationBundle: AnchorPresentationBundle;
}

export interface ProtocolValidationResult {
  valid: boolean;
  normalized?: AnchorIdentity;
  errors: string[];
}

export interface ProtocolVerificationResult {
  valid: boolean;
  checks: { name: string; ok: boolean; detail?: string }[];
  signerChainStates: Record<string, AnchorChainState>;
  flags: string[];
}

export interface AnchorProtocolAdapter {
  validateIdentity(identityLike: unknown): Promise<ProtocolValidationResult>;
  registerPublicIdentity(identityLike: unknown): Promise<ProtocolValidationResult>;
  signTypedMessage(input: {
    issuer: AnchorIdentity;
    subject: AnchorIdentity;
    type: AnchorMessageType;
    payload: AnchorPayloadEntry[];
    previousMessageFp?: string;
  }): Promise<AnchorSignedMessage>;
  verifySignedMessage(input: AnchorSignedMessage): Promise<ProtocolVerificationResult>;
  verifyPresentationBundle(
    bundle: AnchorPresentationBundle,
  ): Promise<ProtocolVerificationResult>;
  computeTrustSummary(
    bundle: AnchorPresentationBundle,
    context: PublicAnchorContext,
  ): Promise<TrustSummaryView>;
}
