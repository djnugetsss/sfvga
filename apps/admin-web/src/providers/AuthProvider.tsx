'use client';

import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { onIdTokenChanged, type User as FirebaseUser } from 'firebase/auth';
import { doc, onSnapshot } from 'firebase/firestore';
import type { AdminAccessSummary, User } from '@sfvga/shared-types';
import { getFirebaseAuth, getFirestoreDb } from '@/services/firebase';
import { signOutAdmin } from '@/services/authService';
import { notifyMemberAppClosed } from '@/lib/adminAppReturn';
import { functionsClient } from '@/services/functionsClient';

export interface AuthContextValue {
  firebaseUser: FirebaseUser | null;
  userProfile: User | null;
  isLoading: boolean;
  isAdmin: boolean;
  access: AdminAccessSummary | null;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [firebaseUser, setFirebaseUser] = useState<FirebaseUser | null>(null);
  const [userProfile, setUserProfile] = useState<User | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [access, setAccess] = useState<AdminAccessSummary | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const auth = getFirebaseAuth();
    let profileUnsub: (() => void) | null = null;

    // onIdTokenChanged also fires on token refresh, so newly-granted admin claims are
    // picked up without a full sign-out/in cycle (admin claims are read off the token).
    const authUnsub = onIdTokenChanged(auth, async (user) => {
      profileUnsub?.();
      profileUnsub = null;

      // A custom-token sign-in can finish while the previous signed-out state is still
      // rendered. Enter loading before resolving access so AdminGuard cannot briefly
      // interpret that transition as a confirmed denial and close the embedded app.
      setIsLoading(true);

      setFirebaseUser(user);

      if (!user) {
        setUserProfile(null);
        setIsAdmin(false);
        setAccess(null);
        setIsLoading(false);
        return;
      }

      try {
        const nextAccess = await functionsClient.auth.getAdminAccess();
        const authorized = Boolean(
          nextAccess.isSuperAdmin || nextAccess.organizationRole || nextAccess.eventAccess.length,
        );
        setAccess(nextAccess);
        setIsAdmin(authorized);
      } catch {
        setAccess(null);
        setIsAdmin(false);
      }

      const ref = doc(getFirestoreDb(), 'users', user.uid);
      profileUnsub = onSnapshot(
        ref,
        (snap) => setUserProfile(snap.exists() ? (snap.data() as User) : null),
        () => setUserProfile(null),
      );

      setIsLoading(false);
    });

    return () => {
      profileUnsub?.();
      authUnsub();
    };
  }, []);

  useEffect(() => {
    if (!firebaseUser) return;
    let checking = false;
    const revalidate = async () => {
      if (checking) return;
      checking = true;
      try {
        const nextAccess = await functionsClient.auth.getAdminAccess();
        const authorized = Boolean(
          nextAccess.isSuperAdmin || nextAccess.organizationRole || nextAccess.eventAccess.length,
        );
        setAccess(nextAccess);
        setIsAdmin(authorized);
        if (!authorized) {
          await signOutAdmin();
          notifyMemberAppClosed();
        }
      } catch {
        // Keep the current screen during a temporary network failure. Sensitive actions
        // still re-check permissions server-side.
      } finally {
        checking = false;
      }
    };
    const timer = window.setInterval(() => void revalidate(), 30_000);
    return () => window.clearInterval(timer);
  }, [firebaseUser]);

  const signOut = useCallback(async () => {
    await signOutAdmin();
  }, []);

  const value = useMemo(
    () => ({
      firebaseUser,
      userProfile,
      isLoading,
      isAdmin,
      access,
      signOut,
    }),
    [firebaseUser, userProfile, isLoading, isAdmin, access, signOut],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuthContext(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuthContext must be used within AuthProvider');
  return ctx;
}
