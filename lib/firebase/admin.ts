import "server-only";
import {
  cert,
  getApps,
  initializeApp,
  applicationDefault,
  type App,
} from "firebase-admin/app";
import { getAuth, type Auth } from "firebase-admin/auth";
import { getFirestore, type Firestore } from "firebase-admin/firestore";

let app: App | undefined;

function hasServiceAccountEnv(): boolean {
  return Boolean(
    process.env.FIREBASE_PROJECT_ID &&
      process.env.FIREBASE_CLIENT_EMAIL &&
      process.env.FIREBASE_PRIVATE_KEY,
  );
}

function hasApplicationDefault(): boolean {
  return Boolean(process.env.GOOGLE_APPLICATION_CREDENTIALS);
}

export function isFirebaseAdminConfigured(): boolean {
  return hasServiceAccountEnv() || hasApplicationDefault();
}

export function isFirebaseConfigured(): boolean {
  return (
    isFirebaseAdminConfigured() ||
    Boolean(process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID)
  );
}

export function getFirebaseAdminApp(): App {
  if (!isFirebaseAdminConfigured()) {
    throw new Error(
      "Firebase Admin is not configured. Set FIREBASE_PROJECT_ID + FIREBASE_CLIENT_EMAIL + FIREBASE_PRIVATE_KEY, or GOOGLE_APPLICATION_CREDENTIALS.",
    );
  }
  if (!app) {
    if (getApps().length) {
      app = getApps()[0]!;
    } else if (hasServiceAccountEnv()) {
      app = initializeApp({
        credential: cert({
          projectId: process.env.FIREBASE_PROJECT_ID!,
          clientEmail: process.env.FIREBASE_CLIENT_EMAIL!,
          privateKey: process.env.FIREBASE_PRIVATE_KEY!.replace(/\\n/g, "\n"),
        }),
      });
    } else {
      app = initializeApp({
        credential: applicationDefault(),
        projectId: process.env.FIREBASE_PROJECT_ID ?? process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
      });
    }
  }
  return app;
}

export function getAdminAuth(): Auth {
  return getAuth(getFirebaseAdminApp());
}

export function getAdminFirestore(): Firestore {
  return getFirestore(getFirebaseAdminApp());
}
