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

interface Treatment {
  id: string;
  treatmentDate: Date;
  treatmentType: string;
  treatmentLocation: string;
  riskLevel: number;
  situation: 'pendente' | 'finalizado' | 'reaberto';
}

interface TreatmentReportProps {
  onEdit: (treatment: Treatment) => void;
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

export function TreatmentReport({ onEdit }: TreatmentReportProps) {
  const firestore = useFirestore();
  const { user } = useUser();
  const { toast } = useToast();
  
  const [treatments, setTreatments] = useState<Treatment[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isDeleting, setIsDeleting] = useState<string | null>(null);

  // Filter states
  const [filterMonths, setFilterMonths] = useState<string[]>([]);
  const [filterTypes, setFilterTypes] = useState<string[]>([]);
  const [filterLocations, setFilterLocations] = useState<string[]>([]);
  const [filterRiskLevels, setFilterRiskLevels] = useState<string[]>([]);
  const [filterSituations, setFilterSituations] = useState<string[]>([]);
  
  // Dynamic options for selects
  const [treatmentTypes, setTreatmentTypes] = useState<string[]>([]);
  const [locations, setLocations] = useState<string[]>([]);

  const getSettingsDocRef = useCallback((collectionName: string) => {
    if (!firestore || !user) return null;
    return doc(firestore, 'sgs_genius', user.uid, 'settings', collectionName);
  }, [firestore, user]);

  // Fetch dynamic options for filters
  useEffect(() => {
    // Re-using occurrence types for now. Should be a separate collection for treatment types
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
    fetchSelectOptions('occurrenceTypes', setTreatmentTypes, 'types');
    fetchSelectOptions('locations', setLocations, 'locations');
  }, [getSettingsDocRef]);
  
  // Fetch all treatments with real-time updates
  useEffect(() => {
    if (!user || !firestore) return;
    setIsLoading(true);

    const treatmentsCollectionRef = collection(firestore, 'sgs_genius', user.uid, 'risk_treatments');
    
    const unsubscribe = onSnapshot(treatmentsCollectionRef, (querySnapshot) => {
      const treatmentsData = querySnapshot.docs.map(doc => {
        const data = doc.data();
        const treatmentDate = data.treatmentDate instanceof Timestamp 
          ? data.treatmentDate.toDate() 
          : new Date(); 

        return {
          id: doc.id,
          ...data,
          treatmentDate,
        } as Treatment;
      });
      
      setTreatments(treatmentsData.sort((a, b) => b.treatmentDate.getTime() - a.treatmentDate.getTime()));
      setIsLoading(false);
    }, (error) => {
        console.error("Error fetching real-time treatments:", error);
        toast({
            variant: "destructive",
            title: "Erro de conexão",
            description: "Não foi possível buscar os tratamentos em tempo real."
        });
        setIsLoading(false);
    });
    
    return () => unsubscribe();
  }, [user, firestore, toast]);

  const filteredTreatments = useMemo(() => {
    return treatments.filter(occ => {
      const occDate = occ.treatmentDate;
      if (!occDate) return false;

      const monthMatch = filterMonths.length === 0 || filterMonths.includes(occDate.getMonth().toString());
      const typeMatch = filterTypes.length === 0 || filterTypes.includes(occ.treatmentType);
      const locationMatch = filterLocations.length === 0 || filterLocations.includes(occ.treatmentLocation);
      const situationMatch = filterSituations.length === 0 || filterSituations.includes(occ.situation);
      
      const riskLevelMatch = filterRiskLevels.length === 0 || filterRiskLevels.some(level => {
        const score = occ.riskLevel;
        if (level === 'alta') return score >= 15;
        if (level === 'media') return score >= 8 && score < 15;
        if (level === 'baixa') return score > 0 && score < 8;
        return false;
      });

      return monthMatch && typeMatch && locationMatch && riskLevelMatch && situationMatch;
    });
  }, [treatments, filterMonths, filterTypes, filterLocations, filterRiskLevels, filterSituations]);

  const clearFilters = () => {
    setFilterMonths([]);
    setFilterTypes([]);
    setFilterLocations([]);
    setFilterRiskLevels([]);
    setFilterSituations([]);
  }

  const handleDelete = async (treatmentId: string) => {
    if (!firestore || !user) {
      toast({ variant: 'destructive', title: 'Erro', description: 'Usuário não autenticado.'});
      return;
    }
    setIsDeleting(treatmentId);
    try {
      const docRef = doc(firestore, 'sgs_genius', user.uid, 'risk_treatments', treatmentId);
      await deleteDoc(docRef);
      
      toast({
        title: 'Sucesso!',
        description: 'Tratamento excluído com sucesso.',
      });
    } catch (error) {
      console.error("Error deleting treatment:", error);
      toast({
        variant: 'destructive',
        title: 'Erro ao excluir',
        description: 'Não foi possível excluir o tratamento.',
      });
    } finally {
      setIsDeleting(null);
    }
  };

  const handleEdit = (treatment: Treatment) => {
    onEdit(treatment);
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
          <CardTitle>Relatório de Tratamentos de Risco</CardTitle>
          <CardDescription>
            Filtre e visualize os tratamentos registrados no sistema.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>Filtrar por Mês</Label>
            <MonthSelector selectedMonths={filterMonths} onMonthChange={setFilterMonths} />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-2 lg:grid-cols-4 gap-4 items-end">
            <MultiSelectFilter
              placeholder="Filtrar por Tipo de Risco"
              options={treatmentTypes.map(t => ({ value: t, label: t }))}
              selected={filterTypes}
              onChange={setFilterTypes}
              disabled={!treatmentTypes || treatmentTypes.length === 0}
            />
            <MultiSelectFilter
              placeholder="Filtrar por Local"
              options={locations.map(l => ({ value: l, label: l }))}
              selected={filterLocations}
              onChange={setFilterLocations}
              disabled={!locations || locations.length === 0}
            />
            <MultiSelectFilter
              placeholder="Filtrar por Nível de Risco (PxC)"
              options={riskLevelOptions}
              selected={filterRiskLevels}
              onChange={setFilterRiskLevels}
            />
            <MultiSelectFilter
              placeholder="Filtrar por Situação"
              options={situationOptions}
              selected={filterSituations}
              onChange={setFilterSituations}
            />
            
            <Button onClick={clearFilters} variant="outline" className="w-full lg:col-start-4">
              Limpar Filtros
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Resultados</CardTitle>
          <CardDescription>
            Foram encontrados {filteredTreatments.length} tratamentos.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Data</TableHead>
                <TableHead>Tipo de Risco</TableHead>
                <TableHead>Local</TableHead>
                <TableHead>Nível de Risco</TableHead>
                <TableHead>Situação</TableHead>
                <TableHead className="text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                renderSkeletons()
              ) : filteredTreatments.length > 0 ? (
                filteredTreatments.map((occ) => {
                  const riskProps = getRiskLevelProperties(occ.riskLevel);
                  const situationProps = getSituationProperties(occ.situation);
                  return (
                    <TableRow key={occ.id}>
                      <TableCell>{occ.treatmentDate ? format(occ.treatmentDate, 'dd/MM/yyyy', { locale: ptBR }) : 'N/A'}</TableCell>
                      <TableCell>{occ.treatmentType}</TableCell>
                      <TableCell>{occ.treatmentLocation}</TableCell>
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
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-primary" aria-label="Editar tratamento" onClick={() => handleEdit(occ)}>
                            <Pencil className="h-4 w-4" />
                        </Button>
                        <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-8 w-8 text-muted-foreground hover:text-destructive"
                                  aria-label="Excluir tratamento"
                                  disabled={isDeleting === occ.id}
                                >
                                  {isDeleting === occ.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                                <AlertDialogHeader>
                                    <AlertDialogTitle>Você tem certeza?</AlertDialogTitle>
                                    <AlertDialogDescription>
                                    Esta ação não pode ser desfeita. Isso excluirá permanentemente o registro de tratamento do dia <span className="font-semibold">{occ.treatmentDate ? format(occ.treatmentDate, 'dd/MM/yyyy') : ''}</span>.
                                    </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                    <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                    <AlertDialogAction 
                                        onClick={() => handleDelete(occ.id)}
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
                    {treatments.length === 0 ? "Nenhum tratamento registrado ainda." : "Nenhum tratamento encontrado com os filtros selecionados."}
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
