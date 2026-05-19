
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
import { format, differenceInDays, startOfDay, isBefore } from 'date-fns';
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
  DialogTrigger,
  DialogClose,
  DialogDescription,
} from "@/components/ui/dialog";
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import { MonthSelector } from './month-selector';
import { Label } from './ui/label';
import { ScrollArea } from './ui/scroll-area';
import { SheetFilter } from './sheet-filter';

interface Treatment {
  id: string;
  treatmentDate: Date;
  treatmentType: string;
  treatmentLocation: string;
  description: string;
  proposedTreatment: string;
  actionTaken: string;
  probability: string;
  consequence: string;
  riskLevel: number;
  situation: 'pendente' | 'finalizado';
  completionDate?: Timestamp;
}

interface TreatmentReportProps {
  onEdit: (treatment: Treatment) => void;
  preFilter?: {
    situations: string[];
  };
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
    { value: 'atrasado', label: 'Atrasado' },
];

const getSituationProperties = (situation: string) => {
    switch (situation) {
        case 'pendente':
            return { label: 'Pendente', className: 'bg-yellow-500 text-black' };
        case 'finalizado':
            return { label: 'Finalizado', className: 'bg-green-600 text-white' };
        default:
            return { label: situation, className: 'bg-muted text-muted-foreground' };
    }
}

