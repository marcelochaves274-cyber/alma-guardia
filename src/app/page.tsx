
'use client'
import { Header } from '@/components/header';
import { Chat } from '@/components/chat';
import { SgsConfiguration } from '@/components/sgs-configuration';
import { Sidebar, SidebarInset } from '@/components/ui/sidebar';
import { SidebarNav } from '@/components/sidebar-nav';
import { useState } from 'react';
import { GeneralSettings } from '@/components/general-settings';

export default function Home() {
  const [activePage, setActivePage] = useState('reminders');

  const renderContent = () => {
    switch (activePage) {
      case 'general-settings':
        return <GeneralSettings />;
      case 'reminders':
      default:
        return (
            <div className="flex flex-1 overflow-hidden">
                <aside className="hidden w-full max-w-md flex-col border-r lg:flex">
                <SgsConfiguration />
                </aside>
                <main className="flex flex-1 flex-col overflow-hidden p-4 md:p-6">
                <Chat />
                </main>
            </div>
        )
    }
  };


  return (
    <div className="flex h-screen flex-col bg-background text-foreground">
      <div className="flex flex-1 overflow-hidden">
        <Sidebar>
          <SidebarNav activePage={activePage} setActivePage={setActivePage} />
        </Sidebar>
        <SidebarInset>
          <Header />
          {renderContent()}
        </SidebarInset>
      </div>
    </div>
  );
}
