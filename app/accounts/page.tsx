"use client";

import { AppShell } from "@/components/app-shell";
import { useAuth } from "@/components/auth-provider";
import { EmptyState } from "@/components/empty-state";
import { SectionHeader } from "@/components/section-header";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { FormField } from "@/components/ui/field";
import { InlineNotice } from "@/components/ui/inline-notice";
import {
    deleteAccount,
    isUnlocked,
    renameAccount,
    type AccountMeta,
} from "@/lib/local/accounts";
import { exportAccountFile, importAccountsFile } from "@/lib/local/portable";
import { Download, Plus, Upload } from "lucide-react";
import * as React from "react";

export default function AccountsPage() {
  const { accounts, active, createAccount } = useAuth();
  const importRef = React.useRef<HTMLInputElement>(null);

  const [creating, setCreating] = React.useState(false);
  const [renaming, setRenaming] = React.useState<AccountMeta | null>(null);

  async function handleImport(file: File) {
    try {
      const added = await importAccountsFile(file);
      alert(
        added > 0
          ? `Imported ${added} account${added === 1 ? "" : "s"}. Unlock each with its password to sign in.`
          : "No new accounts to import.",
      );
    } catch {
      alert("That file is not a valid Anchor account export.");
    }
  }

  function handleDelete(account: AccountMeta) {
    if (
      !confirm(
        `Delete "${account.label}" from this device? Export it first if you want a backup — this cannot be undone.`,
      )
    ) {
      return;
    }
    deleteAccount(account.fingerprint);
  }

  return (
    <AppShell
      context="Accounts"
      links={[{ href: "/wallet", label: "Wallet" }]}
    >
      <div className="flex flex-wrap items-start justify-between gap-4">
        <SectionHeader
          as="h1"
          serif
          title="Manage accounts"
          description="Every identity stored on this device. Create, rename, export, or delete accounts, or import them from a backup file."
        />
        <div className="flex flex-wrap gap-2">
          <Button type="button" onClick={() => setCreating(true)}>
            <Plus className="size-4" aria-hidden />
            Create account
          </Button>
          <Button
            type="button"
            variant="secondary"
            onClick={() => importRef.current?.click()}
          >
            <Upload className="size-4" aria-hidden />
            Import accounts
          </Button>
        </div>
        <input
          ref={importRef}
          type="file"
          accept=".anchor,application/octet-stream"
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) handleImport(file);
            e.target.value = "";
          }}
        />
      </div>

      <InlineNotice tone="info" className="mt-6" title="Exports are encrypted">
        An exported account contains only its public key and a password-protected
        vault — never your plaintext private key. The same password unlocks it
        wherever you import it.
      </InlineNotice>

      <section className="mt-8">
        {accounts.length === 0 ? (
          <EmptyState
            title="No accounts on this device"
            description="Create an account or import one from a backup file."
          />
        ) : (
          <ul className="divide-y divide-line rounded-card border border-line bg-surface">
            {accounts.map((a) => {
              const isActive = a.fingerprint === active?.fingerprint;
              return (
                <li
                  key={a.fingerprint}
                  className="flex flex-wrap items-center justify-between gap-3 px-4 py-3"
                >
                  <div className="min-w-0">
                    <p className="flex items-center gap-2 text-sm font-medium text-ink">
                      {a.label}
                      {isActive ? (
                        <span className="rounded-full bg-accent-soft px-2 py-0.5 text-xs text-accent">
                          Active
                        </span>
                      ) : !isUnlocked(a.fingerprint) ? (
                        <span className="text-xs text-ink-faint">Locked</span>
                      ) : null}
                    </p>
                    <p className="mt-0.5 font-mono text-xs text-ink-muted">
                      {a.fingerprint}
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <Button
                      type="button"
                      variant="secondary"
                      size="sm"
                      onClick={() => setRenaming(a)}
                    >
                      Rename
                    </Button>
                    <Button
                      type="button"
                      variant="secondary"
                      size="sm"
                      onClick={() => exportAccountFile(a.fingerprint)}
                    >
                      <Download className="size-4" aria-hidden />
                      Export
                    </Button>
                    <Button
                      type="button"
                      variant="danger"
                      size="sm"
                      onClick={() => handleDelete(a)}
                    >
                      Delete
                    </Button>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </section>

      <CreateAccountDialog
        open={creating}
        onClose={() => setCreating(false)}
        createAccount={createAccount}
      />
      {renaming ? (
        <RenameAccountDialog
          key={renaming.fingerprint}
          account={renaming}
          onClose={() => setRenaming(null)}
        />
      ) : null}
    </AppShell>
  );
}

function CreateAccountDialog({
  open,
  onClose,
  createAccount,
}: {
  open: boolean;
  onClose: () => void;
  createAccount: (label: string, password: string) => Promise<unknown>;
}) {
  const [label, setLabel] = React.useState("");
  const [password, setPassword] = React.useState("");
  const [confirmPw, setConfirmPw] = React.useState("");
  const [error, setError] = React.useState<string | null>(null);
  const [pending, setPending] = React.useState(false);

  function reset() {
    setLabel("");
    setPassword("");
    setConfirmPw("");
    setError(null);
    setPending(false);
  }

  async function submit() {
    if (password.length < 8) {
      setError("Password must be at least 8 characters.");
      return;
    }
    if (password !== confirmPw) {
      setError("Passwords do not match.");
      return;
    }
    setPending(true);
    setError(null);
    try {
      await createAccount(label, password);
      reset();
      onClose();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not create account.");
      setPending(false);
    }
  }

  return (
    <Dialog
      open={open}
      onClose={() => {
        reset();
        onClose();
      }}
      title="Create account"
      description="Your identity is an Ed25519 keypair, encrypted with this password and stored only in this browser. There is no recovery if you lose the password."
      footer={
        <>
          <Button
            type="button"
            variant="secondary"
            onClick={() => {
              reset();
              onClose();
            }}
          >
            Cancel
          </Button>
          <Button type="button" disabled={pending} onClick={submit}>
            {pending ? "Creating…" : "Create account"}
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        <FormField
          label="Account name"
          value={label}
          onChange={(e) => setLabel(e.target.value)}
          placeholder="My account"
        />
        <FormField
          label="Password"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          hint="At least 8 characters."
        />
        <FormField
          label="Confirm password"
          type="password"
          value={confirmPw}
          onChange={(e) => setConfirmPw(e.target.value)}
          error={error ?? undefined}
        />
      </div>
    </Dialog>
  );
}

function RenameAccountDialog({
  account,
  onClose,
}: {
  account: AccountMeta;
  onClose: () => void;
}) {
  const [label, setLabel] = React.useState(account.label);
  const [pending, setPending] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  async function submit() {
    setPending(true);
    try {
      await renameAccount(account.fingerprint, label);
      onClose();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not rename account.");
    } finally {
      setPending(false);
    }
  }

  return (
    <Dialog
      open
      onClose={onClose}
      title="Rename account"
      footer={
        <>
          <Button type="button" variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button type="button" disabled={pending} onClick={submit}>
            {pending ? "Saving…" : "Save"}
          </Button>
        </>
      }
    >
      <FormField
        label="Account name"
        value={label}
        onChange={(e) => setLabel(e.target.value)}
        error={error ?? undefined}
      />
    </Dialog>
  );
}
