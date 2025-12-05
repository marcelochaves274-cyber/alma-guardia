'use client';
import { useState } from 'react';
import { GeneralSettings } from '@/components/general-settings';
import { Chat } from '@/components/chat';
import { SgsConfiguration } from '@/components/sgs-configuration';
import { Sidebar, SidebarTrigger, SidebarInset } from '@/components/ui/sidebar';
import { SidebarNav } from '@/components/sidebar-nav';
import { Card, CardHeader, CardTitle } from '@/components/ui/card';
import { useAppSettings } from '@/context/app-settings-context';
import Image from 'next/image';
import { Skeleton } from '@/components/ui/skeleton';

export default function Home() {
  const [activePage, setActivePage] = useState('general-settings');
  const { logoUrl, isLoading } = useAppSettings();

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
        <header className="sticky top-0 z-10 w-full shrink-0">
          <Card className="rounded-none border-x-0 border-t-0">
            <CardHeader className="px-4 py-2 md:px-6">
              <CardTitle className="flex items-center gap-4 text-center text-lg md:text-xl">
                <SidebarTrigger />
                {isLoading ? (
                  <Skeleton className="h-6 w-6 rounded-sm" />
                ) : logoUrl ? (
                  <Image
                    src={logoUrl}
                    alt="Logo"
                    width={24}
                    height={24}
                    className="h-6 w-6 rounded-sm object-contain"
                  />
                ) : null}
                <span className="flex-1">Sistema de Gestão de Segurança</span>
              </CardTitle>
            </CardHeader>
          </Card>
        </header>
        <main className="flex flex-1 justify-center overflow-y-auto p-4 md:p-6">
          <div className="w-full max-w-4xl">
            {renderContent()}
          </div>
        </main>
      </SidebarInset>
    </div>
  );
}
