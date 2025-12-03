'use client';

import {
  SidebarContent,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSub,
  SidebarMenuSubButton,
  useSidebar,
  SidebarMenuSubItem,
} from '@/components/ui/sidebar';
import { ListTodo, Settings, ChevronDown } from 'lucide-react';
import { useState } from 'react';
import { SgsGeniusLogo } from './icons';

type SidebarNavProps = {
    activePage: string;
    setActivePage: (page: string) => void;
};

export function SidebarNav({ activePage, setActivePage }: SidebarNavProps) {
  const { state } = useSidebar();
  const [openSubMenus, setOpenSubMenus] = useState<Record<string, boolean>>({
    settings: true,
  });

  const toggleSubMenu = (name: string) => {
    setOpenSubMenus((prev) => ({ ...prev, [name]: !prev[name] }));
  };

  return (
    <>
      <SidebarHeader>
        <div className="flex items-center gap-2">
          <SgsGeniusLogo className="h-6 w-6 text-primary" />
          {state === 'expanded' && (
            <h2 className="text-lg font-semibold">SGS Genius</h2>
          )}
        </div>
      </SidebarHeader>
      <SidebarContent>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton
              isActive={activePage === 'reminders'}
              onClick={() => setActivePage('reminders')}
              tooltip={{
                children: 'Lembretes',
              }}
            >
              <ListTodo />
              <span>Lembretes</span>
            </SidebarMenuButton>
          </SidebarMenuItem>
          <SidebarMenuItem>
            <SidebarMenuButton
              onClick={() => toggleSubMenu('settings')}
              tooltip={{
                children: 'Configurações',
              }}
            >
              <Settings />
              <span>Configurações</span>
              <ChevronDown
                className={`ml-auto h-4 w-4 transition-transform ${
                  openSubMenus['settings'] ? 'rotate-180' : ''
                }`}
              />
            </SidebarMenuButton>
            {openSubMenus['settings'] && state === 'expanded' && (
              <SidebarMenuSub>
                <SidebarMenuSubItem>
                  <SidebarMenuSubButton 
                    isActive={activePage === 'general-settings'}
                    onClick={() => setActivePage('general-settings')}
                  >
                    Configurações gerais
                  </SidebarMenuSubButton>
                </SidebarMenuSubItem>
              </SidebarMenuSub>
            )}
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarContent>
    </>
  );
}
