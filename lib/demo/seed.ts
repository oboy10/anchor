/**
 * Demo key material — deterministic Ed25519 seeds (see lib/crypto/user.ts).
 * Fingerprints are SHA-512(public_key)[0:8].
 */
export const DEMO_KEYS = {
  marcus: {
    fingerprint: "0fb4945c1ecf264f",
    publicKey:
      "ccf2c1fa5cd7df901146c3b7253ec73dbf57b179ee314c4e501e9fbe5db7db79",
    privateKey:
      "983e780889728d3749c0afa572cbbfdea1344666ca7ec17f4124d02f4f100244",
  },
  dawn: {
    fingerprint: "547a35cb38cd0304",
    publicKey:
      "18f796e75a472ac90b7d2668257d001c383b5779abe43d4a6f36a833d250e3d2",
    privateKey:
      "d0c71a546538fc4502a7779fbfce801101776a28495c16d3ed309fcf03d64744",
  },
  hope: {
    fingerprint: "c0a3e8404f76d955",
    publicKey:
      "0dc981225851483b2d7e93ecbfbe162ab4700e986220d7e4114b95d0100a6a30",
    privateKey:
      "d04a0d10564c430525209ec52d23b1f9e9566abf31f0254ac8045b0324749b69",
  },
  bridge: {
    fingerprint: "b00dea2a1a71afbe",
    publicKey:
      "45ae66679b3d32f8789b084ca320bfdcc148b1f7593864e9b62fd29c1d6303dd",
    privateKey:
      "a0a853c8106de3db3124e69ad436d8703860e26831c5c8c75a239c81ec390f72",
  },
  linden: {
    fingerprint: "d094b63654c6109b",
    publicKey:
      "311caabb49f4ce3b5417c1be2b16f899dfe89689a6d3853c2aebb9619eaa8d9e",
    privateKey:
      "e0b0c5324be0ce1d5d2ac11bf94eca16f6ec783d156d8aa795873e44ac8b945d",
  },
  riseup: {
    fingerprint: "46ba45e34db2278e",
    publicKey:
      "a73fb3db243aa490183b4c66ae72cd84b3dea2598ff5121a760fac253674f00b",
    privateKey:
      "389ae375938b10aaf0c10bd62098b21e4339e9885d9439edfdc758514759aa5b",
  },
  eastbay: {
    fingerprint: "b1c4fb0ea95af2d3",
    publicKey:
      "3b918b4188bb615c33eac612e4bf01dfc59a6b5a02887f22a83ddddd1782305f",
    privateKey:
      "f03984a8b3684a9bdbba6314f225e4616761d3432250569872b8ba36457b286a",
  },
  dana: {
    fingerprint: "e7006ba530624596",
    publicKey:
      "19ae822907941a522c367b0f6c94826c8f5a97e054145180576dc58f7f6493f7",
    privateKey:
      "28fbae57e38f053179ece5b40fba6ddd5c5f47e319f09e12385f1913ece8ae7e",
  },
} as const;

import type {
  CredentialEvidence,
  CredentialType,
  Endorsement,
  Provider,
  Resident,
} from "@/types";

export interface SeedIssuance {
  id: string;
  residentSlug: string;
  issuerSlug: string;
  credentialType: CredentialType;
  issueDate: string;
  title: string;
  summary: string;
  evidence: CredentialEvidence;
  residentNote?: string;
}

export const seedResidents: Resident[] = [
  {
    fingerprint: DEMO_KEYS.marcus.fingerprint,
    slug: "r_marcus",
    displayName: "Marcus R.",
    pronouns: "he/him",
    preferredIntro:
      "I have kept up with rent and program responsibilities for the past year and I am looking for a stable place to rent.",
    recordSince: "2025-05-01",
    city: "Oakland, CA",
  },
  {
    fingerprint: DEMO_KEYS.dawn.fingerprint,
    slug: "r_dawn",
    displayName: "Dawn P.",
    pronouns: "she/her",
    preferredIntro:
      "I finished my certificate and I am ready for steady work and my own apartment.",
    recordSince: "2025-08-01",
    city: "Oakland, CA",
  },
];

