'use client';
import { useState } from 'react';
import { GeneralSettings } from '@/components/general-settings';
import { Chat } from '@/components/chat';
import { SgsConfiguration } from '@/components/sgs-configuration';
import { Sidebar, SidebarTrigger } from '@/components/ui/sidebar';
import { SidebarNav } from '@/components/sidebar-nav';
import { Card, CardHeader, CardTitle } from '@/components/ui/card';

export default function Home() {
  const [activePage, setActivePage] = useState('general-settings');

  const renderContent = () => {
    switch (activePage) {
      case 'reminders':
        return (
          <div className="w-full flex flex-col items-center gap-6">
            <div className="w-full max-w-4xl">
              <SgsConfiguration />
            </div>
            <div className="w-full max-w-4xl">
              <Chat />
            </div>
          </div>
        );
      case 'general-settings':
      default:
        return (
          <div className="w-full flex justify-center">
            <div className="w-full max-w-4xl">
              <GeneralSettings />
            </div>
          </div>
        );
    }
  };

  return (
    <div className="flex h-screen bg-background text-foreground">
      <Sidebar>
        <SidebarNav activePage={activePage} setActivePage={setActivePage} />
      </Sidebar>
      <div className="flex flex-1 flex-col">
        <header className="w-full shrink-0">
          <Card className="rounded-none border-x-0 border-t-0">
            <CardHeader>
              <CardTitle className="flex items-center gap-4 px-4 py-2 text-center text-lg md:px-6 md:text-xl">
                <SidebarTrigger className="md:hidden" />
                <span className="flex-1">Sistema de Gestão de Segurança</span>
              </CardTitle>
            </CardHeader>
          </Card>
        </header>
        <main className="overflow-y-auto p-4 md:p-6">
          {renderContent()}
        </main>
      </div>
    </div>
  );
}