export function TreatmentReport({ onEdit, preFilter }: TreatmentReportProps) {
  const firestore = useFirestore();
  const { user } = useUser();
  const { toast } = useToast();
  
  const [treatments, setTreatments] = useState<Treatment[]>([]);
  const [selectedTreatment, setSelectedTreatment] = useState<Treatment | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isDeleting, setIsDeleting] = useState<string | null>(null);
  const [isClient, setIsClient] = useState(false);
  const [clientToday, setClientToday] = useState<Date | null>(null);

  // Filter states
  const [filterYear, setFilterYear] = useState<string[]>([]);
  const [filterMonths, setFilterMonths] = useState<string[]>([]);
  const [filterType, setFilterType] = useState<string[]>([]);
  const [filterLocation, setFilterLocation] = useState<string[]>([]);
  const [filterRiskLevel, setFilterRiskLevel] = useState<string[]>([]);
  const [filterSituation, setFilterSituation] = useState<string[]>(preFilter?.situations || []);
  
  // Dynamic options for selects
  const [availableYears, setAvailableYears] = useState<string[]>([]);
  const [treatmentTypes, setTreatmentTypes] = useState<string[]>([]);
  const [locations, setLocations] = useState<string[]>([]);

  useEffect(() => {
    setIsClient(true);
    setClientToday(startOfDay(new Date()));
  }, []);
  
  useEffect(() => {
    if (preFilter?.situations) {
      setFilterSituation(preFilter.situations);
    }
  }, [preFilter]);

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
          setData((data[field] || []).sort((a: string, b: string) => a.localeCompare(b)));
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
          : new Date(0); 

        return {
          id: doc.id,
          ...data,
          treatmentDate,
        } as Treatment;
      });

      const years = new Set(
        treatmentsData
          .map(occ => occ.treatmentDate?.getFullYear())
          .filter((year): year is number => !!year)
          .map(String)
      );
      setAvailableYears(Array.from(years).sort((a, b) => Number(b) - Number(a)));
      
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
      if (!clientToday) return false;

      const occDate = occ.treatmentDate;
      if (!occDate) return false;

      const yearMatch = filterYear.length === 0 || filterYear.includes(occDate.getFullYear().toString());
      const monthMatch = filterMonths.length === 0 || filterMonths.includes(occDate.getMonth().toString());
      const typeMatch = filterType.length === 0 || filterType.includes(occ.treatmentType);
      const locationMatch = filterLocation.length === 0 || filterLocation.includes(occ.treatmentLocation);
      
      const riskLevelMatch = filterRiskLevel.length === 0 || filterRiskLevel.some((level) => {
        const score = occ.riskLevel;
        if (level === 'alta') return score >= 15;
        if (level === 'media') return score >= 8 && score < 15;
        if (level === 'baixa') return score > 0 && score < 8;
        return false;
      });

      const isOverdue = occ.situation === 'pendente' && occ.completionDate && isBefore(startOfDay(occ.completionDate.toDate()), clientToday);

      const situationMatch = filterSituation.length === 0 || filterSituation.some(s => {
        if (s === 'atrasado') return isOverdue;
        if (s === 'pendente') return occ.situation === 'pendente' && !isOverdue;
        if (s === 'finalizado') return occ.situation === 'finalizado';
        return false;
      });

      return yearMatch && monthMatch && typeMatch && locationMatch && riskLevelMatch && situationMatch;
    });
  }, [treatments, filterYear, filterMonths, filterType, filterLocation, filterRiskLevel, filterSituation, clientToday]);

  const clearFilters = () => {
    setFilterYear([]);
    setFilterMonths([]);
    setFilterType([]);
    setFilterLocation([]);
    setFilterRiskLevel([]);
    setFilterSituation([]);
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
    <div className="space-y-6 w-full max-w-full overflow-x-hidden">
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
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 items-end">
            <div className="space-y-2">
                <Label>Filtrar Ano</Label>
                <SheetFilter
                    title='Filtrar Anos'
                    options={availableYears.map(y => ({ value: y, label: y }))}
                    selected={filterYear}
                    onChange={setFilterYear}
                    disabled={isLoading || availableYears.length === 0}
                    buttonText='Filtrar por Ano'
                />
            </div>
            <div className="space-y-2">
                <Label>Filtrar por Tipo de Risco</Label>
                <SheetFilter
                    title='Filtrar Tipos de Risco'
                    options={treatmentTypes.map(t => ({ value: t, label: t }))}
                    selected={filterType}
                    onChange={setFilterType}
                    disabled={!treatmentTypes || treatmentTypes.length === 0}
                    buttonText='Filtrar por Tipo'
                />
            </div>
             <div className="space-y-2">
                <Label>Nível de Risco (PxC)</Label>
                <SheetFilter
                    title='Filtrar Níveis de Risco'
                    options={riskLevelOptions}
                    selected={filterRiskLevel}
                    onChange={setFilterRiskLevel}
                    buttonText='Filtrar por Nível'
                />
            </div>
            <div className="space-y-2">
                <Label>Filtrar por Local</Label>
                <SheetFilter
                    title='Filtrar Locais'
                    options={locations.map(l => ({ value: l, label: l }))}
                    selected={filterLocation}
                    onChange={setFilterLocation}
                    disabled={!locations || locations.length === 0}
                    buttonText='Filtrar por Local'
                />
            </div>
            <div className="space-y-2">
                <Label>Filtrar por Situação</Label>
                 <SheetFilter
                    title='Filtrar Situações'
                    options={situationOptions}
                    selected={filterSituation}
                    onChange={setFilterSituation}
                    buttonText='Filtrar por Situação'
                />
            </div>
            
            <Button onClick={clearFilters} variant="outline" className="w-full">
              Limpar Filtros
            </Button>
          </div>
        </CardContent>
      </Card>

      <Dialog>
        <Card>
          <CardHeader>
            <CardTitle>Resultados</CardTitle>
            <CardDescription>
              Foram encontrados {filteredTreatments.length} tratamentos.
            </CardDescription>
          </CardHeader>
          <CardContent className="p-0 md:p-6 md:pt-0">
            {/* Adicionado wrapper para scroll horizontal em telas pequenas */}
            {/* A largura mínima evita que as fontes diminuam no celular */}
            <div className="max-h-[65vh] overflow-y-auto md:max-h-none overflow-x-auto w-full border-t md:border-none">
              <Table className="min-w-[800px] md:min-w-full">
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
                  {isLoading || !clientToday ? (
                    renderSkeletons()
                  ) : filteredTreatments.length > 0 ? (
                    filteredTreatments.map((occ) => {
                      const riskProps = getRiskLevelProperties(occ.riskLevel);
                      
                      let situationContent;
                      const completionDate = occ.completionDate?.toDate();

                      if (occ.situation === 'pendente') {
                        if (clientToday && completionDate) {
                          const daysUntil = differenceInDays(startOfDay(completionDate), clientToday);
                          if (daysUntil < 0) {
                            situationContent = (
                              <Badge className="bg-red-600 text-white">Atrasado</Badge>
                            );
                          } else {
                            situationContent = (
                              <div className="flex flex-col items-start gap-1">
                                <Badge className={cn(getSituationProperties('pendente').className)}>
                                  Pendente
                                </Badge>
                                <span className="text-xs text-muted-foreground">
                                  {daysUntil === 0 ? 'Vence hoje' : `Vence em ${daysUntil} dia(s)`}
                                </span>
                              </div>
                            );
                          }
                        } else {
                          // Pendente sem data de conclusão
                          situationContent = (
                            <Badge className={cn(getSituationProperties('pendente').className)}>
                                Pendente
                            </Badge>
                          );
                        }
                      } else { // situation is 'finalizado'
                        situationContent = (
                          <Badge className={cn(getSituationProperties('finalizado').className)}>
                            {getSituationProperties('finalizado').label}
                          </Badge>
                        );
                      }

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
                            {situationContent}
                          </TableCell>
                          <TableCell className="text-right">
                            <DialogTrigger asChild>
                              <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-primary" aria-label="Visualizar tratamento" onClick={() => setSelectedTreatment(occ)}>
                                  <Eye className="h-4 w-4" />
                              </Button>
                            </DialogTrigger>
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
            </div>
          </CardContent>
        </Card>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Detalhes do Tratamento de Risco</DialogTitle>
            <DialogDescription>
              Visualização detalhada do registro de tratamento de risco.
            </DialogDescription>
          </DialogHeader>
          {selectedTreatment && (
            <>
              <ScrollArea className="max-h-[70vh] pr-6">
                <div className="space-y-4 py-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <Label className="font-semibold text-muted-foreground">Data da Identificação</Label>
                        <p>{format(selectedTreatment.treatmentDate, 'dd/MM/yyyy', { locale: ptBR })}</p>
                      </div>
                      <div>
                        <Label className="font-semibold text-muted-foreground">Local</Label>
                        <p>{selectedTreatment.treatmentLocation}</p>
                      </div>
                      <div>
                        <Label className="font-semibold text-muted-foreground">Tipo de Risco</Label>
                        <p>{selectedTreatment.treatmentType}</p>
                      </div>
                      <div>
                        <Label className="font-semibold text-muted-foreground">Situação</Label>
                        <div>
                          <Badge className={cn(getSituationProperties(selectedTreatment.situation).className)}>
                            {getSituationProperties(selectedTreatment.situation).label}
                          </Badge>
                        </div>
                      </div>
                      {selectedTreatment.situation === 'pendente' && selectedTreatment.completionDate && (
                        <div>
                          <Label className="font-semibold text-muted-foreground">Prazo para Conclusão</Label>
                          <p>{format(selectedTreatment.completionDate.toDate(), 'dd/MM/yyyy', { locale: ptBR })}</p>
                        </div>
                      )}
                  </div>
                  <div>
                      <Label className="font-semibold text-muted-foreground">Descrição do Risco</Label>
                      <p className="whitespace-pre-wrap">{selectedTreatment.description || 'Não informado'}</p>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 border-t pt-4 mt-4">
                      <div>
                          <Label className="font-semibold text-muted-foreground">Probabilidade</Label>
                          <p>{selectedTreatment.probability}</p>
                      </div>
                      <div>
                          <Label className="font-semibold text-muted-foreground">Consequência</Label>
                          <p>{selectedTreatment.consequence}</p>
                      </div>
                      <div>
                          <Label className="font-semibold text-muted-foreground">Nível de Risco</Label>
                          <div>
                            <Badge className={cn(getRiskLevelProperties(selectedTreatment.riskLevel).className)}>
                                {getRiskLevelProperties(selectedTreatment.riskLevel).label}
                            </Badge>
                          </div>
                      </div>
                  </div>
                  <div>
                      <Label className="font-semibold text-muted-foreground">Tratamento Proposto</Label>
                      <p className="whitespace-pre-wrap">{selectedTreatment.proposedTreatment || 'Não informado'}</p>
                  </div>
                  <div>
                      <Label className="font-semibold text-muted-foreground">Ação Realizada</Label>
                      <p className="whitespace-pre-wrap">{selectedTreatment.actionTaken || 'Não informado'}</p>
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
    </div>
  );
}

    