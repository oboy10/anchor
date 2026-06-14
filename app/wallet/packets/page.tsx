"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { AppShell } from "@/components/app-shell";
import { WalletTabs } from "@/components/wallet-tabs";
import { PacketsList } from "@/components/packets-list";
import { BuildPacketButton } from "@/components/build-packet-button";
import { LocalDataGate } from "@/components/local-data-gate";
import { SectionHeader } from "@/components/section-header";
import { useAuth } from "@/components/auth-provider";
import { useLocalQuery } from "@/lib/local/hooks";
import { revokePacketAction } from "@/lib/local/actions";
import {
  getActiveResident,
  getLedger,
  listPacketsForResident,
} from "@/lib/local/db";

export default function PacketsPage() {
  const { active, loading } = useAuth();
  const router = useRouter();

  React.useEffect(() => {
    if (!loading && !active) router.replace("/sign-in");
  }, [loading, active, router]);

  const query = useLocalQuery(async () => {
    const resident = await getActiveResident();
    if (!resident) return null;
    const [credentials, packets] = await Promise.all([
      getLedger(resident.fingerprint),
      listPacketsForResident(resident.fingerprint),
    ]);
    return { resident, credentials, packets };
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
              <div className="flex flex-wrap items-start justify-between gap-3">
                <SectionHeader
                  as="h1"
                  serif
                  title="Share packets"
                  description="Time-limited links carrying only the credentials you choose. Revoke any of them at any time."
                />
                <BuildPacketButton
                  residentId={query.data.resident.slug}
                  credentials={query.data.credentials}
                />
              </div>
              <PacketsList
                packets={query.data.packets}
                onRevoke={async (token) => {
                  await revokePacketAction(query.data!.resident.slug, token);
                }}
              />
            </div>
          ) : null}
        </LocalDataGate>
      </div>
    </AppShell>
  );
}
