"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { DEMO_AUTH_ACCOUNTS, DEMO_AUTH_PASSWORD, VERIFIER_DEMO_URL } from "@/lib/auth/demo-accounts";
import { useAuth } from "./auth-provider";
import { SectionHeader } from "./section-header";
import { FormField } from "./ui/field";
import { Button } from "./ui/button";
import { InlineNotice } from "./ui/inline-notice";
import { isFirebaseClientConfigured } from "@/lib/firebase/client";

export function SignInPanel() {
  const { signIn } = useAuth();
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState(DEMO_AUTH_PASSWORD);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  if (!isFirebaseClientConfigured()) {
    return (
      <InlineNotice tone="warning" title="Firebase not configured">
        Add NEXT_PUBLIC_FIREBASE_* variables to your environment and redeploy.
      </InlineNotice>
    );
  }

  async function handleSignIn(targetEmail: string, targetPassword: string) {
    setPending(true);
    setError(null);
    try {
      await signIn(targetEmail, targetPassword);
      const account = DEMO_AUTH_ACCOUNTS.find((a) => a.email === targetEmail);
      router.push(account?.redirect ?? "/demo");
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Sign in failed.";
      setError(msg.includes("invalid-credential") || msg.includes("user-not-found")
        ? "Account not found. Run npm run seed to create demo users in Firebase Auth."
        : msg);
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="space-y-8">
      <SectionHeader
        as="h1"
        serif
        title="Sign in"
        description="Use a demo account below, or enter email and password. Verifiers do not need an account."
      />

      <form
        className="mx-auto max-w-md space-y-4"
        onSubmit={(e) => {
          e.preventDefault();
          handleSignIn(email, password);
        }}
      >
        <FormField
          label="Email"
          type="email"
          autoComplete="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
        />
        <FormField
          label="Password"
          type="password"
          autoComplete="current-password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
        />
        {error ? <p className="text-sm text-danger">{error}</p> : null}
        <Button type="submit" disabled={pending} className="w-full">
          {pending ? "Signing in…" : "Sign in"}
        </Button>
      </form>

      <section>
        <h2 className="text-sm font-semibold uppercase tracking-wide text-ink-muted">
          Demo accounts
        </h2>
        <p className="mt-1 text-sm text-ink-muted">
          Password for all demo accounts:{" "}
          <code className="rounded bg-surface-sunken px-1 text-xs">{DEMO_AUTH_PASSWORD}</code>
        </p>
        <ul className="mt-4 grid gap-2 sm:grid-cols-2">
          {DEMO_AUTH_ACCOUNTS.map((account) => (
            <li key={account.email}>
              <button
                type="button"
                disabled={pending}
                onClick={() => handleSignIn(account.email, DEMO_AUTH_PASSWORD)}
                className="w-full rounded-lg border border-line bg-surface px-4 py-3 text-left text-sm transition-shadow hover:shadow-card"
              >
                <span className="font-medium text-ink">{account.label}</span>
                <span className="mt-0.5 block text-ink-muted">{account.email}</span>
              </button>
            </li>
          ))}
        </ul>
      </section>

      <section className="border-t border-line pt-6">
        <h2 className="text-sm font-semibold text-ink">Verifier (no sign-in)</h2>
        <p className="mt-1 text-sm text-ink-muted">
          Landlords and employers open a share link — no account required.
        </p>
        <Link href={VERIFIER_DEMO_URL} className="mt-3 inline-block text-sm font-medium text-accent hover:text-accent-hover">
          Open sample verification packet →
        </Link>
      </section>
    </div>
  );
}

export function AuthHeaderControls() {
  const { user, profile, loading, signOutUser } = useAuth();

  if (loading) return null;

  if (!user) {
    return (
      <Link
        href="/sign-in"
        className="rounded-md px-3 py-1.5 text-sm font-medium text-accent hover:bg-surface-sunken"
      >
        Sign in
      </Link>
    );
  }

  return (
    <div className="flex items-center gap-2">
      <span className="hidden text-xs text-ink-muted sm:inline">
        {profile?.role ?? "signed in"}
      </span>
      <button
        type="button"
        onClick={() => signOutUser()}
        className="rounded-md px-3 py-1.5 text-sm font-medium text-ink-muted hover:bg-surface-sunken hover:text-ink"
      >
        Sign out
      </button>
    </div>
  );
}
