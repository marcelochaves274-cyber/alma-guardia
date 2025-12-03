'use client';

import React, { createContext, useContext, useState, ReactNode, useEffect } from 'react';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { useFirestore } from '@/firebase';

interface AppSettingsContextType {
  appName: string;
  setAppName: (name: string) => Promise<void>;
  logoUrl: string;
  setLogoUrl: (url: string) => Promise<void>;
  isLoading: boolean;
}

const AppSettingsContext = createContext<AppSettingsContextType | undefined>(undefined);

export function AppSettingsProvider({ children }: { children: ReactNode }) {
  const [appName, setAppNameState] = useState('SGS Genius');
  const [logoUrl, setLogoUrlState] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const firestore = useFirestore();

  useEffect(() => {
    const fetchAppSettings = async () => {
      if (!firestore) return;
      setIsLoading(true);
      try {
        const settingsDocRef = doc(firestore, 'settings', 'appDetails');
        const docSnap = await getDoc(settingsDocRef);
        if (docSnap.exists()) {
          const data = docSnap.data();
          if (data.name) {
            setAppNameState(data.name);
          }
          if (data.logoUrl) {
            setLogoUrlState(data.logoUrl);
          }
        }
      } catch (error) {
        console.error("Error fetching app settings from Firestore:", error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchAppSettings();
  }, [firestore]);

  const setAppName = async (name: string) => {
    if (!firestore) {
      console.error("Firestore is not initialized");
      return;
    }
    const settingsDocRef = doc(firestore, 'settings', 'appDetails');
    await setDoc(settingsDocRef, { name: name }, { merge: true });
    setAppNameState(name);
  };
  
  const setLogoUrl = async (url: string) => {
    if (!firestore) {
      console.error("Firestore is not initialized");
      return;
    }
    const settingsDocRef = doc(firestore, 'settings', 'appDetails');
    await setDoc(settingsDocRef, { logoUrl: url }, { merge: true });
    setLogoUrlState(url);
  };

  const value = {
    appName,
    setAppName,
    logoUrl,
    setLogoUrl,
    isLoading
  };
  
  // Não renderiza o app até que as configurações sejam carregadas para evitar piscar
  if (isLoading) {
    return null; // ou um componente de loading em tela cheia
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
