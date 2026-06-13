import type {
  AnchorEntityType,
  AnchorIdentity,
  AnchorMessageType,
  AnchorPayloadEntry,
  AnchorPresentationBundle,
  AnchorServiceEndpoint,
  AnchorSignedMessage,
  AnchorValue,
  MetricSummary,
  SignerChainStatus,
  TrustSummary,
} from "@/lib/anchor/protocol";

export type {
  AnchorEntityType,
  AnchorIdentity,
  AnchorMessageType,
  AnchorPayloadEntry,
  AnchorPresentationBundle,
  AnchorServiceEndpoint,
  AnchorSignedMessage,
  AnchorValue,
  MetricSummary,
};

export type AnchorPurpose = AnchorPresentationBundle["purpose"];
export type AnchorRequestStatus = "pending" | "fulfilled" | "rejected" | "expired";
export type AnchorChainState = SignerChainStatus;
export type AnchorMetricName = keyof TrustSummary["metrics"];
export type TrustSummaryView = TrustSummary;

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
  deliveryMethod?: "email" | "sms" | "none";
  recipientEmail?: string;
  recipientPhone?: string;
}

export interface AttestationRequestView
  extends Omit<
    AttestationRequestCreate,
    "deliveryMethod" | "recipientEmail" | "recipientPhone"
  > {
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
  payload?: AnchorPayloadEntry[];
  signedMessage?: AnchorSignedMessage;
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
  cachedChainHeads: { signerFingerprint: string; messageFingerprint: string }[];
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
    signerPrivateKey?: string;
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
