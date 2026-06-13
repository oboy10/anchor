import * as React from "react";
import { Info, ShieldCheck, TriangleAlert } from "lucide-react";
import { cn } from "@/lib/cn";

type Tone = "info" | "calm" | "warning";

const tones: Record<Tone, { wrap: string; icon: React.ReactNode }> = {
  info: {
    wrap: "bg-info-soft/60 border-info/20 text-ink",
    icon: <Info className="size-4 text-info" aria-hidden />,
  },
  calm: {
    wrap: "bg-accent-soft/70 border-accent/20 text-ink",
    icon: <ShieldCheck className="size-4 text-accent" aria-hidden />,
  },
  warning: {
    wrap: "bg-warning-soft/70 border-warning/20 text-ink",
    icon: <TriangleAlert className="size-4 text-warning" aria-hidden />,
  },
};

export interface InlineNoticeProps {
  tone?: Tone;
  title?: string;
  children: React.ReactNode;
  className?: string;
}

export function InlineNotice({
  tone = "info",
  title,
  children,
  className,
}: InlineNoticeProps) {
  const t = tones[tone];
  return (
    <div
      className={cn(
        "flex gap-3 rounded-lg border p-3.5 text-sm leading-relaxed",
        t.wrap,
        className,
      )}
    >
      <span className="mt-0.5 shrink-0">{t.icon}</span>
      <div className="space-y-0.5">
        {title ? <p className="font-medium text-ink">{title}</p> : null}
        <div className="text-ink-muted">{children}</div>
      </div>
    </div>
  );
}
