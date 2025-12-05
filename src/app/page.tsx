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

export default function Home() {
  const [activePage, setActivePage] = useState('general-settings');
  const { logoUrl, appName, isLoading } = useAppSettings();

  const renderContent = () => {
    switch (activePage) {
      case 'reminders':
        return (
          <div className="w-full space-y-6">
            <div className="w-full">
              <SgsConfiguration />
            </div>
            <div className="w-full">
              <Chat />
            </div>
          </div>
        );
      case 'general-settings':
      default:
        return <GeneralSettings />;
    }
  };

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

        <main className="flex-1 overflow-y-auto p-4 md:p-6">
          <div className="mx-auto w-full max-w-4xl space-y-6">
             <h1 className="text-3xl font-bold tracking-tight text-foreground">
                {activePage === 'general-settings' ? 'Configurações Gerais' : 'Lembretes e Chat'}
            </h1>
            {renderContent()}
          </div>
        </main>
      </SidebarInset>
    </div>
  );
}
