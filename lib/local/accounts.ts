"use client";

/**
 * Local account store — the sign-in/out system.
 *
 * An "account" is an Ed25519 identity (see lib/crypto/user) whose private seed
 * is encrypted at rest with the user's password (see lib/crypto/vault). The
 * encrypted accounts live in localStorage; the decrypted seed for an unlocked
 * account lives only in sessionStorage (cleared on sign-out / tab close).
 *
 * "Signed in" === there is an active, unlocked account. Switching accounts,
 * creating accounts, and signing out are all expressed here and surfaced by the
 * AuthProvider + account switcher.
 */
import { bytesToHex, hexToBytes, randomBytes } from "@/lib/crypto/bytes";
import type { PortableAccount } from "@/lib/crypto/archive";
import { userFromPrivateSeed } from "@/lib/crypto/user";
import { decryptSeed, encryptSeed, type Vault } from "@/lib/crypto/vault";
import { registerLocalIdentity, setActiveResident } from "./db";
import type { Fingerprint, IssuerType, PublicKeyHex, User } from "@/types";

const ACCOUNTS_KEY = "anchor.accounts.v1";
const ACTIVE_ACCOUNT_KEY = "anchor.activeAccount";
/** Decrypted seeds for unlocked accounts (this tab only). */
const SESSION_KEY = "anchor.session.v1";

/** Public metadata for a stored account. The seed lives only inside `vault`. */
export interface AccountMeta {
  fingerprint: Fingerprint;
  publicKey: PublicKeyHex;
  label: string;
  createdAt: string;
  vault: Vault;
  verifiedEmail?: string;
  verifiedPhone?: string;
  /** Default issuer type applied to credentials this identity signs. */
  issuerType?: IssuerType;
}

interface PersistedAccounts {
  v: 1;
  accounts: AccountMeta[];
}

function isBrowser(): boolean {
  return typeof window !== "undefined" && typeof localStorage !== "undefined";
}

// ---------------------------------------------------------------------------
// Subscriptions (mirrors lib/local/db so React views re-read on change)
// ---------------------------------------------------------------------------

const subscribers = new Set<() => void>();

export function subscribeAccounts(cb: () => void): () => void {
  subscribers.add(cb);
  return () => subscribers.delete(cb);
}

function emit(): void {
  for (const cb of subscribers) cb();
}

// ---------------------------------------------------------------------------
// Persistence helpers
// ---------------------------------------------------------------------------

function readAccounts(): AccountMeta[] {
  if (!isBrowser()) return [];
  const raw = localStorage.getItem(ACCOUNTS_KEY);
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw) as PersistedAccounts;
    return Array.isArray(parsed.accounts) ? parsed.accounts : [];
  } catch {
    return [];
  }
}

function writeAccounts(accounts: AccountMeta[]): void {
  if (!isBrowser()) return;
  localStorage.setItem(
    ACCOUNTS_KEY,
    JSON.stringify({ v: 1, accounts } satisfies PersistedAccounts),
  );
}

function readSession(): Record<Fingerprint, string> {
  if (!isBrowser()) return {};
  const raw = sessionStorage.getItem(SESSION_KEY);
  if (!raw) return {};
  try {
    return JSON.parse(raw) as Record<Fingerprint, string>;
  } catch {
    return {};
  }
}

function writeSession(session: Record<Fingerprint, string>): void {
  if (!isBrowser()) return;
  sessionStorage.setItem(SESSION_KEY, JSON.stringify(session));
}

// ---------------------------------------------------------------------------
// Read API
// ---------------------------------------------------------------------------

export function listAccounts(): AccountMeta[] {
  return readAccounts();
}

export function getAccount(fingerprint: Fingerprint): AccountMeta | undefined {
  return readAccounts().find((a) => a.fingerprint === fingerprint);
}

export function isUnlocked(fingerprint: Fingerprint): boolean {
  return Boolean(readSession()[fingerprint]);
}

export function getActiveFingerprint(): Fingerprint | null {
  if (!isBrowser()) return null;
  const fp = localStorage.getItem(ACTIVE_ACCOUNT_KEY);
  // Only report active when the account is actually unlocked this session.
  return fp && isUnlocked(fp) ? fp : null;
}

/** The active, unlocked account (or null when signed out). */
export function getActiveAccount(): AccountMeta | null {
  const fp = getActiveFingerprint();
  return fp ? (getAccount(fp) ?? null) : null;
}

/** Build a signing-capable User for an unlocked account, else undefined. */
export function getUnlockedUser(fingerprint: Fingerprint): User | undefined {
  const seed = readSession()[fingerprint];
  const account = getAccount(fingerprint);
  if (!seed || !account) return undefined;
  return {
    fingerprint: account.fingerprint,
    publicKey: account.publicKey,
    privateKey: seed,
  };
}

// ---------------------------------------------------------------------------
// Write API
// ---------------------------------------------------------------------------

async function activate(fingerprint: Fingerprint): Promise<void> {
  if (isBrowser()) localStorage.setItem(ACTIVE_ACCOUNT_KEY, fingerprint);
  await setActiveResident(fingerprint);
  emit();
}

