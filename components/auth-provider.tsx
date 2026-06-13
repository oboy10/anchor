"use client";

import * as React from "react";
import {
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signOut,
  type User,
} from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";
import { getFirebaseAuth, getFirebaseFirestore, isFirebaseClientConfigured } from "@/lib/firebase/client";
import type { AuthProfile } from "@/lib/auth/types";
import type { DemoRole } from "@/lib/auth/demo-accounts";

interface AuthContextValue {
  user: User | null;
  profile: AuthProfile | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signOutUser: () => Promise<void>;
}

const AuthContext = React.createContext<AuthContextValue | null>(null);

async function loadProfile(user: User): Promise<AuthProfile> {
  const token = await user.getIdTokenResult();
  const role = (token.claims.role as DemoRole | undefined) ?? "resident";
  const fingerprint = token.claims.fingerprint as string | undefined;
  const slug = token.claims.slug as string | undefined;

  if (fingerprint && slug) {
    return { uid: user.uid, email: user.email, role, fingerprint, slug };
  }

  if (isFirebaseClientConfigured()) {
    const link = await getDoc(
      doc(getFirebaseFirestore(), "authLinks", user.uid),
    );
    if (link.exists()) {
      const data = link.data();
      return {
        uid: user.uid,
        email: user.email,
        role: (data.role as DemoRole) ?? "resident",
        fingerprint: data.fingerprint as string | undefined,
        slug: data.slug as string | undefined,
      };
    }
  }

  return { uid: user.uid, email: user.email, role: "resident" };
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = React.useState<User | null>(null);
  const [profile, setProfile] = React.useState<AuthProfile | null>(null);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    if (!isFirebaseClientConfigured()) {
      setLoading(false);
      return;
    }
    const auth = getFirebaseAuth();
    return onAuthStateChanged(auth, async (next) => {
      setUser(next);
      if (next) {
        try {
          const p = await loadProfile(next);
          setProfile(p);
          // #region agent log
          fetch('http://127.0.0.1:7770/ingest/c43addfd-9145-4c13-b4b0-3d3f620110e8',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'4e4885'},body:JSON.stringify({sessionId:'4e4885',location:'auth-provider.tsx:onAuthStateChanged',message:'auth profile loaded',data:{role:p.role,slug:p.slug},timestamp:Date.now(),hypothesisId:'D'})}).catch(()=>{});
          // #endregion
        } catch {
          setProfile(null);
        }
      } else {
        setProfile(null);
      }
      setLoading(false);
    });
  }, []);

  async function signIn(email: string, password: string) {
    if (!isFirebaseClientConfigured()) {
      throw new Error("Firebase Auth is not configured.");
    }
    await signInWithEmailAndPassword(getFirebaseAuth(), email, password);
  }

  async function signOutUser() {
    if (!isFirebaseClientConfigured()) return;
    await signOut(getFirebaseAuth());
  }

  return (
    <AuthContext.Provider value={{ user, profile, loading, signIn, signOutUser }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = React.useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
