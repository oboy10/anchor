"use client";

import * as React from "react";
import { Suspense } from "react";
import { useRouter } from "next/navigation";
import { AppShell } from "@/components/app-shell";
import { WalletTabs } from "@/components/wallet-tabs";
import { CredentialSigner } from "@/components/credential-signer";
import { useAuth } from "@/components/auth-provider";

export default function IssuePage() {
  const { active, loading } = useAuth();
  const router = useRouter();

  React.useEffect(() => {
    if (!loading && !active) router.replace("/sign-in");
  }, [loading, active, router]);

  if (!loading && !active) return null;

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
