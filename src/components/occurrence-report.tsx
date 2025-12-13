'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { useFirestore, useUser } from '@/firebase';
import { collection, getDoc, doc, Timestamp, deleteDoc, onSnapshot } from 'firebase/firestore';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Skeleton } from './ui/skeleton';
import { Badge } from './ui/badge';
import { Button } from './ui/button';
import { Pencil, Trash2, Loader2, Eye } from 'lucide-react';
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
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogClose,
} from "@/components/ui/dialog";
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import { MonthSelector } from './month-selector';
import { Label } from './ui/label';
import { ScrollArea } from './ui/scroll-area';
import { SheetFilter } from './sheet-filter';


interface Occurrence {
  id: string;
  occurrenceDate: Date;
  occurrenceType: string;
  occurrenceLocation: string;
  involvedPersonName: string;
  analysis: 'alta' | 'media' | 'baixa';
  description: string;
  ageGroup: string;
  birthDate: string;
  cpf: string;
  city: string;
  state: string;
  phone: string;
}

interface OccurrenceReportProps {
  onEdit: (occurrence: Occurrence) => void;
}

const analysisMapping: Record<string, { label: string, className: string }> = {
    alta: { label: 'Alta', className: 'bg-red-500 text-white hover:bg-red-600' },
    media: { label: 'Média', className: 'bg-orange-500 text-white hover:bg-orange-600' },
    baixa: { label: 'Baixa', className: 'bg-yellow-500 text-black hover:bg-yellow-600' }
};

const ageGroupOptions = [
    { value: 'crianca', label: 'Criança (0-12)' },
    { value: 'adolescente', label: 'Adolescente (13-17)' },
    { value: 'adulto1', label: 'Adulto (18-39)' },
    { value: 'adulto2', label: 'Adulto (40-59)' },
    { value: 'idoso', label: 'Idoso (60+)' },
];

