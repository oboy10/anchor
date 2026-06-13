"use client";

import * as React from "react";
import { issueCredentialAction } from "@/lib/local/actions";
import { CredentialCard } from "./credential-card";
import { SectionHeader } from "./section-header";
import { FormField, SelectField, TextAreaField } from "./ui/field";
import { InlineNotice } from "./ui/inline-notice";
import { Button } from "./ui/button";
import { StatusBadge } from "./ui/status-badge";
import {
  CREDENTIAL_TYPE_LABELS,
  type CredentialType,
  type Provider,
  type Resident,
} from "@/types";

export interface ProviderConsoleProps {
  providers: Provider[];
  residents: Resident[];
}

export function ProviderConsole({ providers, residents }: ProviderConsoleProps) {
  const [issuerId, setIssuerId] = React.useState(providers[0]?.slug ?? "");
  const [residentId, setResidentId] = React.useState(residents[0]?.slug ?? "");
  const [credentialType, setCredentialType] = React.useState<CredentialType>(
    "on_time_payment",
  );
  const [title, setTitle] = React.useState("");
  const [summary, setSummary] = React.useState("");
  const [metric, setMetric] = React.useState("");
  const [factLabel, setFactLabel] = React.useState("");
  const [factValue, setFactValue] = React.useState("");
  const [showPreview, setShowPreview] = React.useState(false);
  const [pending, setPending] = React.useState(false);
  const [success, setSuccess] = React.useState<string | null>(null);
  const [error, setError] = React.useState<string | null>(null);

  const issuer = providers.find((p) => p.slug === issuerId);
  const resident = residents.find((r) => r.slug === residentId);

  const previewCredential = {
    id: "preview",
    residentFingerprint: resident?.fingerprint ?? "",
    issuerFingerprint: issuer?.fingerprint ?? "",
    issuerName: issuer?.name ?? "",
    issuerType: issuer?.type ?? ("shelter" as const),
    credentialType,
    issueDate: new Date().toISOString(),
    title: title || "Credential title",
    summary: summary || "Summary of what you are attesting to.",
    evidence: {
      metric: metric || undefined,
      facts:
        factLabel && factValue
          ? [{ label: factLabel, value: factValue }]
          : undefined,
    },
    status: "active" as const,
    attestation: {
      from: issuer?.fingerprint ?? "",
      to: resident?.fingerprint ?? "",
      properties: [],
      nonce: "preview",
      signature: "",
    },
  };

  async function handleIssue() {
    setPending(true);
    setError(null);
    const result = await issueCredentialAction({
      residentId,
      issuerId,
      credentialType,
      title,
      summary,
      metric: metric || undefined,
      facts: factLabel && factValue ? [{ label: factLabel, value: factValue }] : [],
    });
    setPending(false);
    if (!result.ok) {
      setError(result.error ?? "Could not issue credential.");
      return;
    }
    setSuccess(`Credential issued and added to the resident's ledger.`);
    setTitle("");
    setSummary("");
    setMetric("");
    setFactLabel("");
    setFactValue("");
    setShowPreview(false);
    setTimeout(() => setSuccess(null), 5000);
  }

  return (
    <div className="space-y-8">
      <SectionHeader
        as="h1"
        serif
        title="Issue a credential"
        description="Add a verified positive entry to a resident's record. Past entries cannot be edited — only corrected with a new entry."
      />

      {success ? (
        <InlineNotice tone="calm" title="Credential issued">
          {success}
        </InlineNotice>
      ) : null}

      <div className="grid gap-8 lg:grid-cols-2">
        <form
          className="space-y-4"
          onSubmit={(e) => {
            e.preventDefault();
            setShowPreview(true);
          }}
        >
          <SelectField
            label="Issuing as"
            value={issuerId}
            onChange={(e) => setIssuerId(e.target.value)}
            options={providers.map((p) => ({
              value: p.slug,
              label: `${p.name}${p.verified ? "" : " (unverified)"}`,
            }))}
          />
          {issuer?.verified ? (
            <StatusBadge tone="verified">Verified issuer</StatusBadge>
          ) : null}

          <SelectField
            label="Resident"
            value={residentId}
            onChange={(e) => setResidentId(e.target.value)}
            options={residents.map((r) => ({
              value: r.slug,
              label: `${r.displayName}${r.city ? ` · ${r.city}` : ""}`,
            }))}
          />

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

          <div className="flex flex-wrap gap-2 pt-2">
            <Button type="submit" variant="secondary">
              Preview
            </Button>
            <Button
              type="button"
              disabled={pending || !title.trim() || !summary.trim()}
              onClick={handleIssue}
            >
              {pending ? "Issuing…" : "Issue & sign"}
            </Button>
          </div>
          {error ? <p className="text-sm text-danger">{error}</p> : null}
        </form>

        <div>
          <p className="mb-3 text-sm font-medium text-ink-muted">Preview</p>
          {showPreview || title ? (
            <CredentialCard credential={previewCredential} verified={false} />
          ) : (
            <p className="text-sm text-ink-muted">
              Fill in the form to see how the credential will appear in the resident's
              wallet.
            </p>
          )}
          <InlineNotice tone="info" className="mt-4">
            Issuing appends to the ledger and signs the entry with your organization's
            key. The resident is notified in their timeline immediately.
          </InlineNotice>
        </div>
      </div>
    </div>
  );
}
