'use client';
import { SidebarTrigger } from '@/components/ui/sidebar';

export function Header() {
  return (
    <header className="flex h-16 shrink-0 items-center border-b bg-background px-4 md:px-6">
      <div className="flex w-full items-center justify-between">
        <SidebarTrigger />
        <div className="flex-1 text-center">
          <h1 className="text-lg font-semibold whitespace-nowrap">
            Sistema de Gestão de Segurança
          </h1>
        </div>
        {/* Espaçador para manter o título centralizado, combinando com a largura do trigger */}
        <div className="w-8" />
      </div>
    </header>
  );
}
