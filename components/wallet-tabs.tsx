"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/cn";

const TABS = [
  { href: "/wallet", label: "Records" },
  { href: "/wallet/packets", label: "Packets" },
  { href: "/wallet/issue", label: "Issue credential" },
  { href: "/wallet/verify", label: "Verify" },
  { href: "/wallet/identity", label: "Edit profile" },
];

/** Sub-navigation between the wallet's records and identity-verification pages. */
export function WalletTabs() {
  const pathname = usePathname();
  return (
    <nav className="-mb-px flex gap-1 border-b border-line">
      {TABS.map((tab) => {
        const active = pathname === tab.href;
        return (
          <Link
            key={tab.href}
            href={tab.href}
            aria-current={active ? "page" : undefined}
            className={cn(
              "border-b-2 px-3 py-2 text-sm font-medium transition-colors",
              active
                ? "border-accent text-ink"
                : "border-transparent text-ink-muted hover:text-ink",
            )}
          >
            {tab.label}
          </Link>
        );
      })}
    </nav>
  );
}
