'use client'
import { SgsGeniusLogo } from '@/components/icons';
import { SidebarTrigger } from '@/components/ui/sidebar';
import { useAppSettings } from '@/context/app-settings-context';
import { Skeleton } from './ui/skeleton';

export function Header() {
  const { appName, isLoading } = useAppSettings();
  return (
    <header className="flex h-16 shrink-0 items-center border-b bg-background px-4 md:px-6">
      <div className="flex w-1/3 justify-start">
        <SidebarTrigger className="md:hidden" />
      </div>
      <div className="flex flex-1 flex-col items-center justify-center text-center">
          <h1 className="font-headline text-lg font-semibold">Sistema de Gestão de Segurança</h1>
          {isLoading ? (
             <Skeleton className="h-4 w-32 mt-1" />
          ) : (
            <p className="text-sm text-muted-foreground">{appName}</p>
          )}
      </div>
      <div className="flex w-1/3 justify-end" />
    </header>
  );
}
