"use client";

import * as React from "react";
import { Download, Mail } from "lucide-react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { useAuth } from "./auth-provider";
import { AccountUnlockForm } from "./account-unlock-form";
import { sendCredentialByEmailAction, signCredentialAction } from "@/lib/local/actions";
import { exportCredentialFile } from "@/lib/local/portable";
import { CredentialCard } from "./credential-card";
import { SectionHeader } from "./section-header";
import { FormField, SelectField, TextAreaField } from "./ui/field";
import { InlineNotice } from "./ui/inline-notice";
import { Button } from "./ui/button";
import { cn } from "@/lib/cn";
import {
  CREDENTIAL_TYPE_LABELS,
  ISSUER_TYPE_LABELS,
  type CredentialType,
  type IssuerType,
} from "@/types";

type DeliveryMode = "email" | "offline-credential";

interface LoadedRequest {
  token: string;
  status: string;
  requesterName: string;
  requesterFingerprint: string;
  message?: string;
  expiresAt: string;
}

const FINGERPRINT_PATTERN = /[0-9a-f]{16}/i;

function cleanFingerprint(value: string | null): string {
  return value?.match(FINGERPRINT_PATTERN)?.[0].toLowerCase() ?? "";
}

function fingerprintFromNestedUrl(raw: string | null): string {
  if (!raw || typeof window === "undefined") return "";
  try {
    const parsed = new URL(raw, window.location.origin);
    if (parsed.origin !== window.location.origin) return "";
    return (
      cleanFingerprint(parsed.searchParams.get("to")) ||
      cleanFingerprint(parsed.searchParams.get("fingerprint"))
    );
  } catch {
    return cleanFingerprint(raw);
  }
}

/**
 * Sign a credential for delivery by email or as an offline `.anchor` file.
 */
