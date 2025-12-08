'use client';

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';

interface HelpContextType {
  helpEnabled: boolean;
  setHelpEnabled: (enabled: boolean) => void;
}

const HelpContext = createContext<HelpContextType | undefined>(undefined);

export function HelpProvider({ children }: { children: ReactNode }) {
  const [helpEnabled, setHelpEnabledState] = useState(false);

  useEffect(() => {
    // On initial load, try to get the preference from localStorage
    const savedState = localStorage.getItem('sgsHelpEnabled');
    if (savedState !== null) {
      setHelpEnabledState(JSON.parse(savedState));
    }
  }, []);

  const setHelpEnabled = (enabled: boolean) => {
    // Update state and save to localStorage
    setHelpEnabledState(enabled);
    localStorage.setItem('sgsHelpEnabled', JSON.stringify(enabled));
  };

  const contextValue = {
    helpEnabled,
    setHelpEnabled,
  };

  return <HelpContext.Provider value={contextValue}>{children}</HelpContext.Provider>;
}

export function useHelp() {
  const context = useContext(HelpContext);
  if (context === undefined) {
    throw new Error('useHelp must be used within a HelpProvider');
  }
  return context;
}
