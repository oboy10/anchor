import { Suspense } from "react";
import { AppShell } from "@/components/app-shell";
import { SignInPanel } from "@/components/sign-in-panel";

export const metadata = {
  title: "Sign in",
};

export default function SignInPage() {
  return (
    <AppShell context="Sign in" links={[{ href: "/demo", label: "Demo" }]}>
      <Suspense fallback={null}>
        <SignInPanel />
      </Suspense>
    </AppShell>
  );
}
