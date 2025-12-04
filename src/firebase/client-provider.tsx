'use client';

import React from 'react';
import { FirebaseProvider, initializeFirebase } from '@/firebase';

export function FirebaseClientProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const { firebaseApp, auth, firestore } = initializeFirebase();

  return (
    <FirebaseProvider value={{ firebaseApp, auth, firestore }}>
      {children}
    </FirebaseProvider>
  );
}
