"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { AppShell } from "@/components/app-shell";
import { WalletTabs } from "@/components/wallet-tabs";
import { VerifyIdentityCard } from "@/components/verify-identity-card";
import { LocalDataGate } from "@/components/local-data-gate";
import { SectionHeader } from "@/components/section-header";
import { useAuth } from "@/components/auth-provider";
import { useLocalQuery } from "@/lib/local/hooks";
import { getActiveResident, getVouches } from "@/lib/local/db";
import type { Attestation } from "@/types";

/** Parse verified contact attributes out of the Anchor identity vouches. */
function verifiedContacts(vouches: Attestation[]): { email?: string; phone?: string } {
  const out: { email?: string; phone?: string } = {};
  for (const v of vouches) {
    for (const p of v.properties) {
      if (p.key === "a.id:email") out.email = p.value;
      if (p.key === "a.id:phone") out.phone = p.value;
    }
  }
  return out;
}

export default function VerifyIdentityPage() {
  const { active, loading } = useAuth();
  const router = useRouter();

  React.useEffect(() => {
    if (!loading && !active) router.replace("/sign-in");
  }, [loading, active, router]);

  const query = useLocalQuery(async () => {
    const resident = await getActiveResident();
    if (!resident) return null;
    const vouches = await getVouches(resident.fingerprint);
    return { resident, verified: verifiedContacts(vouches) };
  }, []);

  if (!loading && !active) return null;

  return (
    <AppShell context="Wallet" links={[{ href: "/provider", label: "Provider" }]}>
      <WalletTabs />
      <div className="mt-8">
        <LocalDataGate
          loading={loading || query.loading}
          missing={!query.data}
          missingTitle="No wallet yet"
          missingBody="Create an account to generate your identity keypair."
        >
          {query.data ? (
            <div className="space-y-6">
              <SectionHeader
                as="h1"
                serif
                title="Verify your identity"
                description="Confirm an email or phone number so Anchor can vouch it's yours. Verified contacts are recorded as signed attestations in your ledger."
              />
              <VerifyIdentityCard
                fingerprint={query.data.resident.fingerprint}
                verified={query.data.verified}
              />
            </div>
          ) : null}
        </LocalDataGate>
      </div>
    </AppShell>
  );
}
