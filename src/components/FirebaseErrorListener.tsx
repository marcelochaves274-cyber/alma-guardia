'use client';

import { useState, useEffect } from 'react';
import { errorEmitter } from '@/firebase/error-emitter';
import { FirestorePermissionError } from '@/firebase/errors';

/**
 * An invisible component that listens for globally emitted 'permission-error' events.
 * In development, it throws the error to be caught by Next.js's overlay for easy debugging.
 * In production, it logs the error to the console without crashing the app.
 */
export function FirebaseErrorListener() {
  const [error, setError] = useState<FirestorePermissionError | null>(null);

  useEffect(() => {
    const handleError = (error: FirestorePermissionError) => {
      setError(error);
    };

    errorEmitter.on('permission-error', handleError);

    return () => {
      errorEmitter.off('permission-error', handleError);
    };
  }, []);

  // In development, we want to see the rich error overlay.
  // In production, we log the error but don't want to crash the app for the user.
  if (error) {
    if (process.env.NODE_ENV === 'development') {
      throw error;
    } else {
      // Error logged silently in production
      setError(null);
    }
  }

  // This component renders nothing.
  return null;
}
