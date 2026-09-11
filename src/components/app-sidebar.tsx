'use client';

import { SidebarContent, SidebarFooter, SidebarHeader, SidebarMenu, SidebarMenuButton, SidebarMenuItem, SidebarMenuSub, SidebarMenuSubButton, useSidebar, SidebarMenuSubItem, SidebarMenuSkeleton } from '@/components/ui/sidebar';
import { ListTodo, Settings, ChevronDown, LogOut, Siren, ShieldCheck, Sprout, ClipboardList, BookText, FileText, HeartPulse, Files, HardHat, Route, Megaphone, HelpCircle, Info, X, BarChart3, LayoutDashboard, CreditCard, User } from 'lucide-react';
import { useState, useEffect } from 'react';
import { SgsAppLogo } from '@/components/icons';
import { useAppSettings } from '@/context/app-settings-context';
import Image from 'next/image';
import { Skeleton } from '@/components/ui/skeleton';
import { signOut } from 'firebase/auth';
import { useUser, useAuth, useFirestore } from '@/firebase';
import { doc, getDoc } from 'firebase/firestore';
import { useRouter } from 'next/navigation';
import { useToast } from '@/hooks/use-toast';
import { useProfile } from '@/context/profile-context';
import { Button } from './ui/button';
import { useIsMobile } from '@/hooks/use-mobile';

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
  const { state, setOpenMobile } = useSidebar();
  const { logoUrl } = useAppSettings();
  const { user } = useUser();
  const auth = useAuth();
  const firestore = useFirestore();
 
  const router = useRouter();
  const { toast } = useToast();
  const { profile, permissions, clearProfile, isProfileLoading } = useProfile();
  const isMobile = useIsMobile();
  
  const [openSubMenu, setOpenSubMenu] = useState<string | null>(null);
  
  // Estado para guardar as permissões lidas direto do banco
  const [dynamicPermissions, setDynamicPermissions] = useState<any>(null);

  const isAdmin = profile === 'admin';

  // 1. Busca as permissões direto do Firestore (à prova de falhas)
  useEffect(() => {
    if (profile && !isAdmin && user && firestore) {
      const docRef = doc(firestore, 'sgs_genius', user.uid, 'settings', 'profiles');
      getDoc(docRef).then(snap => {
        if (snap.exists()) {
          const data = snap.data();
          const customProfile = (data.customProfiles || []).find((p: any) => p.name === profile);
          if (customProfile && customProfile.permissions) {
            setDynamicPermissions(customProfile.permissions);
          }
        }
      }).catch(err => {
        console.error("Erro ao buscar permissões:", err);
      });
    }
  }, [profile, user, firestore, isAdmin]);

  // 2. Validação refinada para menus e submenus específicos do painel
  const hasPermission = (menuId: string, subId?: string) => {
    if (isAdmin) return true;

    const activePerms = dynamicPermissions || permissions;
    if (!activePerms) return false;

    const cleanMenuId = menuId.replace(/[-_\s]/g, '').toLowerCase();

    for (const [key, value] of Object.entries(activePerms)) {
      const cleanKey = key.replace(/[-_\s]/g, '').toLowerCase();

      if (cleanKey === cleanMenuId) {
        if (!value || typeof value !== 'object') return false;

        // Se foi solicitado um subitem específico
        if (subId) {
          const subMenus = (value as any).subMenus;
          if (subMenus && typeof subMenus === 'object') {
            const cleanSubId = subId.replace(/[-_\s]/g, '').toLowerCase();
            for (const [sKey, sVal] of Object.entries(subMenus)) {
              const cleanSKey = sKey.replace(/[-_\s]/g, '').toLowerCase();
              if (cleanSKey === cleanSubId) {
                if (sVal && typeof sVal === 'object' && 'enabled' in sVal) {
                  return (sVal as any).enabled === true;
                }
                return Boolean(sVal);
              }
            }
          }
          return false; // Submenu não encontrado ou desativado
        }

        // Validação do menu principal
        if ('enabled' in value) {
          return (value as any).enabled === true;
        }
        return true;
      }
    }
    return false;
  };

  const toggleSubMenu = (name: string) => {
    setOpenSubMenu(prev => prev === name ? null : name);
  };
  
  const handleSignOut = async () => {
    if (!auth) return;
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
  };

  const getProfileIcon = () => {
    return <User className="h-4 w-4" />;
  }
  
  const getProfileName = () => {
    if (isAdmin) return 'Administrador';
    return profile || 'Perfil Personalizado';
  }

  if (isProfileLoading) {
      return <SidebarSkeleton />;
  }

  return (
    <>
      <SidebarHeader className="bg-sidebar-secondary justify-between">
        <div className="flex items-center gap-2">
          {logoUrl ? (
             <Image 
                src={logoUrl} 
                alt="Logo da empresa"
                width={24}
                height={24}
                className="rounded-sm object-contain"
             />
          ) : (
            <SgsAppLogo className="h-6 w-6 text-primary" />
          )}
          {state === 'expanded' && (
            <div className="flex flex-col">
              <h2 className="text-lg font-semibold leading-tight">ALMA Guard.ia</h2>
              <span className="text-sm text-muted-foreground leading-tight">{getProfileName()}</span>
            </div>
          )}
        </div>
         {isMobile && (
          <Button variant="ghost" size="icon" onClick={() => setOpenMobile(false)} className="h-8 w-8">
            <X className="h-5 w-5" />
            <span className="sr-only">Fechar menu</span>
          </Button>
        )}
      </SidebarHeader>

      <SidebarContent>
        <SidebarMenu>
          
          {(hasPermission('portalUsuario', 'help') || hasPermission('portalUsuario', 'tutorial') || hasPermission('portalUsuario', 'my-subscription') || hasPermission('portalUsuario')) && (
            <SidebarMenuItem>
              <SidebarMenuButton onClick={() => toggleSubMenu('portal-usuario')} tooltip={{ children: 'Portal do Usuário' }}>
                <LayoutDashboard />
                <span className="font-bold">Portal do Usuário</span>
                <ChevronDown className={`ml-auto h-4 w-4 transition-transform ${openSubMenu === 'portal-usuario' ? 'rotate-180' : ''}`} />
              </SidebarMenuButton>
              {openSubMenu === 'portal-usuario' && state === 'expanded' && (
                <SidebarMenuSub>
                  {(isAdmin || hasPermission('portalUsuario', 'help')) && (
                    <SidebarMenuSubItem>
                      <SidebarMenuSubButton isActive={activePage === 'help'} onClick={() => handlePageChange('help')}>
                        <HelpCircle className="h-4 w-4 mr-2" /> Ajuda
                      </SidebarMenuSubButton>
                    </SidebarMenuSubItem>
                  )}
                  {(isAdmin || hasPermission('portalUsuario', 'tutorial')) && (
                    <SidebarMenuSubItem>
                      <SidebarMenuSubButton isActive={activePage === 'tutorial'} onClick={() => handlePageChange('tutorial')}>
                        <Info className="h-4 w-4 mr-2" /> Tutorial
                      </SidebarMenuSubButton>
                    </SidebarMenuSubItem>
                  )}
                  {(isAdmin || hasPermission('portalUsuario', 'my-subscription')) && (
                    <SidebarMenuSubItem>
                      <SidebarMenuSubButton isActive={activePage === 'my-subscription'} onClick={() => handlePageChange('my-subscription')}>
                        <CreditCard className="h-4 w-4 mr-2" /> Minha Assinatura
                      </SidebarMenuSubButton>
                    </SidebarMenuSubItem>
                  )}
                </SidebarMenuSub>
              )}
            </SidebarMenuItem>
          )}

          {hasPermission('reminders') && (
            <SidebarMenuItem>
              <SidebarMenuButton isActive={activePage === 'reminders'} onClick={() => handlePageChange('reminders')} tooltip={{ children: 'Lembretes' }}>
                <ListTodo />
                <span className="font-bold">Lembretes</span>
              </SidebarMenuButton>
            </SidebarMenuItem>
          )}

          {hasPermission('graphics-report') && (
            <SidebarMenuItem>
              <SidebarMenuButton isActive={activePage === 'graphics-report'} onClick={() => handlePageChange('graphics-report')} tooltip={{ children: 'Gráficos' }}>
                <BarChart3 />
                <span className="font-bold">Gráficos</span>
              </SidebarMenuButton>
            </SidebarMenuItem>
          )}

          {(hasPermission('avisos', 'registerNotice') || hasPermission('avisos', 'pendingNotices') || hasPermission('avisos')) && (
            <SidebarMenuItem>
              <SidebarMenuButton onClick={() => toggleSubMenu('avisos')} tooltip={{ children: 'Central de Avisos' }}>
                <Megaphone />
                <span className="font-bold">Central de Avisos</span>
                <ChevronDown className={`ml-auto h-4 w-4 transition-transform ${openSubMenu === 'avisos' ? 'rotate-180' : ''}`} />
              </SidebarMenuButton>
              {openSubMenu === 'avisos' && state === 'expanded' && (
                <SidebarMenuSub>
                  {(isAdmin || hasPermission('avisos', 'registerNotice')) && (
                    <SidebarMenuSubItem>
                      <SidebarMenuSubButton isActive={activePage === 'register-notice'} onClick={() => handlePageChange('register-notice')}>
                        Registrar Aviso
                      </SidebarMenuSubButton>
                    </SidebarMenuSubItem>
                  )}
                  {(isAdmin || hasPermission('avisos', 'pendingNotices')) && (
                    <SidebarMenuSubItem>
                      <SidebarMenuSubButton isActive={activePage === 'pending-notices'} onClick={() => handlePageChange('pending-notices')}>
                        Avisos Pendentes
                      </SidebarMenuSubButton>
                    </SidebarMenuSubItem>
                  )}
                </SidebarMenuSub>
              )}
            </SidebarMenuItem>
          )}

          {(hasPermission('acidentes', 'registerOccurrence') || hasPermission('acidentes', 'occurrenceReport') || hasPermission('acidentes', 'mapReport') || hasPermission('acidentes') || hasPermission('ocorrencias')) && (
            <SidebarMenuItem>
              <SidebarMenuButton onClick={() => toggleSubMenu('acidentes')} tooltip={{ children: 'Acidentes/Incidentes' }}>
                <Siren />
                <span className="font-bold">Acidentes/Incidentes</span>
                <ChevronDown className={`ml-auto h-4 w-4 transition-transform ${openSubMenu === 'acidentes' ? 'rotate-180' : ''}`} />
              </SidebarMenuButton>
              {openSubMenu === 'acidentes' && state === 'expanded' && (
                <SidebarMenuSub>
                  {(isAdmin || hasPermission('acidentes', 'registerOccurrence')) && (
                    <SidebarMenuSubItem>
                      <SidebarMenuSubButton isActive={activePage === 'register-occurrence'} onClick={() => handlePageChange('register-occurrence')}>
                        Registrar Ocorrência
                      </SidebarMenuSubButton>
                    </SidebarMenuSubItem>
                  )}
                  {(isAdmin || hasPermission('acidentes', 'occurrenceReport') || hasPermission('ocorrencias')) && (
                    <SidebarMenuSubItem>
                      <SidebarMenuSubButton isActive={activePage === 'occurrence-report'} onClick={() => handlePageChange('occurrence-report')}>
                        Relatório de Ocorrência
                      </SidebarMenuSubButton>
                    </SidebarMenuSubItem>
                  )}
                  {(isAdmin || hasPermission('acidentes', 'mapReport') || hasPermission('ocorrencias')) && (
                    <SidebarMenuSubItem>
                      <SidebarMenuSubButton isActive={activePage === 'map-report'} onClick={() => handlePageChange('map-report')}>
                        Mapa de Ocorrências
                      </SidebarMenuSubButton>
                    </SidebarMenuSubItem>
                  )}
                </SidebarMenuSub>
              )}
            </SidebarMenuItem>
          )}

          {(hasPermission('tratamento', 'registerTreatment') || hasPermission('tratamento', 'treatmentReport') || hasPermission('tratamento', 'treatmentMapReport') || hasPermission('tratamento')) && (
            <SidebarMenuItem>
              <SidebarMenuButton onClick={() => toggleSubMenu('tratamento')} tooltip={{ children: 'Tratamento de Risco' }}>
                <ShieldCheck />
                <span className="font-bold">Tratamento de Risco</span>
                <ChevronDown className={`ml-auto h-4 w-4 transition-transform ${openSubMenu === 'tratamento' ? 'rotate-180' : ''}`} />
              </SidebarMenuButton>
              {openSubMenu === 'tratamento' && state === 'expanded' && (
                <SidebarMenuSub>
                  {(isAdmin || hasPermission('tratamento', 'registerTreatment')) && (
                    <SidebarMenuSubItem>
                      <SidebarMenuSubButton isActive={activePage === 'register-treatment'} onClick={() => handlePageChange('register-treatment')}>
                        Registrar Tratamento
                      </SidebarMenuSubButton>
                    </SidebarMenuSubItem>
                  )}
                  {(isAdmin || hasPermission('tratamento', 'treatmentReport')) && (
                    <SidebarMenuSubItem>
                      <SidebarMenuSubButton isActive={activePage === 'treatment-report'} onClick={() => handlePageChange('treatment-report')}>
                        Relatório de Tratamento
                      </SidebarMenuSubButton>
                    </SidebarMenuSubItem>
                  )}
                  {(isAdmin || hasPermission('tratamento', 'treatmentMapReport')) && (
                    <SidebarMenuSubItem>
                      <SidebarMenuSubButton isActive={activePage === 'treatment-map-report'} onClick={() => handlePageChange('treatment-map-report')}>
                        Mapa de Tratamentos
                      </SidebarMenuSubButton>
                    </SidebarMenuSubItem>
                  )}
                </SidebarMenuSub>
              )}
            </SidebarMenuItem>
          )}

          {(hasPermission('faunaFloraGeo', 'registerFaunaFloraGeo') || hasPermission('faunaFloraGeo', 'faunaFloraGeoReport') || hasPermission('faunaFloraGeo', 'faunaFloraGeoMapReport') || hasPermission('faunaFloraGeo')) && (
            <SidebarMenuItem>
              <SidebarMenuButton onClick={() => toggleSubMenu('fauna-flora-geo')} tooltip={{ children: 'Fauna Flora Geo' }}>
                <Sprout />
                <span className="font-bold">Fauna Flora Geo</span>
                <ChevronDown className={`ml-auto h-4 w-4 transition-transform ${openSubMenu === 'fauna-flora-geo' ? 'rotate-180' : ''}`} />
              </SidebarMenuButton>
              {openSubMenu === 'fauna-flora-geo' && state === 'expanded' && (
                <SidebarMenuSub>
                  {(isAdmin || hasPermission('faunaFloraGeo', 'registerFaunaFloraGeo')) && (
                    <SidebarMenuSubItem>
                      <SidebarMenuSubButton isActive={activePage === 'register-fauna-flora-geo'} onClick={() => handlePageChange('register-fauna-flora-geo')}>
                        Registrar F/F/G
                      </SidebarMenuSubButton>
                    </SidebarMenuSubItem>
                  )}
                  {(isAdmin || hasPermission('faunaFloraGeo', 'faunaFloraGeoReport')) && (
                    <SidebarMenuSubItem>
                      <SidebarMenuSubButton isActive={activePage === 'fauna-flora-geo-report'} onClick={() => handlePageChange('fauna-flora-geo-report')}>
                        Relatório F/F/G
                      </SidebarMenuSubButton>
                    </SidebarMenuSubItem>
                  )}
                  {(isAdmin || hasPermission('faunaFloraGeo', 'faunaFloraGeoMapReport')) && (
                    <SidebarMenuSubItem>
                      <SidebarMenuSubButton isActive={activePage === 'fauna-flora-geo-map-report'} onClick={() => handlePageChange('fauna-flora-geo-map-report')}>
                        Mapa Fauna, Flora & Geo
                      </SidebarMenuSubButton>
                    </SidebarMenuSubItem>
                  )}
                </SidebarMenuSub>
              )}
            </SidebarMenuItem>
          )}

          {(hasPermission('equipamentos', 'registerEquipment') || hasPermission('equipamentos', 'equipmentReport') || hasPermission('equipamentos')) && (
            <SidebarMenuItem>
              <SidebarMenuButton onClick={() => toggleSubMenu('equipamentos')} tooltip={{ children: 'Equipamentos' }}>
                <HardHat />
                <span className="font-bold">Equipamentos</span>
                <ChevronDown className={`ml-auto h-4 w-4 transition-transform ${openSubMenu === 'equipamentos' ? 'rotate-180' : ''}`} />
              </SidebarMenuButton>
              {openSubMenu === 'equipamentos' && state === 'expanded' && (
                <SidebarMenuSub>
                  {(isAdmin || hasPermission('equipamentos', 'registerEquipment')) && (
                    <SidebarMenuSubItem>
                      <SidebarMenuSubButton isActive={activePage === 'register-equipment'} onClick={() => handlePageChange('register-equipment')}>
                        Registrar Equipamento
                      </SidebarMenuSubButton>
                    </SidebarMenuSubItem>
                  )}
                  {(isAdmin || hasPermission('equipamentos', 'equipmentReport')) && (
                    <SidebarMenuSubItem>
                      <SidebarMenuSubButton isActive={activePage === 'equipment-report'} onClick={() => handlePageChange('equipment-report')}>
                        Relatório Equipamentos
                      </SidebarMenuSubButton>
                    </SidebarMenuSubItem>
                  )}
                </SidebarMenuSub>
              )}
            </SidebarMenuItem>
          )}

          {(hasPermission('riskAssessment', 'registerRiskAssessment') || hasPermission('riskAssessment', 'riskAssessmentReport') || hasPermission('riskAssessment')) && (
            <SidebarMenuItem>
              <SidebarMenuButton onClick={() => toggleSubMenu('risk-assessment')} tooltip={{ children: 'Avaliação de Riscos' }}>
                <ClipboardList />
                <span className="font-bold">Avaliação de Riscos</span>
                <ChevronDown className={`ml-auto h-4 w-4 transition-transform ${openSubMenu === 'risk-assessment' ? 'rotate-180' : ''}`} />
              </SidebarMenuButton>
              {openSubMenu === 'risk-assessment' && state === 'expanded' && (
                <SidebarMenuSub>
                  {(isAdmin || hasPermission('riskAssessment', 'registerRiskAssessment')) && (
                    <SidebarMenuSubItem>
                      <SidebarMenuSubButton isActive={activePage === 'register-risk-assessment'} onClick={() => handlePageChange('register-risk-assessment')}>
                        Registrar Avaliação
                      </SidebarMenuSubButton>
                    </SidebarMenuSubItem>
                  )}
                  {(isAdmin || hasPermission('riskAssessment', 'riskAssessmentReport')) && (
                    <SidebarMenuSubItem>
                      <SidebarMenuSubButton isActive={activePage === 'risk-assessment-report'} onClick={() => handlePageChange('risk-assessment-report')}>
                        Relatório de Avaliação
                      </SidebarMenuSubButton>
                    </SidebarMenuSubItem>
                  )}
                </SidebarMenuSub>
              )}
            </SidebarMenuItem>
          )}

          {(hasPermission('atividades', 'registerActivity') || hasPermission('atividades', 'activityReport') || hasPermission('atividades')) && (
            <SidebarMenuItem>
              <SidebarMenuButton onClick={() => toggleSubMenu('atividades')} tooltip={{ children: 'Atividades' }}>
                <Route />
                <span className="font-bold">Atividades</span>
                <ChevronDown className={`ml-auto h-4 w-4 transition-transform ${openSubMenu === 'atividades' ? 'rotate-180' : ''}`} />
              </SidebarMenuButton>
              {openSubMenu === 'atividades' && state === 'expanded' && (
                <SidebarMenuSub>
                  {(isAdmin || hasPermission('atividades', 'registerActivity')) && (
                    <SidebarMenuSubItem>
                      <SidebarMenuSubButton isActive={activePage === 'register-activity'} onClick={() => handlePageChange('register-activity')}>
                        Registrar Atividade
                      </SidebarMenuSubButton>
                    </SidebarMenuSubItem>
                  )}
                  {(isAdmin || hasPermission('atividades', 'activityReport')) && (
                    <SidebarMenuSubItem>
                      <SidebarMenuSubButton isActive={activePage === 'activity-report'} onClick={() => handlePageChange('activity-report')}>
                        Relatório de Atividade
                      </SidebarMenuSubButton>
                    </SidebarMenuSubItem>
                  )}
                </SidebarMenuSub>
              )}
            </SidebarMenuItem>
          )}

          {hasPermission('view-pops') && (
            <SidebarMenuItem>
              <SidebarMenuButton isActive={activePage === 'view-pops'} onClick={() => handlePageChange('view-pops')} tooltip={{ children: 'POP' }}>
                <BookText />
                <span className="font-bold">POP</span>
              </SidebarMenuButton>
            </SidebarMenuItem>
          )}

          {hasPermission('view-tcrs') && (
            <SidebarMenuItem>
              <SidebarMenuButton isActive={activePage === 'view-tcrs'} onClick={() => handlePageChange('view-tcrs')} tooltip={{ children: 'TCR' }}>
                <FileText />
                <span className="font-bold">TCR</span>
              </SidebarMenuButton>
            </SidebarMenuItem>
          )}

          {(hasPermission('rame', 'viewPe') || hasPermission('rame', 'viewPae') || hasPermission('rame', 'viewRpo') || hasPermission('rame')) && (
            <SidebarMenuItem>
              <SidebarMenuButton onClick={() => toggleSubMenu('rame')} tooltip={{ children: 'RAME' }}>
                <HeartPulse />
                <span className="font-bold">RAME</span>
                <ChevronDown className={`ml-auto h-4 w-4 transition-transform ${openSubMenu === 'rame' ? 'rotate-180' : ''}`} />
              </SidebarMenuButton>
              {openSubMenu === 'rame' && state === 'expanded' && (
                <SidebarMenuSub>
                  {(isAdmin || hasPermission('rame', 'viewPe')) && (
                    <SidebarMenuSubItem>
                      <SidebarMenuSubButton isActive={activePage === 'view-pe'} onClick={() => handlePageChange('view-pe')} className="font-semibold w-full justify-start pl-2 whitespace-normal h-auto py-2 text-left">
                        PE - Plano de Emergência
                      </SidebarMenuSubButton>
                    </SidebarMenuSubItem>
                  )}
                  {(isAdmin || hasPermission('rame', 'viewPae')) && (
                    <SidebarMenuSubItem>
                      <SidebarMenuSubButton isActive={activePage === 'view-pae'} onClick={() => handlePageChange('view-pae')} className="font-semibold w-full justify-start pl-2 whitespace-normal h-auto py-2 text-left">
                        PAE - Plano de Atendimento de Emergência
                      </SidebarMenuSubButton>
                    </SidebarMenuSubItem>
                  )}
                  {(isAdmin || hasPermission('rame', 'viewRpo')) && (
                    <SidebarMenuSubItem>
                      <SidebarMenuSubButton isActive={activePage === 'view-rpo'} onClick={() => handlePageChange('view-rpo')} className="font-semibold w-full justify-start pl-2 whitespace-normal h-auto py-2 text-left">
                        RPA - Relatório de Pronto Atendimento
                      </SidebarMenuSubButton>
                    </SidebarMenuSubItem>
                  )}
                </SidebarMenuSub>
              )}
            </SidebarMenuItem>
          )}

          {hasPermission('view-sgs-docs') && (
            <SidebarMenuItem>
              <SidebarMenuButton isActive={activePage === 'view-sgs-docs'} onClick={() => handlePageChange('view-sgs-docs')} tooltip={{ children: 'Documentos SGS' }}>
                <Files />
                <span className="font-bold">Documentos SGS</span>
              </SidebarMenuButton>
            </SidebarMenuItem>
          )}

          {(isAdmin || hasPermission('settings')) && (
            <SidebarMenuItem>
              <SidebarMenuButton onClick={() => toggleSubMenu('settings')} tooltip={{ children: 'Configurações' }}>
                <Settings />
                <span className="font-bold">Configurações</span>
                <ChevronDown className={`ml-auto h-4 w-4 transition-transform ${openSubMenu === 'settings' ? 'rotate-180' : ''}`} />
              </SidebarMenuButton>
              {openSubMenu === 'settings' && state === 'expanded' && (
                <SidebarMenuSub>
                  {isAdmin && (
                    <SidebarMenuSubItem>
                      <SidebarMenuSubButton isActive={activePage === 'general-settings'} onClick={() => handlePageChange('general-settings')}>
                        Configurações Gerais
                      </SidebarMenuSubButton>
                    </SidebarMenuSubItem>
                  )}
                  {isAdmin && (
                    <SidebarMenuSubItem>
                      <SidebarMenuSubButton isActive={activePage === 'manage-profile'} onClick={() => handlePageChange('manage-profile')}>
                        Gerenciar Perfis
                      </SidebarMenuSubButton>
                    </SidebarMenuSubItem>
                  )}
                  <SidebarMenuSubItem>
                    <SidebarMenuSubButton isActive={activePage === 'manage-occurrences'} onClick={() => handlePageChange('manage-occurrences')}>
                      Gerenciar Ocorrências
                    </SidebarMenuSubButton>
                  </SidebarMenuSubItem>
                  <SidebarMenuSubItem>
                    <SidebarMenuSubButton isActive={activePage === 'manage-locations'} onClick={() => handlePageChange('manage-locations')}>
                      Gerenciar Locais
                    </SidebarMenuSubButton>
                  </SidebarMenuSubItem>
                  <SidebarMenuSubItem>
                    <SidebarMenuSubButton isActive={activePage === 'manage-map'} onClick={() => handlePageChange('manage-map')}>
                      Gerenciar Mapa
                    </SidebarMenuSubButton>
                  </SidebarMenuSubItem>
                  <SidebarMenuSubItem>
                    <SidebarMenuSubButton isActive={activePage === 'manage-pops'} onClick={() => handlePageChange('manage-pops')}>
                      Gerenciar POPs
                    </SidebarMenuSubButton>
                  </SidebarMenuSubItem>
                  <SidebarMenuSubItem>
                    <SidebarMenuSubButton isActive={activePage === 'manage-tcrs'} onClick={() => handlePageChange('manage-tcrs')}>
                      Gerenciar TCRs
                    </SidebarMenuSubButton>
                  </SidebarMenuSubItem>
                  <SidebarMenuSubItem>
                    <SidebarMenuSubButton isActive={activePage === 'manage-fauna-flora-geo'} onClick={() => handlePageChange('manage-fauna-flora-geo')}>
                      Gerenciar Fa/Fl/Ge
                    </SidebarMenuSubButton>
                  </SidebarMenuSubItem>
                  <SidebarMenuSubItem>
                    <SidebarMenuSubButton isActive={activePage === 'manage-equipment-and-brands'} onClick={() => handlePageChange('manage-equipment-and-brands')}>
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