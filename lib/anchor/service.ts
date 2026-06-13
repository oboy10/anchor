import { randomBytes } from "node:crypto";
import { anchorProtocolAdapter } from "./protocol-adapter";
import {
  createAttestationRequest as repoCreateAttestationRequest,
  getAttestationRequest,
  getIdentity,
  getPublicAnchorContext,
  listAttestationRequests,
  listIdentities,
  listIssuedMessages,
  resetAnchorRepository,
  saveIssuedMessage,
  seedAnchorContext,
  updateAttestationRequest,
  upsertIdentity,
} from "./repository";
import {
  anchorDemoContext,
  anchorDemoIdentities,
  anchorDemoIssuanceIntents,
  anchorDemoRegistration,
  anchorDemoRequests,
} from "./demo";
import type {
  AnchorIdentity,
  AnchorPayloadEntry,
  AnchorPresentationBundle,
  AnchorProtocolAdapter,
  AttestationRequestCreate,
  AttestationRequestView,
  DemoSeedDescriptor,
  IdentityRegistrationRequest,
  IdentityRegistrationResponse,
  IssuanceIntent,
  IssuedMessageView,
  PresentationPrepareRequest,
  PresentationPrepareResponse,
  PresentationVerifyRequest,
  PresentationVerifyResponse,
  PublicAnchorContext,
} from "./types";

function id(prefix: string): string {
  return `${prefix}_${randomBytes(8).toString("base64url")}`;
}

function now(): string {
  return new Date().toISOString();
}

function requireIdentity(fingerprint: string): AnchorIdentity {
  const entry = getIdentity(fingerprint);
  if (!entry) throw new Error(`Unknown Anchor identity: ${fingerprint}`);
  return {
    alg: "Ed25519",
    fingerprint: entry.fingerprint,
    publicKey: entry.publicKey,
    entityType: entry.entityType,
    displayName: entry.displayLabel,
    services: entry.services,
  };
}

function ensurePayloadHasType(payload: AnchorPayloadEntry[], type: string) {
  const existing = payload.find((entry) => entry.k === "a:type");
  if (existing && existing.v !== type) {
    throw new Error("Payload a:type does not match issuance intent type.");
  }
}

export async function registerAnchorIdentity(
  input: IdentityRegistrationRequest,
  adapter: AnchorProtocolAdapter = anchorProtocolAdapter,
): Promise<IdentityRegistrationResponse> {
  const validation = await adapter.registerPublicIdentity(input.identity);
  if (!validation.valid || !validation.normalized) {
    throw new Error(validation.errors.join(" "));
  }

  const existing = getIdentity(validation.normalized.fingerprint);
  if (existing && existing.publicKey !== validation.normalized.publicKey) {
    throw new Error("Fingerprint already belongs to a different public key.");
  }

  const timestamp = now();
  const { entry, created } = upsertIdentity({
    fingerprint: validation.normalized.fingerprint,
    publicKey: validation.normalized.publicKey,
    entityType: validation.normalized.entityType,
    displayLabel: input.displayLabel ?? validation.normalized.displayName,
    services: validation.normalized.services ?? [],
    organization: input.organization,
    createdAt: existing?.createdAt ?? timestamp,
    updatedAt: timestamp,
  });

  return { identity: entry, created };
}

export function lookupAnchorIdentity(fingerprint: string) {
  return getIdentity(fingerprint);
}

export function listAnchorIdentities(filter?: { issuersOnly?: boolean }) {
  const identities = listIdentities();
  return filter?.issuersOnly
    ? identities.filter((identity) => identity.entityType !== "person")
    : identities;
}

export function createAnchorAttestationRequest(
  input: AttestationRequestCreate,
): AttestationRequestView {
  if (!getIdentity(input.subjectFingerprint)) {
    throw new Error("Subject identity must be registered before requesting attestations.");
  }
  if (input.issuerFingerprint && !getIdentity(input.issuerFingerprint)) {
    throw new Error("Issuer identity must be registered before requesting attestations.");
  }
  if (!input.issuerFingerprint && !input.externalContact) {
    throw new Error("Attestation request requires an issuer fingerprint or external contact.");
  }
  if (input.requestedFields.length === 0) {
    throw new Error("Attestation request must include at least one requested field.");
  }

  const timestamp = now();
  return repoCreateAttestationRequest({
    ...input,
    id: id("ar"),
    status: "pending",
    createdAt: timestamp,
    updatedAt: timestamp,
  });
}

export function getAnchorAttestationRequest(id: string) {
  return getAttestationRequest(id);
}

export function listAnchorAttestationRequests(filter?: {
  subjectFingerprint?: string;
  issuerFingerprint?: string;
}) {
  return listAttestationRequests(filter);
}

export function updateAnchorAttestationRequestStatus(
  requestId: string,
  status: AttestationRequestView["status"],
): AttestationRequestView {
  const updated = updateAttestationRequest(requestId, { status });
  if (!updated) throw new Error("Attestation request not found.");
  return updated;
}

