import { AppShell } from "@/components/app-shell";
import { IssueRequestContent } from "./issue-client";

export default function WalletIssuePage() {
  return (
    <AppShell context="Credential request" links={[{ href: "/wallet", label: "Wallet" }]}>
      <IssueRequestContent />
    </AppShell>
  );
}
