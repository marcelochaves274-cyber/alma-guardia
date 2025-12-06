'use client';
import { useState } from 'react';
import { GeneralSettings } from '@/components/general-settings';
import { Chat } from '@/components/chat';
import { SgsConfiguration } from '@/components/sgs-configuration';
import { RegisterOccurrence } from '@/components/register-occurrence';
import { ManageOccurrences } from '@/components/manage-occurrences';
import AppLayout from './app-layout';

// This is a temporary state management. In a real app, you'd use a more robust
// solution like React Context, Redux, or Zustand.
export let activePage = 'general-settings';
export let setActivePage: (page: string) => void;


export default function Home() {
  const [page, setPage] = useState('general-settings');
  activePage = page;
  setActivePage = setPage;

  const renderContent = () => {
    switch (activePage) {
      case 'reminders':
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
      case 'register-occurrence':
        return <RegisterOccurrence />;
      case 'manage-occurrences':
        return <ManageOccurrences />;
      case 'general-settings':
      default:
        return <GeneralSettings />;
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
