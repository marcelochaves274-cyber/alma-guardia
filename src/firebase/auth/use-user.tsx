'use client';

import { useState, useEffect } from 'react';
import { type User, onAuthStateChanged } from 'firebase/auth';
import { useAuth } from '@/firebase';
import { useRouter } from 'next/navigation';

export function useUser() {
  const auth = useAuth();
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!auth) return;

    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setUser(user);
      setIsLoading(false);
      if (!user) {
        // To prevent flicker, middleware should handle redirection.
        // This is a client-side fallback.
        // router.push('/login');
      }
    });

    return () => unsubscribe();
  }, [auth, router]);

  return { user, isLoading };
}
