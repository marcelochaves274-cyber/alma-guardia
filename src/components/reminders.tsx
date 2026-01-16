'use client';

import { useState, useEffect } from 'react';
import { useFirestore, useUser } from '@/firebase';
import { collection, onSnapshot, Timestamp, query, where } from 'firebase/firestore';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { ShieldAlert, Wrench, Megaphone } from 'lucide-react';
import { startOfDay, isBefore } from 'date-fns';

interface Treatment {
  id: string;
  situation: 'pendente' | 'finalizado' | 'reaberto';
}

interface Equipment {
  id: string;
  nextInspectionDate?: Timestamp;
  status: 'operacional' | 'em manutencao' | 'descartado';
}

interface Notice {
    id: string;
    status: 'pendente' | 'finalizado';
}

interface RemindersProps {
  setPage: (page: string, filters?: any) => void;
}

export function Reminders({ setPage }: RemindersProps) {
  const firestore = useFirestore();
  const { user } = useUser();

  const [pendingTreatments, setPendingTreatments] = useState<number>(0);
  const [overdueEquipments, setOverdueEquipments] = useState<number>(0);
  const [pendingNotices, setPendingNotices] = useState<number>(0);

  const [isLoadingTreatments, setIsLoadingTreatments] = useState(true);
  const [isLoadingEquipments, setIsLoadingEquipments] = useState(true);
  const [isLoadingNotices, setIsLoadingNotices] = useState(true);
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
  }, []);

  useEffect(() => {
    if (!user || !firestore) return;

    // Listener for risk treatments
    const treatmentsRef = collection(firestore, 'sgs_genius', user.uid, 'risk_treatments');
    const unsubscribeTreatments = onSnapshot(treatmentsRef, (snapshot) => {
      const pending = snapshot.docs
        .map(doc => doc.data() as Treatment)
        .filter(t => t.situation === 'pendente' || t.situation === 'reaberto');
      setPendingTreatments(pending.length);
      setIsLoadingTreatments(false);
    });

    // Listener for equipments
    const equipmentsRef = collection(firestore, 'sgs_genius', user.uid, 'equipments');
    const unsubscribeEquipments = onSnapshot(equipmentsRef, (snapshot) => {
      const today = startOfDay(new Date());
      const overdue = snapshot.docs
        .map(doc => doc.data() as Equipment)
        .filter(e => {
          if (e.status === 'descartado') {
            return false;
          }
          if (!e.nextInspectionDate) {
            return false;
          }
          const inspectionDate = e.nextInspectionDate.toDate();
          return isBefore(startOfDay(inspectionDate), today);
        });
      setOverdueEquipments(overdue.length);
      setIsLoadingEquipments(false);
    });
    
    // Listener for notices
    const noticesQuery = query(collection(firestore, 'sgs_genius', user.uid, 'notices'), where('status', '==', 'pendente'));
    const unsubscribeNotices = onSnapshot(noticesQuery, (snapshot) => {
        setPendingNotices(snapshot.size);
        setIsLoadingNotices(false);
    });

    return () => {
      unsubscribeTreatments();
      unsubscribeEquipments();
      unsubscribeNotices();
    };
  }, [user, firestore]);
  
  const handleViewTreatments = () => {
    setPage('treatment-report', {
        filters: {
            treatmentReport: {
                situations: ['pendente', 'reaberto']
            }
        }
    });
  }
  
  const handleViewEquipments = () => {
    setPage('equipment-report', {
        filters: {
            equipmentReport: {
                status: 'overdue'
            }
        }
    })
  }

  const handleViewNotices = () => {
    setPage('pending-notices');
  }

  const isLoading = !isClient || isLoadingTreatments || isLoadingEquipments || isLoadingNotices;

  return (
    <div>
      <div className="text-center mb-8">
        <h1 className="text-3xl font-bold">Lembretes</h1>
        <p className="text-muted-foreground">Resumo de itens que necessitam de sua atenção.</p>
      </div>
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {isLoading ? (
          <>
            <ReminderCardSkeleton />
            <ReminderCardSkeleton />
            <ReminderCardSkeleton />
          </>
        ) : (
          <>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Tratamentos de Risco</CardTitle>
                <ShieldAlert className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{pendingTreatments}</div>
                <p className="text-xs text-muted-foreground">pendentes ou reabertos</p>
              </CardContent>
              <CardFooter>
                 <Button className="w-full" onClick={handleViewTreatments} disabled={pendingTreatments === 0}>
                    Ver Tratamentos
                 </Button>
              </CardFooter>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Vistorias de Equipamentos</CardTitle>
                <Wrench className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{overdueEquipments}</div>
                <p className="text-xs text-muted-foreground">vistorias atrasadas</p>
              </CardContent>
              <CardFooter>
                 <Button className="w-full" onClick={handleViewEquipments} disabled={overdueEquipments === 0}>
                    Ver Equipamentos
                 </Button>
              </CardFooter>
            </Card>
             <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Avisos Pendentes</CardTitle>
                <Megaphone className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{pendingNotices}</div>
                <p className="text-xs text-muted-foreground">aguardando ação</p>
              </CardContent>
              <CardFooter>
                 <Button className="w-full" onClick={handleViewNotices} disabled={pendingNotices === 0}>
                    Ver Avisos
                 </Button>
              </CardFooter>
            </Card>
          </>
        )}
      </div>
    </div>
  );
}

function ReminderCardSkeleton() {
    return (
        <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <Skeleton className="h-4 w-1/3" />
                <Skeleton className="h-4 w-4 rounded-sm" />
            </CardHeader>
            <CardContent>
                <Skeleton className="h-8 w-10 mt-1" />
                <Skeleton className="h-3 w-1/2 mt-2" />
            </CardContent>
             <CardFooter>
                <Skeleton className="h-10 w-full" />
            </CardFooter>
        </Card>
    )
}
