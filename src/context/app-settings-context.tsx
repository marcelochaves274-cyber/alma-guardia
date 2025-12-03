'use client';

import React, { createContext, useContext, useState, ReactNode, useEffect } from 'react';

interface AppSettingsContextType {
  appName: string;
  setAppName: (name: string) => void;
}

const AppSettingsContext = createContext<AppSettingsContextType | undefined>(undefined);

export function AppSettingsProvider({ children }: { children: ReactNode }) {
  const [appName, setAppNameState] = useState('SGS Genius');
  const [isInitialized, setIsInitialized] = useState(false);

  useEffect(() => {
    const storedAppName = localStorage.getItem('appName');
    if (storedAppName) {
      setAppNameState(storedAppName);
    }
    setIsInitialized(true);
  }, []);

  const setAppName = (name: string) => {
    localStorage.setItem('appName', name);
    setAppNameState(name);
  };

  const value = {
    appName,
    setAppName,
  };
  
  if (!isInitialized) {
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
