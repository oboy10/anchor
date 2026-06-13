"use client";

/**
 * Auth = the local account session (see lib/local/accounts). "Signed in" means
 * an Ed25519 identity is active and unlocked in this browser. There is no
 * server-side session — identities live, password-protected, in localStorage.
 */
import * as React from "react";
import {
  createAccount,
  getActiveAccount,
  listAccounts,
  signOut as signOutAccount,
  subscribeAccounts,
  switchAccount,
  unlockAccount,
  type AccountMeta,
} from "@/lib/local/accounts";

interface AuthContextValue {
  /** All identities stored on this device (locked or unlocked). */
  accounts: AccountMeta[];
  /** The active, unlocked account, or null when signed out. */
  active: AccountMeta | null;
  loading: boolean;
  createAccount: (label: string, password: string) => Promise<AccountMeta>;
  unlock: (fingerprint: string, password: string) => Promise<void>;
  switchTo: (fingerprint: string) => Promise<void>;
  signOut: () => void;
}

const AuthContext = React.createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [accounts, setAccounts] = React.useState<AccountMeta[]>([]);
  const [active, setActive] = React.useState<AccountMeta | null>(null);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    const sync = () => {
      setAccounts(listAccounts());
      setActive(getActiveAccount());
      setLoading(false);
    };
    sync();
    return subscribeAccounts(sync);
  }, []);

  const value: AuthContextValue = {
    accounts,
    active,
    loading,
    createAccount: (label, password) => createAccount({ label, password }),
    unlock: unlockAccount,
    switchTo: switchAccount,
    signOut: signOutAccount,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = React.useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
