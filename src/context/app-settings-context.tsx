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
import { useToast } from '@/hooks/use-toast';

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
  const { toast } = useToast();

  useEffect(() => {
    // Start loading only when we start checking for a user.
    setIsLoading(true);
    
    // If the user status is still loading, we can't do anything yet.
    if (isUserLoading) {
      return; 
    }

    // If there's no user or no firestore, there's nothing to fetch. Stop loading.
    if (!user || !firestore) {
      setIsLoading(false);
      return;
    }
    
    // At this point, we have a user and firestore, so we can fetch the data.
    const settingsDocRef = doc(firestore, 'users', user.uid, 'settings', 'appDetails');
    let isMounted = true;

    getDoc(settingsDocRef)
      .then((docSnap) => {
        if (isMounted && docSnap.exists()) {
          const data = docSnap.data();
          // Use a function update to prevent stale state
          setAppNameState(data.name || 'SGS Genius');
        }
      })
      .catch((error) => {
        console.error('Error fetching app settings from Firestore:', error);
        toast({
            variant: "destructive",
            title: "Erro ao carregar configurações",
            description: "Não foi possível buscar as configurações salvas."
        })
      })
      .finally(() => {
        // This will be called regardless of success or failure.
        if (isMounted) {
          setIsLoading(false);
        }
      });
      
    return () => {
      // Cleanup to prevent state updates on an unmounted component
      isMounted = false;
    }

  }, [firestore, user, isUserLoading, toast]);

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
