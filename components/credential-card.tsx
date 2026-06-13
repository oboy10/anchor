import * as React from "react";
import { cn } from "@/lib/cn";
import { CREDENTIAL_TYPE_LABELS, type Credential } from "@/types";
import { CredentialIcon } from "./credential-meta";
import { StatusBadge } from "./ui/status-badge";
import { formatDate } from "@/lib/format";

export interface CredentialCardProps {
  credential: Credential;
  /** Show the issuer line + issue date. Default true. */
  showIssuer?: boolean;
  /** Show structured evidence facts. Default true. */
  showEvidence?: boolean;
  /** Show the resident's personal note (only when it should be shared). */
  showResidentNote?: boolean;
  /** Render a per-card "Verified" badge. */
  verified?: boolean;
  className?: string;
  children?: React.ReactNode;
}

export function CredentialCard({
  credential,
  showIssuer = true,
  showEvidence = true,
  showResidentNote = false,
  verified,
  className,
  children,
}: CredentialCardProps) {
  const corrected = credential.status === "corrected";
  return (
    <article
      className={cn(
        "rounded-card border border-line bg-surface p-4 shadow-card sm:p-5",
        className,
      )}
    >
      <div className="flex items-start gap-3.5">
        <span className="mt-0.5 flex size-9 shrink-0 items-center justify-center rounded-lg bg-accent-soft text-accent">
          <CredentialIcon type={credential.credentialType} className="size-[18px]" />
        </span>

        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
            <span className="text-xs font-medium uppercase tracking-wide text-ink-faint">
              {CREDENTIAL_TYPE_LABELS[credential.credentialType]}
            </span>
            {verified ? (
              <StatusBadge tone="verified">Verified</StatusBadge>
            ) : null}
            {corrected ? (
              <StatusBadge tone="warning">Corrected later</StatusBadge>
            ) : null}
          </div>

          <h3 className="mt-1 text-[17px] font-semibold leading-snug text-ink">
            {credential.title}
          </h3>

          {showIssuer ? (
            <p className="mt-1 text-sm text-ink-muted">
              {credential.issuerName} · {formatDate(credential.issueDate)}
            </p>
          ) : null}

          <p className="mt-2 text-[15px] leading-relaxed text-ink">
            {credential.summary}
          </p>

          {showEvidence && credential.evidence.facts?.length ? (
            <dl className="mt-3 grid grid-cols-1 gap-x-6 gap-y-1.5 border-t border-line pt-3 sm:grid-cols-2">
              {credential.evidence.facts.map((f) => (
                <div key={f.label} className="flex justify-between gap-3 text-sm">
                  <dt className="text-ink-muted">{f.label}</dt>
                  <dd className="text-right font-medium text-ink">{f.value}</dd>
                </div>
              ))}
            </dl>
          ) : null}

          {showResidentNote && credential.residentNote ? (
            <p className="mt-3 border-l-2 border-accent/30 pl-3 text-[15px] italic leading-relaxed text-ink-muted">
              “{credential.residentNote}”
              <span className="mt-0.5 block text-xs not-italic text-ink-faint">
                Note from the resident
              </span>
            </p>
          ) : null}

          {children ? <div className="mt-3">{children}</div> : null}
        </div>
      </div>
    </article>
  );
}
