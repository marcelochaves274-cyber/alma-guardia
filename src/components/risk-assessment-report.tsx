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
import { Pencil, Trash2, Loader2 } from 'lucide-react';
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
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import { MultiSelectFilter } from './multi-select-filter';
import { MonthSelector } from './month-selector';
import { Label } from './ui/label';

interface RiskAssessment {
  id: string;
  assessmentDate: Date;
  riskType: string;
  location: string;
  riskLevel: number;
  situation: 'pendente' | 'finalizado' | 'reaberto';
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

const riskLevelOptions = [
    { value: 'alta', label: 'Alta' },
    { value: 'media', label: 'Média' },
    { value: 'baixa', label: 'Baixa' },
];

const situationOptions = [
    { value: 'pendente', label: 'Pendente' },
    { value: 'finalizado', label: 'Finalizado' },
    { value: 'reaberto', label: 'Reaberto' },
];

const getSituationProperties = (situation: string) => {
    switch (situation) {
        case 'pendente':
            return { label: 'Pendente', className: 'bg-yellow-500 text-black' };
        case 'finalizado':
            return { label: 'Finalizado', className: 'bg-green-600 text-white' };
        case 'reaberto':
            return { label: 'Reaberto', className: 'bg-blue-600 text-white' };
        default:
            return { label: situation, className: 'bg-muted text-muted-foreground' };
    }
}

export function RiskAssessmentReport({ onEdit }: RiskAssessmentReportProps) {
  const firestore = useFirestore();
  const { user } = useUser();
  const { toast } = useToast();
  
  const [assessments, setAssessments] = useState<RiskAssessment[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isDeleting, setIsDeleting] = useState<string | null>(null);

  // Filter states
  const [filterYears, setFilterYears] = useState<string[]>([]);
  const [filterMonths, setFilterMonths] = useState<string[]>([]);
  const [filterTypes, setFilterTypes] = useState<string[]>([]);
  const [filterLocations, setFilterLocations] = useState<string[]>([]);
  const [filterRiskLevels, setFilterRiskLevels] = useState<string[]>([]);
  const [filterSituations, setFilterSituations] = useState<string[]>([]);
  
  // Dynamic options for selects
  const [availableYears, setAvailableYears] = useState<string[]>([]);
  const [riskTypes, setRiskTypes] = useState<string[]>([]);
  const [locations, setLocations] = useState<string[]>([]);

  const getSettingsDocRef = useCallback((collectionName: string) => {
    if (!firestore || !user) return null;
    return doc(firestore, 'sgs_genius', user.uid, 'settings', collectionName);
  }, [firestore, user]);

  useEffect(() => {
    const fetchSelectOptions = async (docName: string, setData: (data: string[]) => void, field: 'types' | 'locations') => {
      const docRef = getSettingsDocRef(docName);
      if (!docRef) return;
      try {
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
          const data = docSnap.data();
          setData(data[field] || []);
        }
      } catch (error) {
        console.error(`Error fetching ${docName}:`, error);
      }
    };
    fetchSelectOptions('occurrenceTypes', setRiskTypes, 'types');
    fetchSelectOptions('locations', setLocations, 'locations');
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
          : new Date(); 

        return {
          id: doc.id,
          ...data,
          assessmentDate,
        } as RiskAssessment;
      });

      const years = new Set(
        assessmentsData
          .map(ass => ass.assessmentDate?.getFullYear())
          .filter((year): year is number => !!year)
          .map(String)
      );
      setAvailableYears(Array.from(years).sort((a, b) => Number(b) - Number(a)));
      
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

  const filteredAssessments = useMemo(() => {
    return assessments.filter(ass => {
      const assDate = ass.assessmentDate;
      if (!assDate) return false;

      const yearMatch = filterYears.length === 0 || filterYears.includes(assDate.getFullYear().toString());
      const monthMatch = filterMonths.length === 0 || filterMonths.includes(assDate.getMonth().toString());
      const typeMatch = filterTypes.length === 0 || filterTypes.includes(ass.riskType);
      const locationMatch = filterLocations.length === 0 || filterLocations.includes(ass.location);
      const situationMatch = filterSituations.length === 0 || filterSituations.includes(ass.situation);
      
      const riskLevelMatch = filterRiskLevels.length === 0 || filterRiskLevels.some(level => {
        const score = ass.riskLevel;
        if (level === 'alta') return score >= 15;
        if (level === 'media') return score >= 8 && score < 15;
        if (level === 'baixa') return score > 0 && score < 8;
        return false;
      });

      return yearMatch && monthMatch && typeMatch && locationMatch && riskLevelMatch && situationMatch;
    });
  }, [assessments, filterYears, filterMonths, filterTypes, filterLocations, filterRiskLevels, filterSituations]);

