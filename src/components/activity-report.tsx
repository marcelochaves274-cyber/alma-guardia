
'use client';

import { useState, useEffect, useMemo } from 'react';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { useFirestore, useUser } from '@/firebase';
import { collection, onSnapshot, Timestamp } from 'firebase/firestore';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Skeleton } from './ui/skeleton';
import { useToast } from '@/hooks/use-toast';

interface Activity {
  id: string;
  activityName: string;
  pop: string;
  tcr: string;
  location: string;
  createdAt: Timestamp;
}

export function ActivityReport() {
  const firestore = useFirestore();
  const { user } = useUser();
  const { toast } = useToast();
  
  const [activities, setActivities] = useState<Activity[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!user || !firestore) return;
    setIsLoading(true);
    const activitiesCollectionRef = collection(firestore, 'sgs_genius', user.uid, 'activities');
    
    const unsubscribe = onSnapshot(activitiesCollectionRef, (querySnapshot) => {
      const activitiesData = querySnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data(),
        }) as Activity);
      
      setActivities(activitiesData.sort((a, b) => b.createdAt.toMillis() - a.createdAt.toMillis()));
      setIsLoading(false);
    }, (error) => {
        console.error("Error fetching real-time activities:", error);
        toast({
            variant: "destructive",
            title: "Erro de conexão",
            description: "Não foi possível buscar as atividades em tempo real."
        });
        setIsLoading(false);
    });
    
    return () => unsubscribe();
  }, [user, firestore, toast]);
  

  const renderSkeletons = () => (
    Array.from({ length: 3 }).map((_, i) => (
      <TableRow key={i}>
        <TableCell><Skeleton className="h-5 w-28" /></TableCell>
        <TableCell><Skeleton className="h-5 w-32" /></TableCell>
        <TableCell><Skeleton className="h-5 w-32" /></TableCell>
        <TableCell><Skeleton className="h-5 w-24" /></TableCell>
        <TableCell><Skeleton className="h-5 w-28" /></TableCell>
      </TableRow>
    ))
  );

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Relatório de Atividades</CardTitle>
          <CardDescription>Visualize as atividades registradas no sistema.</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Data</TableHead>
                <TableHead>Atividade</TableHead>
                <TableHead>POP</TableHead>
                <TableHead>TCR</TableHead>
                <TableHead>Local</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                renderSkeletons()
              ) : activities.length > 0 ? (
                activities.map((act) => (
                    <TableRow key={act.id}>
                      <TableCell>{act.createdAt ? format(act.createdAt.toDate(), 'dd/MM/yy HH:mm', { locale: ptBR }) : 'N/A'}</TableCell>
                      <TableCell>{act.activityName.replace(/^POP\/TCR\s/, '')}</TableCell>
                      <TableCell>{act.pop}</TableCell>
                      <TableCell>{act.tcr}</TableCell>
                      <TableCell>{act.location}</TableCell>
                    </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={5} className="h-24 text-center">
                    Nenhuma atividade registrada ainda.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
