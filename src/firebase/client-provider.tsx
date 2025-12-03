'use client';

import React from 'react';
import { FirebaseProvider, initializeFirebase } from '@/firebase';
import { AppSettingsProvider } from '@/context/app-settings-context';
import { SidebarProvider } from '@/components/ui/sidebar';

export function FirebaseClientProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const { firebaseApp, auth, firestore } = initializeFirebase();

  return (
    <FirebaseProvider value={{ firebaseApp, auth, firestore }}>
      <AppSettingsProvider>
        <SidebarProvider>
          {children}
        </SidebarProvider>
      </AppSettingsProvider>
    </FirebaseProvider>
  );
}