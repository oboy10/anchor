"use client";

import { motion, useInView } from "framer-motion";
import { useRef } from "react";
import { AnimatedFraction, AnimatedNumber } from "./animated-number";
import { FadeIn, FadeInWords } from "./fade-in";

const stats = [
  {
    id: "supportive-housing",
    figure: (
      <AnimatedFraction className="font-serif text-[clamp(3rem,8vw,4.5rem)] leading-none tracking-[-0.04em] text-teal" />
    ),
    label:
      "of eligible people are actually accepted to supportive housing.",
    study: "New York Homelessness Study",
    url: "https://citylimits.org/a-lot-of-false-hope-city-data-show-ongoing-barriers-to-supportive-housing/",
  },
  {
    id: "shelter-applications",
    figure: (
      <AnimatedNumber
        value={30}
        suffix="%"
        className="font-serif text-[clamp(3rem,8vw,4.5rem)] leading-none tracking-[-0.04em] text-teal"
      />
    ),
    label:
      "of eligible families have to submit six or more shelter applications before approval.",
    study: "New York Homelessness Study",
    url: "https://www.cityandstateny.com/politics/2022/03/bureaucratic-delays-mistakes-block-homeless-families-finding-shelter-report/363526/",
  },
  {
    id: "housing-vouchers",
    figure: (
      <AnimatedNumber
        value={5.8}
        suffix="%"
        decimals={1}
        className="font-serif text-[clamp(3rem,8vw,4.5rem)] leading-none tracking-[-0.04em] text-teal"
      />
    ),
    label:
      "of people with housing vouchers are actually given leases.",
    study: "Los Angeles Homelessness Study",
    url: "https://www.latimes.com/california/story/2022-07-25/emergency-housing-vouchers-story",
  },
];

const tagline =
  "Eligibility isn't enough. Landlords need to trust that their tenants can make payments.";

export function Stats() {
  const taglineRef = useRef(null);
  const taglineInView = useInView(taglineRef, { once: true, margin: "-60px" });

  return (
    <section className="relative py-12 lg:py-16">
      <div className="mx-auto max-w-7xl px-6 lg:px-10">
        <div className="grid gap-4 lg:grid-cols-3 lg:gap-5">
          {stats.map((stat, i) => (
            <FadeIn
              key={stat.id}
              delay={0.08 * i}
              className="glass-card glass-shine flex flex-col rounded-2xl p-8 lg:p-9"
            >
              <div>{stat.figure}</div>
              <p className="mt-5 flex-1 text-[15px] leading-relaxed text-ink-soft">
                {stat.label}
              </p>
              <p className="mt-6 text-[12px] leading-relaxed text-ink-muted">
                <span className="font-medium text-ink-soft">*{stat.study}</span>
                <br />
                <a
                  href={stat.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-teal underline decoration-teal/30 underline-offset-2 transition-colors hover:text-teal-soft"
                >
                  Read source
                </a>
              </p>
            </FadeIn>
          ))}
        </div>

        <motion.div
          ref={taglineRef}
          className="mx-auto mt-8 max-w-3xl text-center lg:mt-10"
          initial={{ opacity: 0, y: 24 }}
          animate={taglineInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
        >
          <p className="font-serif text-[clamp(1.5rem,3.5vw,2.25rem)] font-normal leading-[1.25] tracking-[-0.02em] text-ink">
            <FadeInWords text={tagline} delay={0.15} />
          </p>
        </motion.div>
      </div>
    </section>
  );
}