export function OccurrenceReport({ onEdit }: OccurrenceReportProps) {
  const firestore = useFirestore();
  const { user } = useUser();
  const { toast } = useToast();
  
  const [occurrences, setOccurrences] = useState<Occurrence[]>([]);
  const [selectedOccurrence, setSelectedOccurrence] = useState<Occurrence | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isDeleting, setIsDeleting] = useState<string | null>(null);
  const [isClient, setIsClient] = useState(false);

  // Filter states
  const [filterYear, setFilterYear] = useState<string[]>([]);
  const [filterMonths, setFilterMonths] = useState<string[]>([]);
  const [filterType, setFilterType] = useState<string[]>([]);
  const [filterLocation, setFilterLocation] = useState<string[]>([]);
  const [filterName, setFilterName] = useState<string>('');
  const [filterAnalysis, setFilterAnalysis] = useState<string[]>([]);
  const [filterAgeGroup, setFilterAgeGroup] = useState<string[]>([]);
  
  // Dynamic options for selects
  const [availableYears, setAvailableYears] = useState<string[]>([]);
  const [occurrenceTypes, setOccurrenceTypes] = useState<string[]>([]);
  const [locations, setLocations] = useState<string[]>([]);

  useEffect(() => {
    setIsClient(true);
  }, []);

  const getSettingsDocRef = useCallback((collectionName: string) => {
    if (!firestore || !user) return null;
    return doc(firestore, 'sgs_genius', user.uid, 'settings', collectionName);
  }, [firestore, user]);

  // Fetch dynamic options for filters
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
    fetchSelectOptions('occurrenceTypes', setOccurrenceTypes, 'types');
    fetchSelectOptions('locations', setLocations, 'locations');
  }, [getSettingsDocRef]);
  
  // Fetch all occurrences with real-time updates
  useEffect(() => {
    if (!user || !firestore) return;
    setIsLoading(true);

    const occurrencesCollectionRef = collection(firestore, 'sgs_genius', user.uid, 'chat_messages');
    
    const unsubscribe = onSnapshot(occurrencesCollectionRef, (querySnapshot) => {
      const occurrencesData = querySnapshot.docs.map(doc => {
        const data = doc.data();
        const occurrenceDate = data.occurrenceDate instanceof Timestamp 
          ? data.occurrenceDate.toDate() 
          : new Date(0); 

        return {
          id: doc.id,
          ...data,
          occurrenceDate: occurrenceDate,
        } as Occurrence;
      });
      
      const years = new Set(
        occurrencesData
          .map(occ => occ.occurrenceDate?.getFullYear())
          .filter((year): year is number => !!year)
          .map(String)
      );
      setAvailableYears(Array.from(years).sort((a, b) => Number(b) - Number(a)));

      setOccurrences(occurrencesData.sort((a, b) => b.occurrenceDate.getTime() - a.occurrenceDate.getTime()));
      setIsLoading(false);
    }, (error) => {
        console.error("Error fetching real-time occurrences:", error);
        toast({
            variant: "destructive",
            title: "Erro de conexão",
            description: "Não foi possível buscar as ocorrências em tempo real."
        });
        setIsLoading(false);
    });
    
    return () => unsubscribe();
  }, [user, firestore, toast]);

  const filteredOccurrences = useMemo(() => {
    return occurrences.filter(occ => {
      const occDate = occ.occurrenceDate;
      if (!occDate || !isClient) return false;

      const yearMatch = filterYear.length === 0 || filterYear.includes(occDate.getFullYear().toString());
      const monthMatch = filterMonths.length === 0 || filterMonths.includes(occDate.getMonth().toString());
      const typeMatch = filterType.length === 0 || filterType.includes(occ.occurrenceType);
      const locationMatch = filterLocation.length === 0 || filterLocation.includes(occ.occurrenceLocation);
      const analysisMatch = filterAnalysis.length === 0 || filterAnalysis.includes(occ.analysis);
      const nameMatch = !filterName || occ.involvedPersonName?.toLowerCase().includes(filterName.toLowerCase());
      const ageGroupMatch = filterAgeGroup.length === 0 || filterAgeGroup.includes(occ.ageGroup);

      return yearMatch && monthMatch && typeMatch && locationMatch && analysisMatch && nameMatch && ageGroupMatch;
    });
  }, [occurrences, filterYear, filterMonths, filterType, filterLocation, filterName, filterAnalysis, filterAgeGroup, isClient]);

  const clearFilters = () => {
    setFilterYear([]);
    setFilterMonths([]);
    setFilterType([]);
    setFilterLocation([]);
    setFilterName('');
    setFilterAnalysis([]);
    setFilterAgeGroup([]);
  }

  const handleDelete = async (occurrenceId: string) => {
    if (!firestore || !user) {
      toast({ variant: 'destructive', title: 'Erro', description: 'Usuário não autenticado.'});
      return;
    }
    setIsDeleting(occurrenceId);
    try {
      const docRef = doc(firestore, 'sgs_genius', user.uid, 'chat_messages', occurrenceId);
      await deleteDoc(docRef);
      
      toast({
        title: 'Sucesso!',
        description: 'Ocorrência excluída com sucesso.',
      });
    } catch (error) {
      console.error("Error deleting occurrence:", error);
      toast({
        variant: 'destructive',
        title: 'Erro ao excluir',
        description: 'Não foi possível excluir a ocorrência.',
      });
    } finally {
      setIsDeleting(null);
    }
  };

  const handleEdit = (occurrence: Occurrence) => {
    onEdit(occurrence);
  };
  
  const renderSkeletons = () => (
    Array.from({ length: 5 }).map((_, i) => (
      <TableRow key={i}>
        <TableCell><Skeleton className="h-5 w-24" /></TableCell>
        <TableCell><Skeleton className="h-5 w-32" /></TableCell>
        <TableCell><Skeleton className="h-5 w-32" /></TableCell>
        <TableCell><Skeleton className="h-5 w-20" /></TableCell>
        <TableCell><Skeleton className="h-5 w-24" /></TableCell>
        <TableCell><Skeleton className="h-5 w-16" /></TableCell>
        <TableCell><Skeleton className="h-5 w-20" /></TableCell>
      </TableRow>
    ))
  );

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Relatório de Ocorrências</CardTitle>
          <CardDescription>
            Filtre e visualize as ocorrências registradas no sistema.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>Filtrar por Mês</Label>
            <MonthSelector selectedMonths={filterMonths} onMonthChange={setFilterMonths} />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 items-end">
            <div className='space-y-2'>
                <Label>Filtrar por Local</Label>
                <SheetFilter
                  title='Filtrar Locais'
                  options={locations.map(l => ({ value: l, label: l }))}
                  selected={filterLocation}
                  onChange={setFilterLocation}
                  disabled={locations.length === 0}
                  buttonText='Filtrar por Local'
                />
            </div>
            <div className='space-y-2'>
                <Label>Filtrar por Ano</Label>
                <SheetFilter
                    title='Filtrar Anos'
                    options={availableYears.map(y => ({ value: y, label: y }))}
                    selected={filterYear}
                    onChange={setFilterYear}
                    disabled={isLoading || availableYears.length === 0}
                    buttonText='Filtrar por Ano'
                />
            </div>
            <div className='space-y-2'>
                <Label>Filtrar por Tipo</Label>
                 <SheetFilter
                    title='Filtrar Tipos'
                    options={occurrenceTypes.map(t => ({ value: t, label: t }))}
                    selected={filterType}
                    onChange={setFilterType}
                    disabled={!occurrenceTypes || occurrenceTypes.length === 0}
                    buttonText='Filtrar por Tipo'
                />
            </div>
            <div className='space-y-2'>
                <Label>Filtrar por Análise</Label>
                <SheetFilter
                    title='Filtrar Análises'
                    options={Object.entries(analysisMapping).map(([key, {label}]) => ({ value: key, label: label }))}
                    selected={filterAnalysis}
                    onChange={setFilterAnalysis}
                    buttonText='Filtrar por Análise'
                />
            </div>
            <div className='space-y-2'>
                <Label>Filtrar Faixa Etária</Label>
                 <SheetFilter
                    title='Filtrar Faixa Etária'
                    options={ageGroupOptions}
                    selected={filterAgeGroup}
                    onChange={setFilterAgeGroup}
                    buttonText='Filtrar Faixa Etária'
                />
            </div>
            
            <div className="space-y-2 lg:col-span-2">
                <Label>Filtrar por Nome</Label>
                <Input
                    placeholder="Nome do envolvido"
                    value={filterName}
                    onChange={(e) => setFilterName(e.target.value)}
                />
            </div>
            
            <Button onClick={clearFilters} variant="outline" className="w-full">
              Limpar Filtros
            </Button>
          </div>
        </CardContent>
      </Card>

      <Dialog onOpenChange={() => setSelectedOccurrence(null)}>
        <Card>
          <CardHeader>
            <CardTitle>Resultados</CardTitle>
            <CardDescription>
              Foram encontradas {filteredOccurrences.length} ocorrências.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Data</TableHead>
                  <TableHead>Tipo</TableHead>
                  <TableHead>Local</TableHead>
                  <TableHead>Envolvido</TableHead>
                  <TableHead>Faixa Etária</TableHead>
                  <TableHead>Análise</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  renderSkeletons()
                ) : filteredOccurrences.length > 0 ? (
                  filteredOccurrences.map((occ) => (
                    <TableRow key={occ.id}>
                      <TableCell>{occ.occurrenceDate ? format(occ.occurrenceDate, 'dd/MM/yyyy', { locale: ptBR }) : 'N/A'}</TableCell>
                      <TableCell>{occ.occurrenceType}</TableCell>
                      <TableCell>{occ.occurrenceLocation}</TableCell>
                      <TableCell>{occ.involvedPersonName}</TableCell>
                      <TableCell>{ageGroupOptions.find(o => o.value === occ.ageGroup)?.label || occ.ageGroup}</TableCell>
                      <TableCell>
                        {occ.analysis && analysisMapping[occ.analysis] ? (
                            <Badge className={cn(analysisMapping[occ.analysis].className)}>
                                {analysisMapping[occ.analysis].label}
                            </Badge>
                        ) : 'N/A'}
                      </TableCell>
                      <TableCell className="text-right">
                         <DialogTrigger asChild>
                           <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-primary" aria-label="Visualizar ocorrência" onClick={() => setSelectedOccurrence(occ)}>
                               <Eye className="h-4 w-4" />
                           </Button>
                         </DialogTrigger>
                         <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-primary" aria-label="Editar ocorrência" onClick={() => handleEdit(occ)}>
                            <Pencil className="h-4 w-4" />
                         </Button>
                         <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-8 w-8 text-muted-foreground hover:text-destructive"
                                  aria-label="Excluir ocorrência"
                                  disabled={isDeleting === occ.id}
                                >
                                  {isDeleting === occ.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                                <AlertDialogHeader>
                                    <AlertDialogTitle>Você tem certeza?</AlertDialogTitle>
                                    <AlertDialogDescription>
                                    Esta ação não pode ser desfeita. Isso excluirá permanentemente o registro da ocorrência de <span className="font-semibold">{occ.involvedPersonName}</span> do dia <span className="font-semibold">{occ.occurrenceDate ? format(occ.occurrenceDate, 'dd/MM/yyyy') : ''}</span>.
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
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={7} className="h-24 text-center">
                      {occurrences.length === 0 ? "Nenhuma ocorrência registrada ainda." : "Nenhuma ocorrência encontrada com os filtros selecionados."}
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
        
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Detalhes da Ocorrência</DialogTitle>
          </DialogHeader>
          {selectedOccurrence && (
            <>
              <ScrollArea className="max-h-[70vh] pr-6">
                <div className="space-y-4 py-4">
                  <div>
                      <Label className="font-semibold text-muted-foreground">Nome Completo</Label>
                      <p>{selectedOccurrence.involvedPersonName}</p>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <Label className="font-semibold text-muted-foreground">Data da Ocorrência</Label>
                        <p>{format(selectedOccurrence.occurrenceDate, 'dd/MM/yyyy', { locale: ptBR })}</p>
                      </div>
                      <div>
                        <Label className="font-semibold text-muted-foreground">Local</Label>
                        <p>{selectedOccurrence.occurrenceLocation}</p>
                      </div>
                      <div>
                        <Label className="font-semibold text-muted-foreground">Tipo de Ocorrência</Label>
                        <p>{selectedOccurrence.occurrenceType}</p>
                      </div>
                      <div>
                        <Label className="font-semibold text-muted-foreground">Análise</Label>
                        <div>
                          {analysisMapping[selectedOccurrence.analysis] ? (
                              <Badge className={cn(analysisMapping[selectedOccurrence.analysis].className)}>
                                  {analysisMapping[selectedOccurrence.analysis].label}
                              </Badge>
                          ) : 'N/A'}
                        </div>
                      </div>
                  </div>
                  <div>
                      <Label className="font-semibold text-muted-foreground">Descrição</Label>
                      <p className="whitespace-pre-wrap">{selectedOccurrence.description}</p>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 border-t pt-4 mt-4">
                      <div>
                        <Label className="font-semibold text-muted-foreground">CPF</Label>
                        <p>{selectedOccurrence.cpf || 'Não informado'}</p>
                      </div>
                      <div>
                        <Label className="font-semibold text-muted-foreground">Data de Nascimento</Label>
                        <p>{selectedOccurrence.birthDate || 'Não informado'}</p>
                      </div>
                      <div>
                        <Label className="font-semibold text-muted-foreground">Faixa Etária</Label>
                        <p>{ageGroupOptions.find(o => o.value === selectedOccurrence.ageGroup)?.label || selectedOccurrence.ageGroup || 'Não informado'}</p>
                      </div>
                      <div>
                        <Label className="font-semibold text-muted-foreground">Telefone</Label>
                        <p>{selectedOccurrence.phone || 'Não informado'}</p>
                      </div>
                      <div>
                        <Label className="font-semibold text-muted-foreground">Cidade</Label>
                        <p>{selectedOccurrence.city || 'Não informado'}</p>
                      </div>
                      <div>
                        <Label className="font-semibold text-muted-foreground">Estado</Label>
                        <p>{selectedOccurrence.state || 'Não informado'}</p>
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
    </div>
  );
}
