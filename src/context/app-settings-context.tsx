'use client';

import React, {
  createContext,
  useContext,
  useState,
  ReactNode,
  useEffect,
} from 'react';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { useFirestore, useUser } from '@/firebase';

interface AppSettingsContextType {
  appName: string;
  setAppName: (name: string) => Promise<void>;
  logoUrl: string;
  setLogoUrl: (url: string) => Promise<void>;
  isLoading: boolean;
}

const AppSettingsContext = createContext<AppSettingsContextType | undefined>(
  undefined
);

export function AppSettingsProvider({ children }: { children: ReactNode }) {
  const [appName, setAppNameState] = useState('SGS Genius');
  const [logoUrl, setLogoUrlState] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const firestore = useFirestore();
  const { user, isLoading: isUserLoading } = useUser();

  useEffect(() => {
    // Only fetch settings if we have a user and firestore instance.
    if (user && firestore) {
      setIsLoading(true);
      const fetchAppSettings = async () => {
        try {
          const settingsDocRef = doc(firestore, 'users', user.uid, 'settings', 'appDetails');
          const docSnap = await getDoc(settingsDocRef);
          if (docSnap.exists()) {
            const data = docSnap.data();
            setAppNameState(data.name || 'SGS Genius');
            setLogoUrlState(data.logoUrl || '');
          }
        } catch (error) {
          console.error('Error fetching app settings from Firestore:', error);
        } finally {
          setIsLoading(false);
        }
      };
      fetchAppSettings();
    } else if (!isUserLoading) {
        // If there's no user and we're not loading the user, stop loading settings.
        setIsLoading(false);
    }
  }, [firestore, user, isUserLoading]);

  const setAppName = async (name: string) => {
    if (!firestore || !user) {
      console.error('Firestore not initialized or user not logged in');
      throw new Error('Usuário não autenticado.');
    }
    const settingsDocRef = doc(firestore, 'users', user.uid, 'settings', 'appDetails');
    await setDoc(settingsDocRef, { name: name }, { merge: true });
    setAppNameState(name);
  };

  const setLogoUrl = async (url: string) => {
    if (!firestore || !user) {
      console.error('Firestore not initialized or user not logged in');
      throw new Error('Usuário não autenticado.');
    }
    const settingsDocRef = doc(firestore, 'users', user.uid, 'settings', 'appDetails');
    await setDoc(settingsDocRef, { logoUrl: url }, { merge: true });
    setLogoUrlState(url);
  };

  const contextValue = {
    appName,
    setAppName,
    logoUrl,
    setLogoUrl,
    isLoading: isLoading || isUserLoading,
  };

  return (
    <AppSettingsContext.Provider value={contextValue}>
      {children}
    </AppSettingsContext.Provider>
  );
}

export function useAppSettings() {
  const context = useContext(AppSettingsContext);
  if (context === undefined) {
    throw new Error(
      'useAppSettings must be used within an AppSettingsProvider'
    );
  }
  return context;
}
