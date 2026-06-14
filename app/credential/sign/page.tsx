import { Suspense } from "react";
import { AppShell } from "@/components/app-shell";
import { CredentialSigner } from "@/components/credential-signer";

export const metadata = {
  title: "Sign credential",
};

export default function SignCredentialPage() {
  return (
    <AppShell context="Wallet">
      <Suspense fallback={<p className="text-sm text-ink-muted">Loading…</p>}>
        <CredentialSigner />
      </Suspense>
    </AppShell>
  );
}
