"use client";

import Link from "next/link";
import { AppShell } from "@/components/app-shell";
import { ResidentDashboard } from "@/components/resident-dashboard";
import { LocalDataGate } from "@/components/local-data-gate";
import { InlineNotice } from "@/components/ui/inline-notice";
import { useAuth } from "@/components/auth-provider";
import { useLocalQuery } from "@/lib/local/hooks";
import {
  getActiveResident,
  getLedger,
  getVouches,
  listPacketsForResident,
} from "@/lib/local/db";
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

export default function WalletPage() {
  const { active } = useAuth();
  const query = useLocalQuery(async () => {
    const resident = await getActiveResident();
    if (!resident) return null;
    const [credentials, packets, vouches] = await Promise.all([
      getLedger(resident.fingerprint),
      listPacketsForResident(resident.fingerprint),
      getVouches(resident.fingerprint),
    ]);
    return { resident, credentials, packets, vouches };
  }, []);

  const isOwnAccount =
    Boolean(active) && active?.fingerprint === query.data?.resident.fingerprint;

  return (
    <AppShell
      context="Wallet"
      links={[
        { href: "/demo", label: "Demo" },
        { href: "/provider", label: "Provider" },
      ]}
    >
      <LocalDataGate
        loading={query.loading}
        missing={!query.data}
        missingTitle="No wallet yet"
        missingBody="Create an account to generate your identity keypair, or reseed demo data from the admin page."
      >
        {query.data ? (
          <div className="space-y-6">
            {!active ? (
              <InlineNotice tone="calm" title="You're viewing sample data">
                This is a demo wallet.{" "}
                <Link href="/sign-in?new=1" className="font-medium text-accent hover:text-accent-hover">
                  Create your own account
                </Link>{" "}
                to generate a private identity and verify your contact details.
              </InlineNotice>
            ) : null}
            <ResidentDashboard
              resident={query.data.resident}
              credentials={query.data.credentials}
              packets={query.data.packets}
              verified={verifiedContacts(query.data.vouches)}
              canVerify={isOwnAccount}
            />
          </div>
        ) : null}
      </LocalDataGate>
    </AppShell>
  );
}
