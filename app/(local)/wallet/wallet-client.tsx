"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ResidentDashboard } from "@/components/resident-dashboard";
import { WalletTabs } from "@/components/wallet-tabs";
import { LocalDataGate } from "@/components/local-data-gate";
import { InlineNotice } from "@/components/ui/inline-notice";
import { useAuth } from "@/components/auth-provider";
import { useLocalQuery } from "@/lib/local/hooks";
import { syncCredentialInboxAction } from "@/lib/local/actions";
import { getActiveResident, getLedger } from "@/lib/local/db";

export function WalletContent() {
  const { active, loading } = useAuth();
  const router = useRouter();

  React.useEffect(() => {
    if (!loading && !active) router.replace("/sign-in");
  }, [loading, active, router]);

  // Pull delivered credentials into the wallet automatically (request flow + email inbox).
  React.useEffect(() => {
    if (!active?.verifiedEmail) return;

    async function sync() {
      await syncCredentialInboxAction();
    }

    sync();
    const interval = window.setInterval(sync, 15000);
    return () => window.clearInterval(interval);
  }, [active?.verifiedEmail, active?.fingerprint]);

  const query = useLocalQuery(async () => {
    const resident = await getActiveResident();
    if (!resident) return null;
    const credentials = await getLedger(resident.fingerprint);
    return { resident, credentials };
  }, []);

  // Signed-out visitors are redirected to /sign-in; render nothing meanwhile.
  if (!loading && !active) return null;

  return (
    <>
      <WalletTabs />
      <div className="mt-8">
        {!loading && active && !active.verifiedEmail ? (
          <InlineNotice tone="warning" className="mb-6" title="Verify your email">
            Add and verify your email so organizations can send you credentials directly.{" "}
            <Link href="/wallet/identity" className="font-medium text-accent hover:text-accent-hover">
              Verify on Edit profile
            </Link>
            {active.pendingEmail ? (
              <>
                {" "}
                (pending: {active.pendingEmail})
              </>
            ) : null}
          </InlineNotice>
        ) : null}
        <LocalDataGate
          loading={loading || query.loading}
          missing={!query.data}
          missingTitle="No wallet yet"
          missingBody="Create an account to generate your identity keypair."
        >
          {query.data ? (
            <ResidentDashboard
              resident={query.data.resident}
              credentials={query.data.credentials}
            />
          ) : null}
        </LocalDataGate>
      </div>
    </>
  );
}
