"use client";

import { ProviderConsole } from "@/components/provider-console";
import { LocalDataGate } from "@/components/local-data-gate";
import { useLocalQuery } from "@/lib/local/hooks";
import { listProviders, listResidents } from "@/lib/local/db";

export function ProviderContent() {
  const query = useLocalQuery(async () => {
    const [providers, residents] = await Promise.all([
      listProviders(),
      listResidents(),
    ]);
    return { providers, residents };
  }, []);

  return (
    <LocalDataGate loading={query.loading}>
      {query.data ? (
        <ProviderConsole
          providers={query.data.providers}
          residents={query.data.residents}
        />
      ) : null}
    </LocalDataGate>
  );
}
