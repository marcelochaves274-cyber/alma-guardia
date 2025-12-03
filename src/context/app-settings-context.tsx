'use client';

import React, { createContext, useContext, useState, ReactNode } from 'react';

interface AppSettingsContextType {
  appName: string;
  setAppName: (name: string) => void;
}

const AppSettingsContext = createContext<AppSettingsContextType | undefined>(undefined);

export function AppSettingsProvider({ children }: { children: ReactNode }) {
  const [appName, setAppName] = useState('SGS Genius');

  const value = {
    appName,
    setAppName,
  };

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
