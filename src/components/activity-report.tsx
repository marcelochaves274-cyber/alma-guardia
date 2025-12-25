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
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogClose,
} from "@/components/ui/dialog";
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
import { collection, onSnapshot, Timestamp, doc, getDoc, query, where, limit, orderBy, deleteDoc } from 'firebase/firestore';
import { Skeleton } from './ui/skeleton';
import { useToast } from '@/hooks/use-toast';
import { Button } from './ui/button';
import { Loader2, Pencil, Trash2, Eye } from 'lucide-react';
import { Textarea } from './ui/textarea';
import { Label } from './ui/label';
import { ScrollArea } from './ui/scroll-area';
import { Badge } from './ui/badge';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface Activity {
  id: string;
  activityName: string;
  pop: string;
  tcr: string;
  riskAssessmentLocation: string[] | string; // Can be string for old data
  createdAt: Timestamp;
}

interface ActivityReportProps {
  onEdit: (activity: Activity) => void;
}

interface PopDocument {
    name: string;
    popContent: string;
    tcrContent: string;
}

interface RiskAssessment {
  id: string;
  assessmentDate: Date;
  location: string;
  taskDescription: string;
  riskSource: string; 
  effects: string; 
  existingControls: string;
  recommendedControls: string;
  probability: string;
  consequence: string;
  riskLevel: number;
}

const getRiskLevelProperties = (score: number) => {
    if (score >= 15) return { label: 'Alta', className: 'bg-red-600 text-white hover:bg-red-700' };
    if (score >= 8) return { label: 'Média', className: 'bg-orange-500 text-white hover:bg-orange-600' };
    if (score > 0) return { label: 'Baixa', className: 'bg-yellow-400 text-black hover:bg-yellow-500' };
    return { label: 'N/A', className: 'bg-muted text-muted-foreground' };
};


