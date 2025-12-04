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
  isLoading: boolean;
}

const AppSettingsContext = createContext<AppSettingsContextType | undefined>(
  undefined
);

export function AppSettingsProvider({ children }: { children: ReactNode }) {
  const [appName, setAppNameState] = useState('SGS Genius');
  const [isLoading, setIsLoading] = useState(true);
  const firestore = useFirestore();
  const { user, isLoading: isUserLoading } = useUser();

  useEffect(() => {
    if (isUserLoading) {
      return; 
    }

    if (!user || !firestore) {
      setIsLoading(false);
      return;
    }
    
    setIsLoading(true);
    const settingsDocRef = doc(firestore, 'users', user.uid, 'settings', 'appDetails');
    let isMounted = true;

    getDoc(settingsDocRef)
      .then((docSnap) => {
        if (isMounted && docSnap.exists()) {
          const data = docSnap.data();
          setAppNameState(data.name || 'SGS Genius');
        }
      })
      .catch((error) => {
        console.error('Error fetching app settings from Firestore:', error);
      })
      .finally(() => {
        if (isMounted) {
          setIsLoading(false);
        }
      });
      
    return () => {
      isMounted = false;
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

  const contextValue = {
    appName,
    setAppName,
    isLoading: isLoading,
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
