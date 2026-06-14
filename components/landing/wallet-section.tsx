"use client";

import { FadeIn } from "./fade-in";
import { WalletIdCard } from "./wallet-id-card";

export function WalletSection() {
  return (
    <section className="relative overflow-hidden border-t border-white/30 py-16 lg:py-24">
      <div
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_60%_50%_at_70%_50%,rgba(42,96,96,0.05),transparent_70%)]"
        aria-hidden
      />

      <div className="relative mx-auto max-w-7xl px-6 lg:px-10">
        <div className="grid items-center gap-10 lg:grid-cols-2 lg:gap-14">
          <FadeIn>
            <p className="text-[12px] uppercase tracking-[0.16em] text-teal">
              The wallet
            </p>
            <h2 className="mt-4 font-serif text-[clamp(2rem,4.5vw,3.25rem)] leading-[1.08] tracking-[-0.03em] text-ink">
              Warm, calm, and yours.
            </h2>
            <p className="mt-5 max-w-md text-[16px] leading-relaxed text-ink-soft">
              Trauma-informed design. Plain language. No punitive framing — just
              a clear timeline of positive credentials you control.
            </p>
          </FadeIn>

          <FadeIn delay={0.12} className="flex justify-center lg:justify-end">
            <WalletIdCard />
          </FadeIn>
        </div>
      </div>
    </section>
  );
}
