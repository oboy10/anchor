/**
 * Seed Firestore with demo TrustWallet data.
 * Requires Firebase Admin credentials.
 */
import type { Firestore } from "firebase-admin/firestore";
import { getAdminFirestore, getAdminAuth } from "@/lib/firebase/admin";
import {
  buildCredentialProperties,
  signAttestation,
} from "@/lib/crypto/attestation";
import { COL, META } from "./collections";
import {
  seedEndorsements,
  seedIssuances,
  seedPacket,
  seedProviders,
  seedResidents,
  DEMO_KEYS,
} from "@/lib/demo/seed";
import {
  DEMO_AUTH_ACCOUNTS,
  DEMO_AUTH_PASSWORD,
} from "@/lib/auth/demo-accounts";

function slugDoc(slug: string, fingerprint: string, kind: "resident" | "provider") {
  return { slug, fingerprint, kind };
}

export async function seedFirestore(db: Firestore = getAdminFirestore()): Promise<void> {
  const batch = db.batch();
  const now = Date.now();
  const day = 24 * 60 * 60 * 1000;

  const slugToFp = new Map<string, string>();
  for (const r of seedResidents) {
    slugToFp.set(r.slug, r.fingerprint);
    const keyEntry = Object.values(DEMO_KEYS).find((k) => k.fingerprint === r.fingerprint);
    batch.set(db.collection(COL.users).doc(r.fingerprint), {
      fingerprint: r.fingerprint,
      publicKey: keyEntry?.publicKey ?? "",
      role: "resident",
      createdAt: new Date().toISOString(),
    });
    batch.set(db.collection(COL.slugs).doc(r.slug), slugDoc(r.slug, r.fingerprint, "resident"));
    batch.set(db.collection(COL.residents).doc(r.fingerprint), { ...r });
  }

  for (const p of seedProviders) {
    slugToFp.set(p.slug, p.fingerprint);
    const keyEntry = Object.values(DEMO_KEYS).find((k) => k.fingerprint === p.fingerprint);
    batch.set(db.collection(COL.users).doc(p.fingerprint), {
      fingerprint: p.fingerprint,
      publicKey: keyEntry?.publicKey ?? "",
      role: "provider",
      createdAt: new Date().toISOString(),
    });
    batch.set(db.collection(COL.slugs).doc(p.slug), slugDoc(p.slug, p.fingerprint, "provider"));
    batch.set(db.collection(COL.providers).doc(p.fingerprint), { ...p });
  }

  await batch.commit();

  // Attestations signed one-by-one (need sequential signing)
  for (const issuance of seedIssuances) {
    const residentFp = slugToFp.get(issuance.residentSlug)!;
    const issuerFp = slugToFp.get(issuance.issuerSlug)!;
    const provider = seedProviders.find((p) => p.fingerprint === issuerFp);
    const keyEntry = Object.values(DEMO_KEYS).find((k) => k.fingerprint === issuerFp);
    if (!keyEntry?.privateKey) continue;

    const properties = buildCredentialProperties({
      credentialId: issuance.id,
      credentialType: issuance.credentialType,
      issueDate: issuance.issueDate,
      title: issuance.title,
      summary: issuance.summary,
      issuerName: provider?.name ?? "Unknown",
      issuerType: provider?.type ?? "shelter",
      metric: issuance.evidence.metric,
      periodStart: issuance.evidence.periodStart,
      periodEnd: issuance.evidence.periodEnd,
      facts: issuance.evidence.facts,
    });

    const record = signAttestation(
      { fingerprint: issuerFp, privateKey: keyEntry.privateKey },
      residentFp,
      properties,
    );

    await db.collection(COL.attestations).doc(record.nonce).set({
      ...record,
      credentialId: issuance.id,
      issueDate: issuance.issueDate,
    });

    if (issuance.residentNote) {
      await db
        .collection(COL.residentNotes)
        .doc(`${residentFp}_${issuance.id}`)
        .set({
          fingerprint: residentFp,
          credentialId: issuance.id,
          note: issuance.residentNote,
        });
    }
  }

  for (const e of seedEndorsements) {
    await db.collection(COL.endorsements).doc(e.id).set(e);
  }

  const residentFp = slugToFp.get(seedPacket.residentSlug)!;
  await db.collection(COL.sharePackets).doc(seedPacket.token).set({
    token: seedPacket.token,
    residentFingerprint: residentFp,
    label: seedPacket.label,
    purpose: seedPacket.purpose,
    intro: seedPacket.intro,
    includedCredentialIds: [...seedPacket.includedCredentialIds],
    sharedNoteCredentialIds: [...seedPacket.sharedNoteCredentialIds],
    createdAt: new Date(now + seedPacket.createdOffsetDays * day).toISOString(),
    expiresAt: new Date(now + seedPacket.expiresOffsetDays * day).toISOString(),
  });

  await db.collection(COL.meta).doc(META.demoSeed).set({
    seededAt: new Date().toISOString(),
    version: 1,
  });

  await seedAuthUsers(db);
}

async function seedAuthUsers(db: Firestore): Promise<void> {
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
        displayName: account.label,
      });
      uid = created.uid;
    }

    let fingerprint: string | undefined;
    if (account.role === "resident") {
      fingerprint = seedResidents.find((r) => r.slug === account.slug)?.fingerprint;
    } else if (account.role === "provider") {
      fingerprint = seedProviders.find((p) => p.slug === account.slug)?.fingerprint;
    }

    await auth.setCustomUserClaims(uid, {
      role: account.role,
      fingerprint: fingerprint ?? null,
      slug: account.slug,
    });

    await db.collection(COL.authLinks).doc(uid).set({
      uid,
      email: account.email,
      role: account.role,
      fingerprint: fingerprint ?? null,
      slug: account.slug,
    });
  }
}

export async function clearDemoFirestore(db: Firestore = getAdminFirestore()): Promise<void> {
  const collections = [
    COL.users,
    COL.slugs,
    COL.residents,
    COL.providers,
    COL.attestations,
    COL.residentNotes,
    COL.statusOverrides,
    COL.sharePackets,
    COL.endorsements,
    COL.authLinks,
  ];

  for (const name of collections) {
    const snap = await db.collection(name).limit(500).get();
    if (snap.empty) continue;
    const batch = db.batch();
    snap.docs.forEach((d) => batch.delete(d.ref));
    await batch.commit();
  }
}

export async function reseedFirestore(): Promise<void> {
  const db = getAdminFirestore();
  await clearDemoFirestore(db);
  await seedFirestore(db);
}
