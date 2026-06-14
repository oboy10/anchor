"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { ArrowUpRight } from "lucide-react";
import { SectionHeader } from "@/components/section-header";
import { InlineNotice } from "@/components/ui/inline-notice";
import { buttonVariants } from "@/components/ui/button";

function safeIssueUrl(raw: string | null): string {
  if (!raw || typeof window === "undefined") return "/provider";
  try {
    const parsed = new URL(raw, window.location.origin);
    if (parsed.origin !== window.location.origin) return "/provider";
    return `${parsed.pathname}${parsed.search}${parsed.hash}`;
  } catch {
    return "/provider";
  }
}

export function IssueRequestContent() {
  const searchParams = useSearchParams();
  const providerHref = safeIssueUrl(searchParams.get("url"));

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <SectionHeader
        as="h1"
        serif
        title="Issue a credential"
        description="A resident shared this request link so a provider can sign a new credential bundle for their wallet."
      />

      <InlineNotice tone="info" title="Provider action required">
        Open the provider console, issue the credential, and send the downloaded
        `.anchor` bundle back to the resident. The bundle includes the signed
        credential plus public signer details for verification.
      </InlineNotice>

      <div className="liquid-glass-subtle rounded-card p-5">
        <p className="text-sm text-ink-muted">
          This page only opens same-site provider links. External URLs are ignored
          to prevent unsafe redirects.
        </p>
        <div className="mt-4">
          <Link href={providerHref} className={buttonVariants("primary", "md")}>
            Open provider console
            <ArrowUpRight className="size-4" aria-hidden />
          </Link>
        </div>
      </div>
    </div>
  );
}
