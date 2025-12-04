'use client'
import { Header } from '@/components/header';
import { Chat } from '@/components/chat';
import { SgsConfiguration } from '@/components/sgs-configuration';
import { Sidebar, SidebarInset } from '@/components/ui/sidebar';
import { SidebarNav } from '@/components/sidebar-nav';
import { useState } from 'react';
import { GeneralSettings } from '@/components/general-settings';
import { useUser } from '@/firebase';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

export default function Home() {
  const { user, isLoading } = useUser();
  const router = useRouter();
  const [activePage, setActivePage] = useState('general-settings');

  useEffect(() => {
    if (!isLoading && !user) {
      router.push('/login');
    }
  }, [user, isLoading, router]);

  if (isLoading) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-background">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  if (!user) {
    return null;
  }

  const renderContent = () => {
    switch (activePage) {
      case 'reminders':
        return (
            <div className="flex flex-1 overflow-hidden">
                <aside className="hidden w-full max-w-md flex-col border-r lg:flex">
                <SgsConfiguration />
                </aside>
                <main className="flex flex-1 flex-col overflow-hidden p-4 md:p-6">
                <Chat />
                </main>
            </div>
        );
      case 'general-settings':
      default:
        return <GeneralSettings />;
    }
  };


  return (
    <div className="flex h-screen flex-col bg-background text-foreground">
      <Header />
      <div className="flex flex-1 overflow-y-auto">
        <Sidebar>
          <SidebarNav activePage={activePage} setActivePage={setActivePage} />
        </Sidebar>
        <SidebarInset>
          <div className="w-full p-4 md:p-6">
            {renderContent()}
          </div>
        </SidebarInset>
      </div>
    </div>
  );
}
