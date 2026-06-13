/** Demo Firebase Auth accounts — created by `npm run seed`. */
export const DEMO_AUTH_PASSWORD = "Anchor1!";

export const VERIFIER_DEMO_URL = "/verify?token=demo-maple-street";

export type DemoRole = "resident" | "provider" | "admin";

export interface DemoAuthAccount {
  email: string;
  label: string;
  role: DemoRole;
  redirect: string;
}

// The server only ever learns an account's role — no resident name, slug, or
// fingerprint. Residents land on /wallet, which resolves their identity locally.
export const DEMO_AUTH_ACCOUNTS: DemoAuthAccount[] = [
  {
    email: "marcus@demo.anchor",
    label: "Marcus (resident)",
    role: "resident",
    redirect: "/wallet",
  },
  {
    email: "dawn@demo.anchor",
    label: "Dawn (resident)",
    role: "resident",
    redirect: "/wallet",
  },
  {
    email: "provider@demo.anchor",
    label: "Provider",
    role: "provider",
    redirect: "/provider",
  },
  {
    email: "admin@demo.anchor",
    label: "Admin",
    role: "admin",
    redirect: "/admin",
  },
];
