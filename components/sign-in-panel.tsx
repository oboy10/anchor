"use client";

import { Plus } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { useAuth } from "./auth-provider";
import { AccountUnlockForm } from "./account-unlock-form";
import { EmailVerificationFlow } from "./email-verification-flow";
import { SectionHeader } from "./section-header";
import { Button } from "./ui/button";
import { FormField } from "./ui/field";
import { InlineNotice } from "./ui/inline-notice";
import type { AccountMeta } from "@/lib/local/accounts";

/**
 * Sign-in surface for local keypair accounts: create a new password-protected
 * identity, or unlock one already stored on this device. No server-side auth.
 */
export function SignInPanel() {
  const { accounts, createAccount, unlock, loading } = useAuth();
  const router = useRouter();
  const params = useSearchParams();
  const nextPath = params.get("next");
  const redirectTo =
    nextPath && nextPath.startsWith("/") && !nextPath.startsWith("//")
      ? nextPath
      : "/wallet";
  const forceCreate = params.get("new") === "1";
  const forceUnlock = params.get("unlock") === "1";
  const [mode, setMode] = useState<"create" | "unlock">("unlock");

  useEffect(() => {
    if (loading) return;
    if (forceCreate) {
      setMode("create");
      return;
    }
    if (forceUnlock) {
      setMode("unlock");
      return;
    }
    setMode(accounts.length === 0 ? "create" : "unlock");
  }, [loading, accounts.length, forceCreate, forceUnlock]);

  if (loading) {
    return <p className="text-sm text-ink-muted">Loading accounts on this device…</p>;
  }

  return (
    <div className="mx-auto max-w-md space-y-8">
      <SectionHeader
        as="h1"
        serif
        title="Sign in"
        description="Your identity is an Ed25519 keypair stored — password-protected — only in this browser. Verifiers do not need an account."
      />

      <div className="flex gap-2 rounded-lg border border-line bg-surface-sunken p-1">
        <ModeTab active={mode === "create"} onClick={() => setMode("create")}>
          Create account
        </ModeTab>
        <ModeTab
          active={mode === "unlock"}
          onClick={() => setMode("unlock")}
          disabled={accounts.length === 0}
        >
          Unlock existing
        </ModeTab>
      </div>

      {mode === "create" ? (
        <CreateAccountForm
          onDone={() => router.push(redirectTo)}
          createAccount={createAccount}
        />
      ) : (
        <AccountUnlockForm
          onDone={() => router.push(redirectTo)}
          unlock={unlock}
          accounts={accounts}
        />
      )}

    </div>
  );
}

function ModeTab({
  active,
  disabled,
  onClick,
  children,
}: {
  active: boolean;
  disabled?: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={
        "flex-1 rounded-md px-3 py-1.5 text-sm font-medium transition-colors disabled:opacity-40 " +
        (active ? "bg-surface text-ink shadow-card" : "text-ink-muted hover:text-ink")
      }
    >
      {children}
    </button>
  );
}

function CreateAccountForm({
  onDone,
  createAccount,
}: {
  onDone: () => void;
  createAccount: (label: string, password: string, email?: string) => Promise<AccountMeta>;
}) {
  const [step, setStep] = useState<"account" | "verify">("account");
  const [created, setCreated] = useState<AccountMeta | null>(null);
  const [label, setLabel] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function submitAccount(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!email.trim()) {
      setError("Enter your email address.");
      return;
    }
    if (password.length < 8) {
      setError("Password must be at least 8 characters.");
      return;
    }
    if (password !== confirm) {
      setError("Passwords do not match.");
      return;
    }
    setPending(true);
    try {
      const meta = await createAccount(label, password, email);
      setCreated(meta);
      setStep("verify");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not create account.");
    } finally {
      setPending(false);
    }
  }

  if (step === "verify" && created) {
    return (
      <div className="space-y-4">
        <InlineNotice tone="calm" title="Verify your email">
          Confirm your email so organizations can send you signed credentials directly.
          You can skip this step, but you won&apos;t receive credentials by email until
          you verify.
        </InlineNotice>
        <EmailVerificationFlow
          fingerprint={created.fingerprint}
          initialEmail={email.trim().toLowerCase()}
          lockEmail
          onVerified={() => onDone()}
        />
        <Button type="button" variant="ghost" className="w-full" onClick={onDone}>
          Skip for now
        </Button>
      </div>
    );
  }

  return (
    <form className="space-y-4" onSubmit={submitAccount}>
      <InlineNotice tone="calm" title="A new keypair is generated on this device">
        Your private key is encrypted with this password and never leaves your
        browser. There is no recovery if you lose it — keep the password safe.
      </InlineNotice>
      <FormField
        label="Account name"
        placeholder="e.g. Marcus R."
        value={label}
        onChange={(e) => setLabel(e.target.value)}
        autoComplete="name"
      />
      <FormField
        label="Email address"
        type="email"
        inputMode="email"
        placeholder="you@example.com"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        hint="Required — used to receive credentials from organizations."
        autoComplete="email"
        required
      />
      <FormField
        label="Password"
        type="password"
        autoComplete="new-password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        hint="At least 8 characters. Encrypts your private key."
        required
      />
      <FormField
        label="Confirm password"
        type="password"
        autoComplete="new-password"
        value={confirm}
        onChange={(e) => setConfirm(e.target.value)}
        required
      />
      {error ? <p className="text-sm text-danger">{error}</p> : null}
      <Button type="submit" disabled={pending} className="w-full">
        <Plus className="size-4" aria-hidden />
        {pending ? "Creating…" : "Create account"}
      </Button>
    </form>
  );
}
