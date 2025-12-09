'use client';

import { useState, useEffect } from 'react';
import { type User, onAuthStateChanged, AuthError } from 'firebase/auth';
import { useAuth } from '@/firebase';

export function useUser() {
  const auth = useAuth();
  const [user, setUser] = useState<User | null>(null);
  const [isUserLoading, setIsUserLoading] = useState(true);
  const [userError, setUserError] = useState<AuthError | null>(null);

  useEffect(() => {
    if (!auth) {
      // Auth service not available yet, wait for it.
      // The loading state remains true until auth is available.
      return;
    }

    const unsubscribe = onAuthStateChanged(auth, 
      (user) => {
        setUser(user);
        setIsUserLoading(false);
      },
      (error: Error) => {
        console.error("Authentication error in useUser:", error);
        setUserError(error as AuthError);
        setIsUserLoading(false);
      }
    );

    return () => unsubscribe();
  }, [auth]);

  return { user, isUserLoading, userError };
}
