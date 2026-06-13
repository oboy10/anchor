/**
 * Seed from the CLI: npm run seed
 *
 * Local-first build: application data lives in each browser, so there is no
 * Firestore data to seed. This script only provisions the demo Firebase Auth
 * accounts (with role/fingerprint/slug custom claims) and records their email
 * hashes in the one server-side collection (`registeredEmails`).
 */
import Module from "node:module";
import { config } from "dotenv";

const require = Module.createRequire(import.meta.url);
require.cache[require.resolve("server-only")] = {
  id: "server-only",
  filename: "server-only",
  loaded: true,
  exports: {},
} as NodeModule;

config({ path: ".env.local" });

async function main() {
  const { getAdminAuth, isFirebaseAdminConfigured } = await import("../lib/firebase/admin");
  if (!isFirebaseAdminConfigured()) {
    throw new Error("Firebase Admin is not configured. Set FIREBASE_* env vars.");
  }
  const { DEMO_AUTH_ACCOUNTS, DEMO_AUTH_PASSWORD } = await import("../lib/auth/demo-accounts");
  const { registerEmailHash } = await import("../lib/firebase/email-registry");

  const auth = getAdminAuth();
  for (const account of DEMO_AUTH_ACCOUNTS) {
    let uid: string;
    try {
      const existing = await auth.getUserByEmail(account.email);
      uid = existing.uid;
      await auth.updateUser(uid, { password: DEMO_AUTH_PASSWORD });
    } catch {
      const created = await auth.createUser({
        email: account.email,
        password: DEMO_AUTH_PASSWORD,
        emailVerified: true,
      });
      uid = created.uid;
    }

    // Role is the only thing the server stores about an account — no resident
    // name, slug, or fingerprint. Identity is resolved locally on /wallet.
    await auth.setCustomUserClaims(uid, { role: account.role });

    await registerEmailHash(account.email);
  }

  console.log("Demo auth users + email hashes seeded successfully.");
}

main().catch((err) => {
  console.error("Seed failed:", err);
  process.exit(1);
});
