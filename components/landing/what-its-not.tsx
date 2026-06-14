"use client";

import { motion, useInView } from "framer-motion";
import { useRef } from "react";
import { FadeIn } from "./fade-in";

const notItems = [
  "Not a credit score",
  "Not a background check company",
  "Not a surveillance or hidden-rating system",
  "Providers cannot silently edit past entries",
  "Verifiers never see the full wallet",
];

export function WhatItsNot() {
  const listRef = useRef(null);
  const inView = useInView(listRef, { once: true, margin: "-60px" });

  return (
    <section id="not" className="py-16 lg:py-24">
      <div className="mx-auto max-w-7xl px-6 lg:px-10">
        <div className="glass-card glass-shine grid gap-10 rounded-3xl p-8 lg:grid-cols-2 lg:items-end lg:p-10">
          <FadeIn>
            <p className="text-[12px] uppercase tracking-[0.16em] text-teal">
              What Anchor is not
            </p>
            <h2 className="mt-4 font-serif text-[clamp(2.5rem,5vw,4rem)] leading-[1.05] tracking-[-0.03em] text-ink">
              Anti-score.
              <br />
              Anti-surveillance.
            </h2>
          </FadeIn>

          <ul ref={listRef} className="space-y-5">
            {notItems.map((item, i) => (
              <motion.li
                key={item}
                className="flex items-start gap-4 border-b border-white/40 pb-5 text-[clamp(1rem,2vw,1.125rem)] text-ink-soft last:border-0"
                initial={{ opacity: 0, x: 16 }}
                animate={inView ? { opacity: 1, x: 0 } : {}}
                transition={{
                  duration: 0.6,
                  delay: 0.08 * i,
                  ease: [0.22, 1, 0.36, 1],
                }}
              >
                <span className="mt-0.5 text-lg text-teal" aria-hidden>
                  ✕
                </span>
                {item}
              </motion.li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  );
}
