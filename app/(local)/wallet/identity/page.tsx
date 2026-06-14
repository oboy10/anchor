import { AppShell } from "@/components/app-shell";
import { VerifyIdentityContent } from "./identity-client";

export default function VerifyIdentityPage() {
  return (
    <AppShell context="Wallet" links={[{ href: "/provider", label: "Provider" }]}>
      <VerifyIdentityContent />
    </AppShell>
  );
}
