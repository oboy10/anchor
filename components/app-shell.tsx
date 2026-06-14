import { cn } from "@/lib/cn";
import * as React from "react";
import { Header, type HeaderLink } from "./header";
import { AccountSwitcher } from "./account-switcher";

export interface AppShellProps {
  children: React.ReactNode;
  links?: HeaderLink[];
  context?: string;
  contained?: boolean;
  className?: string;
}

export function AppShell({
  children,
  links,
  context,
  contained = true,
  className,
}: AppShellProps) {
  return (
    <div className="flex min-h-full flex-col bg-[linear-gradient(135deg,rgba(25,128,127,0.07),transparent_32rem),var(--canvas)]">
      <Header links={links} context={context} trailing={<AccountSwitcher />} />
      <main
        className={cn(
          "flex-1",
          contained && "mx-auto w-full max-w-5xl px-4 py-8 sm:px-6 sm:py-10",
          className,
        )}
      >
        {children}
      </main>
    </div>
  );
}
