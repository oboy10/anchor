import { cn } from "@/lib/cn";
import { formatDate } from "@/lib/format";
import { CREDENTIAL_TYPE_LABELS, type Credential } from "@/types";
import { CredentialIcon } from "./credential-meta";
import { StatusBadge } from "./ui/status-badge";

export interface TimelineItemProps {
  credential: Credential;
  isLast?: boolean;
  onEditNote?: () => void;
  className?: string;
}

export function TimelineItem({
  credential,
  isLast,
  onEditNote,
  className,
}: TimelineItemProps) {
  return (
    <div className={cn("relative flex gap-4 pb-8", className)}>
      {!isLast ? (
        <span
          className="absolute left-[17px] top-10 h-[calc(100%-1.5rem)] w-px bg-line"
          aria-hidden
        />
      ) : null}

      <span className="relative z-10 flex size-9 shrink-0 items-center justify-center rounded-lg border border-line bg-surface text-accent shadow-card">
        <CredentialIcon type={credential.credentialType} className="size-[18px]" />
      </span>

      <div className="min-w-0 flex-1 pt-0.5">
        <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
          <time
            dateTime={credential.issueDate}
            className="text-sm text-ink-muted"
          >
            {formatDate(credential.issueDate)}
          </time>
          <span className="text-ink-faint">·</span>
          <span className="text-xs font-medium uppercase tracking-wide text-ink-faint">
            {CREDENTIAL_TYPE_LABELS[credential.credentialType]}
          </span>
          {credential.status === "corrected" ? (
            <StatusBadge tone="warning">Corrected</StatusBadge>
          ) : (
            <StatusBadge tone="verified">Verified</StatusBadge>
          )}
        </div>

        <h3 className="mt-1 text-[17px] font-semibold leading-snug text-ink">
          {credential.title}
        </h3>
        <p className="mt-0.5 text-sm text-ink-muted">
          {credential.issuerName}
        </p>
        <p className="mt-2 text-[15px] leading-relaxed text-ink">
          {credential.summary}
        </p>

        {credential.evidence.metric ? (
          <p className="mt-2 text-sm font-medium text-accent-ink">
            {credential.evidence.metric}
          </p>
        ) : null}

        {credential.residentNote ? (
          <p className="mt-2 border-l-2 border-line-strong pl-3 text-sm italic text-ink-muted">
            “{credential.residentNote}”
          </p>
        ) : null}

        {onEditNote ? (
          <button
            type="button"
            onClick={onEditNote}
            className="mt-2 text-sm font-medium text-accent hover:text-accent-hover"
          >
            {credential.residentNote ? "Edit your note" : "Add a personal note"}
          </button>
        ) : null}
      </div>
    </div>
  );
}
