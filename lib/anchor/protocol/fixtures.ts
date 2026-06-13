import { createHash } from "node:crypto";
import { generateIdentity } from "./identity";
import { signTypedMessage } from "./message";
import type { AnchorIdentity, AnchorPayloadEntry, AnchorPresentationBundle } from "./types";

export function deterministicSeed(label: string): Buffer {
  return createHash("sha512").update(`anchor-demo:v1:${label}`).digest().subarray(0, 32);
}

export function deterministicIdentity(
  label: string,
  entityType: AnchorIdentity["entityType"],
  displayName: string,
) {
  return generateIdentity({
    entityType,
    displayName,
    seed: deterministicSeed(label),
  });
}

export function createDemoPresentationBundle(): AnchorPresentationBundle {
  const subject = deterministicIdentity("subject:maya", "person", "Maya Resident");
  const landlord = deterministicIdentity("issuer:landlord", "person", "Former Landlord");
  const nonprofit = deterministicIdentity("issuer:nonprofit", "org", "Bridge Housing");
  const peer = deterministicIdentity("issuer:peer", "person", "Community Reference");

  const identity = signTypedMessage({
    from: nonprofit.identity.fingerprint,
    to: subject.identity.fingerprint,
    signerPrivateKey: nonprofit.privateKey,
    nonce: "AAAAAAAAAAAAAAAAAAAAAA",
    payload: payload("identity", "2026-01-10T12:00:00.000Z", [
      ["a.id:method", "caseworker_document_review"],
      ["a.id:first_name", "Maya"],
      ["a.id:last_name", "Rivera"],
      ["a.id:email", "maya@example.test"],
    ]),
  });

  const rent = signTypedMessage({
    from: landlord.identity.fingerprint,
    to: subject.identity.fingerprint,
    signerPrivateKey: landlord.privateKey,
    nonce: "BBBBBBBBBBBBBBBBBBBBBB",
    payload: payload("rent_history", "2026-02-01T12:00:00.000Z", [
      ["a.rent:start_month", "2025-02"],
      ["a.rent:end_month", "2026-01"],
      ["a.rent:currency", "USD"],
      ["a.rent:monthly_amount", "1450"],
      ["a.rent:on_time_count", 12],
      ["a.rent:late_count", 0],
      ["a.rent:payment_method", "ledger"],
    ]),
  });

  const reference = signTypedMessage({
    from: landlord.identity.fingerprint,
    to: subject.identity.fingerprint,
    signerPrivateKey: landlord.privateKey,
    previous: rent,
    nonce: "CCCCCCCCCCCCCCCCCCCCCC",
    payload: payload("reference", "2026-02-02T12:00:00.000Z", [
      ["a.ref:relationship", "landlord"],
      ["a.ref:context", "Prior tenancy"],
      ["a.ref:claim", "Paid on time and left the unit in good standing"],
      ["a.ref:confidence", "high"],
    ]),
  });

  const peerReference = signTypedMessage({
    from: peer.identity.fingerprint,
    to: subject.identity.fingerprint,
    signerPrivateKey: peer.privateKey,
    nonce: "DDDDDDDDDDDDDDDDDDDDDD",
    payload: payload("reference", "2025-12-05T12:00:00.000Z", [
      ["a.ref:relationship", "peer"],
      ["a.ref:claim", "Reliable community member"],
      ["a.ref:confidence", "medium"],
    ]),
  });

  const outcome = signTypedMessage({
    from: nonprofit.identity.fingerprint,
    to: subject.identity.fingerprint,
    signerPrivateKey: nonprofit.privateKey,
    previous: identity,
    nonce: "EEEEEEEEEEEEEEEEEEEEEE",
    payload: payload("outcome", "2026-03-01T12:00:00.000Z", [
      ["a.out:related", reference.fp],
      ["a.out:kind", "housing_application"],
      ["a.out:result", "positive"],
      ["a.out:effective_at", "2026-03-01"],
    ]),
  });

  return {
    v: 1,
    purpose: "housing_application",
    disclosedAt: "2026-03-05T12:00:00.000Z",
    subject: {
      fingerprint: subject.identity.fingerprint,
      publicKey: subject.identity.publicKey,
    },
    messages: [identity, rent, reference, peerReference, outcome],
    relatedKeys: [landlord.identity, nonprofit.identity, peer.identity],
    note: "Deterministic Agent B protocol fixture for the housing trust demo.",
  };
}

function payload(
  type: string,
  timestamp: string,
  entries: Array<[string, AnchorPayloadEntry["v"]]>,
): AnchorPayloadEntry[] {
  return [
    { k: "a:type", v: type },
    { k: "a:ts", v: timestamp },
    ...entries.map(([k, v]) => ({ k, v })),
  ];
}
