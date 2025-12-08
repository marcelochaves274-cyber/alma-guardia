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
import { ListTodo, Settings, ChevronDown, LogOut, Siren, ShieldCheck } from 'lucide-react';
import { useState } from 'react';
import { SgsGeniusLogo } from '@/components/icons';
import { useAppSettings } from '@/context/app-settings-context';
import Image from 'next/image';
import { Skeleton } from '@/components/ui/skeleton';
import { getAuth, signOut } from 'firebase/auth';
import { useFirebaseApp, useUser } from '@/firebase';
import { useRouter } from 'next/navigation';
import { useToast } from '@/hooks/use-toast';

interface AppSidebarProps {
  activePage: string;
  setActivePage: (page: string) => void;
}

export function AppSidebar({ activePage, setActivePage }: AppSidebarProps) {
  const { state } = useSidebar();
  const { appName, logoUrl, isLoading } = useAppSettings();
  const { user } = useUser();
  const firebaseApp = useFirebaseApp();
  const router = useRouter();
  const { toast } = useToast();

  const [openSubMenu, setOpenSubMenu] = useState<string | null>('reminders');

  const toggleSubMenu = (name: string) => {
    setOpenSubMenu(prev => prev === name ? null : name);
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
  
  const handlePageChange = (page: string) => {
    setActivePage(page);
    // This logic ensures the correct parent menu is open when a sub-item is clicked.
    const subMenuParents: Record<string, string> = {
      'register-occurrence': 'acidentes',
      'occurrence-report': 'acidentes',
      'map-report': 'acidentes',
      'register-treatment': 'tratamento',
      'treatment-report': 'tratamento',
      'treatment-map-report': 'tratamento',
      'general-settings': 'settings',
      'manage-occurrences': 'settings',
      'manage-locations': 'settings',
      'manage-map': 'settings'
    };

    const parentMenu = subMenuParents[page];
    if (parentMenu) {
      setOpenSubMenu(parentMenu);
    } else {
      setOpenSubMenu(null);
    }
  }

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
              onClick={() => handlePageChange('reminders')}
              tooltip={{
                children: 'Lembretes',
              }}
            >
              <ListTodo />
              <span className="font-bold">Lembretes</span>
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
              <span className="font-bold">Acidentes/Incidentes</span>
              <ChevronDown
                className={`ml-auto h-4 w-4 transition-transform ${
                  openSubMenu === 'acidentes' ? 'rotate-180' : ''
                }`}
              />
            </SidebarMenuButton>
            {openSubMenu === 'acidentes' && state === 'expanded' && (
              <SidebarMenuSub>
                <SidebarMenuSubItem>
                  <SidebarMenuSubButton 
                    isActive={activePage === 'register-occurrence'}
                    onClick={() => handlePageChange('register-occurrence')}
                  >
                    Registrar Ocorrência
                  </SidebarMenuSubButton>
                </SidebarMenuSubItem>
                <SidebarMenuSubItem>
                  <SidebarMenuSubButton 
                    isActive={activePage === 'occurrence-report'}
                    onClick={() => handlePageChange('occurrence-report')}
                  >
                    Relatório de Ocorrência
                  </SidebarMenuSubButton>
                </SidebarMenuSubItem>
                <SidebarMenuSubItem>
                  <SidebarMenuSubButton 
                    isActive={active_page === 'map-report'}
                    onClick={() => handlePageChange('map-report')}
                  >
                    Relatório de Mapa
                  </SidebarMenuSubButton>
                </SidebarMenuSubItem>
              </SidebarMenuSub>
            )}
          </SidebarMenuItem>
           <SidebarMenuItem>
            <SidebarMenuButton
              onClick={() => toggleSubMenu('tratamento')}
              tooltip={{
                children: 'Tratamento de Risco',
              }}
            >
              <ShieldCheck />
              <span className="font-bold">Tratamento de Risco</span>
              <ChevronDown
                className={`ml-auto h-4 w-4 transition-transform ${
                  openSubMenu === 'tratamento' ? 'rotate-180' : ''
                }`}
              />
            </SidebarMenuButton>
            {openSubMenu === 'tratamento' && state === 'expanded' && (
              <SidebarMenuSub>
                <SidebarMenuSubItem>
                  <SidebarMenuSubButton 
                    isActive={activePage === 'register-treatment'}
                    onClick={() => handlePageChange('register-treatment')}
                  >
                    Registrar Tratamento
                  </SidebarMenuSubButton>
                </SidebarMenuSubItem>
                <SidebarMenuSubItem>
                  <SidebarMenuSubButton 
                    isActive={activePage === 'treatment-report'}
                    onClick={() => handlePageChange('treatment-report')}
                  >
                    Relatório de Tratamento
                  </SidebarMenuSubButton>
                </SidebarMenuSubItem>
                <SidebarMenuSubItem>
                  <SidebarMenuSubButton 
                    isActive={activePage === 'treatment-map-report'}
                    onClick={() => handlePageChange('treatment-map-report')}
                  >
                    Relatório de Mapa
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
              <span className="font-bold">Configurações</span>
              <ChevronDown
                className={`ml-auto h-4 w-4 transition-transform ${
                  openSubMenu === 'settings' ? 'rotate-180' : ''
                }`}
              />
            </SidebarMenuButton>
            {openSubMenu === 'settings' && state === 'expanded' && (
              <SidebarMenuSub>
                <SidebarMenuSubItem>
                  <SidebarMenuSubButton 
                    isActive={activePage === 'general-settings'}
                    onClick={() => handlePageChange('general-settings')}
                  >
                    Configurações gerais
                  </SidebarMenuSubButton>
                </SidebarMenuSubItem>
                <SidebarMenuSubItem>
                  <SidebarMenuSubButton
                    isActive={activePage === 'manage-occurrences'}
                    onClick={() => handlePageChange('manage-occurrences')}
                  >
                    Gerenciar Ocorrências
                  </SidebarMenuSubButton>
                </SidebarMenuSubItem>
                 <SidebarMenuSubItem>
                  <SidebarMenuSubButton
                    isActive={activePage === 'manage-locations'}
                    onClick={() => handlePageChange('manage-locations')}
                  >
                    Gerenciar Locais
                  </SidebarMenuSubButton>
                </SidebarMenuSubItem>
                 <SidebarMenuSubItem>
                  <SidebarMenuSubButton
                    isActive={activePage === 'manage-map'}
                    onClick={() => handlePageChange('manage-map')}
                  >
                    Gerenciar Mapa
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
