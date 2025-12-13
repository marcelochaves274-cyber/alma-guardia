'use client';
import { useState, useEffect } from 'react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { useUser } from '@/firebase';
import { useAppSettings } from '@/context/app-settings-context';

import { GeneralSettings } from '@/components/general-settings';
import { ManageProfile } from '@/components/manage-profile';
import { RegisterOccurrence } from '@/components/register-occurrence';
import { ManageOccurrences } from '@/components/manage-occurrences';
import { ManageLocations } from '@/components/manage-locations';
import { ManageMap } from '@/components/manage-map';
import { OccurrenceReport } from '@/components/occurrence-report';
import { MapReport } from '@/components/map-report';
import { AppSidebar } from '@/components/app-sidebar';
import { RegisterTreatment } from '@/components/register-treatment';
import { TreatmentReport } from '@/components/treatment-report';
import { TreatmentMapReport } from '@/components/treatment-map-report';
import { ManageFaunaFloraGeo } from '@/components/manage-fauna-flora-geo';
import { RegisterFaunaFloraGeo } from '@/components/register-fauna-flora-geo';
import { FaunaFloraGeoReport } from '@/components/fauna-flora-geo-report';
import { FaunaFloraGeoMapReport } from '@/components/fauna-flora-geo-map-report';
import { RegisterRiskAssessment } from './register-risk-assessment';
import { RiskAssessmentReport } from './risk-assessment-report';
import { ManagePops } from './manage-pops';
import { ViewPops } from './view-pops';
import { ViewTcrs } from './view-tcrs';
import { ViewRame } from './view-rame';
import { ViewSgsDocs } from './view-sgs-docs';
import { RegisterEquipment } from './register-equipment';
import { ManageEquipmentAndBrands } from './manage-equipment-and-brands';
import { EquipmentReport } from './equipment-report';
import { RegisterActivity } from './register-activity';
import { ActivityReport } from './activity-report';
import { Reminders } from './reminders';
import { RegisterNotice } from './register-notice';
import { PendingNotices } from './pending-notices';
import { HelpPage } from './help-page';
import { ProfileSelector } from './profile-selector';
import { useProfile } from '@/context/profile-context';
import { TutorialPage } from './tutorial-page';


import {
  Sidebar,
  SidebarInset,
  SidebarTrigger,
  SidebarProvider
} from '@/components/ui/sidebar';
import { Loader2 } from 'lucide-react';
import { ScrollArea } from './ui/scroll-area';

function Loader() {
  return (
    <div className="flex h-screen w-screen flex-col items-center justify-center gap-4 bg-background text-foreground">
      <Loader2 className="h-12 w-12 animate-spin text-primary" />
      <p className="text-muted-foreground">Aguarde, carregando...</p>
    </div>
  );
}

type ReportFilters = {
  treatmentReport?: {
    situations: string[];
  };
  equipmentReport?: {
    status: 'overdue';
  };
}

