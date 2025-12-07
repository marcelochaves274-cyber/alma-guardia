'use client';
import { useState } from 'react';
import { GeneralSettings } from '@/components/general-settings';
import { Chat } from '@/components/chat';
import { SgsConfiguration } from '@/components/sgs-configuration';
import { RegisterOccurrence } from '@/components/register-occurrence';
import { ManageOccurrences } from '@/components/manage-occurrences';
import { ManageLocations } from '@/components/manage-locations';
import { ManageMap } from '@/components/manage-map';
import { OccurrenceReport } from '@/components/occurrence-report';
import { MapReport } from '@/components/map-report';
import AppLayout from './app-layout';

// This is a temporary state management. In a real app, you'd use a more robust
// solution like React Context, Redux, or Zustand.
export let activePage = 'reminders';
export let setActivePage: (page: string) => void;
export let occurrenceToEdit: any | null = null;
export let setOccurrenceToEdit: (occurrence: any | null) => void;


export default function Home() {
  const [page, setPage] = useState('reminders');
  const [editingOccurrence, setEditingOccurrence] = useState<any | null>(null);

  activePage = page;
  setActivePage = (newPage) => {
    // If we're navigating away from the edit page, clear the editing state
    if (newPage !== 'register-occurrence') {
      setEditingOccurrence(null);
    }
    setPage(newPage);
  };
  
  occurrenceToEdit = editingOccurrence;
  setOccurrenceToEdit = setEditingOccurrence;

  const renderContent = () => {
    switch (activePage) {
      case 'general-settings':
        return <GeneralSettings />;
      case 'register-occurrence':
        return <RegisterOccurrence occurrenceToEdit={editingOccurrence} />;
      case 'occurrence-report':
        return <OccurrenceReport />;
      case 'map-report':
        return <MapReport />;
      case 'manage-occurrences':
        return <ManageOccurrences />;
      case 'manage-locations':
        return <ManageLocations />;
      case 'manage-map':
        return <ManageMap />;
      case 'reminders':
      default:
        return (
          <div className="space-y-6">
            <div className="w-full">
              <SgsConfiguration />
            </div>
            <div className="w-full">
              <Chat />
            </div>
          </div>
        );
    }
  };

  return (
    <AppLayout>
      <div className="w-full space-y-6">
        {renderContent()}
      </div>
    </AppLayout>
  );
}