export async function issueAnchorMessage(
  input: IssuanceIntent,
  adapter: AnchorProtocolAdapter = anchorProtocolAdapter,
): Promise<IssuedMessageView> {
  const issuer = requireIdentity(input.issuerFingerprint);
  const subject = requireIdentity(input.subjectFingerprint);
  if (input.requestId) {
    const request = getAttestationRequest(input.requestId);
    if (!request) throw new Error("Attestation request not found.");
    if (request.subjectFingerprint !== input.subjectFingerprint) {
      throw new Error("Issuance subject does not match the request subject.");
    }
    if (request.issuerFingerprint && request.issuerFingerprint !== input.issuerFingerprint) {
      throw new Error("Issuance issuer does not match the request issuer.");
    }
  }

  ensurePayloadHasType(input.payload, input.type);
  const signedMessage = await adapter.signTypedMessage({
    issuer,
    subject,
    type: input.type,
    payload: input.payload,
    previousMessageFp: input.previousMessageFp,
  });

  const view = saveIssuedMessage({
    id: id("im"),
    messageFingerprint: signedMessage.fp,
    issuerFingerprint: input.issuerFingerprint,
    subjectFingerprint: input.subjectFingerprint,
    type: input.type,
    requestId: input.requestId,
    demoConsented: input.persistDemoCopy === true,
    signedMessage: input.persistDemoCopy ? signedMessage : undefined,
    createdAt: now(),
  });

  if (input.requestId) {
    updateAttestationRequest(input.requestId, {
      status: "fulfilled",
      issuedMessageFingerprint: signedMessage.fp,
    });
  }

  return { ...view, signedMessage };
}

export function listDemoConsentedMessages() {
  return listIssuedMessages().filter((message) => message.demoConsented);
}

export function prepareAnchorPresentation(
  input: PresentationPrepareRequest,
): PresentationPrepareResponse {
  const subject = requireIdentity(input.subjectFingerprint);
  const bundle: AnchorPresentationBundle = {
    v: 1,
    purpose: input.purpose,
    disclosedAt: now(),
    subject: {
      fingerprint: subject.fingerprint,
      publicKey: subject.publicKey,
    },
    messages: input.messages,
    relatedKeys: input.relatedKeys,
    note: input.note,
  };
  return { bundle };
}

export async function verifyAnchorPresentation(
  input: PresentationVerifyRequest,
  adapter: AnchorProtocolAdapter = anchorProtocolAdapter,
): Promise<PresentationVerifyResponse> {
  const context = getPublicAnchorContext();
  const verification = await adapter.verifyPresentationBundle(input.bundle);
  const trustSummary = await adapter.computeTrustSummary(input.bundle, context);
  return {
    valid: verification.valid,
    checks: verification.checks,
    signerChainStates: verification.signerChainStates,
    trustSummary,
    notableAttestations: input.bundle.messages
      .map((message) => message.body.payload.find((entry) => entry.k === "a:msg")?.v)
      .filter((value): value is string => typeof value === "string"),
    flags: verification.flags,
    parsedMessageViews: input.bundle.messages.map((message) => ({
      fp: message.fp,
      type: message.body.payload.find((entry) => entry.k === "a:type")?.v as
        | PresentationVerifyResponse["parsedMessageViews"][number]["type"]
        | undefined,
      from: message.body.from,
      to: message.body.to,
      issuedAt: message.body.payload.find((entry) => entry.k === "a:ts")?.v as
        | string
        | undefined,
      labels: message.body.payload
        .filter((entry) => entry.k !== "a:type" && entry.k !== "a:ts")
        .slice(0, 4)
        .map((entry) => `${entry.k}: ${String(entry.v)}`),
    })),
  };
}

export function getAnchorPublicContext(): PublicAnchorContext {
  return getPublicAnchorContext();
}

export async function seedAnchorDemo(
  adapter: AnchorProtocolAdapter = anchorProtocolAdapter,
): Promise<DemoSeedDescriptor> {
  resetAnchorRepository();
  seedAnchorContext(anchorDemoContext);

  for (const registration of anchorDemoRegistration) {
    await registerAnchorIdentity(registration, adapter);
  }

  const requests = anchorDemoRequests.map((request) =>
    createAnchorAttestationRequest(request),
  );

  const issued: IssuedMessageView[] = [];
  for (const intent of anchorDemoIssuanceIntents) {
    const matchingRequest = requests.find(
      (request) =>
        request.subjectFingerprint === intent.subjectFingerprint &&
        request.issuerFingerprint === intent.issuerFingerprint &&
        request.requestedType === intent.type,
    );
    issued.push(
      await issueAnchorMessage(
        {
          ...intent,
          requestId: matchingRequest?.id,
          previousMessageFp: issued.at(-1)?.messageFingerprint,
        },
        adapter,
      ),
    );
  }

  const messages = issued
    .map((message) => message.signedMessage)
    .filter((message): message is NonNullable<typeof message> => !!message);
  const { bundle } = prepareAnchorPresentation({
    purpose: "housing_application",
    subjectFingerprint: anchorDemoIdentities.subject.fingerprint,
    messages,
    relatedKeys: [
      anchorDemoIdentities.formerLandlord,
      anchorDemoIdentities.nonprofit,
      anchorDemoIdentities.caseworker,
      anchorDemoIdentities.housingProgram,
    ],
    note: "Demo bundle: strong Anchor evidence despite limited traditional paperwork.",
  });

  return {
    subjectFingerprint: anchorDemoIdentities.subject.fingerprint,
    verifierFingerprint: anchorDemoIdentities.verifier.fingerprint,
    issuerFingerprints: [
      anchorDemoIdentities.formerLandlord.fingerprint,
      anchorDemoIdentities.nonprofit.fingerprint,
      anchorDemoIdentities.caseworker.fingerprint,
      anchorDemoIdentities.housingProgram.fingerprint,
    ],
    requestIds: requests.map((request) => request.id),
    issuedMessageFingerprints: issued.map((message) => message.messageFingerprint),
    presentationBundle: bundle,
  };
}
