'use client';

import React, {
  createContext,
  useContext,
  useState,
  ReactNode,
  useEffect,
  useCallback,
} from 'react';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { useFirestore, useUser } from '@/firebase';
import { useToast } from '@/hooks/use-toast';

const themes = [
  {
    name: 'musgo',
    displayName: 'Musgo',
    primary: '85 30% 40%',
    accent: '85 20% 35%',
    background: '85 30% 20%',
  },
  {
    name: 'oceano',
    displayName: 'Oceano',
    primary: '210 40% 50%',
    accent: '210 40% 45%',
    background: '210 40% 20%',
  },
  {
    name: 'rubi',
    displayName: 'Rubi',
    primary: '350 60% 50%',
    accent: '350 60% 45%',
    background: '350 60% 20%',
  },
  {
    name: 'ambar',
    displayName: 'Âmbar',
    primary: '35 80% 50%',
    accent: '35 80% 45%',
    background: '35 80% 20%',
  },
  {
    name: 'violeta',
    displayName: 'Violeta',
    primary: '260 60% 60%',
    accent: '260 60% 55%',
    background: '260 60% 25%',
  },
  {
    name: 'ardosia',
    displayName: 'Ardósia',
    primary: '220 15% 50%',
    accent: '220 15% 45%',
    background: '220 15% 20%',
  },
];

interface AppSettingsContextType {
  appName: string;
  setAppName: (name: string) => Promise<void>;
  isLoading: boolean;
  themes: typeof themes;
  selectedTheme: (typeof themes)[0] | null;
  setSelectedTheme: (themeName: string) => void;
  isSavingTheme: boolean;
  saveTheme: () => Promise<void>;
}

const AppSettingsContext = createContext<AppSettingsContextType | undefined>(
  undefined
);

export function AppSettingsProvider({ children }: { children: ReactNode }) {
  const [appName, setAppNameState] = useState('SGS Genius');
  const [isLoading, setIsLoading] = useState(true);
  const [selectedTheme, setSelectedThemeState] = useState<(typeof themes)[0] | null>(themes[0]);
  const [isSavingTheme, setIsSavingTheme] = useState(false);

  const firestore = useFirestore();
  const { user, isLoading: isUserLoading } = useUser();
  const { toast } = useToast();

  const applyTheme = useCallback((themeName: string | null) => {
    const theme = themes.find((t) => t.name === themeName) || themes[0];
    setSelectedThemeState(theme);
    const root = document.documentElement;
    root.style.setProperty('--background', theme.background);
    root.style.setProperty('--primary', theme.primary);
    root.style.setProperty('--accent', theme.accent);
  }, []);

  useEffect(() => {
    let isMounted = true;

    if (isUserLoading) {
      return;
    }

    if (!user || !firestore) {
      setIsLoading(false);
      applyTheme('musgo'); // Apply default theme
      return;
    }

    const settingsDocRef = doc(firestore, 'users', user.uid, 'settings', 'appDetails');
    
    getDoc(settingsDocRef)
      .then((docSnap) => {
        if (isMounted) {
          if (docSnap.exists()) {
            const data = docSnap.data();
            setAppNameState(data.name || 'SGS Genius');
            applyTheme(data.theme || 'musgo');
          } else {
             applyTheme('musgo'); // Apply default if no settings exist
          }
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
        if (isMounted) {
          setIsLoading(false);
        }
      });
      
    return () => {
      isMounted = false;
    }

  }, [firestore, user, isUserLoading, toast, applyTheme]);

  const setAppName = async (name: string) => {
    if (!firestore || !user) {
      console.error('Firestore not initialized or user not logged in');
      throw new Error('Usuário não autenticado.');
    }
    const settingsDocRef = doc(firestore, 'users', user.uid, 'settings', 'appDetails');
    await setDoc(settingsDocRef, { name }, { merge: true });
    setAppNameState(name);
  };
  
  const setSelectedTheme = (themeName: string) => {
    applyTheme(themeName);
  }

  const saveTheme = async () => {
     if (!firestore || !user || !selectedTheme) {
      toast({
        variant: 'destructive',
        title: 'Erro de Autenticação',
        description: 'Você precisa estar logado para salvar um tema.',
      });
      return;
    }
    setIsSavingTheme(true);
     try {
      const settingsDocRef = doc(firestore, 'users', user.uid, 'settings', 'appDetails');
      await setDoc(settingsDocRef, { theme: selectedTheme.name }, { merge: true });
      toast({
        title: 'Sucesso!',
        description: 'O tema foi salvo.',
      });
    } catch (error) {
      console.error('Error saving theme:', error);
      toast({
        variant: 'destructive',
        title: 'Erro ao salvar',
        description:
          'Não foi possível salvar o tema. Verifique as regras de segurança do Firestore.',
      });
    } finally {
      setIsSavingTheme(false);
    }
  }


  const contextValue = {
    appName,
    setAppName,
    isLoading: isLoading,
    themes,
    selectedTheme,
    setSelectedTheme,
    isSavingTheme,
    saveTheme,
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
