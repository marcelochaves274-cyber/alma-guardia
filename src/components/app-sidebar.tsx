
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
  SidebarMenuSkeleton,
} from '@/components/ui/sidebar';
import { ListTodo, Settings, ChevronDown, LogOut, Siren, ShieldCheck, Sprout, ClipboardList, BookText, FileText, HeartPulse, Files, HardHat, Route, Megaphone, HelpCircle, KeyRound, User, Users, Info, Map } from 'lucide-react';
import { useState, useEffect } from 'react';
import { SgsGeniusLogo } from '@/components/icons';
import { useAppSettings } from '@/context/app-settings-context';
import Image from 'next/image';
import { Skeleton } from '@/components/ui/skeleton';
import { getAuth, signOut } from 'firebase/auth';
import { useFirebaseApp, useUser } from '@/firebase';
import { useRouter } from 'next/navigation';
import { useToast } from '@/hooks/use-toast';
import { useProfile } from '@/context/profile-context';

interface AppSidebarProps {
  activePage: string;
  setActivePage: (page: string) => void;
}

function SidebarSkeleton() {
    return (
        <>
            <SidebarHeader className="bg-sidebar-secondary">
                <div className="flex items-center gap-2">
                    <Skeleton className='h-6 w-6 rounded-sm' />
                    <div className="flex flex-col">
                        <Skeleton className='h-5 w-16 mb-1' />
                        <Skeleton className='h-4 w-24' />
                    </div>
                </div>
            </SidebarHeader>
            <SidebarContent>
                <SidebarMenu>
                    <SidebarMenuSkeleton showIcon />
                    <SidebarMenuSkeleton showIcon />
                    <SidebarMenuSkeleton showIcon />
                    <SidebarMenuSkeleton showIcon />
                    <SidebarMenuSkeleton showIcon />
                    <SidebarMenuSkeleton showIcon />
                    <SidebarMenuSkeleton showIcon />
                    <SidebarMenuSkeleton showIcon />
                    <SidebarMenuSkeleton showIcon />
                    <SidebarMenuSkeleton showIcon />
                </SidebarMenu>
            </SidebarContent>
            <SidebarFooter className="bg-sidebar-secondary">
                <SidebarMenu>
                    <SidebarMenuSkeleton showIcon />
                    <SidebarMenuSkeleton showIcon />
                </SidebarMenu>
            </SidebarFooter>
        </>
    )
}

