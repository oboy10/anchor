import { Suspense } from "react";
import { AcceptCredentialContent } from "./accept-client";

export const metadata = {
  title: "Accept credential",
};

export default function AcceptCredentialPage() {
  return (
    <Suspense fallback={<p className="p-8 text-sm text-ink-muted">Loading credential…</p>}>
      <AcceptCredentialContent />
    </Suspense>
  );
}