export function ActivityReport({ onEdit }: ActivityReportProps) {
  const firestore = useFirestore();
  const { user } = useUser();
  const { toast } = useToast();
  
  const [activities, setActivities] = useState<Activity[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedContent, setSelectedContent] = useState({ title: '', content: '' });
  const [selectedAssessments, setSelectedAssessments] = useState<RiskAssessment[]>([]);
  const [isAssessmentModalOpen, setIsAssessmentModalOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState<string | null>(null);

  // States to hold the fetched documents content
  const [popTcrDocs, setPopTcrDocs] = useState<PopDocument[]>([]);
  const [riskAssessments, setRiskAssessments] = useState<RiskAssessment[]>([]);

  useEffect(() => {
    if (!user || !firestore) return;

    // Listen for real-time activity updates
    const activitiesCollectionRef = collection(firestore, 'sgs_genius', user.uid, 'activities');
    const unsubscribeActivities = onSnapshot(activitiesCollectionRef, (querySnapshot) => {
      const activitiesData = querySnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data(),
        }) as Activity);
      
      setActivities(activitiesData.sort((a, b) => b.createdAt.toMillis() - a.createdAt.toMillis()));
      if (isLoading) setIsLoading(false);
    }, (error) => {
        console.error("Error fetching real-time activities:", error);
        toast({
            variant: "destructive",
            title: "Erro de conexão",
            description: "Não foi possível buscar as atividades."
        });
        setIsLoading(false);
    });
    
    // Fetch POP/TCR documents once
    const popDocRef = doc(firestore, 'sgs_genius', user.uid, 'settings', 'pops');
    getDoc(popDocRef).then(docSnap => {
        if (docSnap.exists()) {
            const data = docSnap.data();
            setPopTcrDocs((data.documents || []) as PopDocument[]);
        }
    }).catch(error => console.error("Error fetching POP/TCR docs: ", error));


    // Fetch all risk assessments
    const assessmentsCollectionRef = collection(firestore, 'sgs_genius', user.uid, 'risk_assessments');
    const unsubscribeAssessments = onSnapshot(assessmentsCollectionRef, (querySnapshot) => {
        const assessmentData = querySnapshot.docs.map(doc => {
             const data = doc.data();
             const assessmentDate = data.assessmentDate instanceof Timestamp 
                ? data.assessmentDate.toDate() 
                : new Date(data.assessmentDate); // Fallback for string dates
            return {
                id: doc.id,
                ...data,
                assessmentDate,
            } as RiskAssessment;
        });
        setRiskAssessments(assessmentData);
    }, (error) => console.error("Error fetching risk assessments: ", error));


    return () => {
      unsubscribeActivities();
      unsubscribeAssessments();
    }
  }, [user, firestore, toast, isLoading]);
  
  const handleOpenPopTcrModal = (activity: Activity, type: 'pop' | 'tcr') => {
    const doc = popTcrDocs.find(d => d.name === activity[type]);
    if (doc) {
      setSelectedContent({
        title: type.toUpperCase(),
        content: type === 'pop' ? doc.popContent : doc.tcrContent
      });
    } else {
      setSelectedContent({ title: 'Não encontrado', content: 'O documento correspondente não foi encontrado.'});
    }
  };

  const handleOpenAssessmentModal = (activity: Activity) => {
    const locations = Array.isArray(activity.riskAssessmentLocation) 
        ? activity.riskAssessmentLocation 
        : (activity.riskAssessmentLocation ? [activity.riskAssessmentLocation] : []);

    const assessmentsForLocation = riskAssessments
        .filter(ra => locations.includes(ra.location))
        .sort((a, b) => b.assessmentDate.getTime() - a.assessmentDate.getTime());
    
    setSelectedAssessments(assessmentsForLocation);
    setIsAssessmentModalOpen(true);
  };
  
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
       <Dialog>
        <Card>
            <CardHeader>
            <CardTitle>Relatório de Atividades</CardTitle>
            <CardDescription>Visualize as atividades registradas no sistema e clique para ver os detalhes.</CardDescription>
            </CardHeader>
            <CardContent>
            <Table>
                <TableHeader>
                <TableRow>
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
                    activities.map((act) => {
                        const locations = Array.isArray(act.riskAssessmentLocation) ? act.riskAssessmentLocation : (act.riskAssessmentLocation ? [act.riskAssessmentLocation] : []);
                        return (
                            <TableRow key={act.id}>
                            <TableCell>{act.activityName.replace(/^POP\/TCR\s/, '')}</TableCell>
                            <TableCell>
                              <DialogTrigger asChild>
                                <Button variant="link" className="p-0 h-auto" onClick={() => handleOpenPopTcrModal(act, 'pop')}>
                                  {act.pop}
                                </Button>
                              </DialogTrigger>
                            </TableCell>
                            <TableCell>
                               <DialogTrigger asChild>
                                <Button variant="link" className="p-0 h-auto" onClick={() => handleOpenPopTcrModal(act, 'tcr')}>
                                  {act.tcr}
                                </Button>
                              </DialogTrigger>
                            </TableCell>
                            <TableCell>
                                {locations.length > 0 ? (
                                    <Button variant="secondary" size="sm" onClick={() => handleOpenAssessmentModal(act)}>
                                        <Eye className="mr-2 h-4 w-4" />
                                        Visualizar ({locations.length})
                                    </Button>
                                ) : (
                                    <span className="text-muted-foreground text-sm">N/A</span>
                                )}
                            </TableCell>
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
                                          <AlertDialogDescription>Esta ação excluirá permanentemente o registro da atividade "{act.activityName.replace(/^POP\/TCR\s/, '')}".</AlertDialogDescription>
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
                        );
                    })
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

        {/* Generic Content Modal for POP/TCR */}
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>{selectedContent.title}</DialogTitle>
          </DialogHeader>
          <ScrollArea className="max-h-[70vh] pr-6">
            <div className="whitespace-pre-wrap py-4">{selectedContent.content || "Nenhum conteúdo definido para este documento."}</div>
          </ScrollArea>
           <div className="flex justify-end pt-2">
              <DialogClose asChild>
                  <Button type="button" variant="secondary">
                      Fechar
                  </Button>
              </DialogClose>
          </div>
        </DialogContent>
      </Dialog>
      
      {/* Specific Risk Assessment Modal */}
       <Dialog open={isAssessmentModalOpen} onOpenChange={setIsAssessmentModalOpen}>
        <DialogContent className="max-w-4xl">
           <DialogHeader>
              <DialogTitle>Avaliações de Risco Associadas</DialogTitle>
           </DialogHeader>
          {selectedAssessments.length > 0 ? (
            <>
              <p className='text-sm text-muted-foreground px-6 -mt-4'>
                Exibindo {selectedAssessments.length} avaliação(ões) para os locais selecionados, da mais recente para a mais antiga.
              </p>
            <ScrollArea className="max-h-[70vh] pr-4">
              <div className="space-y-6 p-6">
                {selectedAssessments.map((assessment) => (
                    <div key={assessment.id} className="space-y-4 rounded-lg border p-4">
                       <p className='text-sm font-semibold text-primary'>
                          Local: {assessment.location}
                        </p>
                        <div className="space-y-2">
                            <Label className="font-semibold text-muted-foreground">Etapa da Atividade</Label>
                            <p>{assessment.taskDescription || 'Não informado'}</p>
                        </div>
                        <div>
                            <Label className="font-semibold text-muted-foreground">Causa</Label>
                            <p>{assessment.riskSource  || 'Não informado'}</p>
                        </div>
                            <div>
                            <Label className="font-semibold text-muted-foreground">Perigo</Label>
                            <p>{assessment.effects  || 'Não informado'}</p>
                        </div>
                            <div>
                            <Label className="font-semibold text-muted-foreground">Dano</Label>
                            <p>{assessment.existingControls  || 'Não informado'}</p>
                        </div>
                            <div>
                            <Label className="font-semibold text-muted-foreground">Controle Operacional</Label>
                            <p>{assessment.recommendedControls  || 'Não informado'}</p>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 border-t pt-4 mt-4">
                            <div>
                                <Label className="font-semibold text-muted-foreground">Probabilidade</Label>
                                <p>{assessment.probability}</p>
                            </div>
                            <div>
                                <Label className="font-semibold text-muted-foreground">Consequência</Label>
                                <p>{assessment.consequence}</p>
                            </div>
                            <div>
                                <Label className="font-semibold text-muted-foreground">Nível de Risco</Label>
                                <div>
                                <Badge className={cn(getRiskLevelProperties(assessment.riskLevel).className)}>
                                    {getRiskLevelProperties(assessment.riskLevel).label}
                                </Badge>
                                </div>
                            </div>
                        </div>
                    </div>
                ))}
              </div>
            </ScrollArea>
              <div className="flex justify-end pt-2 px-6 pb-4">
                <DialogClose asChild>
                    <Button type="button" variant="secondary">
                        Fechar
                    </Button>
                </DialogClose>
            </div>
            </>
          ) : (
            <div className='p-6'>
                 <p className="py-4 text-sm text-muted-foreground">Não foi possível encontrar uma avaliação de risco associada a estes locais.</p>
                 <div className="flex justify-end pt-2">
                    <DialogClose asChild>
                        <Button type="button" variant="secondary">
                            Fechar
                        </Button>
                    </DialogClose>
                </div>
            </div>
          )}
        </DialogContent>
       </Dialog>
    </div>
  );
}
