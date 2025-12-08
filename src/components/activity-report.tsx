'use client';

import { useState, useEffect } from 'react';
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
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { useFirestore, useUser } from '@/firebase';
import { collection, onSnapshot, Timestamp, doc, deleteDoc } from 'firebase/firestore';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Skeleton } from './ui/skeleton';
import { useToast } from '@/hooks/use-toast';
import { Button } from './ui/button';
import { Loader2, Pencil, Trash2 } from 'lucide-react';

interface Activity {
  id: string;
  activityName: string;
  pop: string;
  tcr: string;
  riskAssessmentLocation: string;
  createdAt: Timestamp;
}

interface ActivityReportProps {
  onEdit: (activity: Activity) => void;
}


export function ActivityReport({ onEdit }: ActivityReportProps) {
  const firestore = useFirestore();
  const { user } = useUser();
  const { toast } = useToast();
  
  const [activities, setActivities] = useState<Activity[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isDeleting, setIsDeleting] = useState<string | null>(null);

  useEffect(() => {
    if (!user || !firestore) return;

    // Listen for real-time activity updates
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
  
  const handleDelete = async (activityId: string) => {
    if (!firestore || !user) {
      toast({ variant: 'destructive', title: 'Erro', description: 'Usuário não autenticado.'});
      return;
    }
    setIsDeleting(activityId);
    try {
      const docRef = doc(firestore, 'sgs_genius', user.uid, 'activities', activityId);
      await deleteDoc(docRef);
      
      toast({ title: 'Sucesso!', description: 'Atividade excluída com sucesso.' });
    } catch (error) {
      console.error("Error deleting activity:", error);
      toast({
        variant: 'destructive',
        title: 'Erro ao excluir',
        description: 'Não foi possível excluir a atividade.',
      });
    } finally {
      setIsDeleting(null);
    }
  };

  const renderSkeletons = () => (
    Array.from({ length: 3 }).map((_, i) => (
      <TableRow key={i}>
        <TableCell><Skeleton className="h-5 w-28" /></TableCell>
        <TableCell><Skeleton className="h-5 w-32" /></TableCell>
        <TableCell><Skeleton className="h-5 w-32" /></TableCell>
        <TableCell><Skeleton className="h-5 w-24" /></TableCell>
        <TableCell><Skeleton className="h-5 w-28" /></TableCell>
        <TableCell><Skeleton className="h-5 w-20" /></TableCell>
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
                <TableHead>Avaliação de Risco</TableHead>
                <TableHead className="text-right">Ações</TableHead>
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
                      <TableCell>{act.riskAssessmentLocation || 'N/A'}</TableCell>
                      <TableCell className="text-right">
                         <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-primary" aria-label="Editar atividade" onClick={() => onEdit(act)}>
                            <Pencil className="h-4 w-4" />
                         </Button>
                         <AlertDialog>
                            <AlertDialogTrigger asChild>
                               <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-destructive" aria-label="Excluir atividade" disabled={isDeleting === act.id}>
                                  {isDeleting === act.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
                               </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                                <AlertDialogHeader>
                                    <AlertDialogTitle>Você tem certeza?</AlertDialogTitle>
                                    <AlertDialogDescription>Esta ação excluirá permanentemente o registro da atividade.</AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                    <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                    <AlertDialogAction onClick={() => handleDelete(act.id)} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                                        Sim, excluir
                                    </AlertDialogAction>
                                </AlertDialogFooter>
                            </AlertDialogContent>
                         </AlertDialog>
                      </TableCell>
                    </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={6} className="h-24 text-center">
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
