import * as React from "react";
import { cn } from "@/lib/cn";

export interface MetricCardProps {
  value: React.ReactNode;
  label: string;
  /** Small supporting line under the label. */
  detail?: string;
  icon?: React.ReactNode;
  className?: string;
}

export function MetricCard({
  value,
  label,
  detail,
  icon,
  className,
}: MetricCardProps) {
  return (
    <div
      className={cn(
        "rounded-card border border-line bg-surface p-4 shadow-card",
        className,
      )}
    >
      <div className="flex items-center gap-2 text-ink-muted">
        {icon ? <span className="text-accent">{icon}</span> : null}
        <span className="text-sm">{label}</span>
      </div>
      <p className="mt-2 font-serif text-3xl text-ink tnum">{value}</p>
      {detail ? <p className="mt-0.5 text-sm text-ink-muted">{detail}</p> : null}
    </div>
  );
}
