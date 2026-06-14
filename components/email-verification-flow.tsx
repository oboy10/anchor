"use client";

import * as React from "react";
import { BadgeCheck } from "lucide-react";
import { addVouch } from "@/lib/local/db";
import { markVerified } from "@/lib/local/accounts";
import type { Attestation, Fingerprint } from "@/types";
import { FormField } from "./ui/field";
import { Button } from "./ui/button";
import { InlineNotice } from "./ui/inline-notice";

interface StartResponse {
  ok: boolean;
  error?: string;
  value?: string;
  delivered?: boolean;
  devCode?: string;
}

interface ConfirmResponse {
  ok: boolean;
  error?: string;
  attestation?: Attestation;
  verifier?: { fingerprint: Fingerprint; publicKey: string };
}

export interface EmailVerificationFlowProps {
  fingerprint: Fingerprint;
  /** Pre-filled email (e.g. from sign-up). */
  initialEmail?: string;
  /** When true, the email field is read-only after the first send. */
  lockEmail?: boolean;
  onVerified?: (email: string) => void;
  className?: string;
}

/**
 * Send a verification code to an email, confirm it, and record the vouch +
 * account.verifiedEmail. Shared by sign-up and the profile page.
 */
export function EmailVerificationFlow({
  fingerprint,
  initialEmail = "",
  lockEmail = false,
  onVerified,
  className,
}: EmailVerificationFlowProps) {
  const [email, setEmail] = React.useState(initialEmail);
  const [normalizedEmail, setNormalizedEmail] = React.useState("");
  const [code, setCode] = React.useState("");
  const [step, setStep] = React.useState<"enter" | "code">(
    initialEmail ? "enter" : "enter",
  );
  const [devCode, setDevCode] = React.useState<string | null>(null);
  const [error, setError] = React.useState<string | null>(null);
  const [notice, setNotice] = React.useState<string | null>(null);
  const [pending, setPending] = React.useState(false);
  const [verified, setVerified] = React.useState(false);

  async function sendCode(e?: React.FormEvent) {
    e?.preventDefault();
    setError(null);
    setNotice(null);
    setPending(true);
    try {
      const res = await fetch("/api/verify/start", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ channel: "email", value: email }),
      });
      const data = (await res.json()) as StartResponse;
      if (!res.ok || !data.ok) {
        setError(data.error ?? "Could not send a code.");
        return;
      }
      setNormalizedEmail(data.value ?? email.trim().toLowerCase());
      setDevCode(data.devCode ?? null);
      setNotice(
        data.delivered
          ? "Code sent to your email. Enter it below."
          : "Email delivery isn't configured — use the development code below.",
      );
      setStep("code");
    } catch {
      setError("Could not reach the verification service.");
    } finally {
      setPending(false);
    }
  }

  async function confirmCode(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setPending(true);
    try {
      const res = await fetch("/api/verify/confirm", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          channel: "email",
          value: normalizedEmail,
          code,
          fingerprint,
        }),
      });
      const data = (await res.json()) as ConfirmResponse;
      if (!res.ok || !data.ok || !data.attestation || !data.verifier) {
        setError(data.error ?? "Could not verify that code.");
        return;
      }
      await addVouch(fingerprint, data.attestation, data.verifier);
      markVerified(fingerprint, { email: normalizedEmail });
      setVerified(true);
      setNotice("Email verified. You can receive credentials by email.");
      onVerified?.(normalizedEmail);
    } catch {
      setError("Could not reach the verification service.");
    } finally {
      setPending(false);
    }
  }

  if (verified) {
    return (
      <InlineNotice tone="calm" title="Email verified" className={className}>
        {normalizedEmail || email} is linked to your Anchor identity.
      </InlineNotice>
    );
  }

  if (step === "code") {
    return (
      <form className={className ?? "space-y-3"} onSubmit={confirmCode}>
        {notice ? <p className="text-sm text-ink-muted">{notice}</p> : null}
        {devCode ? (
          <InlineNotice tone="warning" title="Development code">
            Your code is{" "}
            <code className="rounded bg-surface-sunken px-1 font-mono">{devCode}</code>.
          </InlineNotice>
        ) : null}
        <FormField
          label="6-digit code"
          inputMode="numeric"
          maxLength={6}
          placeholder="000000"
          value={code}
          onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))}
          required
        />
        {error ? <p className="text-sm text-danger">{error}</p> : null}
        <div className="flex flex-wrap gap-2">
          <Button type="submit" disabled={pending || code.length !== 6}>
            <BadgeCheck className="size-4" aria-hidden />
            {pending ? "Verifying…" : "Verify email"}
          </Button>
          <Button
            type="button"
            variant="ghost"
            disabled={pending}
            onClick={() => {
              setStep("enter");
              setCode("");
              setDevCode(null);
              setError(null);
            }}
          >
            Change email
          </Button>
        </div>
      </form>
    );
  }

  return (
    <form className={className ?? "space-y-3"} onSubmit={sendCode}>
      <FormField
        label="Email address"
        type="email"
        inputMode="email"
        placeholder="you@example.com"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        hint="Used to receive credentials from shelters, landlords, and employers."
        disabled={lockEmail && Boolean(initialEmail)}
        required
      />
      {error ? <p className="text-sm text-danger">{error}</p> : null}
      <Button type="submit" disabled={pending || !email.trim()}>
        {pending ? "Sending…" : "Send verification code"}
      </Button>
    </form>
  );
}
