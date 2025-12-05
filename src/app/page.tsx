'use client';
import { useState } from 'react';
import { GeneralSettings } from '@/components/general-settings';
import { Header } from '@/components/header';
import { Chat } from '@/components/chat';
import { SgsConfiguration } from '@/components/sgs-configuration';
import { Sidebar, SidebarInset } from '@/components/ui/sidebar';
import { SidebarNav } from '@/components/sidebar-nav';
import { Card, CardHeader, CardTitle } from '@/components/ui/card';

export default function Home() {
  const [activePage, setActivePage] = useState('general-settings');

  const renderContent = () => {
    switch (activePage) {
      case 'reminders':
        return (
          <div className="flex w-full flex-1 items-start overflow-hidden">
            <aside className="hidden h-full w-full max-w-xs flex-col border-l bg-background md:flex">
              <SgsConfiguration key="sgs-configuration" />
            </aside>
            <main className="flex flex-1 flex-col overflow-y-auto p-4 md:p-6">
              <Chat />
            </main>
          </div>
        );
      case 'general-settings':
      default:
        return (
          <div className="flex w-full flex-1 justify-center overflow-y-auto p-4 md:p-6">
            <GeneralSettings />
          </div>
        );
    }
  };

  return (
    <div className="flex h-screen flex-col bg-background text-foreground">
      <Header />
      <div className="flex flex-1 overflow-hidden">
        <Sidebar>
          <SidebarNav activePage={activePage} setActivePage={setActivePage} />
        </Sidebar>
        <SidebarInset>
          <div className="flex flex-col w-full h-full">
            <div className="p-4 md:px-6">
                <Card className="w-full max-w-4xl mx-auto">
                    <CardHeader>
                        <CardTitle className="text-center text-lg md:text-xl">
                            Sistema de Gestão de Segurança
                        </CardTitle>
                    </CardHeader>
                </Card>
            </div>
            {renderContent()}
          </div>
        </SidebarInset>
      </div>
    </div>
  );
}
