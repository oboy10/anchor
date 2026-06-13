import * as React from "react";
import Link from "next/link";
import { cn } from "@/lib/cn";
import { Brand } from "./brand";

export interface HeaderLink {
  href: string;
  label: string;
}

export interface HeaderProps {
  links?: HeaderLink[];
  /** Small contextual label shown next to the wordmark (e.g. role). */
  context?: string;
  className?: string;
}

export function Header({ links = [], context, className }: HeaderProps) {
  return (
    <header
      className={cn(
        "sticky top-0 z-30 border-b border-line bg-canvas/85 backdrop-blur",
        className,
      )}
    >
      <div className="mx-auto flex h-14 max-w-5xl items-center justify-between gap-4 px-4 sm:px-6">
        <div className="flex items-center gap-2.5">
          <Brand />
          {context ? (
            <>
              <span className="text-line-strong" aria-hidden>
                /
              </span>
              <span className="text-sm font-medium text-ink-muted">{context}</span>
            </>
          ) : null}
        </div>
        {links.length ? (
          <nav aria-label="Primary" className="flex items-center gap-1">
            {links.map((l) => (
              <Link
                key={l.href}
                href={l.href}
                className="rounded-md px-3 py-1.5 text-sm font-medium text-ink-muted hover:bg-surface-sunken hover:text-ink"
              >
                {l.label}
              </Link>
            ))}
          </nav>
        ) : null}
      </div>
    </header>
  );
}
