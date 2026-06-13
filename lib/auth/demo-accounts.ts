/** Demo Firebase Auth accounts — created by npm run seed. Password shared for hackathon demo only. */
export const DEMO_AUTH_PASSWORD = "TrustWallet1!";

export type DemoRole = "resident" | "provider" | "admin";

export interface DemoAuthAccount {
  email: string;
  role: DemoRole;
  /** Resident slug or provider slug after sign-in redirect. */
  slug: string;
  label: string;
  redirect: string;
}

export const DEMO_AUTH_ACCOUNTS: DemoAuthAccount[] = [
  {
    email: "marcus@demo.trustwallet",
    role: "resident",
    slug: "r_marcus",
    label: "Marcus R. (resident)",
    redirect: "/resident/r_marcus",
  },
  {
    email: "dawn@demo.trustwallet",
    role: "resident",
    slug: "r_dawn",
    label: "Dawn P. (resident)",
    redirect: "/resident/r_dawn",
  },
  {
    email: "provider@demo.trustwallet",
    role: "provider",
    slug: "p_hope",
    label: "Hope Shelter (provider)",
    redirect: "/provider",
  },
  {
    email: "admin@demo.trustwallet",
    role: "admin",
    slug: "admin",
    label: "Admin",
    redirect: "/admin",
  },
];

/** Verifier needs no account — public read-only packet link. */
export const VERIFIER_DEMO_URL = "/verify/demo-maple-street";
