import * as React from "react";
import { cn } from "@/lib/cn";

export interface SectionHeaderProps {
  title: string;
  description?: React.ReactNode;
  /** Right-aligned actions (e.g. a button). */
  action?: React.ReactNode;
  as?: "h1" | "h2" | "h3";
  className?: string;
  serif?: boolean;
}

export function SectionHeader({
  title,
  description,
  action,
  as: Tag = "h2",
  className,
  serif = false,
}: SectionHeaderProps) {
  return (
    <div className={cn("flex flex-wrap items-end justify-between gap-3", className)}>
      <div className="space-y-1">
        <Tag
          className={cn(
            "text-ink",
            serif ? "font-serif text-2xl" : "text-lg font-semibold",
            Tag === "h1" && serif && "text-3xl sm:text-4xl",
          )}
        >
          {title}
        </Tag>
        {description ? (
          <p className="max-w-prose text-[15px] leading-relaxed text-ink-muted">
            {description}
          </p>
        ) : null}
      </div>
      {action ? <div className="shrink-0">{action}</div> : null}
    </div>
  );
}
