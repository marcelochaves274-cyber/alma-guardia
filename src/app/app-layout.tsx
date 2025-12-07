'use client';

import type { ReactNode } from 'react';
import Image from 'next/image';
import {
  Sidebar,
  SidebarInset,
  SidebarTrigger,
} from '@/components/ui/sidebar';
import { AppSidebar } from './app-sidebar';
import { useUser } from '@/firebase';
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAppSettings } from '@/context/app-settings-context';

function Loader2(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg
      {...props}
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M21 12a9 9 0 1 1-6.219-8.56" />
    </svg>
  );
}

interface AppLayoutProps {
  children: ReactNode;
  activePage: string;
  setActivePage: (page: string) => void;
}

export default function AppLayout({ children, activePage, setActivePage }: AppLayoutProps) {
  const { user, isLoading: isAuthLoading } = useUser();
  const { appName, logoUrl, isLoading: isSettingsLoading } = useAppSettings();
  const router = useRouter();
  
  const isLoading = isAuthLoading || isSettingsLoading;
  
  useEffect(() => {
    if (!isLoading && !user) {
      router.push('/login');
    }
  }, [user, isLoading, router]);

  if (isLoading || !user) {
    return (
      <div className="flex h-screen w-screen items-center justify-center bg-background">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <>
      <Sidebar>
        <AppSidebar activePage={activePage} setActivePage={setActivePage} />
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
            {children}
          </main>
        </div>
      </SidebarInset>
    </>
  );
}