export function AppSidebar({ activePage, setActivePage }: AppSidebarProps) {
  const { state } = useSidebar();
  const { appName, logoUrl, isLoading: isSettingsLoading } = useAppSettings();
  const { user } = useUser();
  const firebaseApp = useFirebaseApp();
  const router = useRouter();
  const { toast } = useToast();
  const { profile, clearProfile, isProfileLoading } = useProfile();
  
  const [openSubMenu, setOpenSubMenu] = useState<string | null>(null);

  const isAdmin = profile === 'admin';

  const toggleSubMenu = (name: string) => {
    setOpenSubMenu(prev => prev === name ? null : name);
  };
  
  const handleSignOut = async () => {
    if (!firebaseApp) return;
    const auth = getAuth(firebaseApp);
    try {
      await signOut(auth);
      clearProfile();
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
    const subMenuParents: Record<string, string> = {
      'register-occurrence': 'acidentes',
      'occurrence-report': 'acidentes',
      'map-report': 'acidentes',
      'register-treatment': 'tratamento',
      'treatment-report': 'tratamento',
      'treatment-map-report': 'tratamento',
      'register-fauna-flora-geo': 'fauna-flora-geo',
      'fauna-flora-geo-report': 'fauna-flora-geo',
      'fauna-flora-geo-map-report': 'fauna-flora-geo',
      'register-risk-assessment': 'risk-assessment',
      'risk-assessment-report': 'risk-assessment',
      'register-equipment': 'equipamentos',
      'equipment-report': 'equipamentos',
      'register-activity': 'atividades',
      'activity-report': 'atividades',
      'register-notice': 'avisos',
      'pending-notices': 'avisos',
      'general-settings': 'settings',
      'manage-profile': 'settings',
      'manage-occurrences': 'settings',
      'manage-locations': 'settings',
      'manage-map': 'settings',
      'manage-pops': 'settings',
      'manage-fauna-flora-geo': 'settings',
      'manage-equipment-and-brands': 'settings',
      'tutorial': 'informacoes',
    };

    const parentMenu = subMenuParents[page];
    if (parentMenu) {
      setOpenSubMenu(parentMenu);
    } else {
      if (!['help', 'informacoes', 'reminders'].includes(page)) {
          setOpenSubMenu(null);
      }
    }
  }

  const getProfileIcon = () => {
    if (profile === 'admin') return <User className="h-4 w-4" />;
    if (profile === 'observer') return <Users className="h-4 w-4" />;
    return null;
  }
  
  const getProfileName = () => {
    if (profile === 'admin') return 'Administrador';
    if (profile === 'observer') return 'Observador';
    return 'N/D';
  }

  if (isProfileLoading || isSettingsLoading) {
      return <SidebarSkeleton />;
  }

  return (
    <>
      <SidebarHeader className="bg-sidebar-secondary">
        <div className="flex items-center gap-2">
          {isSettingsLoading ? (
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
            <div className="flex flex-col">
              <h2 className="text-lg font-semibold leading-tight">SGS</h2>
              <span className="text-sm text-muted-foreground leading-tight">{getProfileName()}</span>
            </div>
          )}
        </div>
      </SidebarHeader>
      <SidebarContent>
        <SidebarMenu>
          {isAdmin && (
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
          )}
          <SidebarMenuItem>
            <SidebarMenuButton
              isActive={activePage === 'help'}
              onClick={() => handlePageChange('help')}
              tooltip={{
                children: 'Ajuda',
              }}
            >
              <HelpCircle />
              <span className="font-bold">Ajuda</span>
            </SidebarMenuButton>
          </SidebarMenuItem>
          {isAdmin && (
            <SidebarMenuItem>
              <SidebarMenuButton
                onClick={() => toggleSubMenu('informacoes')}
                tooltip={{
                  children: 'Informações',
                }}
              >
                <Info />
                <span className="font-bold">Informações</span>
                <ChevronDown
                  className={`ml-auto h-4 w-4 transition-transform ${
                    openSubMenu === 'informacoes' ? 'rotate-180' : ''
                  }`}
                />
              </SidebarMenuButton>
              {openSubMenu === 'informacoes' && state === 'expanded' && (
                <SidebarMenuSub>
                  <SidebarMenuSubItem>
                    <SidebarMenuSubButton 
                      isActive={activePage === 'tutorial'}
                      onClick={() => handlePageChange('tutorial')}
                    >
                      Tutorial
                    </SidebarMenuSubButton>
                  </SidebarMenuSubItem>
                </SidebarMenuSub>
              )}
            </SidebarMenuItem>
          )}
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
                {isAdmin && (
                    <>
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
                    </>
                )}
                <SidebarMenuSubItem>
                  <SidebarMenuSubButton 
                    isActive={activePage === 'map-report'}
                    onClick={() => handlePageChange('map-report')}
                  >
                    Mapa de Ocorrências
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
                 {isAdmin && (
                    <>
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
                    </>
                 )}
                <SidebarMenuSubItem>
                  <SidebarMenuSubButton 
                    isActive={activePage === 'treatment-map-report'}
                    onClick={() => handlePageChange('treatment-map-report')}
                  >
                    Mapa de Tratamentos
                  </SidebarMenuSubButton>
                </SidebarMenuSubItem>
              </SidebarMenuSub>
            )}
          </SidebarMenuItem>
          <SidebarMenuItem>
            <SidebarMenuButton
              onClick={() => toggleSubMenu('avisos')}
              tooltip={{
                children: 'Central de Avisos',
              }}
            >
              <Megaphone />
              <span className="font-bold">Central de Avisos</span>
              <ChevronDown
                className={`ml-auto h-4 w-4 transition-transform ${
                  openSubMenu === 'avisos' ? 'rotate-180' : ''
                }`}
              />
            </SidebarMenuButton>
            {openSubMenu === 'avisos' && state === 'expanded' && (
              <SidebarMenuSub>
                <SidebarMenuSubItem>
                  <SidebarMenuSubButton 
                    isActive={activePage === 'register-notice'}
                    onClick={() => handlePageChange('register-notice')}
                  >
                    Registrar Aviso
                  </SidebarMenuSubButton>
                </SidebarMenuSubItem>
                 {isAdmin && (
                    <SidebarMenuSubItem>
                        <SidebarMenuSubButton 
                            isActive={activePage === 'pending-notices'}
                            onClick={() => handlePageChange('pending-notices')}
                        >
                            Avisos Pendentes
                        </SidebarMenuSubButton>
                    </SidebarMenuSubItem>
                 )}
              </SidebarMenuSub>
            )}
          </SidebarMenuItem>
           <SidebarMenuItem>
            <SidebarMenuButton
              onClick={() => toggleSubMenu('fauna-flora-geo')}
              tooltip={{
                children: 'Fauna Flora Geo',
              }}
            >
              <Sprout />
              <span className="font-bold">Fauna Flora Geo</span>
              <ChevronDown
                className={`ml-auto h-4 w-4 transition-transform ${
                  openSubMenu === 'fauna-flora-geo' ? 'rotate-180' : ''
                }`}
              />
            </SidebarMenuButton>
            {openSubMenu === 'fauna-flora-geo' && state === 'expanded' && (
              <SidebarMenuSub>
                {isAdmin && (
                    <>
                        <SidebarMenuSubItem>
                        <SidebarMenuSubButton 
                            isActive={activePage === 'register-fauna-flora-geo'}
                            onClick={() => handlePageChange('register-fauna-flora-geo')}
                        >
                            Registrar F/F/G
                        </SidebarMenuSubButton>
                        </SidebarMenuSubItem>
                        <SidebarMenuSubItem>
                        <SidebarMenuSubButton 
                            isActive={activePage === 'fauna-flora-geo-report'}
                            onClick={() => handlePageChange('fauna-flora-geo-report')}
                        >
                            Relatório F/F/G
                        </SidebarMenuSubButton>
                        </SidebarMenuSubItem>
                    </>
                )}
                <SidebarMenuSubItem>
                  <SidebarMenuSubButton 
                    isActive={activePage === 'fauna-flora-geo-map-report'}
                    onClick={() => handlePageChange('fauna-flora-geo-map-report')}
                  >
                    Mapa Fauna, Flora & Geo
                  </SidebarMenuSubButton>
                </SidebarMenuSubItem>
              </SidebarMenuSub>
            )}
          </SidebarMenuItem>
          {isAdmin && (
            <>
                <SidebarMenuItem>
                    <SidebarMenuButton
                    onClick={() => toggleSubMenu('risk-assessment')}
                    tooltip={{
                        children: 'Avaliação de Riscos',
                    }}
                    >
                    <ClipboardList />
                    <span className="font-bold">Avaliação de Riscos</span>
                    <ChevronDown
                        className={`ml-auto h-4 w-4 transition-transform ${
                        openSubMenu === 'risk-assessment' ? 'rotate-180' : ''
                        }`}
                    />
                    </SidebarMenuButton>
                    {openSubMenu === 'risk-assessment' && state === 'expanded' && (
                    <SidebarMenuSub>
                        <SidebarMenuSubItem>
                        <SidebarMenuSubButton
                            isActive={activePage === 'register-risk-assessment'}
                            onClick={() => handlePageChange('register-risk-assessment')}
                        >
                        Registrar Avaliação
                        </SidebarMenuSubButton>
                        </SidebarMenuSubItem>
                        <SidebarMenuSubItem>
                        <SidebarMenuSubButton
                            isActive={activePage === 'risk-assessment-report'}
                            onClick={() => handlePageChange('risk-assessment-report')}
                        >
                            Relatório de Avaliação
                        </SidebarMenuSubButton>
                        </SidebarMenuSubItem>
                    </SidebarMenuSub>
                    )}
                </SidebarMenuItem>
                <SidebarMenuItem>
                    <SidebarMenuButton
                    onClick={() => toggleSubMenu('equipamentos')}
                    tooltip={{
                        children: 'Equipamentos',
                    }}
                    >
                    <HardHat />
                    <span className="font-bold">Equipamentos</span>
                    <ChevronDown
                        className={`ml-auto h-4 w-4 transition-transform ${
                        openSubMenu === 'equipamentos' ? 'rotate-180' : ''
                        }`}
                    />
                    </SidebarMenuButton>
                    {openSubMenu === 'equipamentos' && state === 'expanded' && (
                    <SidebarMenuSub>
                        <SidebarMenuSubItem>
                        <SidebarMenuSubButton
                            isActive={activePage === 'register-equipment'}
                            onClick={() => handlePageChange('register-equipment')}
                        >
                        Registrar Equipamento
                        </SidebarMenuSubButton>
                        </SidebarMenuSubItem>
                        <SidebarMenuSubItem>
                        <SidebarMenuSubButton
                            isActive={activePage === 'equipment-report'}
                            onClick={() => handlePageChange('equipment-report')}
                        >
                            Relatório Equipamentos
                        </SidebarMenuSubButton>
                        </SidebarMenuSubItem>
                    </SidebarMenuSub>
                    )}
                </SidebarMenuItem>
                <SidebarMenuItem>
                    <SidebarMenuButton
                    onClick={() => toggleSubMenu('atividades')}
                    tooltip={{
                        children: 'Atividades',
                    }}
                    >
                    <Route />
                    <span className="font-bold">Atividades</span>
                    <ChevronDown
                        className={`ml-auto h-4 w-4 transition-transform ${
                        openSubMenu === 'atividades' ? 'rotate-180' : ''
                        }`}
                    />
                    </SidebarMenuButton>
                    {openSubMenu === 'atividades' && state === 'expanded' && (
                    <SidebarMenuSub>
                        <SidebarMenuSubItem>
                        <SidebarMenuSubButton
                            isActive={activePage === 'register-activity'}
                            onClick={() => handlePageChange('register-activity')}
                        >
                        Registrar Atividade
                        </SidebarMenuSubButton>
                        </SidebarMenuSubItem>
                        <SidebarMenuSubItem>
                        <SidebarMenuSubButton
                            isActive={activePage === 'activity-report'}
                            onClick={() => handlePageChange('activity-report')}
                        >
                            Relatório de Atividade
                        </SidebarMenuSubButton>
                        </SidebarMenuSubItem>
                    </SidebarMenuSub>
                    )}
                </SidebarMenuItem>
            </>
          )}
          <SidebarMenuItem>
            <SidebarMenuButton
              isActive={activePage === 'view-pops'}
              onClick={() => handlePageChange('view-pops')}
              tooltip={{
                children: 'POP',
              }}
            >
              <BookText />
              <span className="font-bold">POP</span>
            </SidebarMenuButton>
          </SidebarMenuItem>
          <SidebarMenuItem>
            <SidebarMenuButton
              isActive={activePage === 'view-tcrs'}
              onClick={() => handlePageChange('view-tcrs')}
              tooltip={{
                children: 'TCR',
              }}
            >
              <FileText />
              <span className="font-bold">TCR</span>
            </SidebarMenuButton>
          </SidebarMenuItem>
          <SidebarMenuItem>
            <SidebarMenuButton
              isActive={activePage === 'view-rame'}
              onClick={() => handlePageChange('view-rame')}
              tooltip={{
                children: 'RAME',
              }}
            >
              <HeartPulse />
              <span className="font-bold">RAME</span>
            </SidebarMenuButton>
          </SidebarMenuItem>
          <SidebarMenuItem>
            <SidebarMenuButton
              isActive={activePage === 'view-sgs-docs'}
              onClick={() => handlePageChange('view-sgs-docs')}
              tooltip={{
                children: 'Documentos SGS',
              }}
            >
              <Files />
              <span className="font-bold">Documentos SGS</span>
            </SidebarMenuButton>
          </SidebarMenuItem>
          {isAdmin && (
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
                        Configurações Gerais
                    </SidebarMenuSubButton>
                    </SidebarMenuSubItem>
                    <SidebarMenuSubItem>
                    <SidebarMenuSubButton
                        isActive={activePage === 'manage-profile'}
                        onClick={() => handlePageChange('manage-profile')}
                    >
                        Gerenciar Perfis
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
                    <SidebarMenuSubItem>
                    <SidebarMenuSubButton
                        isActive={activePage === 'manage-pops'}
                        onClick={() => handlePageChange('manage-pops')}
                    >
                        Ger. Atividade POP TCR
                    </SidebarMenuSubButton>
                    </SidebarMenuSubItem>
                    <SidebarMenuSubItem>
                    <SidebarMenuSubButton
                        isActive={activePage === 'manage-fauna-flora-geo'}
                        onClick={() => handlePageChange('manage-fauna-flora-geo')}
                    >
                        Gerenciar Fa/Fl/Ge
                    </SidebarMenuSubButton>
                    </SidebarMenuSubItem>
                    <SidebarMenuSubItem>
                    <SidebarMenuSubButton
                        isActive={activePage === 'manage-equipment-and-brands'}
                        onClick={() => handlePageChange('manage-equipment-and-brands')}
                    >
                        Gerenciar Equip./Marca
                    </SidebarMenuSubButton>
                    </SidebarMenuSubItem>
                </SidebarMenuSub>
                )}
            </SidebarMenuItem>
          )}
        </SidebarMenu>
      </SidebarContent>
      <SidebarFooter className="bg-sidebar-secondary">
         <SidebarMenu>
            <SidebarMenuItem>
                <SidebarMenuButton onClick={() => clearProfile()} tooltip={{children: 'Trocar Perfil'}}>
                    {getProfileIcon()}
                    <span>Mudar Perfil</span>
                </SidebarMenuButton>
            </SidebarMenuItem>
            <SidebarMenuItem>
                <SidebarMenuButton onClick={handleSignOut} tooltip={{children: 'Sair'}}>
                    <LogOut />
                    <span>Sair</span>
                </SidebarMenuButton>
            </SidebarMenuItem>
        </SidebarMenu>
        {state === 'expanded' && (
          <div className="mt-2 border-t border-sidebar-border p-2 pt-3 text-center">
             {user?.email && (
                <p className="text-xs font-bold text-sidebar-foreground/70 truncate mb-1" title={user.email}>
                    {user.email}
                </p>
             )}
             <p className='text-xs text-sidebar-foreground/70'>
                Perfil: <span className='font-bold'>{getProfileName()}</span>
             </p>
          </div>
        )}
      </SidebarFooter>
    </>
  );
}
