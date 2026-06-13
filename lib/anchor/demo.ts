import {
  deterministicIdentity,
  signTypedMessage,
  type AnchorSignedMessage,
} from "@/lib/anchor/protocol";
import type {
  AnchorIdentity,
  AttestationRequestCreate,
  IssuanceIntent,
  PublicAnchorContext,
} from "./types";

const DEMO_KEYPAIRS = {
  subject: deterministicIdentity("agent-a:subject:marcus", "person", "Marcus R."),
  formerLandlord: deterministicIdentity(
    "agent-a:issuer:linden",
    "org",
    "Linden Court Apartments",
  ),
  nonprofit: deterministicIdentity("agent-a:issuer:hope", "org", "Hope Shelter"),
  caseworker: deterministicIdentity(
    "agent-a:issuer:dana",
    "person",
    "Dana Whitfield, LCSW",
  ),
  housingProgram: deterministicIdentity(
    "agent-a:issuer:bridgeway",
    "org",
    "Bridgeway Transitional Housing",
  ),
  verifier: deterministicIdentity("agent-a:verifier:maple", "org", "Maple Street Apartments"),
  lowCredibilityPeer: deterministicIdentity(
    "agent-a:issuer:peer",
    "person",
    "Unverified peer recommender",
  ),
} as const;

export const anchorDemoIdentities = {
  subject: DEMO_KEYPAIRS.subject.identity,
  formerLandlord: DEMO_KEYPAIRS.formerLandlord.identity,
  nonprofit: DEMO_KEYPAIRS.nonprofit.identity,
  caseworker: DEMO_KEYPAIRS.caseworker.identity,
  housingProgram: DEMO_KEYPAIRS.housingProgram.identity,
  verifier: DEMO_KEYPAIRS.verifier.identity,
  lowCredibilityPeer: DEMO_KEYPAIRS.lowCredibilityPeer.identity,
} satisfies Record<string, AnchorIdentity>;

export const anchorDemoRegistration = [
  {
    identity: anchorDemoIdentities.subject,
    displayLabel: "Marcus R.",
  },
  {
    identity: anchorDemoIdentities.formerLandlord,
    displayLabel: "Linden Court Apartments",
    organization: { legalName: "Linden Court Apartments", verified: true },
  },
  {
    identity: anchorDemoIdentities.nonprofit,
    displayLabel: "Hope Shelter",
    organization: { legalName: "Hope Shelter", verified: true },
  },
  {
    identity: anchorDemoIdentities.caseworker,
    displayLabel: "Dana Whitfield, LCSW",
    organization: { relationship: "caseworker at Hope Shelter", verified: true },
  },
  {
    identity: anchorDemoIdentities.housingProgram,
    displayLabel: "Bridgeway Transitional Housing",
    organization: { legalName: "Bridgeway Transitional Housing", verified: true },
  },
  {
    identity: anchorDemoIdentities.verifier,
    displayLabel: "Maple Street Apartments",
    organization: { legalName: "Maple Street Apartments", verified: true },
  },
  {
    identity: anchorDemoIdentities.lowCredibilityPeer,
    displayLabel: "Unverified peer recommender",
  },
];

export const anchorDemoRequests: AttestationRequestCreate[] = [
  {
    subjectFingerprint: anchorDemoIdentities.subject.fingerprint,
    issuerFingerprint: anchorDemoIdentities.housingProgram.fingerprint,
    requestedType: "rent_history",
    requestedFields: [
      "a.rent:start_month",
      "a.rent:end_month",
      "a.rent:on_time_count",
      "a.rent:late_count",
    ],
    note: "Requesting rent/payment history for a new housing application.",
  },
  {
    subjectFingerprint: anchorDemoIdentities.subject.fingerprint,
    issuerFingerprint: anchorDemoIdentities.caseworker.fingerprint,
    requestedType: "reference",
    requestedFields: ["a.ref:relationship", "a.ref:claim", "a.ref:confidence"],
    note: "Requesting caseworker reference for tenancy readiness.",
  },
];

