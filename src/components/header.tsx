'use client';
import { SidebarTrigger } from '@/components/ui/sidebar';

export function Header() {
  return (
    <header className="flex h-16 shrink-0 items-center justify-between border-b bg-background px-4 md:px-6">
      <SidebarTrigger />
      <h1 className="text-lg font-semibold whitespace-nowrap">
        Sistema de Gestão de Segurança
      </h1>
      {/* Espaçador para manter o título perfeitamente centralizado */}
      <div className="w-8" />
    </header>
  );
}
