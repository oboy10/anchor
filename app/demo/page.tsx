import Link from "next/link";
import { AppShell } from "@/components/app-shell";
import { SectionHeader } from "@/components/section-header";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/cn";

const roles = [
  {
    title: "Resident",
    description:
      "View your credential timeline, add notes, and build time-limited share packets for housing or job applications.",
    href: "/resident/r_marcus",
    cta: "Open Marcus's wallet",
  },
  {
    title: "Provider",
    description:
      "Issue signed positive credentials — payment history, references, training, endorsements — to a resident's ledger.",
    href: "/provider",
    cta: "Open issuance console",
  },
  {
    title: "Verifier",
    description:
      "See what a resident chose to share. Read-only, time-limited, integrity-checked.",
    href: "/verify/demo-maple-street",
    cta: "Open sample packet",
  },
  {
    title: "Admin",
    description:
      "Seed demo data, inspect ledger integrity, and reset the in-memory store.",
    href: "/admin",
    cta: "Open admin",
  },
];

export default function DemoPage() {
  return (
    <AppShell
      context="Demo"
      links={[
        { href: "/", label: "Home" },
        { href: "/resident/r_marcus", label: "Wallet" },
        { href: "/provider", label: "Provider" },
      ]}
    >
      <SectionHeader
        as="h1"
        serif
        title="Choose a demo flow"
        description="Each role shows a different part of TrustWallet. All data is sample data for demonstration."
      />

      <ul className="mt-10 grid gap-4 sm:grid-cols-2">
        {roles.map((role) => (
          <li key={role.href}>
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
