"use client";

import * as React from "react";
import { Upload, ShieldCheck } from "lucide-react";
import { CredentialCard } from "@/components/credential-card";
import { SectionHeader } from "@/components/section-header";
import { WalletTabs } from "@/components/wallet-tabs";
import { InlineNotice } from "@/components/ui/inline-notice";
import { Button } from "@/components/ui/button";
import { importLedgerFiles } from "@/lib/local/portable";
import type { AnchorArchive } from "@/lib/crypto/archive";
import { getUserByFingerprint } from "@/lib/local/db";
import { credentialsFromAttestations } from "@/lib/attestation/credential";
import { attestationId, verifyAttestations } from "@/lib/crypto/attestation";
import { shortFingerprint } from "@/lib/format";
import {
  ISSUER_TYPE_LABELS,
  type Credential,
  type Fingerprint,
  type Provider,
  type User,
} from "@/types";

interface VerificationEntry {
  credential: Credential;
  signatureValid: boolean;
  targetValid: boolean;
}

interface VerifyState {
  filenames: string[];
  counts: {
    attestations: number;
    packets: number;
    users: number;
    providers: number;
  };
  entries: VerificationEntry[];
  providers: Map<Fingerprint, Provider>;
}

function publicUserMap(users: User[] | undefined): Map<Fingerprint, string> {
  return new Map((users ?? []).map((u) => [u.fingerprint, u.publicKey]));
}

async function verifyArchive(archive: AnchorArchive): Promise<VerificationEntry[]> {
  const publicKeys = publicUserMap(archive.users);
  const missingIssuers = [
    ...new Set(archive.attestations.map((a) => a.from).filter((from) => !publicKeys.has(from))),
  ];
  const localUsers = await Promise.all(
    missingIssuers.map((fingerprint) => getUserByFingerprint(fingerprint)),
  );
  for (const user of localUsers) {
    if (user?.publicKey) publicKeys.set(user.fingerprint, user.publicKey);
  }

  const byTarget = new Map<Fingerprint, typeof archive.attestations>();
  for (const attestation of archive.attestations) {
    const list = byTarget.get(attestation.to) ?? [];
    list.push(attestation);
    byTarget.set(attestation.to, list);
  }

  const status = new Map<string, { signatureValid: boolean; targetValid: boolean }>();
  await Promise.all(
    [...byTarget.entries()].map(async ([target, attestations]) => {
      const result = await verifyAttestations(attestations, target, (from) =>
        publicKeys.get(from),
      );
      for (const entry of result.entries) {
        status.set(entry.id, {
          signatureValid: entry.signatureValid,
          targetValid: entry.targetValid,
        });
      }
    }),
  );

  return credentialsFromAttestations(archive.attestations).map((credential) => {
    const entryStatus = status.get(attestationId(credential.attestation));
    return {
      credential,
      signatureValid: entryStatus?.signatureValid ?? false,
      targetValid: entryStatus?.targetValid ?? false,
    };
  });
}

function AttesterHover({
  credential,
  provider,
  issued,
}: {
  credential: Credential;
  provider?: Provider;
  issued: Credential[];
}) {
  return (
    <span className="group relative inline-flex">
      <button type="button" className="font-medium text-accent hover:text-accent-hover">
        {credential.issuerName}
      </button>
      <span className="pointer-events-none absolute left-0 top-6 z-30 w-72 translate-y-1 rounded-card border border-white/70 bg-white/90 p-4 text-left opacity-0 shadow-[0_18px_48px_rgba(43,42,38,0.18)] backdrop-blur-xl transition group-hover:translate-y-0 group-hover:opacity-100">
        <span className="block text-sm font-semibold text-ink">
          {provider?.name ?? credential.issuerName}
        </span>
        <span className="mt-1 block text-xs font-medium uppercase tracking-wide text-ink-faint">
          {provider ? ISSUER_TYPE_LABELS[provider.type] : "Bundled signer"}
        </span>
        {provider?.location ? (
          <span className="mt-2 block text-sm text-ink-muted">{provider.location}</span>
        ) : null}
        {provider?.contactEmail ? (
          <span className="mt-1 block text-sm text-ink-muted">{provider.contactEmail}</span>
        ) : null}
        <span className="mt-3 block font-mono text-xs text-ink-faint">
          {shortFingerprint(credential.issuerFingerprint)}
        </span>
        <span className="mt-3 block text-xs font-semibold text-ink">
          Descendant attestations
        </span>
        <span className="mt-1 block text-xs leading-5 text-ink-muted">
          {issued.length
            ? issued.slice(0, 4).map((item) => item.title).join(" · ")
            : "No other uploaded attestations from this signer."}
        </span>
      </span>
    </span>
  );
}

