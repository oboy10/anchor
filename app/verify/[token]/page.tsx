import { notFound } from "next/navigation";
import Link from "next/link";
import { Brand } from "@/components/brand";
import { CredentialCard } from "@/components/credential-card";
import { VerificationBanner } from "@/components/verification-banner";
import { InlineNotice } from "@/components/ui/inline-notice";
import { StatusBadge } from "@/components/ui/status-badge";
import {
  getLedger,
  getPacket,
  getResident,
  verifyResidentChain,
} from "@/lib/data/store";
import { formatDate } from "@/lib/format";
import { summarize, packetState } from "@/lib/metrics";
import { PACKET_PURPOSE_LABELS } from "@/types";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  const packet = getPacket(token);
  return {
    title: packet ? packet.label : "Verification",
    robots: { index: false, follow: false },
  };
}

export default async function VerifyPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  const packet = getPacket(token);
  if (!packet) notFound();

  const resident = getResident(packet.residentFingerprint);
  if (!resident) notFound();

  const state = packetState(packet);
  const ledger = getLedger(packet.residentFingerprint);
  const included = packet.includedCredentialIds
    .map((id) => ledger.find((c) => c.id === id))
    .filter((c): c is NonNullable<typeof c> => !!c);

  const chainResult = verifyResidentChain(packet.residentFingerprint);
  const summary = summarize(included);

  return (
    <div className="min-h-full bg-canvas">
      <header className="border-b border-line bg-surface/80">
        <div className="mx-auto flex h-14 max-w-2xl items-center justify-between px-4 sm:px-6">
          <Brand href="/" />
          <StatusBadge tone={state === "active" ? "verified" : "warning"}>
            {state === "active"
              ? "Active link"
              : state === "revoked"
                ? "Revoked"
                : "Expired"}
          </StatusBadge>
        </div>
      </header>

      <main className="mx-auto max-w-2xl px-4 py-8 sm:px-6 sm:py-10">
        <p className="text-sm font-medium text-accent">Verification page</p>
        <h1 className="mt-2 font-serif text-3xl text-ink">{packet.label}</h1>
        <p className="mt-2 text-[15px] text-ink-muted">
          {PACKET_PURPOSE_LABELS[packet.purpose]} · Shared by{" "}
          <span className="font-medium text-ink">{resident.displayName}</span>
        </p>

        <InlineNotice tone="calm" className="mt-6" title="Shared directly by the resident">
          Only the credentials the resident chose to share appear on this page. This
          is not a background check or credit score.
        </InlineNotice>

        {state !== "active" ? (
          <InlineNotice tone="warning" className="mt-4" title="This link is no longer active">
            {state === "revoked"
              ? "The resident revoked this packet. Ask them for a new link if you still need to review their record."
              : "This packet expired. Ask the resident for an updated link."}
          </InlineNotice>
        ) : null}

        {packet.intro ? (
          <blockquote className="mt-6 border-l-2 border-accent/40 pl-4 text-[15px] leading-relaxed text-ink">
            {packet.intro}
          </blockquote>
        ) : null}

        <div className="mt-6 flex flex-wrap gap-x-4 gap-y-1 text-sm text-ink-muted">
          <span>Expires {formatDate(packet.expiresAt)}</span>
          <span>·</span>
          <span>{included.length} credentials shared</span>
          {summary.monthsOfStability > 0 ? (
            <>
              <span>·</span>
              <span>{summary.monthsOfStability} months on-time payments on record</span>
            </>
          ) : null}
        </div>

        <VerificationBanner result={chainResult} className="mt-6" />

        <section className="mt-8 space-y-4" aria-labelledby="credentials-heading">
          <h2 id="credentials-heading" className="text-lg font-semibold text-ink">
            Shared credentials
          </h2>
          {included.length === 0 ? (
            <p className="text-sm text-ink-muted">No credentials in this packet.</p>
          ) : (
            included.map((c) => (
              <CredentialCard
                key={c.id}
                credential={c}
                verified={chainResult.signaturesValid}
                showResidentNote={packet.sharedNoteCredentialIds.includes(c.id)}
              />
            ))
          )}
        </section>

        <footer className="mt-12 border-t border-line pt-6 text-sm text-ink-faint">
          <p>
            Each credential was issued and signed by the organization named on it.
            TrustWallet verifies ledger integrity; it does not guarantee future behavior.
          </p>
          <p className="mt-2">
            <Link href="/" className="text-accent hover:text-accent-hover">
              About TrustWallet
            </Link>
          </p>
        </footer>
      </main>
    </div>
  );
}
