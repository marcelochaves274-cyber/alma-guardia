
'use client';

import React, { DependencyList, createContext, useContext, ReactNode, useMemo, useState, useEffect } from 'react';
import { FirebaseApp } from 'firebase/app';
import { Firestore } from 'firebase/firestore';
import { Auth, User, onAuthStateChanged, AuthError } from 'firebase/auth';

interface FirebaseProviderProps {
  children: ReactNode;
  firebaseApp: FirebaseApp;
  firestore: Firestore;
  auth: Auth;
}

// Combined state for the Firebase context
export interface FirebaseContextState {
  firebaseApp: FirebaseApp | null;
  firestore: Firestore | null;
  auth: Auth | null;
  user: User | null;
  isUserLoading: boolean;
  userError: AuthError | null;
}

// React Context
export const FirebaseContext = createContext<FirebaseContextState | undefined>(undefined);

/**
 * FirebaseProvider manages and provides Firebase services and user authentication state.
 */
export const FirebaseProvider: React.FC<FirebaseProviderProps> = ({
  children,
  firebaseApp,
  firestore,
  auth,
}) => {
  const [user, setUser] = useState<User | null>(() => {
    if (typeof window === 'undefined' || navigator.onLine) return null;

    try {
      const cachedUser = JSON.parse(localStorage.getItem('sgs-cached-user') || 'null') as {
        uid?: string;
        email?: string | null;
      } | null;
      if (!cachedUser?.uid) return null;

      return {
        uid: cachedUser.uid,
        email: cachedUser.email || null,
        emailVerified: true,
        isAnonymous: false,
      } as User;
    } catch {
      return null;
    }
  });
  const [isUserLoading, setIsUserLoading] = useState(true);
  const [userError, setUserError] = useState<AuthError | null>(null);

  // Effect to subscribe to Firebase auth state changes
  useEffect(() => {
    // If no Auth service instance, we can't determine user state.
    if (!auth) {
      setIsUserLoading(false);
      return;
    }

    let authTimeout = 0;
    const unsubscribe = onAuthStateChanged(
      auth,
      (firebaseUser) => { // Auth state determined
        window.clearTimeout(authTimeout);
        if (firebaseUser) {
          try {
            localStorage.setItem('sgs-cached-user', JSON.stringify({
              uid: firebaseUser.uid,
              email: firebaseUser.email,
            }));
          } catch (error) {
            console.debug('[AUTH] Não foi possível salvar sessão offline:', error);
          }
        }
        if (!firebaseUser && typeof navigator !== 'undefined' && !navigator.onLine) {
          try {
            const cachedUser = JSON.parse(localStorage.getItem('sgs-cached-user') || 'null') as {
              uid?: string;
              email?: string | null;
            } | null;
            if (cachedUser?.uid) {
              setUser({
                uid: cachedUser.uid,
                email: cachedUser.email || null,
                emailVerified: true,
                isAnonymous: false,
              } as User);
              setIsUserLoading(false);
              return;
            }
          } catch (error) {
            console.debug('[AUTH] Sessão offline indisponível:', error);
          }
        }
        setUser(firebaseUser);
        setIsUserLoading(false);
      },
      (error: Error) => { // Auth listener error
        window.clearTimeout(authTimeout);
        console.error("FirebaseProvider: onAuthStateChanged error:", error);
        setUserError(error as AuthError);
        setIsUserLoading(false);
      }
    );
    authTimeout = window.setTimeout(() => {
      if (!navigator.onLine) {
        try {
          const cachedUser = JSON.parse(localStorage.getItem('sgs-cached-user') || 'null') as {
            uid?: string;
            email?: string | null;
          } | null;
          if (cachedUser?.uid) {
            setUser({
              uid: cachedUser.uid,
              email: cachedUser.email || null,
              emailVerified: true,
              isAnonymous: false,
            } as User);
            setIsUserLoading(false);
          }
        } catch (error) {
          console.debug('[AUTH] Sessão offline indisponível:', error);
        }
      }
    }, 1200);

    return () => {
      window.clearTimeout(authTimeout);
      unsubscribe();
    };
  }, [auth]); // This effect MUST depend only on the auth instance.

  // Memoize the context value
  const contextValue = useMemo((): FirebaseContextState => ({
    firebaseApp,
    firestore,
    auth,
    user,
    isUserLoading,
    userError
  }), [firebaseApp, firestore, auth, user, isUserLoading, userError]);

  return (
    <FirebaseContext.Provider value={contextValue}>
      {children}
    </FirebaseContext.Provider>
  );
};


function useFirebaseContext() {
  const context = useContext(FirebaseContext);
  if (context === undefined) {
    throw new Error('useFirebaseContext must be used within a FirebaseProvider.');
  }
  return context;
}


/** Hook to access Firebase Auth instance. */
export const useAuth = (): Auth => {
  const { auth } = useFirebaseContext();
  if (!auth) throw new Error("Firebase Auth not initialized.");
  return auth;
};

/** Hook to access Firestore instance. */
export const useFirestore = (): Firestore => {
  const { firestore } = useFirebaseContext();
  if (!firestore) throw new Error("Firebase Firestore not initialized.");
  return firestore;
};

/** Hook to access Firebase App instance. */
export const useFirebaseApp = (): FirebaseApp => {
  const { firebaseApp } = useFirebaseContext();
  if (!firebaseApp) throw new Error("Firebase App not initialized.");
  return firebaseApp;
};

type MemoFirebase <T> = T & {__memo?: boolean};

export function useMemoFirebase<T>(factory: () => T, deps: DependencyList): T {
  // The 'as T' cast is used here because while we add a private '__memo' property,
  // the external type signature should remain clean and unmodified for the consumer.
  const memoized = useMemo(() => {
    const value = factory();
    if (typeof value === 'object' && value !== null) {
      (value as MemoFirebase<T>).__memo = true;
    }
    return value;
  }, deps);
  
  return memoized;
}

/** Hook to access the authenticated user's state. */
export const useUser = () => {
  const { user, isUserLoading } = useFirebaseContext();
  return { user, isUserLoading };
};