export function VerifyCredentialsContent() {
  const [state, setState] = React.useState<VerifyState | null>(null);
  const [pending, setPending] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const inputRef = React.useRef<HTMLInputElement>(null);

  async function handleFiles(fileList: FileList | null) {
    const files = [...(fileList ?? [])];
    if (!files.length) return;
    setPending(true);
    setError(null);
    try {
      const { archive, ...counts } = await importLedgerFiles(files);
      const entries = await verifyArchive(archive);
      setState({
        filenames: files.map((file) => file.name),
        counts,
        entries,
        providers: new Map(
          (archive.providers ?? []).map((provider) => [provider.fingerprint, provider]),
        ),
      });
    } catch {
      setError("One or more files could not be opened as Anchor credential bundles.");
    } finally {
      setPending(false);
    }
  }

  const verifiedCount =
    state?.entries.filter((entry) => entry.signatureValid && entry.targetValid).length ?? 0;
  const issuedBySigner = new Map<Fingerprint, Credential[]>();
  for (const entry of state?.entries ?? []) {
    const list = issuedBySigner.get(entry.credential.issuerFingerprint) ?? [];
    list.push(entry.credential);
    issuedBySigner.set(entry.credential.issuerFingerprint, list);
  }

  return (
    <>
      <WalletTabs />
      <div className="mt-8 space-y-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <SectionHeader
            as="h1"
            serif
            title="Verify credential bundles"
            description="Upload one or more issued `.anchor` files. Anchor merges them, imports any new records, and verifies signatures using bundled signer identities."
          />
          <Button type="button" onClick={() => inputRef.current?.click()} disabled={pending}>
            <Upload className="size-4" aria-hidden />
            {pending ? "Verifying..." : "Upload bundles"}
          </Button>
          <input
            ref={inputRef}
            type="file"
            multiple
            accept=".anchor,application/octet-stream"
            className="hidden"
            onChange={(event) => {
              handleFiles(event.target.files);
              event.target.value = "";
            }}
          />
        </div>

        {error ? (
          <InlineNotice tone="warning" title="Could not verify bundles">
            {error}
          </InlineNotice>
        ) : null}

        {state ? (
          <InlineNotice tone="calm" title="Bundles merged">
            Imported {state.counts.attestations} new attestation
            {state.counts.attestations === 1 ? "" : "s"} and verified {verifiedCount} of{" "}
            {state.entries.length} uploaded credential
            {state.entries.length === 1 ? "" : "s"}. Files:{" "}
            {state.filenames.join(", ")}.
          </InlineNotice>
        ) : (
          <div className="liquid-glass-subtle rounded-card p-6">
            <ShieldCheck className="size-8 text-accent" aria-hidden />
            <p className="mt-3 text-sm leading-6 text-ink-muted">
              No bundles uploaded yet. Choose multiple files to check a complete
              credential set at once.
            </p>
          </div>
        )}

        {state?.entries.length ? (
          <div className="space-y-4">
            {state.entries.map((entry) => {
              const provider = state.providers.get(entry.credential.issuerFingerprint);
              return (
                <CredentialCard
                  key={`${entry.credential.id}-${entry.credential.attestation.signature}`}
                  credential={entry.credential}
                  verified={entry.signatureValid && entry.targetValid}
                >
                  <p className="text-sm text-ink-muted">
                    Attester:{" "}
                    <AttesterHover
                      credential={entry.credential}
                      provider={provider}
                      issued={issuedBySigner.get(entry.credential.issuerFingerprint) ?? []}
                    />
                  </p>
                  {!entry.signatureValid || !entry.targetValid ? (
                    <p className="mt-2 text-sm font-medium text-danger">
                      {entry.signatureValid
                        ? "Target mismatch"
                        : "Signature could not be verified"}
                    </p>
                  ) : null}
                </CredentialCard>
              );
            })}
          </div>
        ) : null}
      </div>
    </>
  );
}
