"use client";

import { motion, useInView } from "framer-motion";
import { useRef } from "react";
import { FadeIn } from "./fade-in";

const steps = [
  {
    num: "01",
    title: "Organizations issue credentials",
    body: "A shelter, landlord, employer, or caseworker adds a signed, positive entry — payment history, good standing, reference, training, and more.",
  },
  {
    num: "02",
    title: "Resident reviews their timeline",
    body: "Everything appears in one wallet with issuer, date, and optional personal notes — context the resident owns, unsigned and private.",
  },
  {
    num: "03",
    title: "Resident builds a share packet",
    body: "Pick credentials, set expiration (7, 14, or 30 days), add an optional message, and email a reviewer — or copy the link.",
  },
  {
    num: "04",
    title: "Verifier opens the link",
    body: "A public page shows only what was selected. Each credential's signature is checked against the ledger. No account required.",
  },
];

function StepCard({
  step,
  index,
}: {
  step: (typeof steps)[0];
  index: number;
}) {
  const ref = useRef(null);
  const inView = useInView(ref, { once: true, margin: "-100px" });

  return (
    <motion.article
      ref={ref}
      className="group relative border-t border-white/35 py-6 first:border-t-0 lg:py-8"
      initial={{ opacity: 0, x: index % 2 === 0 ? -20 : 20 }}
      animate={inView ? { opacity: 1, x: 0 } : {}}
      whileHover={{ x: 4 }}
      transition={{
        duration: 0.75,
        delay: index * 0.08,
        ease: [0.22, 1, 0.36, 1],
      }}
    >
      <div className="grid gap-6 lg:grid-cols-12 lg:items-start lg:gap-10">
        <p className="font-serif text-[clamp(3rem,6vw,5rem)] leading-none tracking-[-0.04em] text-teal/20 transition-colors group-hover:text-teal/35 lg:col-span-3">
          {step.num}
        </p>
        <div className="lg:col-span-9">
          <h3 className="text-[clamp(1.25rem,2.5vw,1.75rem)] font-medium tracking-[-0.02em] text-ink">
            {step.title}
          </h3>
          <p className="mt-4 max-w-2xl text-[16px] leading-relaxed text-ink-soft">
            {step.body}
          </p>
        </div>
      </div>
    </motion.article>
  );
}

export function HowItWorks() {
  return (
    <section id="how" className="scroll-mt-24 py-16 lg:py-24">
      <div className="mx-auto max-w-7xl px-6 lg:px-10">
        <FadeIn className="glass-card glass-shine overflow-hidden rounded-3xl px-8 lg:px-12">
          <div className="border-b border-white/40 py-6 lg:py-8">
            <p className="text-[12px] uppercase tracking-[0.16em] text-teal">
              How it works
            </p>
            <h2 className="mt-4 max-w-3xl font-serif text-[clamp(2rem,4.5vw,3.25rem)] leading-[1.08] tracking-[-0.03em] text-ink">
              From issuance to verification — four steps, full control.
            </h2>
          </div>

          <div>
            {steps.map((step, i) => (
              <StepCard key={step.num} step={step} index={i} />
            ))}
          </div>
        </FadeIn>
      </div>
    </section>
  );
}
