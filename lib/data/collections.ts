/** Firestore collection and field names — keep in sync with firestore.rules. */
export const COL = {
  users: "users",
  slugs: "slugs",
  residents: "residents",
  providers: "providers",
  attestations: "attestations",
  residentNotes: "residentNotes",
  statusOverrides: "statusOverrides",
  sharePackets: "sharePackets",
  endorsements: "endorsements",
  meta: "meta",
  authLinks: "authLinks",
} as const;

export const META = {
  demoSeed: "demoSeed",
} as const;
