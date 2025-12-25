'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
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
import { collection, getDoc, doc, Timestamp, deleteDoc, onSnapshot } from 'firebase/firestore';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Skeleton } from './ui/skeleton';
import { Badge } from './ui/badge';
import { Button } from './ui/button';
import { Pencil, Trash2, Loader2, Eye } from 'lucide-react';
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
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogClose,
} from "@/components/ui/dialog";
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import { Label } from './ui/label';
import { ScrollArea } from './ui/scroll-area';
import { SheetFilter } from './sheet-filter';


interface RiskAssessment {
  id: string;
  assessmentDate: Date;
  location: string;
  taskDescription: string;
  riskSource: string; // Causa
  effects: string; // Perigo
  existingControls: string; // Dano
  recommendedControls: string; // Controle Operacional
  probability: string;
  consequence: string;
  riskLevel: number;
}

interface RiskAssessmentReportProps {
  onEdit: (assessment: RiskAssessment) => void;
}

const getRiskLevelProperties = (score: number) => {
    if (score >= 15) return { label: 'Alta', className: 'bg-red-600 text-white hover:bg-red-700' };
    if (score >= 8) return { label: 'Média', className: 'bg-orange-500 text-white hover:bg-orange-600' };
    if (score > 0) return { label: 'Baixa', className: 'bg-yellow-400 text-black hover:bg-yellow-500' };
    return { label: 'N/A', className: 'bg-muted text-muted-foreground' };
};

