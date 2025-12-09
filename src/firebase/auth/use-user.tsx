'use client';

import { useContext } from 'react';
import { FirebaseContext, FirebaseContextState } from '@/firebase/provider';

// This is the return type for the useUser hook.
export interface UserHookResult {
  user: FirebaseContextState['user'];
  isUserLoading: FirebaseContextState['isUserLoading'];
  userError: FirebaseContextState['userError'];
}

/**
 * Hook specifically for accessing the authenticated user's state.
 * This provides the User object, loading status, and any auth errors
 * from the central FirebaseProvider.
 * @returns {UserHookResult} Object with user, isUserLoading, userError.
 */
export function useUser(): UserHookResult {
  const context = useContext(FirebaseContext);
  if (context === undefined) {
    throw new Error('useUser must be used within a FirebaseProvider.');
  }
  
  const { user, isUserLoading, userError } = context;

  return { user, isUserLoading, userError };
}
