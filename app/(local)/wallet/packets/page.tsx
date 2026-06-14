import { AppShell } from "@/components/app-shell";
import { PacketsContent } from "./packets-client";

export default function PacketsPage() {
  return (
    <AppShell context="Wallet" links={[{ href: "/provider", label: "Provider" }]}>
      <PacketsContent />
    </AppShell>
  );
}
