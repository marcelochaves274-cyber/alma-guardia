'use client';
import { useState } from 'react';
import { GeneralSettings } from '@/components/general-settings';
import { Chat } from '@/components/chat';
import { SgsConfiguration } from '@/components/sgs-configuration';
import { Sidebar, SidebarTrigger, SidebarInset } from '@/components/ui/sidebar';
import { SidebarNav } from '@/components/sidebar-nav';
import { useAppSettings } from '@/context/app-settings-context';
import Image from 'next/image';
import { Skeleton } from '@/components/ui/skeleton';
import { RegisterOccurrence } from '@/components/register-occurrence';
import { ManageOccurrences } from '@/components/manage-occurrences';

export default function Home() {
  const [activePage, setActivePage] = useState('general-settings');
  const { logoUrl, appName, isLoading } = useAppSettings();

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
  
  const getPageTitle = () => {
    switch (activePage) {
      case 'reminders':
        return 'Lembretes e Chat';
      case 'register-occurrence':
        return 'Registrar Ocorrência de Acidente/Incidente';
      case 'manage-occurrences':
        return 'Gerenciar Ocorrências';
      case 'general-settings':
      default:
        return 'Configurações Gerais';
    }
  }

  return (
    <div className="flex h-screen bg-background text-foreground">
      <Sidebar>
        <SidebarNav activePage={activePage} setActivePage={setActivePage} />
      </Sidebar>

      <SidebarInset className="flex flex-col">
        <header className="relative flex h-20 items-center justify-center border-b bg-card px-4 md:px-6">
          <div className="absolute left-4 flex items-center gap-4">
            <SidebarTrigger />
          </div>
          <div className="flex items-center gap-4">
            {isLoading ? (
              <Skeleton className="h-10 w-10 rounded-md" />
            ) : logoUrl ? (
              <Image
                src={logoUrl}
                alt="Logo"
                width={40}
                height={40}
                className="rounded-md object-contain"
              />
            ) : null}
            <div className="flex flex-col items-center justify-center">
              <span className="text-xl font-bold text-foreground">
                Sistema de Gestão de Segurança
              </span>
              {!isLoading && appName && (
                <span className="text-lg font-bold text-muted-foreground">
                  {appName}
                </span>
              )}
            </div>
          </div>
        </header>

        <main className="flex-1 overflow-y-auto">
          <div className="space-y-6 p-4 md:p-6">
             <h1 className="text-3xl font-bold tracking-tight text-foreground">
                {getPageTitle()}
            </h1>
            {renderContent()}
          </div>
        </main>
      </SidebarInset>
    </div>
  );
}
