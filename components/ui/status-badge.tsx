import * as React from "react";
import { Check, CircleAlert, RotateCcw, ShieldCheck } from "lucide-react";
import { cn } from "@/lib/cn";

type Tone = "verified" | "warning" | "danger" | "info" | "neutral";

const tones: Record<Tone, string> = {
  verified: "bg-verified-soft text-accent-ink border-accent/20",
  warning: "bg-warning-soft text-warning border-warning/20",
  danger: "bg-danger-soft text-danger border-danger/20",
  info: "bg-info-soft text-info border-info/20",
  neutral: "bg-surface-sunken text-ink-muted border-line-strong",
};

export interface StatusBadgeProps {
  tone?: Tone;
  children: React.ReactNode;
  /** Optional leading icon; pass `false` to omit, or a node to override. */
  icon?: React.ReactNode | false;
  className?: string;
}

const defaultIcons: Partial<Record<Tone, React.ReactNode>> = {
  verified: <ShieldCheck className="size-3.5" aria-hidden />,
  warning: <CircleAlert className="size-3.5" aria-hidden />,
  danger: <CircleAlert className="size-3.5" aria-hidden />,
  info: <Check className="size-3.5" aria-hidden />,
};

export function StatusBadge({
  tone = "neutral",
  children,
  icon,
  className,
}: StatusBadgeProps) {
  const leading = icon === false ? null : icon ?? defaultIcons[tone];
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-medium",
        tones[tone],
        className,
      )}
    >
      {leading}
      {children}
    </span>
  );
}

export { RotateCcw as CorrectionIcon };
