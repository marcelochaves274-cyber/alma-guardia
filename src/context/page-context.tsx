'use client';

import React, { createContext, useContext, useState, ReactNode } from 'react';

interface PageContextType {
  activePage: string;
  setActivePage: (page: string) => void;
  occurrenceToEdit: any | null;
  setOccurrenceToEdit: (occurrence: any | null) => void;
}

const PageContext = createContext<PageContextType | undefined>(undefined);

export function PageProvider({ children }: { children: ReactNode }) {
  const [activePage, setActivePageState] = useState('reminders');
  const [occurrenceToEdit, setOccurrenceToEditState] = useState<any | null>(null);

  const setActivePage = (newPage: string) => {
    // If we're navigating away from the edit page, clear the editing state
    if (newPage !== 'register-occurrence' && newPage !== 'reminders') {
        setOccurrenceToEditState(null);
    }
    setActivePageState(newPage);
  };
  
  const setOccurrenceToEdit = (occurrence: any | null) => {
    setOccurrenceToEditState(occurrence);
  }

  const value = {
    activePage,
    setActivePage,
    occurrenceToEdit,
    setOccurrenceToEdit
  };

  return <PageContext.Provider value={value}>{children}</PageContext.Provider>;
}

export function usePage() {
  const context = useContext(PageContext);
  if (context === undefined) {
    throw new Error('usePage must be used within a PageProvider');
  }
  return context;
}
