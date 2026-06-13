"use client";

import * as React from "react";
import { BadgeCheck, Check, Mail, Phone } from "lucide-react";
import { addVouch } from "@/lib/local/db";
import { markVerified } from "@/lib/local/accounts";
import type { Attestation, Fingerprint } from "@/types";
import { SectionHeader } from "./section-header";
import { FormField } from "./ui/field";
import { Button } from "./ui/button";
import { InlineNotice } from "./ui/inline-notice";

type Channel = "email" | "phone";

export interface VerifyIdentityCardProps {
  fingerprint: Fingerprint;
  verified: { email?: string; phone?: string };
}

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

export function VerifyIdentityCard({ fingerprint, verified }: VerifyIdentityCardProps) {
  const [channel, setChannel] = React.useState<Channel>("email");
  const [value, setValue] = React.useState("");
  const [normalizedValue, setNormalizedValue] = React.useState("");
  const [code, setCode] = React.useState("");
  const [step, setStep] = React.useState<"enter" | "code">("enter");
  const [devCode, setDevCode] = React.useState<string | null>(null);
  const [error, setError] = React.useState<string | null>(null);
  const [notice, setNotice] = React.useState<string | null>(null);
  const [pending, setPending] = React.useState(false);

  const alreadyVerified = channel === "email" ? verified.email : verified.phone;

  function reset() {
    setStep("enter");
    setCode("");
    setDevCode(null);
    setError(null);
    setNotice(null);
  }

  function pickChannel(next: Channel) {
    if (next === channel) return;
    setChannel(next);
    setValue("");
    reset();
  }

  async function sendCode(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setNotice(null);
    setPending(true);
    try {
      const res = await fetch("/api/verify/start", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ channel, value }),
      });
      const data = (await res.json()) as StartResponse;
      if (!res.ok || !data.ok) {
        setError(data.error ?? "Could not send a code.");
        return;
      }
      setNormalizedValue(data.value ?? value);
      setDevCode(data.devCode ?? null);
      setNotice(
        data.delivered
          ? `Code sent to your ${channel}. Enter it below.`
          : "Delivery isn't configured here — use the code shown below.",
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
        body: JSON.stringify({ channel, value: normalizedValue, code, fingerprint }),
      });
      const data = (await res.json()) as ConfirmResponse;
      if (!res.ok || !data.ok || !data.attestation || !data.verifier) {
        setError(data.error ?? "Could not verify that code.");
        return;
      }
      await addVouch(fingerprint, data.attestation, data.verifier);
      markVerified(
        fingerprint,
        channel === "email" ? { email: normalizedValue } : { phone: normalizedValue },
      );
      setValue("");
      reset();
      setNotice(`Your ${channel} is verified and vouched for by Anchor.`);
    } catch {
      setError("Could not reach the verification service.");
    } finally {
      setPending(false);
    }
  }

  return (
    <section className="rounded-card border border-line bg-surface p-5 shadow-card">
      <SectionHeader
        title="Verify your contact details"
        description="Confirm an email or phone number. Anchor checks it, then signs a vouch attesting it's yours — recorded in your ledger."
      />

      <div className="mt-4 flex flex-wrap gap-2">
        <VerifiedPill label="Email" value={verified.email} icon={<Mail className="size-3.5" aria-hidden />} />
        <VerifiedPill label="Phone" value={verified.phone} icon={<Phone className="size-3.5" aria-hidden />} />
      </div>

      <div className="mt-5 flex gap-2 rounded-lg border border-line bg-surface-sunken p-1">
        <ChannelTab active={channel === "email"} onClick={() => pickChannel("email")}>
          Email
        </ChannelTab>
        <ChannelTab active={channel === "phone"} onClick={() => pickChannel("phone")}>
          Phone
        </ChannelTab>
      </div>

      {alreadyVerified ? (
        <InlineNotice tone="calm" className="mt-4" title="Already verified">
          Your {channel} ({alreadyVerified}) is verified. You can re-verify a
          different one by entering it below.
        </InlineNotice>
      ) : null}

      {step === "enter" ? (
        <form className="mt-4 space-y-3" onSubmit={sendCode}>
          <FormField
            label={channel === "email" ? "Email address" : "Phone number"}
            type={channel === "email" ? "email" : "tel"}
            inputMode={channel === "email" ? "email" : "tel"}
            placeholder={channel === "email" ? "you@example.com" : "(555) 123-4567"}
            value={value}
            onChange={(e) => setValue(e.target.value)}
            required
          />
          {error ? <p className="text-sm text-danger">{error}</p> : null}
          <Button type="submit" disabled={pending || !value.trim()}>
            {pending ? "Sending…" : "Send verification code"}
          </Button>
        </form>
      ) : (
        <form className="mt-4 space-y-3" onSubmit={confirmCode}>
          {notice ? (
            <p className="text-sm text-ink-muted">{notice}</p>
          ) : null}
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
          <div className="flex gap-2">
            <Button type="submit" disabled={pending || code.length !== 6}>
              <BadgeCheck className="size-4" aria-hidden />
              {pending ? "Verifying…" : "Verify & get vouch"}
            </Button>
            <Button type="button" variant="ghost" onClick={reset} disabled={pending}>
              Start over
            </Button>
          </div>
        </form>
      )}

      {step === "enter" && notice ? (
        <p className="mt-3 flex items-center gap-1.5 text-sm text-accent">
          <Check className="size-4" aria-hidden />
          {notice}
        </p>
      ) : null}
    </section>
  );
}

function VerifiedPill({
  label,
  value,
  icon,
}: {
  label: string;
  value?: string;
  icon: React.ReactNode;
}) {
  const verified = Boolean(value);
  return (
    <span
      className={
        "inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-medium " +
        (verified
          ? "border-accent/30 bg-accent-soft text-accent"
          : "border-line bg-surface-sunken text-ink-muted")
      }
    >
      {icon}
      {label}: {verified ? value : "not verified"}
    </span>
  );
}

function ChannelTab({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={
        "flex-1 rounded-md px-3 py-1.5 text-sm font-medium transition-colors " +
        (active ? "bg-surface text-ink shadow-card" : "text-ink-muted hover:text-ink")
      }
    >
      {children}
    </button>
  );
}
