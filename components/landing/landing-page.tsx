import { Nav } from "./nav";
import { Hero } from "./hero";
import { StoryStatement, Problem } from "./story";
import { Stats } from "./stats";
import { HowItWorks } from "./how-it-works";
import { WalletSection } from "./wallet-section";
import { Roles } from "./roles";
import { Trust } from "./trust";
import { WhatItsNot } from "./what-its-not";
import { StoryCloser } from "./demo-cta";
import { AmbientBackground } from "./ambient-background";
import { SmoothScroll } from "./smooth-scroll";
import "@/app/landing.css";

export function LandingPage() {
  return (
    <div className="landing-site">
      <AmbientBackground />
      <SmoothScroll />
      <Nav />
      <main>
        <Hero />
        <StoryStatement />
        <Problem />
        <Stats />
        <HowItWorks />
        <WalletSection />
        <Roles />
        <Trust />
        <WhatItsNot />
        <StoryCloser />
      </main>
    </div>
  );
}
