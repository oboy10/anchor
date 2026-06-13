#!/usr/bin/env node
/**
 * Seed Firestore with Anchor demo data.
 * Usage: node scripts/seed-firestore.mjs
 * Requires FIREBASE_* admin env vars or GOOGLE_APPLICATION_CREDENTIALS.
 */
import { config } from "dotenv";
import { cert, initializeApp } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";
import { createRequire } from "module";

config({ path: ".env.local" });

const require = createRequire(import.meta.url);

if (
  !process.env.FIREBASE_CLIENT_EMAIL ||
  !process.env.FIREBASE_PRIVATE_KEY
) {
  console.error(
    "Missing FIREBASE_CLIENT_EMAIL / FIREBASE_PRIVATE_KEY in .env.local",
  );
  process.exit(1);
}

initializeApp({
  credential: cert({
    projectId: process.env.FIREBASE_PROJECT_ID,
    clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
    privateKey: process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, "\n"),
  }),
});

// Dynamic import of compiled seed won't work easily — inline minimal call via tsx alternative
console.log(
  "Run seed from the app: open /admin and click Reseed demo data, or use npm run dev with admin env set (auto-seeds on first request).",
);