export const seedProviders: Provider[] = [
  {
    fingerprint: DEMO_KEYS.hope.fingerprint,
    slug: "p_hope",
    name: "Hope Shelter",
    type: "shelter",
    location: "Hope Shelter · Oakland, CA",
    contactEmail: "verify@hopeshelter.org",
    verified: true,
  },
  {
    fingerprint: DEMO_KEYS.bridge.fingerprint,
    slug: "p_bridge",
    name: "Bridgeway Transitional Housing",
    type: "transitional_housing",
    location: "Bridgeway Transitional Housing · Oakland, CA",
    contactEmail: "records@bridgeway.org",
    verified: true,
  },
  {
    fingerprint: DEMO_KEYS.linden.fingerprint,
    slug: "p_linden",
    name: "Linden Court Apartments",
    type: "landlord",
    location: "Linden Court Apartments · Oakland, CA",
    contactEmail: "manager@lindencourt.com",
    verified: true,
  },
  {
    fingerprint: DEMO_KEYS.riseup.fingerprint,
    slug: "p_riseup",
    name: "RiseUp Workforce",
    type: "workforce_program",
    location: "RiseUp Workforce · Oakland, CA",
    contactEmail: "training@riseup.org",
    verified: true,
  },
  {
    fingerprint: DEMO_KEYS.eastbay.fingerprint,
    slug: "p_eastbay",
    name: "East Bay Grocers",
    type: "employer",
    location: "East Bay Grocers · Oakland, CA",
    contactEmail: "hr@eastbaygrocers.com",
    verified: true,
  },
  {
    fingerprint: DEMO_KEYS.dana.fingerprint,
    slug: "p_dana",
    name: "Dana Whitfield, LCSW",
    type: "caseworker",
    location: "Case manager · Hope Shelter",
    contactEmail: "dwhitfield@hopeshelter.org",
    verified: true,
  },
];

export const SLUG_TO_KEY: Record<string, keyof typeof DEMO_KEYS> = {
  r_marcus: "marcus",
  r_dawn: "dawn",
  p_hope: "hope",
  p_bridge: "bridge",
  p_linden: "linden",
  p_riseup: "riseup",
  p_eastbay: "eastbay",
  p_dana: "dana",
};

