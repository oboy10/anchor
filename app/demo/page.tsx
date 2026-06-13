import Link from "next/link";
import { AppShell } from "@/components/app-shell";
import { SectionHeader } from "@/components/section-header";
import { InlineNotice } from "@/components/ui/inline-notice";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/cn";
import { VERIFIER_DEMO_URL, DEMO_AUTH_PASSWORD } from "@/lib/auth/demo-accounts";

const roles = [
  {
    title: "Resident",
    description:
      "View your credential timeline, add notes, and build time-limited share packets.",
    href: "/sign-in",
    cta: "Sign in as resident",
  },
  {
    title: "Provider",
    description:
      "Issue signed positive credentials to a resident's ledger.",
    href: "/sign-in",
    cta: "Sign in as provider",
  },
  {
    title: "Verifier",
    description:
      "See what a resident chose to share. No account required.",
    href: VERIFIER_DEMO_URL,
    cta: "Open sample packet",
  },
  {
    title: "Admin",
    description:
      "Seed demo data and inspect ledger integrity in Firestore.",
    href: "/sign-in",
    cta: "Sign in as admin",
  },
];

export default function DemoPage() {
  return (
    <AppShell
      context="Demo"
      links={[
        { href: "/", label: "Home" },
        { href: "/sign-in", label: "Sign in" },
      ]}
    >
      <SectionHeader
        as="h1"
        serif
        title="Choose a demo flow"
        description="Sign in for resident, provider, or admin. Verifiers use a public link only."
      />

      <InlineNotice tone="info" className="mt-6">
        Demo password for all accounts: <strong>{DEMO_AUTH_PASSWORD}</strong> — run{" "}
        <code className="text-xs">npm run seed</code> once to create Firebase Auth users.
      </InlineNotice>

      <ul className="mt-8 grid gap-4 sm:grid-cols-2">
        {roles.map((role) => (
          <li key={role.title}>
            <Link
              href={role.href}
              className="group flex h-full flex-col rounded-card border border-line bg-surface p-5 shadow-card transition-shadow hover:shadow-lift"
            >
              <h2 className="text-lg font-semibold text-ink">{role.title}</h2>
              <p className="mt-2 flex-1 text-[15px] leading-relaxed text-ink-muted">
                {role.description}
              </p>
              <span
                className={cn(
                  "mt-4 inline-flex text-sm font-medium text-accent group-hover:text-accent-hover",
                )}
              >
                {role.cta} →
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </AppShell>
  );
}
