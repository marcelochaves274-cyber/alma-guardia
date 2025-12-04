'use client'
import { SidebarTrigger } from '@/components/ui/sidebar';

export function Header() {

  return (
    <header className="flex h-16 shrink-0 items-center border-b bg-background px-4 md:px-6">
      <div className="flex w-full items-center justify-between">
        <div className="flex items-center gap-2">
          <SidebarTrigger />
        </div>
        <h1 className="font-headline text-lg font-semibold">Sistema de Gestão de Segurança</h1>
        <div className="w-1/3" />
      </div>
    </header>
  );
}
