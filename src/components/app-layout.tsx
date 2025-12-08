
'use client';
import { useState } from 'react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { useUser } from '@/firebase';
import { useAppSettings } from '@/context/app-settings-context';

import { GeneralSettings } from '@/components/general-settings';
import { Chat } from '@/components/chat';
import { SgsConfiguration } from '@/components/sgs-configuration';
import { RegisterOccurrence } from '@/components/register-occurrence';
import { ManageOccurrences } from '@/components/manage-occurrences';
import { ManageLocations } from '@/components/manage-locations';
import { ManageMap } from '@/components/manage-map';
import { OccurrenceReport } from '@/components/occurrence-report';
import { MapReport } from '@/components/map-report';
import { AppSidebar } from '@/app/app-sidebar';
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


import {
  Sidebar,
  SidebarInset,
  SidebarTrigger,
  SidebarProvider
} from '@/components/ui/sidebar';

function Loader() {
  return (
    <div className="flex h-screen w-screen items-center justify-center bg-background">
      <svg
        xmlns="http://www.w3.org/2000/svg"
        width="24"
        height="24"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        className="h-12 w-12 animate-spin text-primary"
      >
        <path d="M21 12a9 9 0 1 1-6.219-8.56" />
      </svg>
    </div>
  );
}

function MainAppLayout() {
  const { user, isUserLoading } = useUser();
  const router = useRouter();

  const [activePage, setActivePage] = useState('reminders');
  const [occurrenceToEdit, setOccurrenceToEdit] = useState<any | null>(null);
  const [treatmentToEdit, setTreatmentToEdit] = useState<any | null>(null);
  const [faunaFloraGeoToEdit, setFaunaFloraGeoToEdit] = useState<any | null>(null);
  const [assessmentToEdit, setAssessmentToEdit] = useState<any | null>(null);
  const [equipmentToEdit, setEquipmentToEdit] = useState<any | null>(null);
  const { appName, logoUrl } = useAppSettings();

  if (isUserLoading) {
    return <Loader />;
  }

  if (!user) {
    router.push('/login');
    return <Loader />;
  }
  
  const handlePageChange = (page: string) => {
    if (page !== 'register-occurrence') {
      setOccurrenceToEdit(null);
    }
    if (page !== 'register-treatment') {
      setTreatmentToEdit(null);
    }
    if (page !== 'register-fauna-flora-geo') {
      setFaunaFloraGeoToEdit(null);
    }
    if (page !== 'register-risk-assessment') {
      setAssessmentToEdit(null);
    }
    if (page !== 'register-equipment') {
      setEquipmentToEdit(null);
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

  const renderContent = () => {
    switch (activePage) {
      case 'general-settings':
        return <GeneralSettings />;
      case 'register-occurrence':
        return <RegisterOccurrence occurrenceToEdit={occurrenceToEdit} setPage={handlePageChange} />;
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
        return <RegisterTreatment treatmentToEdit={treatmentToEdit} setPage={handlePageChange} />;
      case 'treatment-report':
        return <TreatmentReport onEdit={handleEditTreatment} />;
      case 'treatment-map-report':
        return <TreatmentMapReport />;
      case 'register-fauna-flora-geo':
        return <RegisterFaunaFloraGeo recordToEdit={faunaFloraGeoToEdit} setPage={handlePageChange} />;
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
        return (
          <div className="space-y-6">
            <div className="w-full">
              <SgsConfiguration />
            </div>
            <div className="w-full">
              <Chat />
            </div>
          </div>
        );
    }
  };

  return (
    <SidebarProvider>
      <Sidebar>
        <AppSidebar activePage={activePage} setActivePage={handlePageChange} />
      </Sidebar>
      <SidebarInset>
        <div className="flex flex-col h-screen">
          <header className="sticky top-0 z-10 flex h-20 items-center justify-center border-b bg-card px-4 shadow-sm md:px-6">
            <div className="absolute left-4 flex items-center gap-4">
              <SidebarTrigger />
            </div>
            <div className="flex items-center gap-4">
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
                <span className="font-bold text-xl text-foreground">
                  Sistema de Gestão de Segurança
                </span>
                {appName && (
                  <span className="font-bold text-lg text-muted-foreground">
                    {appName}
                  </span>
                )}
              </div>
            </div>
          </header>
          <main className="flex-1 overflow-y-auto p-4 md:p-6 lg:p-8">
             <div className="w-full space-y-6">
              {renderContent()}
            </div>
          </main>
        </div>
      </SidebarInset>
    </SidebarProvider>
  );
}

export function AppLayout() {
  return <MainAppLayout />;
}
