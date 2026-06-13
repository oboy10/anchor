#!/usr/bin/env node
/**
 * Remove legacy Firestore data from the old server-persisted wallet build.
 *
 * Keeps only what the local-first app uses today:
 *   - registeredEmails
 *   - pendingVerifications (short-lived codes)
 *   - registeredIdentities (email/phone hash registry)
 *
 * Also deletes all Firebase Auth users (app auth is local-only now).
 *
 * Usage: node scripts/cleanup-firebase.mjs
 */
import { config } from "dotenv";
import { cert, getApps, initializeApp } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { getFirestore } from "firebase-admin/firestore";

config({ path: ".env.local" });

const LEGACY_COLLECTIONS = [
  "users",
  "slugs",
  "residents",
  "providers",
  "attestations",
  "residentNotes",
  "sharePackets",
  "endorsements",
  "authLinks",
  "meta",
  "_meta",
];

const KEEP_COLLECTIONS = new Set([
  "registeredEmails",
  "pendingVerifications",
  "registeredIdentities",
]);

function init() {
  if (getApps().length) return getFirestore();

  const email = process.env.FIREBASE_CLIENT_EMAIL?.trim();
  const key = process.env.FIREBASE_PRIVATE_KEY?.trim();
  if (!email || !key) {
    console.error(
      "Missing FIREBASE_CLIENT_EMAIL / FIREBASE_PRIVATE_KEY in .env.local",
    );
    process.exit(1);
  }

  initializeApp({
    credential: cert({
      projectId: process.env.FIREBASE_PROJECT_ID,
      clientEmail: email,
      privateKey: key.replace(/\\n/g, "\n"),
    }),
  });

  return getFirestore();
}

async function deleteCollection(db, name) {
  const ref = db.collection(name);
  let total = 0;

  while (true) {
    const snapshot = await ref.limit(500).get();
    if (snapshot.empty) break;

    const batch = db.batch();
    snapshot.docs.forEach((doc) => batch.delete(doc.ref));
    await batch.commit();
    total += snapshot.size;
  }

  if (total === 0) {
    console.log(`  skip ${name} (empty or missing)`);
  } else {
    console.log(`  deleted collection: ${name} (${total} docs)`);
  }
}

async function clearPendingVerifications(db) {
  await deleteCollection(db, "pendingVerifications");
}

async function deleteAllAuthUsers() {
  const auth = getAuth();
  let deleted = 0;
  let pageToken;
  do {
    const result = await auth.listUsers(1000, pageToken);
    for (const user of result.users) {
      await auth.deleteUser(user.uid);
      deleted += 1;
      console.log(`  deleted auth user: ${user.email ?? user.uid}`);
    }
    pageToken = result.pageToken;
  } while (pageToken);
  if (deleted === 0) console.log("  no Firebase Auth users");
  return deleted;
}

async function listRootCollections(db) {
  const collections = await db.listCollections();
  return collections.map((c) => c.id);
}

async function main() {
  const db = init();
  const project = process.env.FIREBASE_PROJECT_ID ?? "unknown";
  console.log(`Firebase cleanup — project ${project}\n`);

  console.log("Before:");
  const before = await listRootCollections(db);
  console.log(`  collections: ${before.join(", ") || "(none)"}\n`);

  console.log("Removing legacy Firestore collections…");
  for (const name of LEGACY_COLLECTIONS) {
    await deleteCollection(db, name);
  }

  console.log("\nClearing ephemeral verification codes…");
  await clearPendingVerifications(db);

  console.log("\nRemoving Firebase Auth users (local-only auth now)…");
  const authDeleted = await deleteAllAuthUsers();

  console.log("\nAfter:");
  const after = await listRootCollections(db);
  const unexpected = after.filter((c) => !KEEP_COLLECTIONS.has(c));
  console.log(`  collections: ${after.join(", ") || "(none)"}`);
  if (unexpected.length) {
    console.warn(
      `  note: unexpected collections remain (not auto-deleted): ${unexpected.join(", ")}`,
    );
  }

  console.log("\nDone.");
  console.log(`  Auth users deleted: ${authDeleted}`);
  console.log(
    "  Kept collections: registeredEmails, pendingVerifications, registeredIdentities",
  );
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
