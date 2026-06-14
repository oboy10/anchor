"use client";

import Link from "next/link";
import { motion, useScroll, useTransform } from "framer-motion";
import { AnchorLogo } from "./anchor-logo";
import { SIGN_IN_URL } from "@/lib/landing/constants";

const links = [
  ["How it works", "#how"],
  ["Residents", "#residents"],
  ["Trust", "#trust"],
] as const;

export function Nav() {
  const { scrollY } = useScroll();
  const scrolled = useTransform(scrollY, [0, 80], [0, 1]);
  const navWidth = useTransform(scrollY, [0, 120], ["100%", "96%"]);

  return (
    <motion.header
      initial={{ y: -24, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
      className="fixed inset-x-0 top-0 z-50 flex justify-center px-4 pt-4 sm:px-6"
    >
      <motion.div
        style={{ width: navWidth }}
        className="relative max-w-3xl"
      >
        <motion.div
          className="glass-nav glass-shine relative flex h-[3.25rem] items-center justify-between rounded-full px-2 pl-4 sm:h-14 sm:pl-5 sm:pr-2"
        >
          <motion.div
            style={{ opacity: scrolled }}
            className="glass-nav-scrolled pointer-events-none absolute inset-0 rounded-full"
            aria-hidden
          />

          <Link href="/" className="relative z-10 flex items-center gap-2.5">
            <AnchorLogo
              width={28}
              height={28}
              className="h-7 w-7 bg-transparent"
              priority
            />
            <span className="text-[14px] font-medium tracking-[-0.02em] text-ink">
              Anchor
            </span>
          </Link>

          <nav className="relative z-10 hidden items-center gap-0.5 rounded-full glass-pill p-1 md:flex">
            {links.map(([label, href]) => (
              <a
                key={href}
                href={href}
                className="rounded-full px-3.5 py-1.5 text-[12px] text-ink-muted transition-all hover:bg-white/40 hover:text-ink"
              >
                {label}
              </a>
            ))}
          </nav>

          <Link
            href={SIGN_IN_URL}
            className="relative z-10 rounded-full bg-teal/90 px-4 py-2 text-[12px] font-medium text-cream shadow-[0_4px_16px_rgba(42,96,96,0.22),inset_0_1px_0_rgba(255,255,255,0.15)] transition-all hover:bg-teal hover:shadow-[0_6px_24px_rgba(42,96,96,0.3)] sm:px-5 sm:text-[13px]"
          >
            Try Anchor
          </Link>
        </motion.div>
      </motion.div>
    </motion.header>
  );
}
