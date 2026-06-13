import { verifyMessage } from "./message";
import { messageType, payloadString } from "./payload";
import { validateIdentity } from "./identity";
import { indexMessagesBySigner, verifySignerChain } from "./chain";
import { resolveActiveMessages } from "./resolution";
import { computeTrustSummary } from "./trust-summary";
import type {
  AnchorIdentity,
  AnchorPresentationBundle,
  AnchorProtocolContext,
  AnchorSignedMessage,
  ParsedMessageView,
  PresentationVerificationResult,
  VerificationCheck,
} from "./types";

export function verifyPresentationBundle(
  bundle: AnchorPresentationBundle,
  context: AnchorProtocolContext = {},
): PresentationVerificationResult {
  const relatedSubject: AnchorIdentity = {
    alg: "Ed25519",
    publicKey: bundle.subject.publicKey,
    fingerprint: bundle.subject.fingerprint,
    entityType: "person",
  };
  const subjectOk = validateIdentity(relatedSubject);
  const checks: VerificationCheck[] = [
    {
      name: "subject_identity_valid",
      ok: subjectOk,
      severity: subjectOk ? "info" : "error",
      message: subjectOk
        ? "Subject fingerprint matches subject public key"
        : "Subject fingerprint does not match subject public key",
    },
  ];

  const messageResults = bundle.messages.map((message) => ({
    message,
    result: verifyMessage(message),
  }));
  for (const result of messageResults) checks.push(...result.result.checks);

  const bySigner = indexMessagesBySigner(bundle.messages);
  const signerChainStates = [...bySigner.values()].map((messages) =>
    verifySignerChain(messages, {
      partialContext: context.partialContext,
      skipSignatureVerification: true,
    }),
  );

  const resolution = resolveActiveMessages(bundle.messages);
  const parsedMessageViews = bundle.messages.map((message) =>
    parseMessageView(message, resolution.revoked.has(message.fp), resolution.disputed.has(message.fp)),
  );
  const flags = [
    ...resolution.warnings,
    ...signerChainStates.flatMap((state) =>
      ["forked", "cyclic", "tampered", "orphaned"].includes(state.status) ? state.flags : [],
    ),
    ...messageResults
      .filter(({ result }) => !result.valid)
      .map(({ message }) => `Message ${message.fp} failed verification`),
  ];

  const enrichedContext = {
    ...context,
    identities: [...(context.identities ?? []), ...(bundle.relatedKeys ?? [])],
  };
  const trustSummary = computeTrustSummary({
    messages: bundle.messages,
    activeMessages: resolution.activeMessages,
    disputed: resolution.disputed,
    revoked: resolution.revoked,
    chainStates: signerChainStates,
    subjectFingerprint: bundle.subject.fingerprint,
    context: enrichedContext,
  });

  return {
    valid:
      subjectOk &&
      messageResults.every(({ result }) => result.valid) &&
      !signerChainStates.some((state) => ["forked", "cyclic", "tampered"].includes(state.status)),
    checks,
    signerChainStates,
    trustSummary,
    notableAttestations: parsedMessageViews.filter(
      (view) => !view.revoked && ["identity", "reference", "rent_history", "payment_history", "outcome"].includes(view.type ?? ""),
    ),
    flags,
    parsedMessageViews,
  };
}

function parseMessageView(
  message: AnchorSignedMessage,
  revoked: boolean,
  disputed: boolean,
): ParsedMessageView {
  return {
    fp: message.fp,
    type: messageType(message.body.payload),
    from: message.body.from,
    to: message.body.to,
    timestamp: payloadString(message.body.payload, "a:ts"),
    payload: message.body.payload,
    revoked,
    disputed,
    flags: [
      ...(revoked ? ["Message has been revoked"] : []),
      ...(disputed ? ["Message has an unresolved dispute"] : []),
    ],
  };
}
