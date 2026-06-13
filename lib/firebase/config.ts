/**
 * Firebase web client configuration.
 * NEXT_PUBLIC_* env vars override defaults (see .env.example).
 * Default values are the anchor-8bdff web app config — public by design;
 * security is enforced via Firestore rules, not hiding these fields.
 */

const defaultFirebaseConfig = {
  apiKey: "AIzaSyDeNFK2fskWsLPoNkkxEk36GXsVBZznm4c",
  authDomain: "anchor-8bdff.firebaseapp.com",
  projectId: "anchor-8bdff",
  storageBucket: "anchor-8bdff.firebasestorage.app",
  messagingSenderId: "994582091613",
  appId: "1:994582091613:web:99777ea476831400c83ab4",
} as const;

export const firebaseConfig = {
  apiKey:
    process.env.NEXT_PUBLIC_FIREBASE_API_KEY ?? defaultFirebaseConfig.apiKey,
  authDomain:
    process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN ??
    defaultFirebaseConfig.authDomain,
  projectId:
    process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID ??
    defaultFirebaseConfig.projectId,
  storageBucket:
    process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET ??
    defaultFirebaseConfig.storageBucket,
  messagingSenderId:
    process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID ??
    defaultFirebaseConfig.messagingSenderId,
  appId:
    process.env.NEXT_PUBLIC_FIREBASE_APP_ID ?? defaultFirebaseConfig.appId,
} as const;

export function isFirebaseClientConfigured(): boolean {
  return Boolean(
    firebaseConfig.apiKey &&
      firebaseConfig.authDomain &&
      firebaseConfig.projectId &&
      firebaseConfig.appId,
  );
}
