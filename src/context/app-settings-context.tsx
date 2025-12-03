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

  const getSettingsDocRef = (userId: string) => {
    return doc(firestore!, 'users', userId, 'settings', 'appDetails');
  };

  useEffect(() => {
    const fetchAppSettings = async () => {
      if (!firestore || !user) {
        if (!isUserLoading) setIsLoading(false);
        return;
      };
      setIsLoading(true);
      try {
        const settingsDocRef = getSettingsDocRef(user.uid);
        const docSnap = await getDoc(settingsDocRef);
        if (docSnap.exists()) {
          const data = docSnap.data();
          setAppNameState(data.name || 'SGS Genius');
          setLogoUrlState(data.logoUrl || '');
        } else {
          // If no settings exist, use default values
          setAppNameState('SGS Genius');
          setLogoUrlState('');
        }
      } catch (error) {
        console.error('Error fetching app settings from Firestore:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchAppSettings();
  }, [firestore, user, isUserLoading]);

  const setAppName = async (name: string) => {
    if (!firestore || !user) {
      console.error('Firestore not initialized or user not logged in');
      throw new Error('Usuário não autenticado.');
    }
    const settingsDocRef = getSettingsDocRef(user.uid);
    await setDoc(settingsDocRef, { name: name }, { merge: true });
    setAppNameState(name);
  };

  const setLogoUrl = async (url: string) => {
    if (!firestore || !user) {
      console.error('Firestore not initialized or user not logged in');
      throw new Error('Usuário não autenticado.');
    }
    const settingsDocRef = getSettingsDocRef(user.uid);
    await setDoc(settingsDocRef, { logoUrl: url }, { merge: true });
    setLogoUrlState(url);
  };

  const value = {
    appName,
    setAppName,
    logoUrl,
    setLogoUrl,
    isLoading: isLoading || isUserLoading,
  };
  
  if (isLoading || isUserLoading) {
    return null; // Don't render app until settings and user are loaded
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
    throw new Error(
      'useAppSettings must be used within an AppSettingsProvider'
    );
  }
  return context;
}
