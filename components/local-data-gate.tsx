"use client";

import * as React from "react";
import { InlineNotice } from "./ui/inline-notice";

export interface LocalDataGateProps {
  loading: boolean;
  missing?: boolean;
  missingTitle?: string;
  missingBody?: string;
  children: React.ReactNode;
}

/**
 * Loading/empty wrapper for local-first pages. Data is read from the browser
 * after mount, so there is a brief loading window on every page.
 */
export function LocalDataGate({
  loading,
  missing,
  missingTitle = "Not found",
  missingBody = "This item does not exist in your local data.",
  children,
}: LocalDataGateProps) {
  if (loading) {
    return (
      <p className="text-sm text-ink-muted" role="status" aria-live="polite">
        Loading your local data…
      </p>
    );
  }
  if (missing) {
    return (
      <InlineNotice tone="warning" title={missingTitle}>
        {missingBody}
      </InlineNotice>
    );
  }
  return <>{children}</>;
}
