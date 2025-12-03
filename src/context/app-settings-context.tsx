'use client';

import React, { createContext, useContext, useState, ReactNode, useEffect } from 'react';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { useFirestore } from '@/firebase';

interface AppSettingsContextType {
  appName: string;
  setAppName: (name: string) => Promise<void>;
  isLoading: boolean;
}

const AppSettingsContext = createContext<AppSettingsContextType | undefined>(undefined);

export function AppSettingsProvider({ children }: { children: ReactNode }) {
  const [appName, setAppNameState] = useState('SGS Genius');
  const [isLoading, setIsLoading] = useState(true);
  const firestore = useFirestore();

  useEffect(() => {
    const fetchAppName = async () => {
      if (!firestore) return;
      setIsLoading(true);
      try {
        const settingsDocRef = doc(firestore, 'settings', 'appDetails');
        const docSnap = await getDoc(settingsDocRef);
        if (docSnap.exists() && docSnap.data().name) {
          setAppNameState(docSnap.data().name);
        }
      } catch (error) {
        console.error("Error fetching app name from Firestore:", error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchAppName();
  }, [firestore]);

  const setAppName = async (name: string) => {
    if (!firestore) {
      console.error("Firestore is not initialized");
      return;
    }
    const settingsDocRef = doc(firestore, 'settings', 'appDetails');
    await setDoc(settingsDocRef, { name: name });
    setAppNameState(name);
  };

  const value = {
    appName,
    setAppName,
    isLoading
  };
  
  if (isLoading) {
    return null; // ou um componente de loading
  }

  return (
    <AppSettingsContext.Provider value={value}>
      {children}
    </AppSettingsContext.Provider>
  );
}

export function useAppSettings() {
  const context = useContext(AppSettingsContext);
  if (context === undefined) {
    throw new Error('useAppSettings must be used within an AppSettingsProvider');
  }
  return context;
}
