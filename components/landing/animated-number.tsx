"use client";

import { animate, useInView } from "framer-motion";
import { useEffect, useRef, useState } from "react";

type AnimatedNumberProps = {
  value: number;
  suffix?: string;
  decimals?: number;
  className?: string;
};

export function AnimatedNumber({
  value,
  suffix = "",
  decimals = 0,
  className,
}: AnimatedNumberProps) {
  const ref = useRef<HTMLSpanElement>(null);
  const inView = useInView(ref, { once: true, margin: "-80px" });
  const [display, setDisplay] = useState(decimals > 0 ? "0." + "0".repeat(decimals) : "0");

  useEffect(() => {
    if (!inView) return;

    const controls = animate(0, value, {
      duration: 2,
      ease: [0.22, 1, 0.36, 1],
      onUpdate: (latest) => {
        setDisplay(
          decimals > 0 ? latest.toFixed(decimals) : String(Math.round(latest)),
        );
      },
    });

    return () => controls.stop();
  }, [inView, value, decimals]);

  return (
    <span ref={ref} className={className}>
      {display}
      {suffix}
    </span>
  );
}

type AnimatedFractionProps = {
  className?: string;
};

export function AnimatedFraction({ className }: AnimatedFractionProps) {
  const ref = useRef<HTMLSpanElement>(null);
  const inView = useInView(ref, { once: true, margin: "-80px" });
  const [numerator, setNumerator] = useState(0);

  useEffect(() => {
    if (!inView) return;

    const controls = animate(0, 1, {
      duration: 1.2,
      ease: [0.22, 1, 0.36, 1],
      onUpdate: (latest) => setNumerator(Math.round(latest)),
    });

    return () => controls.stop();
  }, [inView]);

  return (
    <span ref={ref} className={className}>
      {numerator} in 5
    </span>
  );
}
