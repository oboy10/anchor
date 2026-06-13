import type { DemoRole } from "./demo-accounts";

export interface AuthProfile {
  uid: string;
  email: string | null;
  role: DemoRole | "verifier";
  fingerprint?: string;
  slug?: string;
}

export function redirectForRole(profile: AuthProfile): string {
  if (profile.role === "resident" && profile.slug) return `/resident/${profile.slug}`;
  if (profile.role === "provider") return "/provider";
  if (profile.role === "admin") return "/admin";
  return "/demo";
}
