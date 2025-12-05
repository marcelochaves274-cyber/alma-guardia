'use client';
import { SidebarTrigger } from '@/components/ui/sidebar';

export function Header() {
  return (
    <header className="flex h-16 shrink-0 items-center border-b bg-background px-4 md:px-6">
      <SidebarTrigger />
    </header>
  );
}
