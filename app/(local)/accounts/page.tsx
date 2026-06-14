import { AppShell } from "@/components/app-shell";
import { AccountsContent } from "./accounts-client";

export default function AccountsPage() {
  return (
    <AppShell
      context="Accounts"
      links={[{ href: "/wallet", label: "Wallet" }]}
    >
      <AccountsContent />
    </AppShell>
  );
}
