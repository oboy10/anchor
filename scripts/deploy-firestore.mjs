#!/usr/bin/env node
/**
 * Deploy the locally-stored Firestore schema (rules + indexes + collections)
 * before each build.
 *
 * The schema lives in firestore.rules, firestore.indexes.json (referenced by
 * firebase.json) and firestore.collections.json. This script ships the
 * rules/indexes to the live project and records the canonical collection list
 * (and ensures each collection exists) so the deployed schema always matches
 * what's in the repo.
 *
 * Auth: builds a service-account credentials file from FIREBASE_* env vars
 * (same ones the Admin SDK uses) and points GOOGLE_APPLICATION_CREDENTIALS at
 * it, so no interactive `firebase login` is needed in CI / Vercel.
 *
 * Safe to run anywhere: if creds are missing it logs and exits 0 so local/
 * preview builds without admin env still succeed.
 *
 * Usage: node scripts/deploy-firestore.mjs
 */
import { spawnSync } from "node:child_process";
import { mkdtempSync, writeFileSync, rmSync, existsSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");

function resolveFirebaseBin() {
  const localBin = join(root, "node_modules", ".bin", "firebase");
  if (existsSync(localBin)) return localBin;
  // Fallback for environments where .bin is not materialized yet.
  return process.platform === "win32" ? "npx.cmd" : "npx";
}

function firebaseDeployArgs(projectId) {
  const localBin = join(root, "node_modules", ".bin", "firebase");
  const usesNpx = !existsSync(localBin);
  return {
    command: resolveFirebaseBin(),
    args: usesNpx
      ? ["firebase", "deploy", "--only", "firestore:rules,firestore:indexes", "--project", projectId, "--non-interactive", "--force"]
      : ["deploy", "--only", "firestore:rules,firestore:indexes", "--project", projectId, "--non-interactive", "--force"],
  };
}

// Load .env.local for local runs. On Vercel the vars are already in env, and
// the file won't exist there — dotenv is a no-op then.
const envPath = resolve(root, ".env.local");
if (existsSync(envPath)) {
  const { config } = await import("dotenv");
  config({ path: envPath });
}

const projectId =
  process.env.FIREBASE_PROJECT_ID ||
  process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;
const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
const privateKey = process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, "\n");

if (!projectId || !clientEmail || !privateKey) {
  console.warn(
    "[deploy-firestore] Missing FIREBASE_PROJECT_ID / FIREBASE_CLIENT_EMAIL / " +
      "FIREBASE_PRIVATE_KEY — skipping Firestore schema deploy.",
  );
  process.exit(0);
}

const dir = mkdtempSync(join(tmpdir(), "fb-sa-"));
const keyPath = join(dir, "service-account.json");
writeFileSync(
  keyPath,
  JSON.stringify({
    type: "service_account",
    project_id: projectId,
    client_email: clientEmail,
    private_key: privateKey,
  }),
);

try {
  const { command, args } = firebaseDeployArgs(projectId);
  const result = spawnSync(command, args, {
    cwd: root,
    stdio: "inherit",
    env: { ...process.env, GOOGLE_APPLICATION_CREDENTIALS: keyPath },
  });
  if (result.error) {
    console.error("[deploy-firestore]", result.error.message);
    if (process.env.VERCEL) {
      console.warn(
        "[deploy-firestore] Continuing Vercel build without Firestore deploy. " +
          "Run `npm run firestore:deploy` locally if rules changed.",
      );
      process.exit(0);
    }
    process.exit(1);
  }
  if (result.status !== 0) {
    console.error("[deploy-firestore] firebase deploy failed.");
    if (process.env.VERCEL) {
      console.warn(
        "[deploy-firestore] Continuing Vercel build without Firestore deploy. " +
          "Run `npm run firestore:deploy` locally if rules changed.",
      );
      process.exit(0);
    }
    process.exit(result.status ?? 1);
  }
  console.log("[deploy-firestore] Rules + indexes deployed.");

  await provisionCollections();
  console.log("[deploy-firestore] Firestore schema deployed.");
} finally {
  rmSync(dir, { recursive: true, force: true });
}

/**
 * Record the canonical collection list (firestore.collections.json) into the
 * project and make sure each collection exists. Firestore creates collections
 * lazily, so we ensure an empty one by writing a `_schema` marker doc; the full
 * manifest is stored at `_meta/schema`.
 */
async function provisionCollections() {
  const manifestPath = resolve(root, "firestore.collections.json");
  if (!existsSync(manifestPath)) {
    console.warn("[deploy-firestore] No firestore.collections.json — skipping.");
    return;
  }
  const manifest = JSON.parse(readFileSync(manifestPath, "utf8"));
  const collections = manifest.collections ?? [];

  const { cert, initializeApp } = await import("firebase-admin/app");
  const { getFirestore, FieldValue } = await import("firebase-admin/firestore");

  const app = initializeApp({
    credential: cert({ projectId, clientEmail, privateKey }),
  });
  const db = getFirestore(app);

  await db.doc("_meta/schema").set({
    collections,
    updatedAt: FieldValue.serverTimestamp(),
  });

  for (const { name } of collections) {
    const snap = await db.collection(name).limit(1).get();
    if (snap.empty) {
      await db.collection(name).doc("_schema").set({
        _placeholder: true,
        createdAt: FieldValue.serverTimestamp(),
      });
    }
  }
  console.log(
    `[deploy-firestore] Recorded ${collections.length} collection(s): ` +
      collections.map((c) => c.name).join(", "),
  );
}
