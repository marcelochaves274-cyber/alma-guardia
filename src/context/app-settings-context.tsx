'use client';

import React, {
  createContext,
  useContext,
  useState,
  ReactNode,
  useEffect,
  useCallback,
} from 'react';
import { doc, getDoc, setDoc, updateDoc } from 'firebase/firestore';
import { useFirestore, useUser } from '@/firebase';
import { useToast } from '@/hooks/use-toast';

const themes = [
  {
    name: 'musgo',
    displayName: 'Musgo',
    // Base HSL values
    background: '85 30% 20%',
    foreground: '85 10% 95%',
    card: '85 30% 25%',
    popover: '85 30% 25%',
    primary: '85 30% 40%',
    secondary: '85 15% 30%',
    muted: '85 15% 30%',
    accent: '85 20% 35%',
    border: '85 15% 35%',
    input: '85 20% 85%',
    ring: '85 30% 40%',
    sidebar: '85 30% 15%',
  },
  {
    name: 'oceano',
    displayName: 'Oceano',
    background: '210 40% 20%',
    foreground: '210 10% 95%',
    card: '210 40% 25%',
    popover: '210 40% 25%',
    primary: '210 40% 50%',
    secondary: '210 25% 30%',
    muted: '210 25% 30%',
    accent: '210 30% 40%',
    border: '210 25% 40%',
    input: '210 30% 85%',
    ring: '210 40% 50%',
    sidebar: '210 40% 15%',
  },
  {
    name: 'rubi',
    displayName: 'Rubi',
    background: '350 60% 20%',
    foreground: '350 10% 95%',
    card: '350 60% 25%',
    popover: '350 60% 25%',
    primary: '350 60% 50%',
    secondary: '350 40% 30%',
    muted: '350 40% 30%',
    accent: '350 50% 40%',
    border: '350 40% 40%',
    input: '350 50% 85%',
    ring: '350 60% 50%',
    sidebar: '350 60% 15%',
  },
  {
    name: 'ambar',
    displayName: 'Âmbar',
    background: '35 80% 20%',
    foreground: '35 10% 95%',
    card: '35 80% 25%',
    popover: '35 80% 25%',
    primary: '35 80% 50%',
    secondary: '35 60% 30%',
    muted: '35 60% 30%',
    accent: '35 70% 40%',
    border: '35 60% 40%',
    input: '35 70% 85%',
    ring: '35 80% 50%',
    sidebar: '35 80% 15%',
  },
  {
    name: 'violeta',
    displayName: 'Violeta',
    background: '260 60% 25%',
    foreground: '260 10% 95%',
    card: '260 60% 30%',
    popover: '260 60% 30%',
    primary: '260 60% 60%',
    secondary: '260 40% 40%',
    muted: '260 40% 40%',
    accent: '260 50% 50%',
    border: '260 40% 50%',
    input: '260 50% 85%',
    ring: '260 60% 60%',
    sidebar: '260 60% 20%',
  },
  {
    name: 'ardosia',
    displayName: 'Ardósia',
    background: '220 15% 20%',
    foreground: '220 10% 95%',
    card: '220 15% 25%',
    popover: '220 15% 25%',
    primary: '220 15% 50%',
    secondary: '220 10% 30%',
    muted: '220 10% 30%',
    accent: '220 12% 40%',
    border: '220 10% 40%',
    input: '220 12% 85%',
    ring: '220 15% 50%',
    sidebar: '220 15% 15%',
  },
];

type Theme = (typeof themes)[0];

interface AppSettingsContextType {
  appName: string;
  setAppName: (name: string) => Promise<void>;
  logoUrl: string | null;
  setLogoUrl: (url: string | null) => void;
  isLoading: boolean;
  themes: Theme[];
  selectedTheme: Theme | null;
  setSelectedTheme: (themeName: string) => void;
  isSavingTheme: boolean;
  saveTheme: () => Promise<void>;
  isSavingLogo: boolean;
  saveLogo: () => Promise<void>;
  removeLogo: () => Promise<void>;
}

const AppSettingsContext = createContext<AppSettingsContextType | undefined>(
  undefined
);

