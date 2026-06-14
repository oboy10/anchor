import { AppShell } from "@/components/app-shell";
import { ProviderContent } from "./provider-client";

export default function ProviderPage() {
  return (
    <AppShell
      context="Provider"
      links={[
        { href: "/wallet", label: "Wallet" },
        { href: "/admin", label: "Admin" },
      ]}
    >
      <ProviderContent />
    </AppShell>
  );
}
