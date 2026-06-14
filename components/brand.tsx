import * as React from "react";
import Link from "next/link";
import { cn } from "@/lib/cn";

/** Anchor wordmark with the product mark. */
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
      {/* eslint-disable-next-line @next/next/no-img-element -- fixed-size 10 KB UI mark; avoids next/image client and optimizer overhead in every header. */}
      <img
        src="/anchor_logo.png"
        alt=""
        width={32}
        height={32}
        className="size-8 rounded-md object-contain"
        loading="lazy"
        decoding="async"
      />
      <span className="text-[17px] font-semibold tracking-tight">Anchor</span>
    </Link>
  );
}
