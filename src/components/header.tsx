'use client';
import { SidebarTrigger } from '@/components/ui/sidebar';

export function Header() {
  // Este componente não está mais em uso na página principal,
  // mas é mantido para referência futura ou outras páginas.
  return (
    <header className="flex h-16 shrink-0 items-center border-b bg-background px-4 md:px-6">
      <SidebarTrigger />
    </header>
  );
}