export function RiskAssessmentReport({ onEdit }: RiskAssessmentReportProps) {
  const firestore = useFirestore();
  const { user } = useUser();
  const { toast } = useToast();
  
  const [assessments, setAssessments] = useState<RiskAssessment[]>([]);
  const [selectedAssessment, setSelectedAssessment] = useState<RiskAssessment | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isDeleting, setIsDeleting] = useState<string | null>(null);
  const [isClient, setIsClient] = useState(false);

  const [filterLocation, setFilterLocation] = useState<string[]>([]);
  
  const [locations, setLocations] = useState<string[]>([]);
  const [isLoadingLocations, setIsLoadingLocations] = useState(true);

  useEffect(() => {
    setIsClient(true);
  }, []);


  const getSettingsDocRef = useCallback((collectionName: string) => {
    if (!firestore || !user) return null;
    return doc(firestore, 'sgs_genius', user.uid, 'settings', collectionName);
  }, [firestore, user]);

  useEffect(() => {
    const fetchSelectOptions = async () => {
      const docRef = getSettingsDocRef('locations');
      if (!docRef) {
        setIsLoadingLocations(false);
        return;
      }
      try {
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
          const data = docSnap.data();
          setLocations(data['locations'] || []);
        }
      } catch (error) {
        console.error(`Error fetching locations:`, error);
      } finally {
        setIsLoadingLocations(false);
      }
    };
    fetchSelectOptions();
  }, [getSettingsDocRef]);
  
  useEffect(() => {
    if (!user || !firestore) return;
    setIsLoading(true);

    const assessmentsCollectionRef = collection(firestore, 'sgs_genius', user.uid, 'risk_assessments');
    
    const unsubscribe = onSnapshot(assessmentsCollectionRef, (querySnapshot) => {
      const assessmentsData = querySnapshot.docs.map(doc => {
        const data = doc.data();
        const assessmentDate = data.assessmentDate instanceof Timestamp 
          ? data.assessmentDate.toDate() 
          : new Date(0); 

        return {
          id: doc.id,
          ...data,
          assessmentDate,
        } as RiskAssessment;
      });
      
      setAssessments(assessmentsData.sort((a, b) => b.assessmentDate.getTime() - a.assessmentDate.getTime()));
      setIsLoading(false);
    }, (error) => {
        console.error("Error fetching real-time assessments:", error);
        toast({
            variant: "destructive",
            title: "Erro de conexão",
            description: "Não foi possível buscar as avaliações em tempo real."
        });
        setIsLoading(false);
    });
    
    return () => unsubscribe();
  }, [user, firestore, toast]);

  const filteredAndGroupedAssessments = useMemo(() => {
    if (!isClient) return {};
    const filtered = assessments.filter(ass => {
        const locationMatch = filterLocation.length === 0 || filterLocation.includes(ass.location);
        return locationMatch;
    });

    return filtered.reduce((acc, assessment) => {
      const location = assessment.location || 'Sem Local';
      if (!acc[location]) {
        acc[location] = [];
      }
      acc[location].push(assessment);
      return acc;
    }, {} as Record<string, RiskAssessment[]>);
  }, [assessments, filterLocation, isClient]);


  const handleDelete = async (assessmentId: string) => {
    if (!firestore || !user) {
      toast({ variant: 'destructive', title: 'Erro', description: 'Usuário não autenticado.'});
      return;
    }
    setIsDeleting(assessmentId);
    try {
      const docRef = doc(firestore, 'sgs_genius', user.uid, 'risk_assessments', assessmentId);
      await deleteDoc(docRef);
      
      toast({
        title: 'Sucesso!',
        description: 'Avaliação de risco excluída com sucesso.',
      });
    } catch (error) {
      console.error("Error deleting assessment:", error);
      toast({
        variant: 'destructive',
        title: 'Erro ao excluir',
        description: 'Não foi possível excluir a avaliação.',
      });
    } finally {
      setIsDeleting(null);
    }
  };

  const handleEdit = (assessment: RiskAssessment) => {
    onEdit(assessment);
  };
  
  const renderSkeletons = () => {
    return (
      <>
        {Array.from({ length: 3 }).map((_, i) => (
          <Card key={i}>
            <CardHeader>
                <Skeleton className="h-6 w-1/3" />
            </CardHeader>
            <CardContent className="space-y-4">
                <Skeleton className="h-20 w-full" />
                <Skeleton className="h-20 w-full" />
            </CardContent>
          </Card>
        ))}
      </>
    );
  };

  return (
    <Dialog onOpenChange={(isOpen) => !isOpen && setSelectedAssessment(null)}>
        <div className="space-y-6">
        <Card>
            <CardHeader>
            <CardTitle>Relatório de Avaliação de Risco</CardTitle>
            <CardDescription>
                Filtre as avaliações de risco por local.
            </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 items-end">
                <div className="space-y-2">
                    <Label>Filtrar por Local</Label>
                    <SheetFilter
                        title='Filtrar Locais'
                        options={locations.map(l => ({ value: l, label: l }))}
                        selected={filterLocation}
                        onChange={setFilterLocation}
                        disabled={isLoadingLocations || locations.length === 0}
                        buttonText='Filtrar por Local'
                    />
                </div>
                <Button onClick={() => setFilterLocation([])} variant="outline" className="w-full sm:w-auto self-end">
                Limpar Filtro
                </Button>
            </div>
            </CardContent>
        </Card>

        {isLoading ? (
            renderSkeletons()
        ) : Object.keys(filteredAndGroupedAssessments).length > 0 ? (
            <div className="space-y-8">
            {Object.entries(filteredAndGroupedAssessments).map(([location, locationAssessments], index) => (
                <Card key={location} className={cn(index % 2 === 0 ? "bg-card" : "bg-muted/40")}>
                    <CardHeader>
                        <CardTitle className="text-xl">{location}</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        {locationAssessments.map(ass => {
                            const riskProps = getRiskLevelProperties(ass.riskLevel);
                            return (
                                <div key={ass.id} className="rounded-lg border bg-background p-4 space-y-3">
                                    <div className="flex justify-between items-start">
                                        <div className='space-y-1'>
                                            <p className='text-sm font-semibold'>{ass.taskDescription || 'Etapa não descrita'}</p>
                                            <p className='text-xs text-muted-foreground'>{format(ass.assessmentDate, "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}</p>
                                        </div>
                                        <div className="flex items-center shrink-0">
                                            <DialogTrigger asChild>
                                                <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-primary" aria-label="Visualizar avaliação" onClick={() => setSelectedAssessment(ass)}>
                                                    <Eye className="h-4 w-4" />
                                                </Button>
                                            </DialogTrigger>
                                            <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-primary" aria-label="Editar avaliação" onClick={() => handleEdit(ass)}>
                                                <Pencil className="h-4 w-4" />
                                            </Button>
                                            <AlertDialog>
                                                <AlertDialogTrigger asChild>
                                                    <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-destructive" aria-label="Excluir avaliação" disabled={isDeleting === ass.id}>
                                                        {isDeleting === ass.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
                                                    </Button>
                                                </AlertDialogTrigger>
                                                <AlertDialogContent>
                                                    <AlertDialogHeader>
                                                        <AlertDialogTitle>Você tem certeza?</AlertDialogTitle>
                                                        <AlertDialogDescription>Esta ação excluirá permanentemente esta avaliação de risco.</AlertDialogDescription>
                                                    </AlertDialogHeader>
                                                    <AlertDialogFooter>
                                                        <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                                        <AlertDialogAction onClick={() => handleDelete(ass.id)} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                                                            Sim, excluir
                                                        </AlertDialogAction>
                                                    </AlertDialogFooter>
                                                </AlertDialogContent>
                                            </AlertDialog>
                                        </div>
                                    </div>
                                    <div className='grid grid-cols-1 md:grid-cols-4 gap-4 text-sm'>
                                        <div><strong className='text-muted-foreground'>Causa:</strong> <p>{ass.riskSource}</p></div>
                                        <div><strong className='text-muted-foreground'>Perigo:</strong> <p>{ass.effects}</p></div>
                                        <div><strong className='text-muted-foreground'>Dano:</strong> <p>{ass.existingControls}</p></div>
                                        <div>
                                            <strong className='text-muted-foreground'>Nível de Risco:</strong>
                                            <p><Badge className={cn(riskProps.className)}>{riskProps.label}</Badge></p>
                                        </div>
                                    </div>
                                </div>
                            )
                        })}
                    </CardContent>
                </Card>
            ))}
            </div>
        ) : (
            <Card>
                <CardContent className="p-10 text-center text-muted-foreground">
                    {assessments.length === 0 ? "Nenhuma avaliação de risco registrada ainda." : "Nenhuma avaliação encontrada com os filtros selecionados."}
                </CardContent>
            </Card>
        )}
        </div>

        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Detalhes da Avaliação de Risco</DialogTitle>
          </DialogHeader>
            {selectedAssessment && (
              <>
                <ScrollArea className="max-h-[70vh] pr-6">
                  <div className="space-y-4 py-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <Label className="font-semibold text-muted-foreground">Data da Avaliação</Label>
                        <p>{format(
                          selectedAssessment.assessmentDate,
                          "dd/MM/yyyy 'às' HH:mm",
                          { locale: ptBR }
                        )}</p>
                      </div>
                      <div>
                        <Label className="font-semibold text-muted-foreground">Local</Label>
                        <p>{selectedAssessment.location}</p>
                      </div>
                    </div>
                      <div>
                        <Label className="font-semibold text-muted-foreground">Etapa da Atividade</Label>
                        <p>{selectedAssessment.taskDescription}</p>
                      </div>
                      <div>
                        <Label className="font-semibold text-muted-foreground">Causa</Label>
                        <p>{selectedAssessment.riskSource}</p>
                      </div>
                      <div>
                        <Label className="font-semibold text-muted-foreground">Perigo</Label>
                        <p>{selectedAssessment.effects}</p>
                      </div>
                      <div>
                        <Label className="font-semibold text-muted-foreground">Dano</Label>
                        <p>{selectedAssessment.existingControls}</p>
                      </div>
                      <div>
                        <Label className="font-semibold text-muted-foreground">Controle Operacional</Label>
                        <p>{selectedAssessment.recommendedControls}</p>
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
                            <div>
                              <Badge className={cn(getRiskLevelProperties(selectedAssessment.riskLevel).className)}>
                                  {getRiskLevelProperties(selectedAssessment.riskLevel).label}
                              </Badge>
                            </div>
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
            )}
        </DialogContent>
      </Dialog>
  );
}
