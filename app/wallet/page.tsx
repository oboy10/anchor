"use client";

import { AppShell } from "@/components/app-shell";
import { ResidentDashboard } from "@/components/resident-dashboard";
import { LocalDataGate } from "@/components/local-data-gate";
import { SelectField } from "@/components/ui/field";
import { useLocalQuery } from "@/lib/local/hooks";
import {
  getActiveResident,
  getLedger,
  listPacketsForResident,
  listResidents,
  setActiveResident,
} from "@/lib/local/db";

export default function WalletPage() {
  const query = useLocalQuery(async () => {
    const resident = await getActiveResident();
    if (!resident) return null;
    const [credentials, packets, residents] = await Promise.all([
      getLedger(resident.fingerprint),
      listPacketsForResident(resident.fingerprint),
      listResidents(),
    ]);
    return { resident, credentials, packets, residents };
  }, []);

  return (
    <AppShell
      context="Wallet"
      links={[
        { href: "/demo", label: "Demo" },
        { href: "/provider", label: "Provider" },
        { href: "/verify?token=demo-maple-street", label: "Sample packet" },
      ]}
    >
      <LocalDataGate
        loading={query.loading}
        missing={!query.data}
        missingTitle="No wallet yet"
        missingBody="Your local data has no resident identity. Reseed demo data from the admin page."
      >
        {query.data ? (
          <div className="space-y-6">
            {query.data.residents.length > 1 ? (
              <div className="max-w-xs">
                <SelectField
                  label="Active identity (stored only in this browser)"
                  value={query.data.resident.fingerprint}
                  onChange={(e) => setActiveResident(e.target.value)}
                  options={query.data.residents.map((r) => ({
                    value: r.fingerprint,
                    label: r.displayName,
                  }))}
                />
              </div>
            ) : null}
            <ResidentDashboard
              resident={query.data.resident}
              credentials={query.data.credentials}
              packets={query.data.packets}
            />
          </div>
        ) : null}
      </LocalDataGate>
    </AppShell>
  );
}
