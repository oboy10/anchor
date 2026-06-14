"use client";

import * as React from "react";
import { Download } from "lucide-react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { useAuth } from "./auth-provider";
import { signCredentialAction } from "@/lib/local/actions";
import { exportCredentialFile } from "@/lib/local/portable";
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

/**
 * Sign a credential for any fingerprint with the active account's key and
 * export it as a binary file. The recipient imports it into their wallet with
 * "Add credentials". The target fingerprint can be typed or autofilled from a
 * `?to=<fingerprint>` URL parameter.
 */
function fingerprintFromNestedUrl(raw: string | null): string {
  if (!raw || typeof window === "undefined") return "";
  try {
    const parsed = new URL(raw, window.location.origin);
    if (parsed.origin !== window.location.origin) return "";
    return parsed.searchParams.get("to") ?? parsed.searchParams.get("fingerprint") ?? "";
  } catch {
    return "";
  }
}

export function CredentialSigner() {
  const { active } = useAuth();
  const params = useSearchParams();
  const presetTo =
    params.get("to") ??
    params.get("fingerprint") ??
    fingerprintFromNestedUrl(params.get("url"));

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

  const previewCredential = {
    id: "preview",
    residentFingerprint: toFingerprint,
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
      to: toFingerprint,
      properties: [],
      nonce: "preview",
      signature: "",
    },
  };

  async function handleSign() {
    setPending(true);
    setError(null);
    setSuccess(null);
    const result = await signCredentialAction({
      toFingerprint,
      issuerName,
      issuerType,
      credentialType,
      title,
      summary,
      metric: metric || undefined,
      facts: factLabel && factValue ? [{ label: factLabel, value: factValue }] : [],
    });
    setPending(false);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    await exportCredentialFile(result.attestation, title);
    setSuccess(
      "Credential signed and downloaded. Send the file to the recipient — they import it with “Add credentials”.",
    );
  }

  if (!active) {
    return (
      <InlineNotice tone="info" title="Sign in to issue credentials">
        Signing a credential uses your account&apos;s private key.{" "}
        <Link href="/sign-in" className="font-medium text-accent hover:text-accent-hover">
          Sign in
        </Link>{" "}
        to continue.
      </InlineNotice>
    );
  }

  return (
    <div className="space-y-8">
      <SectionHeader
        as="h1"
        serif
        title="Sign a credential"
        description="Attest a positive, verifiable entry for someone by their identity fingerprint, then export it as a file for them to import."
      />

      {success ? (
        <InlineNotice tone="calm" title="Credential signed">
          {success}
        </InlineNotice>
      ) : null}

      <div className="grid gap-8 lg:grid-cols-2">
        <form
          className="space-y-4"
          onSubmit={(e) => {
            e.preventDefault();
            handleSign();
          }}
        >
          <FormField
            label="Recipient fingerprint"
            hint="The 16-character identity fingerprint of the person you're crediting."
            value={toFingerprint}
            onChange={(e) => setToFingerprint(e.target.value)}
            placeholder="a1b2c3d4e5f60718"
            className="font-mono"
            required
          />

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
              disabled={pending || !title.trim() || !summary.trim() || !toFingerprint.trim()}
            >
              <Download className="size-4" aria-hidden />
              {pending ? "Signing…" : "Sign & export file"}
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
              Fill in the form to see how the credential will appear once imported.
            </p>
          )}
          <InlineNotice tone="info" className="mt-4">
            The exported file contains a single Ed25519-signed attestation. Nothing
            is stored on a server — you hand the file to the recipient directly.
          </InlineNotice>
        </div>
      </div>
    </div>
  );
}
