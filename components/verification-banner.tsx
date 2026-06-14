import * as React from "react";
import { ShieldCheck, ShieldAlert } from "lucide-react";
import { cn } from "@/lib/cn";
import type { VerificationResult } from "@/types";

export interface VerificationBannerProps {
  result: VerificationResult;
  className?: string;
}

/**
 * Communicates integrity state without relying on color alone: a clear icon,
 * heading, and explanatory line accompany every state.
 */
export function VerificationBanner({ result, className }: VerificationBannerProps) {
  const ok = result.chainValid && result.signaturesValid;
  return (
    <div
      className={cn(
        "flex items-start gap-3.5 rounded-card border p-4",
        ok
          ? "border-accent/25 bg-accent-soft/60"
          : "border-danger/25 bg-danger-soft/60",
        className,
      )}
      role="status"
    >
      <span className={cn("mt-0.5 shrink-0", ok ? "text-accent" : "text-danger")}>
        {ok ? (
          <ShieldCheck className="size-6" aria-hidden />
        ) : (
          <ShieldAlert className="size-6" aria-hidden />
        )}
      </span>
      <div className="space-y-1">
        <p className="font-semibold text-ink">
          {ok ? "Record verified" : "Record could not be fully verified"}
        </p>
        <p className="text-sm leading-relaxed text-ink-muted">
          {ok ? (
            <>
              All {result.entriesChecked} signed attestations verify against their
              issuers&apos; Ed25519 public keys and target this resident&apos;s fingerprint.
            </>
          ) : (
            <>
              We checked {result.entriesChecked} attestations.{" "}
              {!result.chainValid
                ? "One or more records did not verify completely. "
                : ""}
              {!result.signaturesValid
                ? "One or more Ed25519 signatures did not verify. "
                : ""}
              Treat this record with caution.
            </>
          )}
        </p>
      </div>
    </div>
  );
}