export const anchorDemoIssuanceIntents: IssuanceIntent[] = [
  {
    issuerFingerprint: anchorDemoIdentities.nonprofit.fingerprint,
    subjectFingerprint: anchorDemoIdentities.subject.fingerprint,
    type: "identity",
    persistDemoCopy: true,
    payload: [
      { k: "a.id:first_name", v: "Marcus" },
      { k: "a.id:last_name", v: "R." },
      { k: "a.id:method", v: "case-managed intake" },
      { k: "a.id:issuer_scope", v: "housing support program" },
    ],
  },
  {
    issuerFingerprint: anchorDemoIdentities.housingProgram.fingerprint,
    subjectFingerprint: anchorDemoIdentities.subject.fingerprint,
    type: "rent_history",
    persistDemoCopy: true,
    payload: [
      { k: "a.rent:start_month", v: "2025-05" },
      { k: "a.rent:end_month", v: "2026-04" },
      { k: "a.rent:currency", v: "USD" },
      { k: "a.rent:monthly_amount", v: "320.00" },
      { k: "a.rent:on_time_count", v: 12 },
      { k: "a.rent:late_count", v: 0 },
      { k: "a.rent:payment_method", v: "program ledger" },
    ],
  },
  {
    issuerFingerprint: anchorDemoIdentities.formerLandlord.fingerprint,
    subjectFingerprint: anchorDemoIdentities.subject.fingerprint,
    type: "reference",
    persistDemoCopy: true,
    payload: [
      { k: "a.ref:relationship", v: "former landlord" },
      { k: "a.ref:context", v: "Studio rental in 2023" },
      { k: "a.ref:claim", v: "Paid rent and left the unit in good condition." },
      { k: "a.ref:confidence", v: "high" },
    ],
  },
  {
    issuerFingerprint: anchorDemoIdentities.caseworker.fingerprint,
    subjectFingerprint: anchorDemoIdentities.subject.fingerprint,
    type: "reference",
    persistDemoCopy: true,
    payload: [
      { k: "a.ref:relationship", v: "caseworker" },
      { k: "a.ref:context", v: "Worked together for one year" },
      { k: "a.ref:claim", v: "Ready for independent tenancy." },
      { k: "a.ref:confidence", v: "high" },
    ],
  },
];

export const anchorDemoContext: Pick<
  PublicAnchorContext,
  "organizationRelationships" | "demoOutcomes"
> = {
  organizationRelationships: [
    {
      sourceFingerprint: anchorDemoIdentities.caseworker.fingerprint,
      targetFingerprint: anchorDemoIdentities.nonprofit.fingerprint,
      relationship: "caseworker",
    },
  ],
  demoOutcomes: [
    {
      id: "out_landlord_positive_1",
      relatedFingerprint: anchorDemoIdentities.formerLandlord.fingerprint,
      kind: "prior_reference_outcome",
      result: "positive tenancy completed",
      effectiveAt: "2026-03-01T00:00:00.000Z",
    },
    {
      id: "out_peer_low_context",
      relatedFingerprint: anchorDemoIdentities.lowCredibilityPeer.fingerprint,
      kind: "reference_integrity_warning",
      result: "no organization or outcome-backed edges",
      effectiveAt: "2026-05-01T00:00:00.000Z",
    },
  ],
};

export function signAnchorDemoIntent(
  intent: IssuanceIntent,
  previous?: AnchorSignedMessage,
): AnchorSignedMessage {
  const keypair = Object.values(DEMO_KEYPAIRS).find(
    (candidate) => candidate.identity.fingerprint === intent.issuerFingerprint,
  );
  if (!keypair) throw new Error("Unknown demo issuer.");
  return signTypedMessage({
    from: intent.issuerFingerprint,
    to: intent.subjectFingerprint,
    signerPrivateKey: keypair.privateKey,
    previous,
    payload: [
      { k: "a:type", v: intent.type },
      { k: "a:ts", v: new Date().toISOString() },
      ...(intent.payload ?? []).filter(
        (entry) => entry.k !== "a:type" && entry.k !== "a:ts",
      ),
    ],
  });
}
