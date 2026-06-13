import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { Brand } from "@/components/brand";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/cn";

export default function LandingPage() {
  return (
    <div className="flex min-h-full flex-col">
      <header className="border-b border-line">
        <div className="mx-auto flex h-14 max-w-3xl items-center justify-between px-4 sm:px-6">
          <Brand />
          <Link
            href="/demo"
            className={cn(buttonVariants("secondary", "sm"))}
          >
            Enter demo
          </Link>
        </div>
      </header>

      <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-12 sm:px-6 sm:py-16">
        <p className="text-sm font-medium text-accent">Resident-controlled record</p>
        <h1 className="mt-3 font-serif text-4xl leading-tight text-ink sm:text-[2.75rem]">
          A verified record you own — not a score someone else assigns.
        </h1>
        <p className="mt-5 max-w-prose text-[17px] leading-relaxed text-ink-muted">
          Anchor helps people rebuilding after homelessness carry forward
          verified proof of reliability: on-time payments, housing good standing,
          references, training, and caseworker endorsements. Shelters, landlords,
          employers, and programs issue credentials. You choose what to share.
        </p>

        <div className="mt-8 flex flex-wrap gap-3">
          <Link href="/resident/r_marcus" className={buttonVariants("primary", "md")}>
            View sample wallet
            <ArrowRight className="size-4" aria-hidden />
          </Link>
          <Link href="/verify?token=demo-maple-street" className={buttonVariants("secondary", "md")}>
            See a shared packet
          </Link>
        </div>

        <section className="mt-16 space-y-8 border-t border-line pt-12">
          <div>
            <h2 className="font-serif text-2xl text-ink">How it works</h2>
            <ol className="mt-4 space-y-4 text-[15px] leading-relaxed text-ink-muted">
              <li>
                <span className="font-medium text-ink">1. Organizations issue credentials.</span>{" "}
                A shelter, landlord, or employer adds a signed, positive entry to your
                ledger — payment history, good standing, a reference, training completion.
              </li>
              <li>
                <span className="font-medium text-ink">2. You review your timeline.</span>{" "}
                Everything appears in one place, with who issued it and when. You can add
                a short personal note if you want.
              </li>
              <li>
                <span className="font-medium text-ink">3. You build a share packet.</span>{" "}
                Pick exactly which credentials to include, set an expiration, and send a
                link to a landlord, employer, or counselor.
              </li>
              <li>
                <span className="font-medium text-ink">4. They verify — nothing more.</span>{" "}
                The verification page shows only what you selected. Each entry is
                integrity-checked against the ledger.
              </li>
            </ol>
          </div>

          <div>
            <h2 className="font-serif text-2xl text-ink">What this is not</h2>
            <p className="mt-3 max-w-prose text-[15px] leading-relaxed text-ink-muted">
              Anchor is not a credit score, a background check, or a surveillance
              tool. There are no hidden ratings. Providers cannot edit past entries.
              You can revoke a share link at any time.
            </p>
          </div>
        </section>
      </main>

      <footer className="border-t border-line py-6">
        <p className="mx-auto max-w-3xl px-4 text-sm text-ink-faint sm:px-6">
          Demo build · all data stored locally in your browser · no server-side records except registered-email hashes
        </p>
      </footer>
    </div>
  );
}
