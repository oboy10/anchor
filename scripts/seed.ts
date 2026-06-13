/**
 * Seed Firestore from the CLI: npm run seed
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
  const { reseedFirestore } = await import("../lib/data/seed-firestore");
  await reseedFirestore();
  console.log("Firestore demo data seeded successfully.");
}

main().catch((err) => {
  console.error("Seed failed:", err);
  process.exit(1);
});