function MainAppLayout() {
  const { user } = useUser();
  const { profile, isProfileLoading } = useProfile();
  const router = useRouter();

  const getDefaultPageForProfile = (profile: string | null) => {
    if (profile === 'observer') {
      return 'register-notice';
    }
    return 'reminders';
  };

  const [activePage, setActivePage] = useState(getDefaultPageForProfile(profile));
  const [reportFilters, setReportFilters] = useState<ReportFilters | null>(null);
  const [prefillData, setPrefillData] = useState<any | null>(null);

  const [occurrenceToEdit, setOccurrenceToEdit] = useState<any | null>(null);
  const [treatmentToEdit, setTreatmentToEdit] = useState<any | null>(null);
  const [faunaFloraGeoToEdit, setFaunaFloraGeoToEdit] = useState<any | null>(null);
  const [assessmentToEdit, setAssessmentToEdit] = useState<any | null>(null);
  const [equipmentToEdit, setEquipmentToEdit] = useState<any | null>(null);
  const [activityToEdit, setActivityToEdit] = useState<any | null>(null);
  const [noticeToEdit, setNoticeToEdit] = useState<any | null>(null);
  const { appName, logoUrl } = useAppSettings();

  useEffect(() => {
    // When profile changes, reset the page to the default for that profile.
    setActivePage(getDefaultPageForProfile(profile));
  }, [profile]);

  // Main loading gate. Waits for both user and profile information.
  if (isProfileLoading) {
    return <Loader />;
  }
  
  // If user is logged in, but no profile is selected, show selector.
  if (user && !profile) {
    return <ProfileSelector />;
  }

  // If there's no user and we are past the loading state, redirect has been initiated
  // by the root page.tsx. Render a loader to prevent flicker during redirect.
  if (!user) {
    return <Loader />;
  }
  
  const handlePageChange = (page: string, options?: { filters?: ReportFilters, prefill?: any }) => {
    setReportFilters(options?.filters || null);
    setPrefillData(options?.prefill || null);

    setOccurrenceToEdit(null);
    setTreatmentToEdit(null);
    setFaunaFloraGeoToEdit(null);
    setAssessmentToEdit(null);
    setEquipmentToEdit(null);
    setActivityToEdit(null);
    setNoticeToEdit(null);
    
    if (page !== 'register-occurrence' && page !== 'register-treatment' && page !== 'register-fauna-flora-geo') {
      setPrefillData(null);
    }
    
    setActivePage(page);
  };

  const handleEditOccurrence = (occurrence: any) => {
    setOccurrenceToEdit(occurrence);
    setActivePage('register-occurrence');
  }

  const handleEditTreatment = (treatment: any) => {
    setTreatmentToEdit(treatment);
    setActivePage('register-treatment');
  }
  
  const handleEditFaunaFloraGeo = (record: any) => {
    setFaunaFloraGeoToEdit(record);
    setActivePage('register-fauna-flora-geo');
  }

  const handleEditAssessment = (assessment: any) => {
    setAssessmentToEdit(assessment);
    setActivePage('register-risk-assessment');
  }

  const handleEditEquipment = (equipment: any) => {
    setEquipmentToEdit(equipment);
    setActivePage('register-equipment');
  }

  const handleEditActivity = (activity: any) => {
    setActivityToEdit(activity);
    setActivePage('register-activity');
  }

  const handleEditNotice = (notice: any) => {
    setNoticeToEdit(notice);
    setActivePage('register-notice');
  }

  const renderContent = () => {
    switch (activePage) {
      case 'help':
        return <HelpPage />;
      case 'tutorial':
        return <TutorialPage />;
      case 'general-settings':
        return <GeneralSettings />;
      case 'manage-profile':
        return <ManageProfile />;
      case 'register-occurrence':
        return <RegisterOccurrence occurrenceToEdit={occurrenceToEdit} setPage={handlePageChange} prefillData={prefillData} />;
      case 'occurrence-report':
        return <OccurrenceReport onEdit={handleEditOccurrence} />;
      case 'map-report':
        return <MapReport />;
      case 'manage-occurrences':
        return <ManageOccurrences />;
      case 'manage-locations':
        return <ManageLocations />;
      case 'manage-map':
        return <ManageMap />;
      case 'manage-pops':
        return <ManagePops />;
      case 'manage-fauna-flora-geo':
        return <ManageFaunaFloraGeo />;
      case 'manage-equipment-and-brands':
        return <ManageEquipmentAndBrands />;
      case 'register-treatment':
        return <RegisterTreatment treatmentToEdit={treatmentToEdit} setPage={handlePageChange} prefillData={prefillData} />;
      case 'treatment-report':
        return <TreatmentReport onEdit={handleEditTreatment} preFilter={reportFilters?.treatmentReport} />;
      case 'treatment-map-report':
        return <TreatmentMapReport />;
      case 'register-fauna-flora-geo':
        return <RegisterFaunaFloraGeo recordToEdit={faunaFloraGeoToEdit} setPage={handlePageChange} prefillData={prefillData} />;
      case 'fauna-flora-geo-report':
        return <FaunaFloraGeoReport onEdit={handleEditFaunaFloraGeo} />;
      case 'fauna-flora-geo-map-report':
        return <FaunaFloraGeoMapReport />;
      case 'register-risk-assessment':
        return <RegisterRiskAssessment assessmentToEdit={assessmentToEdit} setPage={handlePageChange} />;
      case 'risk-assessment-report':
        return <RiskAssessmentReport onEdit={handleEditAssessment} />;
      case 'register-equipment':
        return <RegisterEquipment equipmentToEdit={equipmentToEdit} setPage={handlePageChange} />;
      case 'equipment-report':
        return <EquipmentReport onEdit={handleEditEquipment} preFilter={reportFilters?.equipmentReport}/>;
      case 'register-activity':
        return <RegisterActivity activityToEdit={activityToEdit} setPage={handlePageChange} />;
      case 'activity-report':
        return <ActivityReport onEdit={handleEditActivity} />;
      case 'register-notice':
        return <RegisterNotice noticeToEdit={noticeToEdit} setPage={handlePageChange} />;
      case 'pending-notices':
        return <PendingNotices setPage={handlePageChange} />;
      case 'view-pops':
        return <ViewPops />;
      case 'view-tcrs':
        return <ViewTcrs />;
      case 'view-rame':
        return <ViewRame />;
      case 'view-sgs-docs':
        return <ViewSgsDocs />;
      case 'reminders':
      default:
        return <Reminders setPage={handlePageChange} />;
    }
  };

  const getProfileName = () => {
    if (profile === 'admin') return 'Administrador';
    if (profile === 'observer') return 'Observador';
    return '';
  }

  return (
    <SidebarProvider>
      <Sidebar>
        <AppSidebar activePage={activePage} setActivePage={handlePageChange} />
      </Sidebar>
      <SidebarInset>
        <div className="flex flex-col h-screen">
          <header className="sticky top-0 z-10 flex h-20 items-center justify-between border-b bg-card px-4 shadow-sm md:px-6">
            <div className="flex items-center gap-4">
              <SidebarTrigger />
            </div>
            <div className="flex flex-1 items-center justify-center gap-4 pr-8 md:pr-0">
              {logoUrl && (
                <Image
                  src={logoUrl}
                  alt="Logo"
                  width={40}
                  height={40}
                  className="rounded-md object-contain"
                />
              )}
              <div className="flex flex-col items-center justify-center">
                <span className="text-base md:text-xl font-bold text-foreground text-center">
                  Sistema de Gestão de Segurança
                </span>
                <span className="text-sm md:text-lg font-bold text-muted-foreground text-center">
                    {appName || 'SGS Genius'}
                </span>
              </div>
            </div>
          </header>
          <ScrollArea className="flex-1">
            <main className="p-4 md:p-6 lg:p-8">
              <div className="w-full space-y-6">
                {renderContent()}
              </div>
            </main>
          </ScrollArea>
        </div>
      </SidebarInset>
    </SidebarProvider>
  );
}

export function AppLayout() {
  return <MainAppLayout />;
}
