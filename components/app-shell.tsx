import * as React from "react";
import { cn } from "@/lib/cn";
import { Header, type HeaderLink } from "./header";
import { AuthHeaderControls } from "./sign-in-panel";

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
    <div className="flex min-h-full flex-col">
      <Header links={links} context={context} trailing={<AuthHeaderControls />} />
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
