import { AppShell } from "@/components/app-shell";
import { WalletContent } from "./wallet-client";

export default function WalletPage() {
  return (
    <AppShell
      context="Wallet"
      links={[{ href: "/provider", label: "Provider" }]}
    >
      <WalletContent />
    </AppShell>
  );
}
