"use client";

import * as React from "react";
import { X } from "lucide-react";
import { cn } from "@/lib/cn";

export interface DialogProps {
  open: boolean;
  onClose: () => void;
  title: string;
  description?: string;
  children: React.ReactNode;
  /** Footer actions, rendered right-aligned. */
  footer?: React.ReactNode;
  className?: string;
}

/**
 * Modal built on the native <dialog> element so we get focus trapping,
 * Escape-to-close, and inert background for free, then styled to match the
 * design system. As a side panel on small screens, full width.
 */
export function Dialog({
  open,
  onClose,
  title,
  description,
  children,
  footer,
  className,
}: DialogProps) {
  const ref = React.useRef<HTMLDialogElement>(null);

  React.useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (open && !el.open) el.showModal();
    if (!open && el.open) el.close();
  }, [open]);

  if (typeof window === "undefined") return null;

  return (
    <dialog
      ref={ref}
      aria-labelledby="dialog-title"
      onClose={onClose}
      onCancel={onClose}
      onClick={(e) => {
        // Close when the backdrop (the dialog element itself) is clicked.
        if (e.target === ref.current) onClose();
      }}
      className={cn(
        "m-auto w-[min(36rem,calc(100vw-2rem))] rounded-card border border-line bg-surface p-0 text-ink shadow-lift backdrop:bg-ink/30",
        className,
      )}
    >
      <div className="flex items-start justify-between gap-4 border-b border-line px-5 py-4">
        <div className="space-y-1">
          <h2 id="dialog-title" className="font-serif text-xl text-ink">
            {title}
          </h2>
          {description ? (
            <p className="text-sm text-ink-muted">{description}</p>
          ) : null}
        </div>
        <button
          type="button"
          onClick={onClose}
          aria-label="Close dialog"
          className="-mr-1 -mt-1 rounded-md p-1.5 text-ink-muted hover:bg-surface-sunken hover:text-ink"
        >
          <X className="size-5" aria-hidden />
        </button>
      </div>
      <div className="max-h-[70vh] overflow-y-auto px-5 py-4">{children}</div>
      {footer ? (
        <div className="flex flex-wrap justify-end gap-2 border-t border-line px-5 py-4">
          {footer}
        </div>
      ) : null}
    </dialog>
  );
}
