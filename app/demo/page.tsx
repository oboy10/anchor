import { AppShell } from "@/components/app-shell";
import { SectionHeader } from "@/components/section-header";
import { cn } from "@/lib/cn";
import Link from "next/link";

const roles = [
  {
    title: "Resident",
    description:
      "Create your keypair identity, verify your contact details, review your credential timeline, and build time-limited share packets.",
    href: "/sign-in?new=1",
    cta: "Create a resident account",
  },
  {
    title: "Provider",
    description:
      "Issue signed positive credentials to a resident's ledger.",
    href: "/provider",
    cta: "Open provider console",
  },
  {
    title: "Admin",
    description:
      "Inspect identities and ledger integrity; export, import, or reset your local data.",
    href: "/admin",
    cta: "Open admin",
  },
];

export default function DemoPage() {
  return (
    <AppShell context="Demo">
      <SectionHeader
        as="h1"
        serif
        title="Choose a demo flow"
        description="Identities are Ed25519 keypairs stored — password-protected — in your browser. Verifiers open a resident's share link and need no account."
      />

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