/** Create a brand-new identity (keypair) and sign in to it. */
export async function createAccount(input: {
  label: string;
  password: string;
}): Promise<AccountMeta> {
  if (input.password.length < 8) {
    throw new Error("Password must be at least 8 characters.");
  }
  const seed = randomBytes(32);
  const seedHex = bytesToHex(seed);
  const user = await userFromPrivateSeed(hexToBytes(seedHex));
  const vault = await encryptSeed(seedHex, input.password);
  const meta: AccountMeta = {
    fingerprint: user.fingerprint,
    publicKey: user.publicKey,
    label: input.label.trim() || "My account",
    createdAt: new Date().toISOString(),
    vault,
  };

  const accounts = readAccounts();
  if (accounts.some((a) => a.fingerprint === meta.fingerprint)) {
    throw new Error("Account already exists.");
  }
  writeAccounts([...accounts, meta]);
  writeSession({ ...readSession(), [meta.fingerprint]: seedHex });

  await registerLocalIdentity(user, meta.label);
  await activate(meta.fingerprint);
  return meta;
}

/** Unlock a stored account with its password and sign in to it. */
export async function unlockAccount(
  fingerprint: Fingerprint,
  password: string,
): Promise<void> {
  const account = getAccount(fingerprint);
  if (!account) throw new Error("Account not found.");
  const seedHex = await decryptSeed(account.vault, password); // throws if wrong
  writeSession({ ...readSession(), [fingerprint]: seedHex });
  await registerLocalIdentity(account, account.label);
  await activate(fingerprint);
}

/** Switch the active account. Requires the target to already be unlocked. */
export async function switchAccount(fingerprint: Fingerprint): Promise<void> {
  if (!isUnlocked(fingerprint)) {
    throw new Error("This account is locked. Unlock it with its password.");
  }
  await activate(fingerprint);
}

/** Sign out: lock every account and clear the active pointer. */
export function signOut(): void {
  if (isBrowser()) {
    sessionStorage.removeItem(SESSION_KEY);
    localStorage.removeItem(ACTIVE_ACCOUNT_KEY);
  }
  emit();
}

/**
 * Merge imported accounts into the local store. Existing accounts (matched by
 * fingerprint) are left untouched; only new identities are added and registered
 * as wallets. Returns the number of accounts added. Does not unlock anything —
 * each imported account must still be unlocked with its password.
 */
export async function importAccounts(accounts: PortableAccount[]): Promise<number> {
  const existing = readAccounts();
  const known = new Set(existing.map((a) => a.fingerprint));
  const added: AccountMeta[] = [];

  for (const account of accounts) {
    if (!account?.fingerprint || !account.publicKey || !account.vault) continue;
    if (known.has(account.fingerprint)) continue;
    known.add(account.fingerprint);
    added.push(account as AccountMeta);
  }

  if (added.length === 0) return 0;
  writeAccounts([...existing, ...added]);
  for (const account of added) {
    await registerLocalIdentity(account, account.label);
  }
  emit();
  return added.length;
}

/** Rename a stored account (and its wallet display name). */
export async function renameAccount(
  fingerprint: Fingerprint,
  label: string,
): Promise<void> {
  const trimmed = label.trim();
  if (!trimmed) throw new Error("Account name cannot be empty.");
  const account = getAccount(fingerprint);
  if (!account) throw new Error("Account not found.");
  writeAccounts(
    readAccounts().map((a) =>
      a.fingerprint === fingerprint ? { ...a, label: trimmed } : a,
    ),
  );
  await registerLocalIdentity(account, trimmed);
  emit();
}

/**
 * Permanently remove a stored account from this device. Locks it first (drops
 * its session seed) and clears the active pointer if it was signed in. The
 * ledger/wallet data in lib/local/db is left untouched.
 */
export function deleteAccount(fingerprint: Fingerprint): void {
  writeAccounts(readAccounts().filter((a) => a.fingerprint !== fingerprint));
  const session = readSession();
  if (session[fingerprint]) {
    delete session[fingerprint];
    writeSession(session);
  }
  if (isBrowser() && localStorage.getItem(ACTIVE_ACCOUNT_KEY) === fingerprint) {
    localStorage.removeItem(ACTIVE_ACCOUNT_KEY);
  }
  emit();
}

/** Set the default issuer type used when this identity signs credentials. */
export function setIssuerType(
  fingerprint: Fingerprint,
  issuerType: IssuerType,
): void {
  writeAccounts(
    readAccounts().map((a) =>
      a.fingerprint === fingerprint ? { ...a, issuerType } : a,
    ),
  );
  emit();
}

/** Record a verified contact attribute on the account (after a vouch). */
export function markVerified(
  fingerprint: Fingerprint,
  attrs: { email?: string; phone?: string },
): void {
  const accounts = readAccounts().map((a) =>
    a.fingerprint === fingerprint
      ? {
          ...a,
          verifiedEmail: attrs.email ?? a.verifiedEmail,
          verifiedPhone: attrs.phone ?? a.verifiedPhone,
        }
      : a,
  );
  writeAccounts(accounts);
  emit();
}
