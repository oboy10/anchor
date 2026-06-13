import type {
  AnchorIdentity,
  AttestationRequestCreate,
  IssuanceIntent,
  PublicAnchorContext,
} from "./types";

const DEMO_PUBLIC_KEYS = {
  marcus: {
    fingerprint: "0fb4945c1ecf264f",
    publicKey: "ccf2c1fa5cd7df901146c3b7253ec73dbf57b179ee314c4e501e9fbe5db7db79",
  },
  dawn: {
    fingerprint: "547a35cb38cd0304",
    publicKey: "18f796e75a472ac90b7d2668257d001c383b5779abe43d4a6f36a833d250e3d2",
  },
  hope: {
    fingerprint: "c0a3e8404f76d955",
    publicKey: "0dc981225851483b2d7e93ecbfbe162ab4700e986220d7e4114b95d0100a6a30",
  },
  bridge: {
    fingerprint: "b00dea2a1a71afbe",
    publicKey: "45ae66679b3d32f8789b084ca320bfdcc148b1f7593864e9b62fd29c1d6303dd",
  },
  linden: {
    fingerprint: "d094b63654c6109b",
    publicKey: "311caabb49f4ce3b5417c1be2b16f899dfe89689a6d3853c2aebb9619eaa8d9e",
  },
  eastbay: {
    fingerprint: "b1c4fb0ea95af2d3",
    publicKey: "3b918b4188bb615c33eac612e4bf01dfc59a6b5a02887f22a83ddddd1782305f",
  },
  dana: {
    fingerprint: "e7006ba530624596",
    publicKey: "19ae822907941a522c367b0f6c94826c8f5a97e054145180576dc58f7f6493f7",
  },
} as const;

function publicKeyBase64url(key: keyof typeof DEMO_PUBLIC_KEYS): string {
  return Buffer.from(DEMO_PUBLIC_KEYS[key].publicKey, "hex").toString("base64url");
}

export const anchorDemoIdentities = {
  subject: {
    alg: "Ed25519",
    fingerprint: DEMO_PUBLIC_KEYS.marcus.fingerprint,
    publicKey: publicKeyBase64url("marcus"),
    entityType: "person",
    displayName: "Marcus R.",
  },
  formerLandlord: {
    alg: "Ed25519",
    fingerprint: DEMO_PUBLIC_KEYS.linden.fingerprint,
    publicKey: publicKeyBase64url("linden"),
    entityType: "org",
    displayName: "Linden Court Apartments",
  },
  nonprofit: {
    alg: "Ed25519",
    fingerprint: DEMO_PUBLIC_KEYS.hope.fingerprint,
    publicKey: publicKeyBase64url("hope"),
    entityType: "org",
    displayName: "Hope Shelter",
  },
  caseworker: {
    alg: "Ed25519",
    fingerprint: DEMO_PUBLIC_KEYS.dana.fingerprint,
    publicKey: publicKeyBase64url("dana"),
    entityType: "person",
    displayName: "Dana Whitfield, LCSW",
  },
  housingProgram: {
    alg: "Ed25519",
    fingerprint: DEMO_PUBLIC_KEYS.bridge.fingerprint,
    publicKey: publicKeyBase64url("bridge"),
    entityType: "org",
    displayName: "Bridgeway Transitional Housing",
  },
  verifier: {
    alg: "Ed25519",
    fingerprint: DEMO_PUBLIC_KEYS.eastbay.fingerprint,
    publicKey: publicKeyBase64url("eastbay"),
    entityType: "org",
    displayName: "Maple Street Apartments",
  },
  lowCredibilityPeer: {
    alg: "Ed25519",
    fingerprint: DEMO_PUBLIC_KEYS.dawn.fingerprint,
    publicKey: publicKeyBase64url("dawn"),
    entityType: "person",
    displayName: "Unverified peer recommender",
  },
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
