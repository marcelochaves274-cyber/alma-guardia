'use client'
import Image from 'next/image';
import { SidebarTrigger } from '@/components/ui/sidebar';
import { useAppSettings } from '@/context/app-settings-context';
import { Skeleton } from './ui/skeleton';

export function Header() {
  const { appName, logoUrl, isLoading } = useAppSettings();
  return (
    <header className="flex h-16 shrink-0 items-center border-b bg-background px-4 md:px-6">
      <div className="flex items-center gap-2">
        <SidebarTrigger />
        {logoUrl && !isLoading && (
          <Image 
            src={logoUrl} 
            alt="Logo da empresa"
            width={32}
            height={32}
            className="rounded-sm object-contain"
          />
        )}
        <h1 className="font-headline text-lg font-semibold hidden sm:block">Sistema de Gestão de Segurança</h1>
      </div>
      <div className="flex flex-1 flex-col items-center justify-center text-center">
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
