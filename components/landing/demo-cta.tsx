"use client";

import Link from "next/link";
import { motion, useInView } from "framer-motion";
import { useRef } from "react";
import { AnchorLogo } from "./anchor-logo";
import { SIGN_IN_URL } from "@/lib/landing/constants";

export function StoryCloser() {
  const ref = useRef(null);
  const inView = useInView(ref, { once: true, margin: "-120px" });

  return (
    <section
      ref={ref}
      className="border-t border-line bg-ink py-20 text-cream lg:py-28"
    >
      <div className="mx-auto max-w-7xl px-6 text-center lg:px-10">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={inView ? { opacity: 1, scale: 1 } : {}}
          transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
          className="mb-8 flex justify-center"
        >
          <AnchorLogo
            alt=""
            width={96}
            height={96}
            className="h-20 w-20 brightness-0 invert opacity-90 sm:h-24 sm:w-24"
          />
        </motion.div>

        <motion.p
          className="font-serif text-[clamp(2rem,6vw,4.5rem)] leading-[1.06] tracking-[-0.03em]"
          initial={{ opacity: 0, y: 32 }}
          animate={inView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.8, delay: 0.1, ease: [0.22, 1, 0.36, 1] }}
        >
          Portable trust.
          <br />
          <span className="italic text-cream/70">On your terms.</span>
        </motion.p>

        <motion.p
          className="mx-auto mt-6 max-w-lg text-[15px] leading-relaxed text-cream/60"
          initial={{ opacity: 0 }}
          animate={inView ? { opacity: 1 } : {}}
          transition={{ duration: 0.7, delay: 0.3 }}
        >
          Civic-tech for verifiable positive reputation — built for people
          rebuilding after homelessness.
        </motion.p>

        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={inView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.6, delay: 0.45 }}
        >
          <Link
            href={SIGN_IN_URL}
            className="glass glass-liquid-cta mt-8 inline-flex h-12 min-w-[9.5rem] items-center justify-center rounded-full px-8 text-[14px] font-medium text-cream"
          >
            <span className="relative z-10">Try Anchor</span>
          </Link>
        </motion.div>
      </div>
    </section>
  );
}
