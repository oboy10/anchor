import { AppShell } from "@/components/app-shell";
import { ProviderConsole } from "@/components/provider-console";
import { listProviders, listResidents } from "@/lib/data";

export const metadata = {
  title: "Provider console",
};

export default async function ProviderPage() {
  const providers = await listProviders();
  const residents = await listResidents();

  return (
    <AppShell
      context="Provider"
      links={[
        { href: "/demo", label: "Demo" },
        { href: "/resident/r_marcus", label: "Wallet" },
        { href: "/admin", label: "Admin" },
      ]}
    >
      <ProviderConsole providers={providers} residents={residents} />
    </AppShell>
  );
}
