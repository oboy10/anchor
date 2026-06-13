#!/usr/bin/env node
/**
 * Push .env.local values to the linked Vercel project.
 * Requires: vercel login (or VERCEL_TOKEN), and vercel link in this repo.
 *
 * Usage: node scripts/sync-vercel-env.mjs [production-url]
 */
import { spawnSync } from "node:child_process";
import { readFileSync, existsSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import dotenv from "dotenv";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const envPath = resolve(root, ".env.local");
const productionUrl =
  process.argv[2]?.trim() || "https://milpitas-hacks-red.vercel.app";

if (!existsSync(envPath)) {
  console.error("Missing .env.local — copy from .env.example and fill in values.");
  process.exit(1);
}

dotenv.config({ path: envPath });

const KEYS = [
  "NEXT_PUBLIC_FIREBASE_API_KEY",
  "NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN",
  "NEXT_PUBLIC_FIREBASE_PROJECT_ID",
  "NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET",
  "NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID",
  "NEXT_PUBLIC_FIREBASE_APP_ID",
  "FIREBASE_PROJECT_ID",
  "FIREBASE_CLIENT_EMAIL",
  "FIREBASE_PRIVATE_KEY",
  "RESEND_API_KEY",
  "RESEND_FROM",
  "NEXT_PUBLIC_APP_URL",
];

const values = {
  ...process.env,
  NEXT_PUBLIC_APP_URL: productionUrl,
};

const targets = ["production", "preview", "development"];

function addEnv(name, value, target) {
  const result = spawnSync(
    "vercel",
    ["env", "add", name, target, "--force", "--sensitive"],
    {
      cwd: root,
      input: value,
      encoding: "utf8",
      stdio: ["pipe", "pipe", "pipe"],
    },
  );

  if (result.status !== 0) {
    const err = result.stderr?.trim() || result.stdout?.trim();
    console.error(`Failed ${name} (${target}): ${err}`);
    return false;
  }

  console.log(`Set ${name} → ${target}`);
  return true;
}

let failed = 0;
for (const key of KEYS) {
  const value = values[key]?.trim();
  if (!value) {
    console.warn(`Skip ${key} (empty)`);
    continue;
  }

  for (const target of targets) {
    if (!addEnv(key, value, target)) failed += 1;
  }
}

if (failed > 0) {
  console.error(`\n${failed} update(s) failed. Run \`vercel login\` and \`vercel link\` first.`);
  process.exit(1);
}

console.log("\nDone. Redeploy production for changes to take effect:");
console.log("  vercel --prod");
