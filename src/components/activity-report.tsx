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
  DialogTrigger,
  DialogClose,
} from "@/components/ui/dialog";
import { useFirestore, useUser } from '@/firebase';
import { collection, onSnapshot, Timestamp, doc, getDoc, query, where, limit, orderBy } from 'firebase/firestore';
import { Skeleton } from './ui/skeleton';
import { useToast } from '@/hooks/use-toast';
import { Button } from './ui/button';
import { Loader2 } from 'lucide-react';
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
  riskAssessmentLocation: string;
  createdAt: Timestamp;
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


export function ActivityReport() {
  const firestore = useFirestore();
  const { user } = useUser();
  const { toast } = useToast();
  
  const [activities, setActivities] = useState<Activity[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedContent, setSelectedContent] = useState({ title: '', content: '' });
  const [selectedAssessment, setSelectedAssessment] = useState<RiskAssessment | null>(null);
  const [isAssessmentModalOpen, setIsAssessmentModalOpen] = useState(false);

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
                : new Date(); 
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
    const assessmentsForLocation = riskAssessments
        .filter(ra => ra.location === activity.riskAssessmentLocation)
        .sort((a, b) => b.assessmentDate.getTime() - a.assessmentDate.getTime());
    
    setSelectedAssessment(assessmentsForLocation[0] || null);
    setIsAssessmentModalOpen(true);
  };


  const renderSkeletons = () => (
    Array.from({ length: 3 }).map((_, i) => (
      <TableRow key={i}>
        <TableCell><Skeleton className="h-5 w-32" /></TableCell>
        <TableCell><Skeleton className="h-5 w-32" /></TableCell>
        <TableCell><Skeleton className="h-5 w-24" /></TableCell>
        <TableCell><Skeleton className="h-5 w-28" /></TableCell>
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
                </TableRow>
                </TableHeader>
                <TableBody>
                {isLoading ? (
                    renderSkeletons()
                ) : activities.length > 0 ? (
                    activities.map((act) => (
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
                           <Button variant="link" className="p-0 h-auto" onClick={() => handleOpenAssessmentModal(act)}>
                                {act.riskAssessmentLocation || 'N/A'}
                            </Button>
                        </TableCell>
                        </TableRow>
                    ))
                ) : (
                    <TableRow>
                    <TableCell colSpan={4} className="h-24 text-center">
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
        <DialogContent className="max-w-2xl">
          {selectedAssessment ? (
            <>
            <DialogHeader>
              <DialogTitle>Detalhes da Avaliação de Risco</DialogTitle>
              <DialogDescription>
                Esta é a avaliação de risco mais recente para o local: {selectedAssessment.location}.
              </DialogDescription>
            </DialogHeader>
            <ScrollArea className="max-h-[70vh] pr-6">
              <div className="space-y-4 py-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label className="font-semibold text-muted-foreground">Data da Avaliação</Label>
                    <p>{format(selectedAssessment.assessmentDate, 'dd/MM/yyyy \'às\' HH:mm', { locale: ptBR })}</p>
                  </div>
                  <div>
                    <Label className="font-semibold text-muted-foreground">Local</Label>
                    <p>{selectedAssessment.location}</p>
                  </div>
                </div>
                  <div>
                    <Label className="font-semibold text-muted-foreground">Etapa da Atividade</Label>
                    <p>{selectedAssessment.taskDescription || 'Não informado'}</p>
                  </div>
                    <div>
                    <Label className="font-semibold text-muted-foreground">Causa</Label>
                    <p>{selectedAssessment.riskSource  || 'Não informado'}</p>
                  </div>
                    <div>
                    <Label className="font-semibold text-muted-foreground">Perigo</Label>
                    <p>{selectedAssessment.effects  || 'Não informado'}</p>
                  </div>
                    <div>
                    <Label className="font-semibold text-muted-foreground">Dano</Label>
                    <p>{selectedAssessment.existingControls  || 'Não informado'}</p>
                  </div>
                    <div>
                    <Label className="font-semibold text-muted-foreground">Controle Operacional</Label>
                    <p>{selectedAssessment.recommendedControls  || 'Não informado'}</p>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 border-t pt-4 mt-4">
                    <div>
                        <Label className="font-semibold text-muted-foreground">Probabilidade</Label>
                        <p>{selectedAssessment.probability}</p>
                    </div>
                      <div>
                        <Label className="font-semibold text-muted-foreground">Consequência</Label>
                        <p>{selectedAssessment.consequence}</p>
                    </div>
                      <div>
                        <Label className="font-semibold text-muted-foreground">Nível de Risco</Label>
                        <p>
                          <Badge className={cn(getRiskLevelProperties(selectedAssessment.riskLevel).className)}>
                              {getRiskLevelProperties(selectedAssessment.riskLevel).label}
                          </Badge>
                        </p>
                    </div>
                  </div>
              </div>
            </ScrollArea>
              <div className="flex justify-end pt-2">
                <DialogClose asChild>
                    <Button type="button" variant="secondary">
                        Fechar
                    </Button>
                </DialogClose>
            </div>
            </>
          ) : (
            <DialogHeader>
                <DialogTitle>Avaliação de Risco não encontrada</DialogTitle>
                 <DialogDescription className="py-4">Não foi possível encontrar uma avaliação de risco associada a este local.</DialogDescription>
                 <div className="flex justify-end pt-2">
                    <DialogClose asChild>
                        <Button type="button" variant="secondary">
                            Fechar
                        </Button>
                    </DialogClose>
                </div>
            </DialogHeader>
          )}
        </DialogContent>
       </Dialog>
    </div>
  );
}
