"use client";

import * as React from "react";
import { KeyRound } from "lucide-react";
import { Button } from "./ui/button";
import { FormField } from "./ui/field";
import type { AccountMeta } from "@/lib/local/accounts";

export interface AccountUnlockFormProps {
  accounts: Pick<AccountMeta, "fingerprint" | "label">[];
  unlock: (fingerprint: string, password: string) => Promise<void>;
  onDone: () => void;
  compact?: boolean;
}

/** Unlock a password-protected identity already stored on this device. */
export function AccountUnlockForm({
  accounts,
  unlock,
  onDone,
  compact,
}: AccountUnlockFormProps) {
  const [fingerprint, setFingerprint] = React.useState(accounts[0]?.fingerprint ?? "");
  const [password, setPassword] = React.useState("");
  const [error, setError] = React.useState<string | null>(null);
  const [pending, setPending] = React.useState(false);

  React.useEffect(() => {
    if (!accounts.length) return;
    if (!accounts.some((a) => a.fingerprint === fingerprint)) {
      setFingerprint(accounts[0]!.fingerprint);
    }
  }, [accounts, fingerprint]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setPending(true);
    try {
      await unlock(fingerprint, password);
      onDone();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not unlock account.");
    } finally {
      setPending(false);
    }
  }

  if (!accounts.length) return null;

  return (
    <form className={compact ? "space-y-3" : "space-y-4"} onSubmit={submit}>
      <fieldset className="space-y-2">
        {!compact ? (
          <legend className="text-sm font-medium text-ink">Account on this device</legend>
        ) : null}
        {accounts.map((a) => (
          <label
            key={a.fingerprint}
            className="flex cursor-pointer items-center gap-3 rounded-lg border border-line bg-surface px-4 py-3 text-sm has-[:checked]:border-accent"
          >
            <input
              type="radio"
              name="account"
              value={a.fingerprint}
              checked={fingerprint === a.fingerprint}
              onChange={() => setFingerprint(a.fingerprint)}
              className="accent-accent"
            />
            <span className="min-w-0">
              <span className="block truncate font-medium text-ink">{a.label}</span>
              <span className="block font-mono text-xs text-ink-muted">{a.fingerprint}</span>
            </span>
          </label>
        ))}
      </fieldset>
      <FormField
        label="Password"
        type="password"
        autoComplete="current-password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        required
      />
      {error ? <p className="text-sm text-danger">{error}</p> : null}
      <Button type="submit" disabled={pending || !fingerprint} className={compact ? "" : "w-full"}>
        <KeyRound className="size-4" aria-hidden />
        {pending ? "Unlocking…" : "Unlock account"}
      </Button>
    </form>
  );
}
