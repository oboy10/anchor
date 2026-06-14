"use client";

import { FadeIn } from "./fade-in";
import { LockAnimation } from "./lock-animation";

const trustPoints = [
  {
    title: "Ed25519 signatures",
    body: "Each attestation is signed with a 32-byte keypair. Verification checks the signature against the issuer's public key.",
  },
  {
    title: "Fingerprints",
    body: "Short 16-character IDs derived from SHA-512 of the public key — readable handles without exposing full keys.",
  },
  {
    title: "Canonical encoding",
    body: "Attestation bodies use sorted JSON keys for stable, byte-for-byte signing. Nonces prevent replay.",
  },
  {
    title: "Keys stay server-side",
    body: "Provider private keys never land in the database — only on the server via secure environment configuration.",
  },
];

export function Trust() {
  return (
    <section
      id="trust"
      className="scroll-mt-24 relative overflow-hidden py-16 lg:py-24"
    >
      <div className="relative mx-auto max-w-7xl px-6 lg:px-10">
        <div className="grid items-center gap-10 lg:grid-cols-2 lg:gap-14">
          <FadeIn>
            <p className="text-[12px] uppercase tracking-[0.16em] text-teal">
              Trust &amp; cryptography
            </p>
            <h2 className="mt-4 font-serif text-[clamp(2rem,4.5vw,3.25rem)] leading-[1.08] tracking-[-0.03em] text-ink">
              Signed facts.
              <br />
              <span className="text-teal">Detectable tampering.</span>
            </h2>
            <p className="mt-6 max-w-md text-[16px] leading-relaxed text-ink-soft">
              An attestation is a signed directed edge: an issuer signs positive
              properties about a resident. Verifiers check the chain — no hidden
              ratings, no opaque algorithms.
            </p>

            <div className="mt-10 rounded-2xl glass p-5 font-mono text-[12px] leading-relaxed text-ink-soft">
              <p className="text-ink-muted">{"// attestation body"}</p>
              <p className="mt-2">{`{ "from", "to", "properties", "nonce" }`}</p>
              <p className="mt-3 text-teal">signature → Ed25519(canonical JSON)</p>
            </div>
          </FadeIn>

          <FadeIn delay={0.15}>
            <div className="flex flex-col items-center lg:items-end">
              <LockAnimation />
              <div className="mt-8 max-w-xs text-center lg:text-right">
                <p className="text-[11px] font-medium uppercase tracking-[0.14em] text-teal">
                  End-to-end encrypted
                </p>
                <p className="mt-3 text-[15px] leading-relaxed text-ink">
                  Every credential is signed with{" "}
                  <span className="font-medium text-teal">Ed25519</span>{" "}
                  signatures and verified against the issuer&apos;s public key
                  before anything is shown.
                </p>
                <p className="mt-2 text-[13px] leading-relaxed text-ink-muted">
                  Tampering is detectable. No hidden scores. No opaque
                  algorithms.
                </p>
              </div>
            </div>
          </FadeIn>
        </div>

        <div className="mt-14 grid gap-3 lg:grid-cols-4">
          {trustPoints.map((point, i) => (
            <FadeIn
              key={point.title}
              delay={0.1 * i}
              className="glass-card rounded-2xl p-8 lg:p-9"
            >
              <h3 className="text-[14px] font-medium text-ink">{point.title}</h3>
              <p className="mt-3 text-[13px] leading-relaxed text-ink-muted">
                {point.body}
              </p>
            </FadeIn>
          ))}
        </div>
      </div>
    </section>
  );
}
