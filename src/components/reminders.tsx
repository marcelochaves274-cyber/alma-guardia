
'use client';

import { useState, useEffect } from 'react';
import { useFirestore, useUser } from '@/firebase';
import { collection, onSnapshot, Timestamp, query, where } from 'firebase/firestore';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { ShieldAlert, Wrench, Megaphone, ShieldX, CalendarClock, AlertTriangle } from 'lucide-react';
import { startOfDay, isBefore, differenceInDays, addYears, addMonths } from 'date-fns';

interface Treatment {
  id: string;
  situation: 'pendente' | 'finalizado';
  completionDate?: Timestamp;
}

interface Equipment {
  id: string;
  nextInspectionDate?: Timestamp;
  status: 'operacional' | 'em manutencao' | 'descartado';
  manufacturingDate?: Timestamp;
  validityYears?: string;
  validityMonths?: string;
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
  const [overdueTreatments, setOverdueTreatments] = useState<number>(0);
  const [overdueEquipments, setOverdueEquipments] = useState<number>(0);
  const [dueSoonEquipments, setDueSoonEquipments] = useState<number>(0);
  const [expiredEquipments, setExpiredEquipments] = useState<number>(0);
  const [pendingNotices, setPendingNotices] = useState<number>(0);

  const [isLoadingTreatments, setIsLoadingTreatments] = useState(true);
  const [isLoadingEquipments, setIsLoadingEquipments] = useState(true);
  const [isLoadingNotices, setIsLoadingNotices] = useState(true);
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
  }, []);

  // Efeito para lidar com notificações push nativas
  useEffect(() => {
    // Não faz nada se estiver carregando ou se não houver itens críticos
    if (isLoadingEquipments || isLoadingNotices || isLoadingTreatments) return;

    const criticalItemsMessages: string[] = [];
    if (overdueTreatments > 0) criticalItemsMessages.push(`${overdueTreatments} tratamento(s) atrasado(s)`);
    if (overdueEquipments > 0) criticalItemsMessages.push(`${overdueEquipments} vistoria(s) de equipamento atrasada(s)`);
    if (expiredEquipments > 0) criticalItemsMessages.push(`${expiredEquipments} equipamento(s) com validade expirada`);
    if (pendingNotices > 0) criticalItemsMessages.push(`${pendingNotices} aviso(s) pendente(s)`);

    if (criticalItemsMessages.length === 0) return;

    const showNotification = () => {
      const notificationBody = "Resumo de pendências: " + criticalItemsMessages.join(', ') + ".";
      new Notification("ALMA Guardia - Alertas Críticos", {
        body: notificationBody,
        icon: "https://firebasestorage.googleapis.com/v0/b/brave-drive-472322-m2.firebasestorage.app/o/ALMA%20-%20Simbolo_letreiro%20Branco%20%20-%20Grande.png?alt=media&token=674ce95f-b9e9-4212-8895-6753b1af996d",
        tag: 'alma-guardia-critical-alerts', // Identificador único para a notificação
        requireInteraction: true // Mantém a notificação visível até a interação do usuário
      });
    };

    if ('Notification' in window) {
      if (Notification.permission === 'granted') {
        showNotification();
      } else if (Notification.permission !== 'denied') {
        Notification.requestPermission().then(permission => {
          if (permission === 'granted') {
            showNotification();
          }
        });
      }
    }
  }, [pendingNotices, overdueTreatments, overdueEquipments, expiredEquipments, isLoadingEquipments, isLoadingNotices, isLoadingTreatments]);

  useEffect(() => {
    if (!user || !firestore) return;

    // Listener for risk treatments
    const treatmentsRef = collection(firestore, 'sgs_genius', user.uid, 'risk_treatments');
    const unsubscribeTreatments = onSnapshot(treatmentsRef, (snapshot) => {
      const today = startOfDay(new Date());
      let pendingCount = 0;
      let overdueCount = 0;
      snapshot.docs.forEach(doc => {
          const treatment = doc.data() as Treatment;
          if (treatment.situation === 'pendente') {
              const completionDate = treatment.completionDate?.toDate();
              if (completionDate && isBefore(startOfDay(completionDate), today)) {
                  overdueCount++;
              } else {
                  pendingCount++;
              }
          }
      });
      setPendingTreatments(pendingCount);
      setOverdueTreatments(overdueCount);
      setIsLoadingTreatments(false);
    });

    // Listener for equipments
    const equipmentsRef = collection(firestore, 'sgs_genius', user.uid, 'equipments');
    const unsubscribeEquipments = onSnapshot(equipmentsRef, (snapshot) => {
      const today = startOfDay(new Date());
      let overdueCount = 0;
      let dueSoonCount = 0;
      let expiredCount = 0;

      snapshot.docs.forEach(doc => {
        const e = doc.data() as Equipment;
        if (e.status === 'descartado') return;

        // Expiry check
        let isExpired = false;
        if (e.manufacturingDate && (e.validityYears || e.validityMonths)) {
          let expiryDate = e.manufacturingDate.toDate();
          if (e.validityYears) expiryDate = addYears(expiryDate, Number(e.validityYears));
          if (e.validityMonths) expiryDate = addMonths(expiryDate, Number(e.validityMonths));
          if (isBefore(startOfDay(expiryDate), today)) {
            expiredCount++;
            isExpired = true;
          }
        }

        // If the equipment is expired, it shouldn't be counted as needing inspection.
        if (isExpired) return;

        // Inspection check (only if not expired)
        if (e.nextInspectionDate) {
          const inspectionDay = startOfDay(e.nextInspectionDate.toDate());
          if (isBefore(inspectionDay, today)) {
            overdueCount++;
          } else if (differenceInDays(inspectionDay, today) <= 10) {
            dueSoonCount++;
          }
        }
      });
      setOverdueEquipments(overdueCount);
      setDueSoonEquipments(dueSoonCount);
      setExpiredEquipments(expiredCount);
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
                situations: ['pendente']
            }
        }
    });
  }

  const handleViewOverdueTreatments = () => {
    setPage('treatment-report', {
        filters: {
            treatmentReport: {
                situations: ['atrasado']
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

  const handleViewDueSoonEquipments = () => {
    setPage('equipment-report', {
        filters: {
            equipmentReport: {
                status: 'due_soon'
            }
        }
    })
  }

  const handleViewExpiredEquipments = () => {
    setPage('equipment-report', {
        filters: {
            equipmentReport: {
                status: 'expired'
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
      <div className="space-y-8">
        {isLoading ? (
          <>
            <ReminderGroupSkeleton />
            <ReminderGroupSkeleton />
            <ReminderCardSkeleton />
          </>
        ) : (
          <>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card>
                <CardHeader className="relative flex flex-row items-center justify-center space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Avisos Pendentes</CardTitle>
                  <Megaphone className="h-4 w-4 text-muted-foreground absolute right-6 top-1/2 -translate-y-1/2" />
                </CardHeader>
                <CardContent className="text-center">
                  <div className="text-2xl font-bold">{pendingNotices}</div>
                  <p className="text-xs text-muted-foreground">aguardando ação</p>
                </CardContent>
                <CardFooter>
                    <Button className="w-full" onClick={handleViewNotices} disabled={pendingNotices === 0}>
                      Ver Avisos
                    </Button>
                </CardFooter>
              </Card>
              <Card className="flex flex-col">
                <CardHeader className="text-center"><CardTitle>Tratamentos de Risco</CardTitle></CardHeader>
                <CardContent className="grid sm:grid-cols-2 gap-4 flex-1">
                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2"><CardTitle className="text-sm font-medium">Tratamentos Pendentes</CardTitle><ShieldAlert className="h-4 w-4 text-muted-foreground" /></CardHeader>
                        <CardContent className="text-center"><div className="text-2xl font-bold">{pendingTreatments}</div><p className="text-xs text-muted-foreground">dentro do prazo</p></CardContent>
                        <CardFooter><Button className="w-full" onClick={handleViewTreatments} disabled={pendingTreatments === 0}>Ver Pendentes</Button></CardFooter>
                    </Card>
                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2"><CardTitle className="text-sm font-medium">Tratamentos Atrasados</CardTitle><ShieldX className="h-4 w-4 text-muted-foreground" /></CardHeader>
                        <CardContent className="text-center"><div className="text-2xl font-bold">{overdueTreatments}</div><p className="text-xs text-muted-foreground">fora do prazo</p></CardContent>
                        <CardFooter><Button variant="destructive" className="w-full" onClick={handleViewOverdueTreatments} disabled={overdueTreatments === 0}>Ver Atrasados</Button></CardFooter>
                    </Card>
                </CardContent>
              </Card>
            </div>

            <div className="pt-2">
              <Card className="flex flex-col w-full">
                <CardHeader className="text-center"><CardTitle>Vistorias de Equipamentos</CardTitle></CardHeader>
                <CardContent className="grid sm:grid-cols-3 gap-4 flex-1">
                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2"><CardTitle className="text-sm font-medium">Vistoria de Equipamentos a Vencer</CardTitle><CalendarClock className="h-4 w-4 text-muted-foreground" /></CardHeader>
                        <CardContent className="text-center"><div className="text-2xl font-bold">{dueSoonEquipments}</div><p className="text-xs text-muted-foreground">nos próximos 10 dias</p></CardContent>
                        <CardFooter><Button className="w-full" onClick={handleViewDueSoonEquipments} disabled={dueSoonEquipments === 0}>Ver Equipamentos</Button></CardFooter>
                    </Card>
                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2"><CardTitle className="text-sm font-medium">Vistoria de Equipamentos Atrasadas</CardTitle><Wrench className="h-4 w-4 text-muted-foreground" /></CardHeader>
                        <CardContent className="text-center"><div className="text-2xl font-bold">{overdueEquipments}</div><p className="text-xs text-muted-foreground">vistorias atrasadas</p></CardContent>
                        <CardFooter><Button variant="destructive" className="w-full" onClick={handleViewEquipments} disabled={overdueEquipments === 0}>Ver Atrasados</Button></CardFooter>
                    </Card>
                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium">Validade de Equipamentos Expirada</CardTitle>
                            <AlertTriangle className="h-4 w-4 text-muted-foreground" />
                        </CardHeader>
                        <CardContent className="text-center">
                            <div className="text-2xl font-bold">{expiredEquipments}</div>
                            <p className="text-xs text-muted-foreground">equipamentos vencidos</p>
                        </CardContent>
                        <CardFooter>
                            <Button variant="destructive" className="w-full" onClick={handleViewExpiredEquipments} disabled={expiredEquipments === 0}>
                                Ver Vencidos
                            </Button>
                        </CardFooter>
                    </Card>
                </CardContent>
              </Card>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

function ReminderGroupSkeleton() {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <Card className="flex flex-col">
        <CardHeader><Skeleton className="h-6 w-1/2" /></CardHeader>
        <CardContent className="grid sm:grid-cols-2 gap-4 flex-1">
          <ReminderCardSkeleton />
          <ReminderCardSkeleton />
        </CardContent>
      </Card>
      <Card className="flex flex-col">
        <CardHeader><Skeleton className="h-6 w-1/2" /></CardHeader>
        <CardContent className="grid sm:grid-cols-3 gap-4 flex-1">
          <ReminderCardSkeleton />
          <ReminderCardSkeleton />
          <ReminderCardSkeleton />
        </CardContent>
      </Card>
    </div>
  )
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
