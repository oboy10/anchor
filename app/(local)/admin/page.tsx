import Link from "next/link";
import { AppShell } from "@/components/app-shell";
import { AdminControls } from "@/components/admin-controls";
import { SectionHeader } from "@/components/section-header";
import { InlineNotice } from "@/components/ui/inline-notice";
import { AdminContent } from "./admin-client";

export default function AdminPage() {
  return (
    <AppShell
      context="Admin"
      links={[{ href: "/wallet", label: "Wallet" }]}
    >
      <div className="flex flex-wrap items-start justify-between gap-4">
        <SectionHeader
          as="h1"
          serif
          title="Administration"
          description="Inspect Ed25519 identities, signed attestations, and verification state."
        />
        <AdminControls />
      </div>

      <InlineNotice tone="info" className="mt-6" title="Data backend: local-first">
        All data lives in this browser&apos;s storage as portable JSON. Nothing is
        stored on a server except opaque hash lists of registered emails and
        verified phone/email contacts. Use the controls above to export, import,
        or reset your local data.
      </InlineNotice>

      <section className="mt-8 space-y-4">
        <h2 className="text-lg font-semibold text-ink">Quick links</h2>
        <ul className="space-y-1 text-sm">
          <li>
            <Link href="/wallet" className="text-accent hover:text-accent-hover">
              My wallet
            </Link>
          </li>
          <li>
            <Link href="/provider" className="text-accent hover:text-accent-hover">
              Provider console
            </Link>
          </li>
        </ul>
      </section>

      <AdminContent />
    </AppShell>
  );
}
