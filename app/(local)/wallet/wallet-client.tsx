"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { ResidentDashboard } from "@/components/resident-dashboard";
import { WalletTabs } from "@/components/wallet-tabs";
import { LocalDataGate } from "@/components/local-data-gate";
import { useAuth } from "@/components/auth-provider";
import { useLocalQuery } from "@/lib/local/hooks";
import { getActiveResident, getLedger } from "@/lib/local/db";

export function WalletContent() {
  const { active, loading } = useAuth();
  const router = useRouter();

  React.useEffect(() => {
    if (!loading && !active) router.replace("/sign-in");
  }, [loading, active, router]);

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
