"use client";

import { motion, useInView } from "framer-motion";
import { useRef } from "react";

export function WalletIdCard() {
  const ref = useRef(null);
  const inView = useInView(ref, { once: true, margin: "-80px" });

  return (
    <motion.div
      ref={ref}
      className="glass-card glass-shine flex h-64 w-64 items-center justify-center rounded-3xl sm:h-72 sm:w-72 lg:h-80 lg:w-80"
      initial={{ opacity: 0, scale: 0.92 }}
      animate={inView ? { opacity: 1, scale: 1 } : {}}
      transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
    >
      <svg
        viewBox="0 0 64 64"
        className="h-40 w-40 text-teal sm:h-44 sm:w-44 lg:h-52 lg:w-52"
        fill="none"
        aria-hidden
      >
        <path
          d="M32 54 C32 54 10 38 10 24 C10 17 15 12 22 12 C26 12 30 14 32 18 C34 14 38 12 42 12 C49 12 54 17 54 24 C54 38 32 54 32 54 Z"
          stroke="currentColor"
          strokeWidth="3"
          strokeLinejoin="round"
        />
      </svg>
    </motion.div>
  );
}
