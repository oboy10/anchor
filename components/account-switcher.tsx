"use client";

import { cn } from "@/lib/cn";
import { shortFingerprint } from "@/lib/format";
import { isUnlocked } from "@/lib/local/accounts";
import {
    Check,
    ChevronDown,
    Lock,
    Plus,
    Settings,
    UserRound
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import * as React from "react";
import { useAuth } from "./auth-provider";

/**
 * Header control that ties the account switcher to sign-in/out. Switches
 * between unlocked identities inline; routes locked ones and new-account
 * creation to /sign-in.
 */
export function AccountSwitcher() {
  const { accounts, active, loading, switchTo, signOut } = useAuth();
  const router = useRouter();
  const [open, setOpen] = React.useState(false);
  const ref = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    if (!open) return;
    const onClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, [open]);

  if (loading) return null;

  if (!active) {
    return (
      <Link
        href="/sign-in"
        className="rounded-md px-3 py-1.5 text-sm font-medium text-accent hover:bg-surface-sunken"
      >
        Sign in
      </Link>
    );
  }

  async function handleSwitch(fingerprint: string) {
    setOpen(false);
    if (isUnlocked(fingerprint)) {
      await switchTo(fingerprint);
    } else {
      router.push("/sign-in");
    }
  }

  function handleSignOut() {
    setOpen(false);
    signOut();
    router.push("/sign-in");
  }

  const others = accounts.filter((a) => a.fingerprint !== active.fingerprint);

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="menu"
        aria-expanded={open}
        className="flex items-center gap-2 rounded-md px-2.5 py-1.5 text-sm font-medium text-ink hover:bg-surface-sunken"
      >
        <span className="flex size-6 items-center justify-center rounded-full bg-accent-soft text-accent">
          <UserRound className="size-3.5" aria-hidden />
        </span>
        <span className="hidden max-w-[10rem] truncate sm:inline">{active.label}</span>
        <ChevronDown className="size-3.5 text-ink-muted" aria-hidden />
      </button>

      {open ? (
        <div
          role="menu"
          className="absolute right-0 z-40 mt-2 w-72 overflow-hidden rounded-lg border border-line bg-surface shadow-card"
        >
          <button
            type="button"
            role="menuitem"
            onClick={() => {
              setOpen(false);
              router.push("/wallet");
            }}
            className="block w-full border-b border-line px-4 py-3 text-left hover:bg-surface-sunken"
          >
            <p className="text-sm font-medium text-ink">{active.label}</p>
            <p className="mt-0.5 font-mono text-xs text-ink-muted">
              {shortFingerprint(active.fingerprint)} · View dashboard
            </p>
            {active.verifiedEmail || active.verifiedPhone ? (
              <p className="mt-1 flex items-center gap-1 text-xs text-accent">
                <Check className="size-3" aria-hidden />
                Verified {active.verifiedEmail ? "email" : ""}
                {active.verifiedEmail && active.verifiedPhone ? " · " : ""}
                {active.verifiedPhone ? "phone" : ""}
              </p>
            ) : null}
          </button>

          {others.length ? (
            <ul className="border-b border-line py-1">
              {others.map((a) => (
                <li key={a.fingerprint}>
                  <button
                    type="button"
                    role="menuitem"
                    onClick={() => handleSwitch(a.fingerprint)}
                    className="flex w-full items-center justify-between gap-2 px-4 py-2 text-left text-sm text-ink hover:bg-surface-sunken"
                  >
                    <span className="min-w-0">
                      <span className="block truncate font-medium">{a.label}</span>
                      <span className="block font-mono text-xs text-ink-muted">
                        {shortFingerprint(a.fingerprint)}
                      </span>
                    </span>
                    <span
                      className={cn(
                        "shrink-0 text-xs",
                        isUnlocked(a.fingerprint) ? "text-ink-muted" : "text-ink-faint",
                      )}
                    >
                      {isUnlocked(a.fingerprint) ? "Switch" : "Unlock"}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          ) : null}

          <div className="py-1">
            <Link
              href="/sign-in?new=1"
              role="menuitem"
              onClick={() => setOpen(false)}
              className="flex items-center gap-2 px-4 py-2 text-sm text-ink hover:bg-surface-sunken"
            >
              <Plus className="size-4 text-ink-muted" aria-hidden />
              Create new account
            </Link>
            <Link
              href="/accounts"
              role="menuitem"
              onClick={() => setOpen(false)}
              className="flex items-center gap-2 px-4 py-2 text-sm text-ink hover:bg-surface-sunken"
            >
              <Settings className="size-4 text-ink-muted" aria-hidden />
              Manage accounts
            </Link>
            <button
              type="button"
              role="menuitem"
              onClick={handleSignOut}
              className="flex w-full items-center gap-2 px-4 py-2 text-left text-sm text-ink-muted hover:bg-surface-sunken hover:text-ink"
            >
              <Lock className="size-4" aria-hidden />
              Lock account
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
