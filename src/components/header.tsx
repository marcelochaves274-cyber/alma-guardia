'use client'
import { SgsGeniusLogo } from '@/components/icons';
import { SidebarTrigger } from '@/components/ui/sidebar';
import { useAppSettings } from '@/context/app-settings-context';

export function Header() {
  const { appName } = useAppSettings();
  return (
    <header className="flex h-16 shrink-0 items-center gap-4 border-b bg-background px-4 md:px-6">
      <SidebarTrigger className="md:hidden" />
      <SgsGeniusLogo className="h-6 w-6 text-primary" />
      <h1 className="font-headline text-xl font-semibold">{appName}</h1>
    </header>
  );
}
