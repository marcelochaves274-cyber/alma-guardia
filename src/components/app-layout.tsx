'use client';
import { useState } from 'react';
import Image from 'next/image';

import { GeneralSettings } from '@/components/general-settings';
import { Chat } from '@/components/chat';
import { SgsConfiguration } from '@/components/sgs-configuration';
import { RegisterOccurrence } from '@/components/register-occurrence';
import { ManageOccurrences } from '@/components/manage-occurrences';
import { ManageLocations } from '@/components/manage-locations';
import { ManageMap } from '@/components/manage-map';
import { OccurrenceReport } from '@/components/occurrence-report';
import { MapReport } from '@/components/map-report';
import { AppSidebar } from '@/app/app-sidebar';

import { useAppSettings } from '@/context/app-settings-context';
import {
  Sidebar,
  SidebarInset,
  SidebarTrigger,
  SidebarProvider
} from '@/components/ui/sidebar';

export function AppLayout() {
  const [activePage, setActivePage] = useState('reminders');
  const [occurrenceToEdit, setOccurrenceToEdit] = useState<any | null>(null);
  const { appName, logoUrl } = useAppSettings();

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
    <AppSettingsProvider>
      <SidebarProvider>
        <Sidebar>
          <AppSidebar activePage={activePage} setActivePage={handlePageChange} />
        </Sidebar>
        <SidebarInset>
          <div className="flex flex-col h-screen">
            <header className="sticky top-0 z-10 flex h-20 items-center justify-center border-b bg-card px-4 shadow-sm md:px-6">
              <div className="absolute left-4 flex items-center gap-4">
                <SidebarTrigger />
              </div>
              <div className="flex items-center gap-4">
                {logoUrl && (
                  <Image
                    src={logoUrl}
                    alt="Logo"
                    width={40}
                    height={40}
                    className="rounded-md object-contain"
                  />
                )}
                <div className="flex flex-col items-center justify-center">
                  <span className="font-bold text-xl text-foreground">
                    Sistema de Gestão de Segurança
                  </span>
                  {appName && (
                    <span className="font-bold text-lg text-muted-foreground">
                      {appName}
                    </span>
                  )}
                </div>
              </div>
            </header>
            <main className="flex-1 overflow-y-auto p-4 md:p-6 lg:p-8">
               <div className="w-full space-y-6">
                {renderContent()}
              </div>
            </main>
          </div>
        </SidebarInset>
      </SidebarProvider>
    </AppSettingsProvider>
  );
}
