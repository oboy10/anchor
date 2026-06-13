"use client";

import Link from "next/link";
import { Brand } from "@/components/brand";
import { CredentialCard } from "@/components/credential-card";
import { VerificationBanner } from "@/components/verification-banner";
import { InlineNotice } from "@/components/ui/inline-notice";
import { StatusBadge } from "@/components/ui/status-badge";
import { useLocalQuery } from "@/lib/local/hooks";
import {
  buildSharePayload,
  decodeSharePayload,
  resolveSharePayload,
  type ResolvedShare,
} from "@/lib/local/share-link";
import { formatDate } from "@/lib/format";
import { summarize } from "@/lib/metrics";
import { PACKET_PURPOSE_LABELS } from "@/types";

type State = "active" | "expired" | "revoked";

function packetStateOf(packet: ResolvedShare["payload"]["packet"]): State {
  if (packet.revokedAt) return "revoked";
  if (new Date(packet.expiresAt).getTime() <= Date.now()) return "expired";
  return "active";
}

export default function VerifyPage() {
  const query = useLocalQuery(async (): Promise<ResolvedShare | null> => {
    if (typeof window === "undefined") return null;
    // Prefer the self-contained payload in the URL fragment (works on any
    // device). Fall back to `?token=` for a locally stored packet (the
    // resident's own browser / the seeded demo link).
    const hash = window.location.hash.replace(/^#/, "");
    if (hash) {
      return resolveSharePayload(decodeSharePayload(hash));
    }
    const token = new URLSearchParams(window.location.search).get("token");
    if (!token) return null;
    const payload = await buildSharePayload(token);
    return payload ? resolveSharePayload(payload) : null;
  }, []);

  return (
    <div className="min-h-full bg-canvas">
      <header className="border-b border-line bg-surface/80">
        <div className="mx-auto flex h-14 max-w-2xl items-center justify-between px-4 sm:px-6">
          <Brand href="/" />
          {query.data ? (
            <StatusBadge
              tone={
                packetStateOf(query.data.payload.packet) === "active"
                  ? "verified"
                  : "warning"
              }
            >
              {packetStateOf(query.data.payload.packet) === "active"
                ? "Active link"
                : packetStateOf(query.data.payload.packet) === "revoked"
                  ? "Revoked"
                  : "Expired"}
            </StatusBadge>
          ) : null}
        </div>
      </header>

      <main className="mx-auto max-w-2xl px-4 py-8 sm:px-6 sm:py-10">
        {query.loading ? (
          <p className="text-sm text-ink-muted" role="status">
            Verifying shared record…
          </p>
        ) : query.error || !query.data ? (
          <InlineNotice tone="warning" title="This link could not be opened">
            The share link is invalid or incomplete. Ask the sender for a fresh
            link.
          </InlineNotice>
        ) : (
          <VerifyContent resolved={query.data} />
        )}
      </main>
    </div>
  );
}

function VerifyContent({ resolved }: { resolved: ResolvedShare }) {
  const { payload, credentials, verification } = resolved;
  const { packet, resident } = payload;
  const state = packetStateOf(packet);
  const summary = summarize(credentials);

  return (
    <>
      <p className="text-sm font-medium text-accent">Verification page</p>
      <h1 className="mt-2 font-serif text-3xl text-ink">{packet.label}</h1>
      <p className="mt-2 text-[15px] text-ink-muted">
        {PACKET_PURPOSE_LABELS[packet.purpose]} · Shared by{" "}
        <span className="font-medium text-ink">{resident.displayName}</span>
      </p>

      <InlineNotice tone="calm" className="mt-6" title="Shared directly by the resident">
        Only the credentials the resident chose to share appear on this page. Each
        is verified against the issuer&apos;s signature, fully in your browser.
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
        <span>{credentials.length} credentials shared</span>
        {summary.monthsOfStability > 0 ? (
          <>
            <span>·</span>
            <span>{summary.monthsOfStability} months on-time payments on record</span>
          </>
        ) : null}
      </div>

      <VerificationBanner result={verification} className="mt-6" />

      <section className="mt-8 space-y-4" aria-labelledby="credentials-heading">
        <h2 id="credentials-heading" className="text-lg font-semibold text-ink">
          Shared credentials
        </h2>
        {credentials.length === 0 ? (
          <p className="text-sm text-ink-muted">No credentials in this packet.</p>
        ) : (
          credentials.map((c) => (
            <CredentialCard
              key={c.id}
              credential={c}
              verified={verification.signaturesValid}
              showResidentNote={packet.sharedNoteCredentialIds.includes(c.id)}
            />
          ))
        )}
      </section>

      <footer className="mt-12 border-t border-line pt-6 text-sm text-ink-faint">
        <p>
          Each credential was issued and signed by the organization named on it.
          Anchor verifies signatures; it does not guarantee future behavior.
        </p>
        <p className="mt-2">
          <Link href="/" className="text-accent hover:text-accent-hover">
            About Anchor
          </Link>
        </p>
      </footer>
    </>
  );
}
