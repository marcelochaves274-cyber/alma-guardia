
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
  const [activePage, setActivePage] = useState('reminders');

  useEffect(() => {
    // If auth state is not loading and there's no user, redirect to login
    if (!isLoading && !user) {
      router.push('/login');
    }
  }, [user, isLoading, router]);

  // Primary loading indicator for the initial auth check.
  if (isLoading) {
    return (
      <div className="flex h-screen w-full items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  // If loading is finished and there's still no user, we'll be redirected,
  // so rendering null prevents a flash of content.
  if (!user) {
    return null;
  }


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
