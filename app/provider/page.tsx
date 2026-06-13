import { AppShell } from "@/components/app-shell";
import { ProviderConsole } from "@/components/provider-console";
import { listProviders, listResidents } from "@/lib/data/store";

export const metadata = {
  title: "Provider console",
};

export default function ProviderPage() {
  const providers = listProviders();
  const residents = listResidents();

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
