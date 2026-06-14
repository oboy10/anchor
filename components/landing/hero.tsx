"use client";

import Link from "next/link";
import { motion, useScroll, useTransform } from "framer-motion";
import { useRef } from "react";
import { FadeInWords } from "./fade-in";
import { HeroLogo } from "./hero-logo";
import { SIGN_IN_URL } from "@/lib/landing/constants";

export function Hero() {
  const ref = useRef(null);
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ["start start", "end start"],
  });
  const opacity = useTransform(scrollYProgress, [0, 0.55], [1, 0]);
  const y = useTransform(scrollYProgress, [0, 0.55], [0, -40]);
  const logoScale = useTransform(scrollYProgress, [0, 0.55], [1, 0.88]);

  return (
    <section
      ref={ref}
      className="relative flex min-h-[92svh] flex-col items-center justify-center overflow-hidden px-6 pt-24 pb-12 sm:pt-28"
    >
      <HeroBackground />

      <motion.div
        style={{ opacity, y }}
        className="relative z-10 mx-auto flex max-w-4xl flex-col items-center text-center"
      >
        <motion.div style={{ scale: logoScale }}>
          <HeroLogo />
        </motion.div>

        <h1 className="font-serif text-[clamp(2.25rem,6.5vw,4.5rem)] leading-[1.06] tracking-[-0.03em] text-ink">
          <FadeInWords text="A verified record you own" delay={0.35} />
          <br />
          <motion.span
            className="mt-1 block italic text-teal"
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{
              duration: 0.7,
              delay: 1,
              ease: [0.22, 1, 0.36, 1],
            }}
          >
            — not a score someone else assigns.
          </motion.span>
        </h1>

        <motion.p
          className="mx-auto mt-8 max-w-xl text-[17px] leading-relaxed text-ink-soft"
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{
            duration: 0.7,
            delay: 1.2,
            ease: [0.22, 1, 0.36, 1],
          }}
        >
          Anchor is a resident-controlled reputation wallet — portable,
          organization-issued credentials for people rebuilding after
          homelessness. You decide what to share, with whom, and for how long.
        </motion.p>

        <motion.div
          className="mt-10 flex flex-col items-center gap-3 sm:flex-row"
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{
            duration: 0.6,
            delay: 1.4,
            ease: [0.22, 1, 0.36, 1],
          }}
        >
          <Link
            href={SIGN_IN_URL}
            className="inline-flex h-12 items-center justify-center rounded-full bg-ink/90 px-7 text-[14px] font-medium text-cream shadow-[0_8px_28px_rgba(20,18,16,0.18),inset_0_1px_0_rgba(255,255,255,0.1)] transition-all hover:bg-ink hover:shadow-[0_12px_36px_rgba(20,18,16,0.22)]"
          >
            Try Anchor
          </Link>
          <a
            href="#how"
            className="glass-button inline-flex h-12 items-center justify-center rounded-full px-7 text-[14px] font-medium text-ink"
          >
            How it works
          </a>
        </motion.div>
      </motion.div>
    </section>
  );
}

function HeroBackground() {
  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden>
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_70%_50%_at_50%_0%,rgba(42,96,96,0.07),transparent_70%)]" />
      <motion.div
        className="absolute -left-24 top-1/4 h-72 w-72 rounded-full bg-teal/[0.05] blur-3xl"
        animate={{ x: [0, 30, 0], y: [0, -20, 0] }}
        transition={{ duration: 12, repeat: Infinity, ease: "easeInOut" }}
      />
      <motion.div
        className="absolute -right-16 bottom-1/4 h-64 w-64 rounded-full bg-white/30 blur-3xl"
        animate={{ x: [0, -24, 0], y: [0, 16, 0] }}
        transition={{ duration: 10, repeat: Infinity, ease: "easeInOut", delay: 1 }}
      />
    </div>
  );
}
