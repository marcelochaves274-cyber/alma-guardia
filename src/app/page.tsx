'use client';
import { useState } from 'react';
import { GeneralSettings } from '@/components/general-settings';
import { Chat } from '@/components/chat';
import { SgsConfiguration } from '@/components/sgs-configuration';
import { Sidebar, SidebarInset, SidebarTrigger } from '@/components/ui/sidebar';
import { SidebarNav } from '@/components/sidebar-nav';
import { Card, CardHeader, CardTitle } from '@/components/ui/card';

export default function Home() {
  const [activePage, setActivePage] = useState('general-settings');

  const renderContent = () => {
    switch (activePage) {
      case 'reminders':
        return (
          <div className="w-full flex-1 flex flex-col items-center gap-6 overflow-y-auto p-4 md:p-6">
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
          <div className="w-full flex-1 overflow-y-auto p-4 md:p-6">
            <GeneralSettings />
          </div>
        );
    }
  };

  return (
    <div className="flex h-screen bg-background text-foreground">
      <Sidebar>
        <SidebarNav activePage={activePage} setActivePage={setActivePage} />
      </Sidebar>
      <SidebarInset>
        <div className="flex flex-col w-full h-full">
          <div className="w-full">
              <Card className='rounded-none border-x-0 border-t-0'>
                  <CardHeader>
                      <CardTitle className="flex items-center gap-4 text-center text-lg md:text-xl px-4 md:px-6">
                          <SidebarTrigger className='md:hidden' />
                          <span className='flex-1'>Sistema de Gestão de Segurança</span>
                      </CardTitle>
                  </CardHeader>
              </Card>
          </div>
          {renderContent()}
        </div>
      </SidebarInset>
    </div>
  );
}
