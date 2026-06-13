"use client";

import Link from "next/link";
import { AppShell } from "@/components/app-shell";
import { AdminControls } from "@/components/admin-controls";
import { LocalDataGate } from "@/components/local-data-gate";
import { SectionHeader } from "@/components/section-header";
import { VerificationBanner } from "@/components/verification-banner";
import { InlineNotice } from "@/components/ui/inline-notice";
import { useLocalQuery } from "@/lib/local/hooks";
import {
  getAttestations,
  getLedger,
  listProviders,
  listResidents,
  verifyResidentChain,
} from "@/lib/local/db";
import { shortHex } from "@/lib/crypto/user";
import { seedPacket } from "@/lib/demo/seed";

export default function AdminPage() {
  const query = useLocalQuery(async () => {
    const [residents, providers] = await Promise.all([
      listResidents(),
      listProviders(),
    ]);
    const verifications = await Promise.all(
      residents.map(async (r) => ({
        r,
        ledger: await getLedger(r.slug),
        attestations: await getAttestations(r.slug),
        result: await verifyResidentChain(r.slug),
      })),
    );
    return { residents, providers, verifications };
  }, []);

  return (
    <AppShell
      context="Admin"
      links={[
        { href: "/demo", label: "Demo" },
        { href: "/resident/r_marcus", label: "Wallet" },
      ]}
    >
      <div className="flex flex-wrap items-start justify-between gap-4">
        <SectionHeader
          as="h1"
          serif
          title="Demo administration"
          description="Inspect Ed25519 identities, signed attestations, and verification state."
        />
        <AdminControls />
      </div>

      <InlineNotice tone="info" className="mt-6" title="Data backend: local-first">
        All data lives in this browser&apos;s storage as portable JSON. Nothing is
        stored on a server except a hash list of registered emails. Use the
        controls above to export, import, or reseed your local data.
      </InlineNotice>

      <section className="mt-8 space-y-4">
        <h2 className="text-lg font-semibold text-ink">Quick links</h2>
        <ul className="space-y-1 text-sm">
          <li>
            <Link href="/resident/r_marcus" className="text-accent hover:text-accent-hover">
              Marcus&apos;s wallet
            </Link>
          </li>
          <li>
            <Link
              href={`/verify?token=${seedPacket.token}`}
              className="text-accent hover:text-accent-hover"
            >
              Sample verification packet
            </Link>
          </li>
          <li>
            <Link href="/provider" className="text-accent hover:text-accent-hover">
              Provider console
            </Link>
          </li>
        </ul>
      </section>

      <LocalDataGate loading={query.loading}>
        {query.data ? (
          <>
            <section className="mt-10">
              <h2 className="text-lg font-semibold text-ink">Identities</h2>
              <p className="mt-1 text-sm text-ink-muted">
                Each user is an Ed25519 keypair. Fingerprint = SHA-512(public_key)[0:8].
              </p>
              <ul className="mt-3 divide-y divide-line rounded-card border border-line bg-surface">
                {[...query.data.residents, ...query.data.providers].map((u) => (
                  <li
                    key={u.fingerprint}
                    className="flex flex-wrap items-center justify-between gap-2 px-4 py-3 text-sm"
                  >
                    <span className="font-medium text-ink">
                      {"displayName" in u ? u.displayName : u.name}
                    </span>
                    <code className="font-mono text-xs text-ink-muted">{u.fingerprint}</code>
                  </li>
                ))}
              </ul>
            </section>

            <section className="mt-10 space-y-6">
              <h2 className="text-lg font-semibold text-ink">Attestation verification</h2>
              {query.data.verifications.map(({ r, ledger, attestations, result }) => (
                <div key={r.fingerprint} className="space-y-3">
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="font-medium text-ink">{r.displayName}</h3>
                    <code className="text-xs text-ink-faint">{r.fingerprint}</code>
                    <span className="text-sm text-ink-muted">
                      {ledger.length} attestations
                    </span>
                  </div>
                  <VerificationBanner result={result} />
                  <details className="rounded-lg border border-line bg-surface text-sm">
                    <summary className="cursor-pointer px-4 py-3 font-medium text-ink">
                      Inspect attestations
                    </summary>
                    <ul className="divide-y divide-line border-t border-line">
                      {attestations.map((a, i) => {
                        const cred = ledger[i];
                        const entry = result.entries[i];
                        return (
                          <li key={a.nonce} className="px-4 py-2 font-mono text-xs text-ink-muted">
                            {cred?.title ?? a.nonce.slice(0, 8)} · from{" "}
                            {shortHex(a.from)} → to {shortHex(a.to)} · sig{" "}
                            {entry?.signatureValid ? "✓" : "✗"} · nonce{" "}
                            {shortHex(a.nonce)}
                          </li>
                        );
                      })}
                    </ul>
                  </details>
                </div>
              ))}
            </section>
          </>
        ) : null}
      </LocalDataGate>
    </AppShell>
  );
}
