"use client";

import { use } from "react";
import { AppShell } from "@/components/app-shell";
import { ResidentDashboard } from "@/components/resident-dashboard";
import { LocalDataGate } from "@/components/local-data-gate";
import { useLocalQuery } from "@/lib/local/hooks";
import { getLedger, getResident, listPacketsForResident } from "@/lib/local/db";

export default function ResidentPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const query = useLocalQuery(async () => {
    const resident = await getResident(id);
    if (!resident) return null;
    const [credentials, packets] = await Promise.all([
      getLedger(id),
      listPacketsForResident(id),
    ]);
    return { resident, credentials, packets };
  }, [id]);

  return (
    <AppShell
      context="Resident wallet"
      links={[
        { href: "/demo", label: "Demo" },
        { href: "/provider", label: "Provider" },
        { href: `/verify/demo-maple-street`, label: "Sample packet" },
      ]}
    >
      <LocalDataGate
        loading={query.loading}
        missing={!query.data}
        missingTitle="Resident not found"
        missingBody="This wallet does not exist in your local data."
      >
        {query.data ? (
          <ResidentDashboard
            resident={query.data.resident}
            credentials={query.data.credentials}
            packets={query.data.packets}
          />
        ) : null}
      </LocalDataGate>
    </AppShell>
  );
}
