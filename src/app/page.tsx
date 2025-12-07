'use client';
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
import { useState } from 'react';

export default function Home() {
  const [activePage, setActivePage] = useState('reminders');
  const [occurrenceToEdit, setOccurrenceToEdit] = useState<any | null>(null);

  const handlePageChange = (page: string) => {
    if (page !== 'register-occurrence') {
      setOccurrenceToEdit(null);
    }
    setActivePage(page);
  };

  const handleEditOccurrence = (occurrence: any) => {
    setOccurrenceToEdit(occurrence);
    setActivePage('register-occurrence');
  }

  const renderContent = () => {
    switch (activePage) {
      case 'general-settings':
        return <GeneralSettings />;
      case 'register-occurrence':
        return <RegisterOccurrence occurrenceToEdit={occurrenceToEdit} setPage={handlePageChange} />;
      case 'occurrence-report':
        return <OccurrenceReport onEdit={handleEditOccurrence} />;
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
    <AppLayout activePage={activePage} setActivePage={handlePageChange}>
      <div className="w-full space-y-6">
        {renderContent()}
      </div>
    </AppLayout>
  );
}