  const clearFilters = () => {
    setFilterYears([]);
    setFilterMonths([]);
    setFilterTypes([]);
    setFilterLocations([]);
    setFilterRiskLevels([]);
    setFilterSituations([]);
  }

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
  
  const renderSkeletons = () => (
    Array.from({ length: 5 }).map((_, i) => (
      <TableRow key={i}>
        <TableCell><Skeleton className="h-5 w-24" /></TableCell>
        <TableCell><Skeleton className="h-5 w-32" /></TableCell>
        <TableCell><Skeleton className="h-5 w-32" /></TableCell>
        <TableCell><Skeleton className="h-5 w-24" /></TableCell>
        <TableCell><Skeleton className="h-5 w-24" /></TableCell>
        <TableCell><Skeleton className="h-5 w-20" /></TableCell>
      </TableRow>
    ))
  );

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Relatório de Avaliação de Risco</CardTitle>
          <CardDescription>
            Filtre e visualize as avaliações de risco registradas no sistema.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>Filtrar por Mês</Label>
            <MonthSelector selectedMonths={filterMonths} onMonthChange={setFilterMonths} />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 items-end">
            <MultiSelectFilter
              placeholder="Filtrar Ano"
              options={availableYears.map(y => ({ value: y, label: y }))}
              selected={filterYears}
              onChange={setFilterYears}
              disabled={availableYears.length === 0}
            />
            <MultiSelectFilter
              placeholder="Filtrar por Tipo de Risco"
              options={riskTypes.map(t => ({ value: t, label: t }))}
              selected={filterTypes}
              onChange={setFilterTypes}
              disabled={!riskTypes || riskTypes.length === 0}
            />
            <MultiSelectFilter
              placeholder="Nível de Risco (PxC)"
              options={riskLevelOptions}
              selected={filterRiskLevels}
              onChange={setFilterRiskLevels}
            />
            <MultiSelectFilter
              placeholder="Filtrar por Local"
              options={locations.map(l => ({ value: l, label: l }))}
              selected={filterLocations}
              onChange={setFilterLocations}
              disabled={!locations || locations.length === 0}
            />
            <MultiSelectFilter
              placeholder="Filtrar por Situação"
              options={situationOptions}
              selected={filterSituations}
              onChange={setFilterSituations}
            />
            
            <Button onClick={clearFilters} variant="outline" className="w-full">
              Limpar Filtros
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Resultados</CardTitle>
          <CardDescription>
            Foram encontradas {filteredAssessments.length} avaliações.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Data</TableHead>
                <TableHead>Local</TableHead>
                <TableHead>Tipo de Risco</TableHead>
                <TableHead>Nível de Risco</TableHead>
                <TableHead>Situação</TableHead>
                <TableHead className="text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                renderSkeletons()
              ) : filteredAssessments.length > 0 ? (
                filteredAssessments.map((ass) => {
                  const riskProps = getRiskLevelProperties(ass.riskLevel);
                  const situationProps = getSituationProperties(ass.situation);
                  return (
                    <TableRow key={ass.id}>
                      <TableCell>{ass.assessmentDate ? format(ass.assessmentDate, 'dd/MM/yyyy', { locale: ptBR }) : 'N/A'}</TableCell>
                      <TableCell>{ass.location}</TableCell>
                      <TableCell>{ass.riskType}</TableCell>
                      <TableCell>
                          <Badge className={cn(riskProps.className)}>
                              {riskProps.label}
                          </Badge>
                      </TableCell>
                       <TableCell>
                          <Badge className={cn(situationProps.className)}>
                              {situationProps.label}
                          </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-primary" aria-label="Editar avaliação" onClick={() => handleEdit(ass)}>
                            <Pencil className="h-4 w-4" />
                        </Button>
                        <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-8 w-8 text-muted-foreground hover:text-destructive"
                                  aria-label="Excluir avaliação"
                                  disabled={isDeleting === ass.id}
                                >
                                  {isDeleting === ass.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                                <AlertDialogHeader>
                                    <AlertDialogTitle>Você tem certeza?</AlertDialogTitle>
                                    <AlertDialogDescription>
                                    Esta ação não pode ser desfeita. Isso excluirá permanentemente o registro da avaliação de risco do dia <span className="font-semibold">{ass.assessmentDate ? format(ass.assessmentDate, 'dd/MM/yyyy') : ''}</span>.
                                    </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                    <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                    <AlertDialogAction 
                                        onClick={() => handleDelete(ass.id)}
                                        className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                    >
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
                  <TableCell colSpan={6} className="h-24 text-center">
                    {assessments.length === 0 ? "Nenhuma avaliação registrada ainda." : "Nenhuma avaliação encontrada com os filtros selecionados."}
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
