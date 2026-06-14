import { Suspense } from "react";
import { AppShell } from "@/components/app-shell";
import { CredentialSigner } from "@/components/credential-signer";
import { WalletTabs } from "@/components/wallet-tabs";

export default function IssuePage() {
  return (
    <AppShell context="Wallet">
      <WalletTabs />
      <div className="mt-8">
        <Suspense fallback={null}>
          <CredentialSigner />
        </Suspense>
      </div>
    </AppShell>
  );
}