/** Issued oldest-first. */
export const seedIssuances: SeedIssuance[] = [
  {
    id: "c_program_start",
    residentSlug: "r_marcus",
    issuerSlug: "p_hope",
    credentialType: "program_participation",
    issueDate: "2025-05-12T15:00:00.000Z",
    title: "Joined the case-managed housing program",
    summary:
      "Marcus enrolled in Hope Shelter's case-managed program and has attended scheduled check-ins.",
    evidence: {
      metric: "Active participant",
      periodStart: "2025-05-12",
      facts: [
        { label: "Program", value: "Stable Start case management" },
        { label: "Attendance", value: "All scheduled check-ins kept" },
      ],
    },
  },
  {
    id: "c_pay_q1",
    residentSlug: "r_marcus",
    issuerSlug: "p_bridge",
    credentialType: "on_time_payment",
    issueDate: "2025-08-04T15:00:00.000Z",
    title: "3 months of on-time program payments",
    summary: "On-time program fees from May through July 2025.",
    evidence: {
      metric: "3 consecutive on-time payments",
      periodStart: "2025-05-01",
      periodEnd: "2025-07-31",
      facts: [
        { label: "Payments", value: "3 of 3 on time" },
        { label: "Amount", value: "$320 / month" },
      ],
    },
  },
  {
    id: "c_training",
    residentSlug: "r_marcus",
    issuerSlug: "p_riseup",
    credentialType: "job_training_completion",
    issueDate: "2025-09-20T15:00:00.000Z",
    title: "Completed Warehouse & Logistics certificate",
    summary:
      "Finished a 6-week certificate covering safety, inventory systems, and forklift basics.",
    evidence: {
      metric: "Certificate awarded",
      periodStart: "2025-08-11",
      periodEnd: "2025-09-19",
      facts: [
        { label: "Hours", value: "120 hours" },
        { label: "Result", value: "Passed all modules" },
      ],
    },
    residentNote: "This certificate helped me pick up weekend shifts.",
  },
  {
    id: "c_pay_q2",
    residentSlug: "r_marcus",
    issuerSlug: "p_bridge",
    credentialType: "on_time_payment",
    issueDate: "2025-11-04T15:00:00.000Z",
    title: "6 months of on-time program payments",
    summary: "On-time program fees continued through October 2025.",
    evidence: {
      metric: "6 consecutive on-time payments",
      periodStart: "2025-05-01",
      periodEnd: "2025-10-31",
      facts: [
        { label: "Payments", value: "6 of 6 on time" },
        { label: "Late payments", value: "None" },
      ],
    },
  },
  {
    id: "c_employer_ref",
    residentSlug: "r_marcus",
    issuerSlug: "p_eastbay",
    credentialType: "employer_reference",
    issueDate: "2026-01-15T15:00:00.000Z",
    title: "Reliable part-time stocking associate",
    summary:
      "Marcus worked weekend shifts since October and was dependable, punctual, and easy to work with.",
    evidence: {
      metric: "Reliable, recommended for rehire",
      periodStart: "2025-10-04",
      facts: [
        { label: "Role", value: "Stocking associate (part-time)" },
        { label: "Attendance", value: "No missed shifts" },
      ],
    },
  },
  {
    id: "c_good_standing",
    residentSlug: "r_marcus",
    issuerSlug: "p_bridge",
    credentialType: "housing_good_standing",
    issueDate: "2026-02-10T15:00:00.000Z",
    title: "In good standing at Bridgeway",
    summary:
      "No lease violations or incidents on record. Maintained unit and followed community guidelines.",
    evidence: {
      metric: "Good standing",
      periodStart: "2025-05-01",
      facts: [
        { label: "Violations", value: "None" },
        { label: "Unit condition", value: "Well maintained" },
      ],
    },
  },
  {
    id: "c_pay_year",
    residentSlug: "r_marcus",
    issuerSlug: "p_bridge",
    credentialType: "on_time_payment",
    issueDate: "2026-04-06T15:00:00.000Z",
    title: "12 months of on-time housing payments",
    summary: "A full year of on-time program payments with no missed months.",
    evidence: {
      metric: "12 consecutive on-time payments",
      periodStart: "2025-05-01",
      periodEnd: "2026-04-30",
      facts: [
        { label: "Payments", value: "12 of 12 on time" },
        { label: "Late payments", value: "None" },
      ],
    },
  },
  {
    id: "c_landlord_ref",
    residentSlug: "r_marcus",
    issuerSlug: "p_linden",
    credentialType: "landlord_reference",
    issueDate: "2026-05-12T15:00:00.000Z",
    title: "Prior tenancy reference",
    summary:
      "Rented a studio at Linden Court in 2023. Paid rent and left the unit in good condition.",
    evidence: {
      metric: "Would rent to again",
      periodStart: "2023-02-01",
      periodEnd: "2023-12-31",
      facts: [
        { label: "Tenancy", value: "11 months" },
        { label: "Move-out", value: "Unit in good condition" },
      ],
    },
  },
  {
    id: "c_caseworker",
    residentSlug: "r_marcus",
    issuerSlug: "p_dana",
    credentialType: "caseworker_endorsement",
    issueDate: "2026-05-20T15:00:00.000Z",
    title: "Caseworker endorsement",
    summary:
      "I have worked with Marcus for a year. He follows through on commitments and is ready for independent housing.",
    evidence: {
      metric: "Ready for independent housing",
      facts: [
        { label: "Working together since", value: "May 2025" },
        { label: "Recommendation", value: "Independent tenancy" },
      ],
    },
  },
  {
    id: "c_dawn_training",
    residentSlug: "r_dawn",
    issuerSlug: "p_riseup",
    credentialType: "job_training_completion",
    issueDate: "2025-11-02T15:00:00.000Z",
    title: "Completed Medical Office Administration certificate",
    summary: "Finished an 8-week certificate in front-office and scheduling systems.",
    evidence: {
      metric: "Certificate awarded",
      facts: [{ label: "Hours", value: "96 hours" }],
    },
  },
  {
    id: "c_dawn_pay",
    residentSlug: "r_dawn",
    issuerSlug: "p_hope",
    credentialType: "on_time_payment",
    issueDate: "2026-03-01T15:00:00.000Z",
    title: "4 months of on-time program payments",
    summary: "On-time program fees from November 2025 through February 2026.",
    evidence: {
      metric: "4 consecutive on-time payments",
      periodStart: "2025-11-01",
      periodEnd: "2026-02-28",
    },
  },
];

export const seedEndorsements: Endorsement[] = [
  {
    id: "e_dana",
    residentFingerprint: DEMO_KEYS.marcus.fingerprint,
    fromFingerprint: DEMO_KEYS.dana.fingerprint,
    fromProviderName: "Dana Whitfield, LCSW",
    message:
      "Marcus is consistent and accountable. I'm glad to speak with any landlord directly.",
    date: "2026-05-20T15:00:00.000Z",
  },
];