export function AppSettingsProvider({ children }: { children: ReactNode }) {
  const [appName, setAppNameState] = useState('');
  const [logoUrl, setLogoUrl] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedTheme, setSelectedThemeState] = useState<Theme | null>(themes[0]);
  const [isSavingTheme, setIsSavingTheme] = useState(false);
  const [isSavingLogo, setIsSavingLogo] = useState(false);

  const firestore = useFirestore();
  const { user, isLoading: isUserLoading } = useUser();
  const { toast } = useToast();

  const applyTheme = useCallback((themeName: string | null) => {
    const theme = themes.find((t) => t.name === themeName) || themes[0];
    setSelectedThemeState(theme);
    const root = document.documentElement;
    if (theme) {
        root.style.setProperty('--background', theme.background);
        root.style.setProperty('--foreground', theme.foreground);
        root.style.setProperty('--card', theme.card);
        root.style.setProperty('--popover', theme.popover);
        root.style.setProperty('--primary', theme.primary);
        root.style.setProperty('--secondary', theme.secondary);
        root.style.setProperty('--muted', theme.muted);
        root.style.setProperty('--accent', theme.accent);
        root.style.setProperty('--border', theme.border);
        root.style.setProperty('--input', theme.input);
        root.style.setProperty('--ring', theme.ring);
        root.style.setProperty('--sidebar-background', theme.sidebar);
    }
  }, []);

  useEffect(() => {
    let isMounted = true;
    if (isUserLoading) return;

    if (!user || !firestore) {
      setIsLoading(false);
      applyTheme('musgo'); // Apply default theme if no user
      return;
    }

    const settingsDocRef = doc(firestore, 'users', user.uid, 'settings', 'appDetails');
    
    getDoc(settingsDocRef)
      .then((docSnap) => {
        if (isMounted) {
          if (docSnap.exists()) {
            const data = docSnap.data();
            setAppNameState(data.name || '');
            applyTheme(data.theme || 'musgo');
            setLogoUrl(data.logoUrl || null);
          } else {
             // This is the expected case for a new user. Apply defaults.
             applyTheme('musgo');
             setAppNameState('');
             setLogoUrl(null);
          }
        }
      })
      .catch((error) => {
        if (isMounted) {
            // This is the CRITICAL change. If we get a permission error, we assume it's a new user
            // and the document doesn't exist yet, which is fine. We just apply defaults and continue.
            if (error.code === 'permission-denied' || error.message.includes('insufficient permissions')) {
                console.warn("Permission denied on initial settings load. Assuming new user and applying defaults.");
                applyTheme('musgo');
                setAppNameState('');
                setLogoUrl(null);
            } else {
                // For any other error, we show the toast.
                console.error('Error fetching app settings:', error);
                toast({
                    variant: "destructive",
                    title: "Erro ao Carregar Configurações",
                    description: `Não foi possível carregar suas configurações. Causa: ${error.message}`
                });
            }
        }
      })
      .finally(() => {
        if (isMounted) {
          setIsLoading(false);
        }
      });
      
    return () => { isMounted = false; }

  }, [firestore, user, isUserLoading, toast, applyTheme]);
  
  const setAppName = async (name: string) => {
    if (!firestore || !user) {
      toast({
        variant: 'destructive',
        title: 'Erro de Autenticação',
        description: 'Você precisa estar logado para salvar.',
      });
      throw new Error('Authentication error');
    }
    await setDoc(doc(firestore, 'users', user.uid, 'settings', 'appDetails'), { name }, { merge: true });
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
    } catch (error: any) {
      console.error('Error saving theme:', error);
      toast({
        variant: 'destructive',
        title: 'Erro ao Salvar Tema',
        description: `Não foi possível salvar. Erro: ${error.message}`,
      });
    } finally {
      setIsSavingTheme(false);
    }
  }

  const saveLogo = async () => {
    if (!firestore || !user) {
      toast({
        variant: 'destructive',
        title: 'Erro de Autenticação',
        description: 'Você precisa estar logado para salvar a logo.',
      });
      return;
    }
     if (!logoUrl) {
      toast({
        variant: 'destructive',
        title: 'Nenhuma logo selecionada',
        description: 'Por favor, carregue uma imagem primeiro.',
      });
      return;
    }
    setIsSavingLogo(true);
    try {
      const settingsDocRef = doc(firestore, 'users', user.uid, 'settings', 'appDetails');
      await setDoc(settingsDocRef, { logoUrl: logoUrl }, { merge: true });
      toast({
        title: 'Sucesso!',
        description: 'A logo foi salva.',
      });
    } catch (error: any) {
      console.error('Error saving logo:', error);
      toast({
        variant: 'destructive',
        title: 'Erro ao Salvar Logo',
        description: `Não foi possível salvar. Erro: ${error.message}`,
      });
    } finally {
      setIsSavingLogo(false);
    }
  }
  
  const removeLogo = async () => {
     if (!firestore || !user) {
      toast({
        variant: 'destructive',
        title: 'Erro de Autenticação',
        description: 'Você precisa estar logado.',
      });
      return;
    }
    setIsSavingLogo(true);
    try {
      const settingsDocRef = doc(firestore, 'users', user.uid, 'settings', 'appDetails');
      await updateDoc(settingsDocRef, { logoUrl: null });
      setLogoUrl(null);
      toast({
        title: 'Logo Removida',
        description: 'A sua logo foi removida com sucesso.',
      });
    } catch (error: any) {
      console.error('Error removing logo:', error);
      toast({
        variant: 'destructive',
        title: 'Erro ao Remover Logo',
        description: `Não foi possível remover. Erro: ${error.message}`,
      });
    } finally {
      setIsSavingLogo(false);
    }
  };

  const contextValue = {
    appName,
    setAppName,
    logoUrl,
    setLogoUrl,
    isLoading: isLoading || isUserLoading,
    themes,
    selectedTheme,
    setSelectedTheme,
    isSavingTheme,
    saveTheme,
    isSavingLogo,
    saveLogo,
    removeLogo
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

    