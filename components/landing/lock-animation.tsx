"use client";

import { motion, useInView } from "framer-motion";
import { useRef } from "react";

const STROKE = 5.5;

export function LockAnimation() {
  const ref = useRef(null);
  const inView = useInView(ref, { once: true, margin: "-100px" });

  return (
    <div
      ref={ref}
      className="relative flex h-56 w-56 items-center justify-center rounded-3xl glass-card glass-shine sm:h-60 sm:w-60"
    >
      <svg
        viewBox="0 0 72 88"
        className="h-32 w-auto text-teal sm:h-36"
        fill="none"
        aria-hidden
      >
        {/* Body */}
        <motion.rect
          x="14"
          y="42"
          width="44"
          height="38"
          rx="8"
          stroke="currentColor"
          strokeWidth={STROKE}
          fill="none"
          initial={{ opacity: 0, scale: 0.96 }}
          animate={inView ? { opacity: 1, scale: 1 } : {}}
          transition={{ duration: 0.5, delay: 0.1, ease: [0.22, 1, 0.36, 1] }}
          style={{ transformOrigin: "36px 61px" }}
        />

        {/* Shackle */}
        <motion.path
          d="M 22 42 V 28 C 22 16 50 16 50 28 V 42"
          stroke="currentColor"
          strokeWidth={STROKE}
          strokeLinecap="round"
          strokeLinejoin="round"
          fill="none"
          initial={{ rotate: -22, opacity: 0 }}
          animate={
            inView ? { rotate: 0, opacity: 1 } : { rotate: -22, opacity: 0 }
          }
          transition={{
            rotate: { duration: 0.65, delay: 0.35, ease: [0.22, 1, 0.36, 1] },
            opacity: { duration: 0.3, delay: 0.25 },
          }}
          style={{ transformOrigin: "22px 42px" }}
        />
      </svg>
    </div>
  );
}
