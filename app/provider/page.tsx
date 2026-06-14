"use client";

import { AppShell } from "@/components/app-shell";
import { ProviderConsole } from "@/components/provider-console";
import { LocalDataGate } from "@/components/local-data-gate";
import { useLocalQuery } from "@/lib/local/hooks";
import { listProviders, listResidents } from "@/lib/local/db";

export default function ProviderPage() {
  const query = useLocalQuery(async () => {
    const [providers, residents] = await Promise.all([
      listProviders(),
      listResidents(),
    ]);
    return { providers, residents };
  }, []);

  return (
    <AppShell
      context="Provider"
      links={[
        { href: "/wallet", label: "Wallet" },
        { href: "/admin", label: "Admin" },
      ]}
    >
      <LocalDataGate loading={query.loading}>
        {query.data ? (
          <ProviderConsole
            providers={query.data.providers}
            residents={query.data.residents}
          />
        ) : null}
      </LocalDataGate>
    </AppShell>
  );
}
