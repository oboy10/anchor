"use client";

import { getApps, initializeApp, type FirebaseApp } from "firebase/app";
import { getAuth, type Auth } from "firebase/auth";
import { getFirestore, type Firestore } from "firebase/firestore";
import { firebaseConfig, isFirebaseClientConfigured } from "./config";

let app: FirebaseApp | undefined;
let auth: Auth | undefined;
let db: Firestore | undefined;

/** Lazily initialize the Firebase client app (browser only). */
export function getFirebaseApp(): FirebaseApp {
  if (!isFirebaseClientConfigured()) {
    throw new Error(
      "Firebase client is not configured. Add NEXT_PUBLIC_FIREBASE_* variables to .env.local.",
    );
  }
  if (!app) {
    app = getApps().length ? getApps()[0]! : initializeApp(firebaseConfig);
  }
  return app;
}

export function getFirebaseAuth(): Auth {
  if (!auth) auth = getAuth(getFirebaseApp());
  return auth;
}

export function getFirebaseFirestore(): Firestore {
  if (!db) db = getFirestore(getFirebaseApp());
  return db;
}

export { isFirebaseClientConfigured };
