"use client";

import * as React from "react";
import { Mail } from "lucide-react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { useAuth } from "./auth-provider";
import { sendCredentialByEmailAction } from "@/lib/local/actions";
import { CredentialCard } from "./credential-card";
import { SectionHeader } from "./section-header";
import { FormField, SelectField, TextAreaField } from "./ui/field";
import { InlineNotice } from "./ui/inline-notice";
import { Button } from "./ui/button";
import {
  CREDENTIAL_TYPE_LABELS,
  ISSUER_TYPE_LABELS,
  type CredentialType,
  type IssuerType,
} from "@/types";

interface LoadedRequest {
  token: string;
  status: string;
  requesterName: string;
  requesterFingerprint: string;
  message?: string;
  expiresAt: string;
}

/**
 * Sign a credential and deliver it by email. The recipient opens a link to add
 * it to their wallet — no file upload required.
 */
export function CredentialSigner() {
  const { active } = useAuth();
  const params = useSearchParams();
  const presetEmail = params.get("email") ?? "";
  const requestToken = params.get("request")?.trim() ?? "";

  const [loadedRequest, setLoadedRequest] = React.useState<LoadedRequest | null>(null);
  const [requestLoading, setRequestLoading] = React.useState(!!requestToken);
  const [requestError, setRequestError] = React.useState<string | null>(null);

  const [toEmail, setToEmail] = React.useState(presetEmail);
  const [toFingerprint, setToFingerprint] = React.useState<string | undefined>();
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

  React.useEffect(() => {
    if (!requestToken) return;
    let activeEffect = true;
    setRequestLoading(true);
    setRequestError(null);
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

  const previewRecipient = toFingerprint ?? "0000000000000000";

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

  async function handleSend() {
    setPending(true);
    setError(null);
    setSuccess(null);
    const result = await sendCredentialByEmailAction({
      toEmail: lockedRecipient ? undefined : toEmail,
      toFingerprint: lockedRecipient ? toFingerprint : undefined,
      issuerName,
      issuerType,
      credentialType,
      title,
      summary,
      metric: metric || undefined,
      facts: factLabel && factValue ? [{ label: factLabel, value: factValue }] : [],
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

  const signInHref = requestToken
    ? `/sign-in?next=${encodeURIComponent(`/credential/sign?request=${requestToken}`)}`
    : "/sign-in";

  if (!active) {
    return (
      <InlineNotice tone="info" title="Sign in to issue credentials">
        Signing a credential uses your account&apos;s private key.{" "}
        <Link href={signInHref} className="font-medium text-accent hover:text-accent-hover">
          Sign in
        </Link>{" "}
        to continue.
      </InlineNotice>
    );
  }

  if (requestLoading) {
    return (
      <p className="text-sm text-ink-muted">Loading credential request…</p>
    );
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
        title={lockedRecipient ? "Sign requested credential" : "Issue a credential"}
        description={
          lockedRecipient
            ? `${loadedRequest?.requesterName} asked you to sign a credential. Fill in the details below — it will be delivered to their wallet when you sign.`
            : "Enter the recipient's verified email. Anchor signs the credential and emails them a link to add it to their wallet."
        }
      />

      {lockedRecipient && loadedRequest?.message ? (
        <InlineNotice tone="info" title="Their note">
          &ldquo;{loadedRequest.message}&rdquo;
        </InlineNotice>
      ) : null}

      {success ? (
        <InlineNotice tone="calm" title="Credential sent">
          {success}
        </InlineNotice>
      ) : null}

      <div className="grid gap-8 lg:grid-cols-2">
        <form
          className="space-y-4"
          onSubmit={(e) => {
            e.preventDefault();
            handleSend();
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
                (!lockedRecipient && !toEmail.trim())
              }
            >
              <Mail className="size-4" aria-hidden />
              {pending
                ? "Signing…"
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
            {lockedRecipient
              ? "When you sign, the credential is delivered directly to their wallet — no extra step for them."
              : "The signed credential is stored briefly on Firebase until the recipient accepts it. Nothing is added to their wallet until they open the email link."}
          </InlineNotice>
        </div>
      </div>
    </div>
  );
}
