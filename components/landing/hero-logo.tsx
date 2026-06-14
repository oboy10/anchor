"use client";

import { motion } from "framer-motion";
import { AnchorLogo } from "./anchor-logo";

const ringSize = "clamp(8.5rem, 22vw, 12.5rem)";

export function HeroLogo() {
  return (
    <div className="relative mb-12 flex justify-center sm:mb-14">
      <motion.div
        className="relative flex items-center justify-center"
        style={{ width: ringSize, height: ringSize }}
        initial={{ opacity: 0, scale: 0.85 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 1, ease: [0.22, 1, 0.36, 1] }}
      >
        <div
          className="pointer-events-none absolute inset-0 rounded-full bg-teal/10 blur-2xl"
          aria-hidden
        />
        <div
          className="pointer-events-none absolute inset-0 rounded-full border border-teal/10"
          aria-hidden
        />
        <AnchorLogo
          alt=""
          width={280}
          height={280}
          priority
          className="relative h-[clamp(7rem, 18vw, 10.5rem)] w-[clamp(7rem, 18vw, 10.5rem)] bg-transparent drop-shadow-[0_8px_32px_rgba(42,96,96,0.12)]"
        />
      </motion.div>
    </div>
  );
}
