"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Brand } from "@/components/brand";
import { CredentialCard } from "@/components/credential-card";
import { useAuth } from "@/components/auth-provider";
import { acceptCredentialDeliveryAction } from "@/lib/local/actions";
import { credentialFromAttestation } from "@/lib/attestation/credential";
import { InlineNotice } from "@/components/ui/inline-notice";
import { Button } from "@/components/ui/button";
import type { Attestation, Provider, User } from "@/types";

interface DeliveryView {
  token: string;
  status: string;
  title: string;
  summary: string;
  issuerName: string;
  issuerFingerprint: string;
  recipientFingerprint: string;
  attestation: Attestation;
  users: User[];
  providers: Provider[];
  expiresAt: string;
  acceptedAt?: string;
}

export function AcceptCredentialContent() {
  const params = useSearchParams();
  const token = params.get("token") ?? "";
  const router = useRouter();
  const { active } = useAuth();
  const missingTokenError = token ? null : "This link is missing a delivery token.";
  const [delivery, setDelivery] = React.useState<DeliveryView | null>(null);
  const [loading, setLoading] = React.useState(!!token);
  const [error, setError] = React.useState<string | null>(missingTokenError);
  const [accepting, setAccepting] = React.useState(false);
  const [accepted, setAccepted] = React.useState(false);

  React.useEffect(() => {
    if (!token) return;
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(`/api/credential/delivery/${encodeURIComponent(token)}`);
        const data = (await res.json()) as {
          ok?: boolean;
          error?: string;
          delivery?: DeliveryView;
        };
        if (!res.ok || !data.ok || !data.delivery) {
          if (!cancelled) setError(data.error ?? "Could not load this credential.");
          return;
        }
        if (!cancelled) setDelivery(data.delivery);
      } catch {
        if (!cancelled) setError("Could not reach the server.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [token]);

  const previewCredential = React.useMemo(() => {
    if (!delivery) return null;
    return credentialFromAttestation(delivery.attestation);
  }, [delivery]);

  async function handleAccept() {
    if (!delivery || !active) return;
    setAccepting(true);
    setError(null);
    const result = await acceptCredentialDeliveryAction({
      token: delivery.token,
      attestation: delivery.attestation,
      users: delivery.users,
      providers: delivery.providers,
    });
    setAccepting(false);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    setAccepted(true);
    setTimeout(() => router.push("/wallet"), 1200);
  }

  const signInHref = `/sign-in?next=${encodeURIComponent(`/credential/accept?token=${token}`)}`;

  return (
    <div className="min-h-full bg-canvas">
      <header className="border-b border-line bg-surface/80">
        <div className="mx-auto flex h-14 max-w-2xl items-center px-4 sm:px-6">
          <Brand href="/" />
        </div>
      </header>

      <main className="mx-auto max-w-2xl px-4 py-8 sm:px-6 sm:py-10">
        {loading ? (
          <p className="text-sm text-ink-muted">Loading credential…</p>
        ) : error && !delivery ? (
          <InlineNotice tone="warning" title="This link could not be opened">
            {error}
          </InlineNotice>
        ) : delivery ? (
          <div className="space-y-6">
            <div>
              <p className="text-sm font-medium text-accent">Credential delivery</p>
              <h1 className="mt-2 font-serif text-3xl text-ink">{delivery.title}</h1>
              <p className="mt-2 text-[15px] text-ink-muted">
                From <span className="font-medium text-ink">{delivery.issuerName}</span>
              </p>
            </div>

            {delivery.status === "expired" ? (
              <InlineNotice tone="warning" title="This link expired">
                Ask the issuer to send the credential again.
              </InlineNotice>
            ) : delivery.status === "accepted" || accepted ? (
              <InlineNotice tone="calm" title="Credential added">
                This credential is in your wallet.{" "}
                <Link href="/wallet" className="font-medium text-accent hover:text-accent-hover">
                  Open wallet
                </Link>
              </InlineNotice>
            ) : !active ? (
              <InlineNotice tone="info" title="Sign in to accept">
                Sign in with the account that verified this email address.{" "}
                <Link href={signInHref} className="font-medium text-accent hover:text-accent-hover">
                  Sign in
                </Link>
              </InlineNotice>
            ) : active.fingerprint !== delivery.recipientFingerprint ? (
              <InlineNotice tone="warning" title="Wrong account">
                This credential was issued to a different Anchor identity. Switch to the
                correct account or{" "}
                <Link href={signInHref} className="font-medium text-accent hover:text-accent-hover">
                  sign in again
                </Link>
                .
              </InlineNotice>
            ) : !active.verifiedEmail ? (
              <InlineNotice tone="warning" title="Verify your email first">
                Verify your email on the{" "}
                <Link href="/wallet/identity" className="font-medium text-accent hover:text-accent-hover">
                  profile page
                </Link>{" "}
                before accepting this credential.
              </InlineNotice>
            ) : (
              <>
                {previewCredential ? (
                  <CredentialCard credential={previewCredential} verified />
                ) : null}
                <p className="text-sm leading-relaxed text-ink-muted">{delivery.summary}</p>
                <Button type="button" disabled={accepting} onClick={handleAccept}>
                  {accepting ? "Adding to wallet…" : "Add to my wallet"}
                </Button>
                {error ? <p className="text-sm text-danger">{error}</p> : null}
              </>
            )}
          </div>
        ) : null}
      </main>
    </div>
  );
}
