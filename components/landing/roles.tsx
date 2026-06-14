"use client";

import Link from "next/link";
import { motion, useInView } from "framer-motion";
import { useRef, useState } from "react";
import { FadeIn } from "./fade-in";
import { ISSUE_URL, VERIFY_URL, WALLET_URL } from "@/lib/landing/constants";

const roles = [
  {
    id: "residents",
    label: "Residents",
    title: "Your wallet. Your disclosure.",
    points: [
      "Credential timeline with filters by type",
      "Summary metrics and personal notes on each entry",
      "Build time-limited share packets (7 / 14 / 30 days)",
      "Email reviewers or copy link — revoke anytime",
    ],
    link: {
      label: "View in app",
      href: WALLET_URL,
    },
  },
  {
    id: "providers",
    label: "Organizations",
    title: "Issue signed, positive credentials.",
    points: [
      "Choose org, resident, credential type, and evidence",
      "Preview before issuing to the ledger",
      "Each issuance creates an Ed25519 attestation",
      "Corrections are explicit new entries — never silent edits",
    ],
    link: {
      label: "Provider portal",
      href: ISSUE_URL,
    },
  },
  {
    id: "verifiers",
    label: "Verifiers",
    title: "Verify integrity. No account needed.",
    points: [
      "Open a share packet by token — public page",
      "See only selected credentials, never the full wallet",
      "Cryptographic verification banner per entry",
      "Active, expired, or revoked status clearly shown",
    ],
    link: {
      label: "Sample verify link",
      href: VERIFY_URL,
    },
  },
];

export function Roles() {
  const [active, setActive] = useState(0);
  const contentRef = useRef(null);
  const inView = useInView(contentRef, { once: true, margin: "-80px" });

  return (
    <section id="residents" className="scroll-mt-24 py-16 lg:py-24">
      <div className="mx-auto max-w-7xl px-6 lg:px-10">
        <FadeIn>
          <p className="text-[12px] uppercase tracking-[0.16em] text-teal">
            Built for everyone in the chain
          </p>
          <h2 className="mt-4 max-w-3xl font-serif text-[clamp(2rem,4.5vw,3.25rem)] leading-[1.08] tracking-[-0.03em] text-ink">
            Three roles. One trust model.
          </h2>
        </FadeIn>

        <FadeIn className="glass-card glass-shine mt-8 rounded-3xl p-8 lg:mt-10 lg:p-10">
          <div ref={contentRef}>
          <div className="flex flex-wrap gap-2 rounded-full glass-pill p-1.5">
            {roles.map((role, i) => (
              <button
                key={role.id}
                type="button"
                onClick={() => setActive(i)}
                className={`rounded-full px-5 py-2.5 text-[13px] font-medium transition-all ${
                  active === i
                    ? "glass-pill-active text-cream"
                    : "text-ink-muted hover:bg-white/35 hover:text-ink"
                }`}
              >
                {role.label}
              </button>
            ))}
          </div>

          <motion.div
            key={active}
            initial={{ opacity: 0, y: 16 }}
            animate={inView ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
            className="grid gap-8 pt-6 lg:grid-cols-2 lg:gap-10"
          >
            <div>
              <h3 className="font-serif text-[clamp(1.75rem,3vw,2.5rem)] leading-tight tracking-[-0.02em] text-ink">
                {roles[active].title}
              </h3>
              <ul className="mt-8 space-y-4">
                {roles[active].points.map((point) => (
                  <li
                    key={point}
                    className="flex gap-3 text-[15px] leading-relaxed text-ink-soft"
                  >
                    <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-teal" />
                    {point}
                  </li>
                ))}
              </ul>
              <Link
                href={roles[active].link.href}
                className="mt-10 inline-flex items-center gap-2 text-[14px] font-medium text-teal transition-colors hover:text-teal-soft"
              >
                {roles[active].link.label}
                <span aria-hidden>→</span>
              </Link>
            </div>

            <div className="relative flex items-center justify-center rounded-2xl glass p-10 lg:p-14">
              <div className="relative space-y-5 text-center">
                <p className="text-[11px] uppercase tracking-[0.14em] text-ink-muted">
                  Core principle
                </p>
                <p className="font-serif text-[clamp(1.5rem,3vw,2rem)] leading-snug tracking-[-0.02em] text-ink">
                  {active === 0 && "Resident-controlled disclosure"}
                  {active === 1 && "Positive-only ledger"}
                  {active === 2 && "Verifiable integrity"}
                </p>
                <p className="mx-auto max-w-xs text-[14px] leading-relaxed text-ink-muted">
                  {active === 0 &&
                    "You decide what credentials appear in every share link."}
                  {active === 1 &&
                    "Shelters, landlords, and employers issue affirming credentials — never punitive scores."}
                  {active === 2 &&
                    "Each entry is cryptographically signed. Tampering is detectable."}
                </p>
              </div>
            </div>
          </motion.div>
          </div>
        </FadeIn>
      </div>
    </section>
  );
}
