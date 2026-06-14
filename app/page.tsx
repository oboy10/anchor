import Link from "next/link";
import { Brand } from "@/components/brand";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/cn";

const outcomes = [
  { label: "Resident owned", value: "100%" },
  { label: "Share links", value: "Timed" },
  { label: "Hidden scores", value: "0" },
];

const credentials = [
  {
    title: "Housing good standing",
    issuer: "Milpitas Shelter Network",
    detail: "6 months of positive tenancy notes",
  },
  {
    title: "On-time contribution history",
    issuer: "Bridge Housing Partner",
    detail: "Verified payments and program participation",
  },
  {
    title: "Employment reference",
    issuer: "Community Works",
    detail: "Signed reliability endorsement",
  },
];

const steps = [
  {
    title: "Organizations issue",
    body:
      "Shelters, landlords, employers, and programs sign positive records directly to a resident-held wallet.",
  },
  {
    title: "Residents curate",
    body:
      "The resident reviews the timeline, adds optional context, and chooses exactly what should be shared.",
  },
  {
    title: "Reviewers verify",
    body:
      "A landlord, employer, or counselor opens a time-limited link and sees only the selected credentials.",
  },
];

export default function LandingPage() {
  return (
    <div className="landing-color-field relative flex min-h-full flex-col overflow-hidden">
      <div className="ambient-grid pointer-events-none absolute inset-x-0 top-0 h-[42rem]" />
      <div className="pointer-events-none absolute -left-32 top-28 h-80 w-80 rounded-full bg-accent/12 blur-3xl" />
      <div className="pointer-events-none absolute right-[-10rem] top-[38rem] h-96 w-96 rounded-full bg-info/12 blur-3xl" />
      <div className="pointer-events-none absolute bottom-40 left-1/2 h-72 w-[34rem] -translate-x-1/2 rounded-full bg-warning/10 blur-3xl" />

      <header className="sticky top-0 z-40 border-b border-white/50 bg-canvas/70 backdrop-blur-xl">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:px-6">
          <Brand />
          <nav className="hidden items-center gap-1 text-sm font-medium text-ink-muted md:flex">
            <a href="#workflow" className="rounded-full px-3 py-1.5 hover:bg-white/55 hover:text-ink">
              Workflow
            </a>
            <a href="#proof" className="rounded-full px-3 py-1.5 hover:bg-white/55 hover:text-ink">
              Proof
            </a>
            <a href="#principles" className="rounded-full px-3 py-1.5 hover:bg-white/55 hover:text-ink">
              Principles
            </a>
          </nav>
          <Link href="/sign-in" className={cn(buttonVariants("secondary", "sm"))}>
            Sign in
          </Link>
        </div>
      </header>

      <main className="relative z-10 flex-1">
        <section className="mx-auto grid min-h-[calc(100vh-4rem)] max-w-6xl items-center gap-10 px-4 py-14 sm:px-6 lg:grid-cols-[1.02fr_0.98fr] lg:py-20">
          <div>
            <h1 className="max-w-3xl font-serif text-5xl leading-[0.96] text-ink sm:text-6xl lg:text-7xl">
              A verified record you own, not a score someone else assigns.
            </h1>
            <p className="mt-6 max-w-2xl text-lg leading-8 text-ink-muted">
              Anchor helps people rebuilding after homelessness carry forward
              verified proof of reliability: payment history, housing good
              standing, references, training, and caseworker endorsements.
            </p>

            <div className="mt-8 flex flex-wrap items-center gap-3">
              <Link href="/sign-in?new=1" className={buttonVariants("primary", "md")}>
                Create your account
                <span aria-hidden>→</span>
              </Link>
              <a href="#workflow" className={buttonVariants("secondary", "md")}>
                See how it works
              </a>
            </div>

            <dl className="mt-10 grid max-w-xl grid-cols-3 gap-3">
              {outcomes.map((item) => (
                <div key={item.label} className="liquid-glass-subtle rounded-card px-4 py-3">
                  <dt className="text-xs font-medium uppercase tracking-wide text-ink-faint">
                    {item.label}
                  </dt>
                  <dd className="mt-1 font-serif text-2xl text-ink">{item.value}</dd>
                </div>
              ))}
            </dl>
          </div>

          <div className="float-slow relative">
            <div className="liquid-glass glass-edge wallet-preview-glow rounded-[2rem] p-4 sm:p-5">
              <div className="relative overflow-hidden rounded-[1.5rem] border border-white/60 bg-surface/70">
                <div className="flex items-center justify-between border-b border-line/70 bg-white/42 px-5 py-4">
                  <div>
                    <p className="text-xs font-medium uppercase tracking-[0.18em] text-accent">
                      Anchor wallet
                    </p>
                    <h2 className="mt-1 font-serif text-2xl text-ink">Marcus R.</h2>
                  </div>
                  <div className="rounded-full bg-accent-soft px-3 py-1 text-xs font-medium text-accent-ink">
                    Verified
                  </div>
                </div>

                <div className="space-y-3 p-5">
                  {credentials.map((credential) => (
                    <article
                      key={credential.title}
                      className="rounded-2xl border border-white/60 bg-white/54 p-4 shadow-[0_12px_28px_rgba(43,42,38,0.06)]"
                    >
                      <div className="flex items-start justify-between gap-4">
                        <div>
                          <h3 className="font-semibold text-ink">{credential.title}</h3>
                          <p className="mt-1 text-sm text-ink-muted">{credential.issuer}</p>
                        </div>
                        <span className="rounded-full border border-accent/20 bg-accent-soft px-2.5 py-0.5 text-xs font-medium text-accent-ink">
                          Signed
                        </span>
                      </div>
                      <p className="mt-3 text-sm leading-6 text-ink-muted">
                        {credential.detail}
                      </p>
                    </article>
                  ))}
                </div>

                <div className="border-t border-line/70 bg-accent-soft/42 p-5">
                  <div className="rounded-2xl bg-white/62 p-4">
                    <p className="text-sm font-medium text-ink">Share packet ready</p>
                    <p className="mt-1 text-sm text-ink-muted">
                      Housing application · expires in 7 days · 3 credentials selected
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section id="workflow" className="mx-auto max-w-6xl scroll-mt-24 px-4 py-12 sm:px-6">
          <div className="grid gap-4 md:grid-cols-3">
            {steps.map((step, index) => (
              <article key={step.title} className="liquid-glass-subtle rounded-card p-6">
                <span className="flex size-10 items-center justify-center rounded-full bg-accent text-sm font-semibold text-white">
                  {index + 1}
                </span>
                <h2 className="mt-5 font-serif text-2xl text-ink">{step.title}</h2>
                <p className="mt-3 text-[15px] leading-7 text-ink-muted">{step.body}</p>
              </article>
            ))}
          </div>
        </section>

        <section id="proof" className="mx-auto max-w-6xl scroll-mt-24 px-4 py-12 sm:px-6">
          <div className="liquid-glass grid gap-8 rounded-[2rem] p-6 sm:p-8 lg:grid-cols-[0.9fr_1.1fr]">
            <div>
              <p className="text-sm font-medium text-accent">What reviewers see</p>
              <h2 className="mt-3 font-serif text-4xl leading-tight text-ink">
                Only the evidence a resident chooses to share.
              </h2>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              {[
                "Integrity-checked signatures",
                "Issuer names and dates",
                "Resident-selected notes",
                "No hidden rating model",
              ].map((item) => (
                <div key={item} className="rounded-2xl border border-white/60 bg-white/50 p-4">
                  <p className="text-sm font-medium text-ink">{item}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section id="principles" className="relative mx-auto max-w-6xl scroll-mt-24 px-4 py-12 sm:px-6 sm:pb-20">
          <div className="absolute inset-x-4 top-0 h-px bg-gradient-to-r from-transparent via-accent/24 to-transparent sm:inset-x-6" />
          <div className="grid gap-8 pt-10 lg:grid-cols-[0.72fr_1fr]">
            <div>
              <p className="text-sm font-medium text-accent">What this is not</p>
              <h2 className="mt-3 font-serif text-4xl leading-tight text-ink">
                Not a credit score, background check, or surveillance layer.
              </h2>
            </div>
            <div className="space-y-4 text-[15px] leading-8 text-ink-muted">
              <p>
                There are no hidden ratings. Providers cannot edit past entries.
                Residents can revoke a share link at any time.
              </p>
              <p>
                Anchor is designed to help credible, positive history move with
                the person who earned it, without creating a new screening system
                outside their control.
              </p>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}