export function CredentialSigner() {
  const { active, accounts, loading, unlock } = useAuth();
  const params = useSearchParams();
  const presetEmail = params.get("email") ?? "";
  const requestToken = params.get("request")?.trim() ?? "";
  const presetTo =
    cleanFingerprint(params.get("to")) ||
    cleanFingerprint(params.get("fingerprint")) ||
    fingerprintFromNestedUrl(params.get("url"));
  const initialMode: DeliveryMode =
    !requestToken && params.get("mode") === "offline-credential"
      ? "offline-credential"
      : "email";

  const [loadedRequest, setLoadedRequest] = React.useState<LoadedRequest | null>(null);
  const [requestLoading, setRequestLoading] = React.useState(!!requestToken);
  const [requestError, setRequestError] = React.useState<string | null>(null);

  const [deliveryMode, setDeliveryMode] = React.useState<DeliveryMode>(initialMode);
  const [toEmail, setToEmail] = React.useState(presetEmail);
  const [toFingerprint, setToFingerprint] = React.useState(presetTo);
  const [issuerName, setIssuerName] = React.useState("");
  const issuerType: IssuerType = active?.issuerType ?? "caseworker";
  const [credentialType, setCredentialType] =
    React.useState<CredentialType>("on_time_payment");
  const [title, setTitle] = React.useState("");
  const [summary, setSummary] = React.useState("");
  const [metric, setMetric] = React.useState("");
  const [factLabel, setFactLabel] = React.useState("");
  const [factValue, setFactValue] = React.useState("");
  const [pending, setPending] = React.useState(false);
  const [success, setSuccess] = React.useState<string | null>(null);
  const [error, setError] = React.useState<string | null>(null);

  const fromFingerprint = active?.fingerprint ?? "";
  const lockedRecipient = !!loadedRequest && loadedRequest.status === "pending";
  const offlineMode = deliveryMode === "offline-credential" && !lockedRecipient;

  React.useEffect(() => {
    if (!requestToken) return;
    let activeEffect = true;
    fetch(`/api/credential/request/${encodeURIComponent(requestToken)}`)
      .then(async (res) => {
        const data = (await res.json()) as {
          ok?: boolean;
          error?: string;
          request?: LoadedRequest;
        };
        if (!activeEffect) return;
        if (!res.ok || !data.ok || !data.request) {
          setRequestError(data.error ?? "Could not load this credential request.");
          setRequestLoading(false);
          return;
        }
        const req = data.request;
        if (req.status === "expired") {
          setRequestError("This credential request has expired.");
          setRequestLoading(false);
          return;
        }
        if (req.status === "fulfilled") {
          setRequestError("This request was already fulfilled.");
          setRequestLoading(false);
          return;
        }
        setLoadedRequest(req);
        setToFingerprint(req.requesterFingerprint);
        if (req.message) {
          setSummary((prev) => prev || (req.message ?? ""));
        }
        setRequestLoading(false);
      })
      .catch(() => {
        if (!activeEffect) return;
        setRequestError("Could not load this credential request.");
        setRequestLoading(false);
      });
    return () => {
      activeEffect = false;
    };
  }, [requestToken]);

  const previewRecipient = toFingerprint.trim() || "0000000000000000";

  const previewCredential = {
    id: "preview",
    residentFingerprint: previewRecipient,
    issuerFingerprint: fromFingerprint,
    issuerName: issuerName || active?.label || "You",
    issuerType,
    credentialType,
    issueDate: new Date().toISOString(),
    title: title || "Credential title",
    summary: summary || "Summary of what you are attesting to.",
    evidence: {
      metric: metric || undefined,
      facts:
        factLabel && factValue ? [{ label: factLabel, value: factValue }] : undefined,
    },
    status: "active" as const,
    attestation: {
      from: fromFingerprint,
      to: previewRecipient,
      properties: [],
      nonce: "preview",
      signature: "",
    },
  };

  const credentialInput = {
    issuerName,
    issuerType,
    credentialType,
    title,
    summary,
    metric: metric || undefined,
    facts: factLabel && factValue ? [{ label: factLabel, value: factValue }] : [],
  };

  async function handleEmailSend() {
    setPending(true);
    setError(null);
    setSuccess(null);
    const result = await sendCredentialByEmailAction({
      toEmail: lockedRecipient ? undefined : toEmail,
      toFingerprint: lockedRecipient ? toFingerprint : undefined,
      ...credentialInput,
      requestToken: lockedRecipient ? requestToken : undefined,
    });
    setPending(false);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    if (result.autoDelivered) {
      setSuccess(
        `Credential signed and delivered to ${loadedRequest?.requesterName ?? "the requester"}. It will appear in their wallet automatically.`,
      );
      return;
    }
    setSuccess(
      result.emailSent
        ? `Credential signed and emailed to ${toEmail.trim()}. They can open the link to add it to their wallet.`
        : `Credential signed. Delivery link: ${result.acceptUrl ?? "see server response"}`,
    );
  }

  async function handleOfflineSign() {
    setPending(true);
    setError(null);
    setSuccess(null);
    const result = await signCredentialAction({
      toFingerprint,
      ...credentialInput,
    });
    setPending(false);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    await exportCredentialFile(result.attestation, title);
    setSuccess(
      "Credential signed and downloaded. Send the `.anchor` file to the recipient — they import it with Offline credential → Upload.",
    );
  }

  async function handleSubmit() {
    if (offlineMode) {
      await handleOfflineSign();
      return;
    }
    await handleEmailSend();
  }

  const signInHref = requestToken
    ? `/sign-in?unlock=1&next=${encodeURIComponent(`/credential/sign?request=${requestToken}`)}`
    : offlineMode && toFingerprint
      ? `/sign-in?unlock=1&next=${encodeURIComponent(`/credential/sign?mode=offline-credential&to=${toFingerprint}`)}`
      : "/sign-in?unlock=1";

  if (loading) {
    return <p className="text-sm text-ink-muted">Loading…</p>;
  }

  if (!active && accounts.length > 0) {
    return (
      <div className="mx-auto max-w-md space-y-6">
        <SectionHeader
          as="h1"
          serif
          title="Unlock to sign"
          description="Your account is saved on this device — enter your password to unlock it and sign this credential."
        />
        <AccountUnlockForm
          accounts={accounts}
          unlock={unlock}
          onDone={() => {
            /* AuthProvider re-renders with active account */
          }}
          compact
        />
        <p className="text-center text-sm text-ink-muted">
          Not you?{" "}
          <Link href={signInHref} className="font-medium text-accent hover:text-accent-hover">
            Switch account
          </Link>
          {" · "}
          <Link href="/sign-in?new=1" className="font-medium text-accent hover:text-accent-hover">
            Create new account
          </Link>
        </p>
      </div>
    );
  }

  if (!active) {
    const returnPath =
      typeof window !== "undefined"
        ? `${window.location.pathname}${window.location.search}`
        : "/credential/sign";
    const createHref = `/sign-in?new=1&next=${encodeURIComponent(returnPath)}`;
    return (
      <InlineNotice tone="info" title="Sign in to issue credentials">
        No account on this device yet.{" "}
        <Link href={createHref} className="font-medium text-accent hover:text-accent-hover">
          Create an account
        </Link>{" "}
        to continue.
      </InlineNotice>
    );
  }

  if (requestLoading) {
    return <p className="text-sm text-ink-muted">Loading credential request…</p>;
  }

  if (requestError) {
    return (
      <InlineNotice tone="warning" title="Request unavailable">
        {requestError}
      </InlineNotice>
    );
  }

  return (
    <div className="space-y-8">
      <SectionHeader
        as="h1"
        serif
        title={
          lockedRecipient
            ? "Sign requested credential"
            : offlineMode
              ? "Offline credential"
              : "Issue a credential"
        }
        description={
          lockedRecipient
            ? `${loadedRequest?.requesterName} asked you to sign a credential. Fill in the details below — it will be delivered to their wallet when you sign.`
            : offlineMode
              ? "Sign a credential and download a file to hand off directly — no email or server required."
              : "Enter the recipient's verified email. Anchor signs the credential and emails them a link to add it to their wallet."
        }
      />

      {!lockedRecipient ? (
        <div className="flex gap-2 rounded-lg border border-line bg-surface-sunken p-1">
          <ModeTab
            active={deliveryMode === "email"}
            onClick={() => setDeliveryMode("email")}
          >
            Email delivery
          </ModeTab>
          <ModeTab
            active={deliveryMode === "offline-credential"}
            onClick={() => setDeliveryMode("offline-credential")}
          >
            Offline credential
          </ModeTab>
        </div>
      ) : null}

      {lockedRecipient && loadedRequest?.message ? (
        <InlineNotice tone="info" title="Their note">
          &ldquo;{loadedRequest.message}&rdquo;
        </InlineNotice>
      ) : null}

      {success ? (
        <InlineNotice tone="calm" title={offlineMode ? "Credential exported" : "Credential sent"}>
          {success}
        </InlineNotice>
      ) : null}

      <div className="grid gap-8 lg:grid-cols-2">
        <form
          className="space-y-4"
          onSubmit={(e) => {
            e.preventDefault();
            handleSubmit();
          }}
        >
          {lockedRecipient ? (
            <div className="rounded-lg border border-line bg-surface-sunken px-4 py-3">
              <p className="text-sm font-medium text-ink">Recipient</p>
              <p className="text-sm text-ink-muted">
                {loadedRequest?.requesterName} · fingerprint{" "}
                <span className="font-mono text-xs">{loadedRequest?.requesterFingerprint}</span>
              </p>
            </div>
          ) : offlineMode ? (
            <FormField
              label="Recipient fingerprint"
              hint="16-character identity from their wallet (they can copy it from their record)."
              value={toFingerprint}
              onChange={(e) => setToFingerprint(e.target.value.trim().toLowerCase())}
              placeholder="abcd1234abcd1234"
              required
              className="font-mono"
            />
          ) : (
            <FormField
              label="Recipient email"
              type="email"
              hint="They must have verified this email on their Anchor account."
              value={toEmail}
              onChange={(e) => setToEmail(e.target.value)}
              placeholder="resident@example.com"
              required
            />
          )}

          <FormField
            label="Signing as"
            hint="Your account key signs the credential. This name is shown to the recipient."
            value={issuerName}
            onChange={(e) => setIssuerName(e.target.value)}
            placeholder={active.label}
          />

          <p className="text-sm text-ink-muted">
            Issuing as{" "}
            <span className="font-medium text-ink">{ISSUER_TYPE_LABELS[issuerType]}</span>
            {" · "}
            <Link
              href="/wallet/identity"
              className="font-medium text-accent hover:text-accent-hover"
            >
              Change in Edit profile
            </Link>
          </p>

          <SelectField
            label="Credential type"
            value={credentialType}
            onChange={(e) => setCredentialType(e.target.value as CredentialType)}
            options={Object.entries(CREDENTIAL_TYPE_LABELS).map(([v, l]) => ({
              value: v,
              label: l,
            }))}
          />

          <FormField
            label="Title"
            hint="Short headline, e.g. “12 months of on-time housing payments”"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            required
          />

          <TextAreaField
            label="Summary"
            hint="Plain-language attestation. Be specific and factual."
            value={summary}
            onChange={(e) => setSummary(e.target.value)}
            required
            rows={3}
          />

          <FormField
            label="Metric (optional)"
            hint="e.g. “12 consecutive on-time payments”"
            value={metric}
            onChange={(e) => setMetric(e.target.value)}
          />

          <div className="grid gap-3 sm:grid-cols-2">
            <FormField
              label="Fact label"
              hint="Optional structured detail"
              value={factLabel}
              onChange={(e) => setFactLabel(e.target.value)}
              placeholder="Payments"
            />
            <FormField
              label="Fact value"
              value={factValue}
              onChange={(e) => setFactValue(e.target.value)}
              placeholder="12 of 12 on time"
            />
          </div>

          <div className="pt-2">
            <Button
              type="submit"
              disabled={
                pending ||
                !title.trim() ||
                !summary.trim() ||
                (offlineMode ? !toFingerprint.trim() : !lockedRecipient && !toEmail.trim())
              }
            >
              {offlineMode ? (
                <Download className="size-4" aria-hidden />
              ) : (
                <Mail className="size-4" aria-hidden />
              )}
              {pending
                ? "Signing…"
                : offlineMode
                  ? "Sign & download file"
                  : lockedRecipient
                    ? "Sign & deliver credential"
                    : "Sign & email credential"}
            </Button>
          </div>
          {error ? <p className="text-sm text-danger">{error}</p> : null}
        </form>

        <div>
          <p className="mb-3 text-sm font-medium text-ink-muted">Preview</p>
          {title ? (
            <CredentialCard credential={previewCredential} verified={false} />
          ) : (
            <p className="text-sm text-ink-muted">
              Fill in the form to see how the credential will appear in the recipient&apos;s wallet.
            </p>
          )}
          <InlineNotice tone="info" className="mt-4">
            {offlineMode
              ? "The downloaded `.anchor` file contains a signed attestation. Nothing is stored on a server — hand the file to the recipient directly."
              : lockedRecipient
                ? "When you sign, the credential is delivered directly to their wallet — no extra step for them."
                : "The signed credential is stored briefly on Firebase until the recipient accepts it. Nothing is added to their wallet until they open the email link."}
          </InlineNotice>
        </div>
      </div>
    </div>
  );
}

function ModeTab({
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
      className={cn(
        "flex-1 rounded-md px-3 py-1.5 text-sm font-medium transition-colors",
        active ? "bg-surface text-ink shadow-card" : "text-ink-muted hover:text-ink",
      )}
    >
      {children}
    </button>
  );
}
