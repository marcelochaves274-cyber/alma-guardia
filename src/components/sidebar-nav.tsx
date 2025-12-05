'use client';

import {
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSub,
  SidebarMenuSubButton,
  useSidebar,
  SidebarMenuSubItem,
} from '@/components/ui/sidebar';
import { ListTodo, Settings, ChevronDown, LogOut, Siren } from 'lucide-react';
import { useState } from 'react';
import { SgsGeniusLogo } from './icons';
import { useAppSettings } from '@/context/app-settings-context';
import Image from 'next/image';
import { Skeleton } from './ui/skeleton';
import { getAuth, signOut } from 'firebase/auth';
import { useFirebaseApp, useUser } from '@/firebase';
import { useRouter } from 'next/navigation';
import { useToast } from '@/hooks/use-toast';

type SidebarNavProps = {
    activePage: string;
    setActivePage: (page: string) => void;
};

export function SidebarNav({ activePage, setActivePage }: SidebarNavProps) {
  const { state } = useSidebar();
  const { appName, logoUrl, isLoading } = useAppSettings();
  const { user } = useUser();
  const firebaseApp = useFirebaseApp();
  const router = useRouter();
  const { toast } = useToast();

  const [openSubMenus, setOpenSubMenus] = useState<Record<string, boolean>>({
    settings: true,
    acidentes: true,
  });

  const toggleSubMenu = (name: string) => {
    setOpenSubMenus((prev) => ({ ...prev, [name]: !prev[name] }));
  };
  
  const handleSignOut = async () => {
    if (!firebaseApp) return;
    const auth = getAuth(firebaseApp);
    try {
      await signOut(auth);
      router.push('/login');
      toast({
        title: 'Logout realizado',
        description: 'Você foi desconectado com sucesso.',
      })
    } catch (error) {
      console.error('Error signing out:', error);
      toast({
        variant: 'destructive',
        title: 'Erro',
        description: 'Não foi possível fazer logout.',
      })
    }
  };

  return (
    <>
      <SidebarHeader>
        <div className="flex items-center gap-2">
          {isLoading ? (
            <Skeleton className='h-6 w-6 rounded-sm' />
          ) : logoUrl ? (
             <Image 
                src={logoUrl} 
                alt="Logo da empresa"
                width={24}
                height={24}
                className="rounded-sm object-contain"
              />
          ) : (
            <SgsGeniusLogo className="h-6 w-6 text-primary" />
          )}
          {state === 'expanded' && (
            <h2 className="text-lg font-semibold truncate" title={appName}>{appName}</h2>
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
              onClick={() => toggleSubMenu('acidentes')}
              tooltip={{
                children: 'Acidentes/Incidentes',
              }}
            >
              <Siren />
              <span>Acidentes/Incidentes</span>
              <ChevronDown
                className={`ml-auto h-4 w-4 transition-transform ${
                  openSubMenus['acidentes'] ? 'rotate-180' : ''
                }`}
              />
            </SidebarMenuButton>
            {openSubMenus['acidentes'] && state === 'expanded' && (
              <SidebarMenuSub>
                <SidebarMenuSubItem>
                  <SidebarMenuSubButton 
                    isActive={activePage === 'register-occurrence'}
                    onClick={() => setActivePage('register-occurrence')}
                  >
                    Registrar Ocorrência
                  </SidebarMenuSubButton>
                </SidebarMenuSubItem>
                <SidebarMenuSubItem>
                  <SidebarMenuSubButton 
                    isActive={activePage === 'occurrence-report'}
                    onClick={() => setActivePage('occurrence-report')}
                  >
                    Relatório de Ocorrência
                  </SidebarMenuSubButton>
                </SidebarMenuSubItem>
              </SidebarMenuSub>
            )}
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
      <SidebarFooter>
        <SidebarMenu>
            <SidebarMenuItem>
                <SidebarMenuButton onClick={handleSignOut} tooltip={{children: 'Sair'}}>
                    <LogOut />
                    <span>Sair</span>
                </SidebarMenuButton>
            </SidebarMenuItem>
        </SidebarMenu>
        {state === 'expanded' && user?.email && (
          <div className="mt-2 border-t border-sidebar-border p-2 pt-3 text-center">
            <p className="text-xs font-bold text-sidebar-foreground/70 truncate" title={user.email}>
                {user.email}
            </p>
          </div>
        )}
      </SidebarFooter>
    </>
  );
}
