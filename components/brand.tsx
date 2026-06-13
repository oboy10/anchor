import * as React from "react";
import Link from "next/link";
import { cn } from "@/lib/cn";

/** TrustWallet wordmark with a small, restrained shield mark. */
export function Brand({
  className,
  href = "/",
}: {
  className?: string;
  href?: string;
}) {
  return (
    <Link
      href={href}
      className={cn(
        "inline-flex items-center gap-2 rounded-md text-ink",
        className,
      )}
    >
      <span className="flex size-7 items-center justify-center rounded-md bg-accent text-white">
        <svg viewBox="0 0 24 24" className="size-4" aria-hidden fill="none">
          <path
            d="M12 3 5 6v5.5c0 4 2.8 6.8 7 9 4.2-2.2 7-5 7-9V6l-7-3Z"
            stroke="currentColor"
            strokeWidth="1.6"
            strokeLinejoin="round"
          />
          <path
            d="m9 12 2 2 4-4"
            stroke="currentColor"
            strokeWidth="1.6"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </span>
      <span className="text-[17px] font-semibold tracking-tight">TrustWallet</span>
    </Link>
  );
}
