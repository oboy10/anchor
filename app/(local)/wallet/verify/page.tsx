import { AppShell } from "@/components/app-shell";
import { VerifyCredentialsContent } from "./verify-client";

export default function VerifyCredentialsPage() {
  return (
    <AppShell context="Wallet" links={[{ href: "/provider", label: "Provider" }]}>
      <VerifyCredentialsContent />
    </AppShell>
  );
}
