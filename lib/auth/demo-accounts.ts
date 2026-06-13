/** Demo Firebase Auth accounts — created by `npm run seed`. */
export const DEMO_AUTH_PASSWORD = "Anchor1!";

export const VERIFIER_DEMO_URL = "/verify?token=demo-maple-street";

export type DemoRole = "resident" | "provider" | "admin";

export interface DemoAuthAccount {
  email: string;
  label: string;
  role: DemoRole;
  slug?: string;
  redirect: string;
}

export const DEMO_AUTH_ACCOUNTS: DemoAuthAccount[] = [
  {
    email: "marcus@demo.anchor",
    label: "Marcus (resident)",
    role: "resident",
    slug: "r_marcus",
    redirect: "/resident/r_marcus",
  },
  {
    email: "dawn@demo.anchor",
    label: "Dawn (resident)",
    role: "resident",
    slug: "r_dawn",
    redirect: "/resident/r_dawn",
  },
  {
    email: "provider@demo.anchor",
    label: "Provider",
    role: "provider",
    slug: "p_hope_shelter",
    redirect: "/provider",
  },
  {
    email: "admin@demo.anchor",
    label: "Admin",
    role: "admin",
    redirect: "/admin",
  },
];
