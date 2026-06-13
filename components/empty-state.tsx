import * as React from "react";
import { cn } from "@/lib/cn";

export interface EmptyStateProps {
  icon?: React.ReactNode;
  title: string;
  description?: string;
  action?: React.ReactNode;
  className?: string;
}

export function EmptyState({
  icon,
  title,
  description,
  action,
  className,
}: EmptyStateProps) {
  return (
    <div
      className={cn(
        "rounded-card border border-dashed border-line-strong bg-surface/50 px-6 py-10 text-center",
        className,
      )}
    >
      {icon ? (
        <div className="mx-auto mb-3 flex size-10 items-center justify-center rounded-full bg-surface-sunken text-ink-muted">
          {icon}
        </div>
      ) : null}
      <p className="font-medium text-ink">{title}</p>
      {description ? (
        <p className="mx-auto mt-1 max-w-sm text-sm text-ink-muted">
          {description}
        </p>
      ) : null}
      {action ? <div className="mt-4 flex justify-center">{action}</div> : null}
    </div>
  );
}
