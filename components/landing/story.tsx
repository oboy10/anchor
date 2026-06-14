"use client";

import { FadeIn } from "./fade-in";

const marqueeText =
  "Resident-controlled · Positive-only · Cryptographically signed · Revocable sharing · Not a credit score · Not surveillance · ";

export function StoryStatement() {
  return (
    <section className="overflow-hidden py-3">
      <div className="glass mx-4 overflow-hidden rounded-2xl sm:mx-6 lg:mx-10">
        <div className="flex w-max animate-marquee py-3">
        {[0, 1].map((i) => (
          <p
            key={i}
            aria-hidden={i === 1}
            className="shrink-0 px-6 font-serif text-[clamp(2rem,7vw,4.5rem)] tracking-[-0.03em] text-ink/85"
          >
            {marqueeText.repeat(2)}
          </p>
        ))}
      </div>
      </div>
    </section>
  );
}

export function Problem() {
  return (
    <section className="relative py-16 lg:py-24">
      <div className="mx-auto max-w-7xl px-6 lg:px-10">
        <FadeIn>
          <p className="text-[12px] uppercase tracking-[0.16em] text-teal">
            The problem
          </p>
          <h2 className="mt-4 max-w-3xl font-serif text-[clamp(2rem,4.5vw,3.5rem)] leading-[1.1] tracking-[-0.03em] text-ink">
            No paper trail.
            <br />
            <span className="text-ink-muted">Even when the record is real.</span>
          </h2>
        </FadeIn>

        <FadeIn className="mt-6 lg:mt-8" delay={0.1}>
          <p className="glass-card max-w-3xl rounded-2xl p-8 text-[clamp(1.0625rem,1.8vw,1.25rem)] leading-[1.65] text-ink-soft lg:p-10">
            People exiting homelessness often have no traditional documentation
            landlords or employers trust — even when they&apos;ve paid rent on
            time, completed programs, or earned references. Anchor lets trusted
            organizations cryptographically sign positive facts about a person.
            The resident owns the record and decides exactly what to share.
          </p>
        </FadeIn>
      </div>
    </section>
  );
}
