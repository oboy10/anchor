"use client";

import * as React from "react";
import { Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";

/**
 * Issuers and users are the same identity now — credential signing lives in the
 * wallet dashboard. This route just forwards (preserving query params) so older
 * links keep working.
 */
function ProviderRedirect() {
  const router = useRouter();
  const params = useSearchParams();
  React.useEffect(() => {
    const qs = params.toString();
    router.replace(`/wallet/issue${qs ? `?${qs}` : ""}`);
  }, [router, params]);
  return null;
}

export default function ProviderPage() {
  return (
    <Suspense fallback={null}>
      <ProviderRedirect />
    </Suspense>
  );
}
