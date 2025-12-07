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
import { Input } from '@/components/ui/input';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Checkbox } from "@/components/ui/checkbox";
import { useFirestore, useUser } from '@/firebase';
import { collection, getDoc, doc, Timestamp, deleteDoc, onSnapshot } from 'firebase/firestore';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Skeleton } from './ui/skeleton';
import { Badge } from './ui/badge';
import { Button } from './ui/button';
import { Pencil, Trash2, Loader2, ChevronDown } from 'lucide-react';
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
import { setActivePage, setOccurrenceToEdit } from '@/app/page';

interface Occurrence {
  id: string;
  occurrenceDate: Date;
  occurrenceType: string;
  occurrenceLocation: string;
  involvedPersonName: string;
  analysis: 'alta' | 'media' | 'baixa';
  description: string;
}

const analysisMapping: Record<string, { label: string, className: string }> = {
    alta: { label: 'Alta', className: 'bg-red-500 text-white hover:bg-red-600' },
    media: { label: 'Média', className: 'bg-orange-500 text-white hover:bg-orange-600' },
    baixa: { label: 'Baixa', className: 'bg-yellow-500 text-black hover:bg-yellow-600' }
};

const months = [
    { value: '1', label: 'Janeiro' }, { value: '2', label: 'Fevereiro' }, { value: '3', label: 'Março' },
    { value: '4', label: 'Abril' }, { value: '5', label: 'Maio' }, { value: '6', label: 'Junho' },
    { value: '7', label: 'Julho' }, { value: '8', label: 'Agosto' }, { value: '9', label: 'Setembro' },
    { value: '10', label: 'Outubro' }, { value: '11', label: 'Novembro' }, { value: '12', label: 'Dezembro' }
];

const analysisOptions = Object.entries(analysisMapping).map(([key, { label }]) => ({ value: key, label }));

interface MultiSelectFilterProps {
  placeholder: string;
  options: { value: string; label: string }[];
  selected: string[];
  onChange: (selected: string[]) => void;
  disabled?: boolean;
}

function MultiSelectFilter({ placeholder, options, selected, onChange, disabled }: MultiSelectFilterProps) {
  const [isOpen, setIsOpen] = useState(false);

  const handleSelect = (value: string) => {
    const newSelected = selected.includes(value)
      ? selected.filter(item => item !== value)
      : [...selected, value];
    onChange(newSelected);
  };

  const getButtonText = () => {
    if (selected.length === 0) return placeholder;
    if (selected.length === 1) {
      const option = options.find(o => o.value === selected[0]);
      return option?.label || placeholder;
    }
    return `${selected.length} selecionados`;
  };

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={isOpen}
          className="w-full justify-between"
          disabled={disabled}
        >
          <span>{getButtonText()}</span>
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-full p-0">
        <div className="max-h-60 overflow-auto p-1">
          {options.map((option) => (
            <div
              key={option.value}
              className="flex items-center space-x-2 p-2 hover:bg-accent rounded-md cursor-pointer"
              onClick={() => handleSelect(option.value)}
            >
              <Checkbox
                id={`check-${option.value}`}
                checked={selected.includes(option.value)}
                onCheckedChange={() => handleSelect(option.value)}
              />
              <label
                htmlFor={`check-${option.value}`}
                className="w-full text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
              >
                {option.label}
              </label>
            </div>
          ))}
        </div>
      </PopoverContent>
    </Popover>
  );
}

export function OccurrenceReport() {
  const firestore = useFirestore();
  const { user } = useUser();
  const { toast } = useToast();
  
  const [occurrences, setOccurrences] = useState<Occurrence[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isDeleting, setIsDeleting] = useState<string | null>(null);

  // Filter states
  const [filterYears, setFilterYears] = useState<string[]>([]);
  const [filterMonths, setFilterMonths] = useState<string[]>([]);
  const [filterTypes, setFilterTypes] = useState<string[]>([]);
  const [filterLocations, setFilterLocations] = useState<string[]>([]);
  const [filterName, setFilterName] = useState<string>('');
  const [filterAnalyses, setFilterAnalyses] = useState<string[]>([]);

  // Dynamic options for selects
  const [availableYears, setAvailableYears] = useState<string[]>([]);
  const [occurrenceTypes, setOccurrenceTypes] = useState<string[]>([]);
  const [locations, setLocations] = useState<string[]>([]);

  const getSettingsDocRef = useCallback((collectionName: string) => {
    if (!firestore || !user) return null;
    return doc(firestore, 'users', user.uid, 'settings', collectionName);
  }, [firestore, user]);

  // Fetch dynamic options for filters
  useEffect(() => {
    const fetchSelectOptions = async (docName: string, setData: (data: string[]) => void) => {
      const docRef = getSettingsDocRef(docName);
      if (!docRef) return;
      const docSnap = await getDoc(docRef);
      if (docSnap.exists()) {
        const data = docSnap.data();
        setData(data.types || data.locations || []);
      }
    };
    fetchSelectOptions('occurrenceTypes', setOccurrenceTypes);
    fetchSelectOptions('locations', setLocations);
  }, [getSettingsDocRef]);
  
  // Fetch all occurrences with real-time updates
  useEffect(() => {
    if (!user || !firestore) return;
    setIsLoading(true);

    const occurrencesCollectionRef = collection(firestore, 'users', user.uid, 'occurrences');
    
    const unsubscribe = onSnapshot(occurrencesCollectionRef, (querySnapshot) => {
      const occurrencesData = querySnapshot.docs.map(doc => {
        const data = doc.data();
        // Convert Firestore Timestamp to JS Date object
        const occurrenceDate = data.occurrenceDate instanceof Timestamp 
          ? data.occurrenceDate.toDate() 
          : new Date(); // Fallback to current date if something is wrong

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
    
    // Cleanup subscription on component unmount
    return () => unsubscribe();
  }, [user, firestore, toast]);

  const filteredOccurrences = useMemo(() => {
    return occurrences.filter(occ => {
      const occDate = occ.occurrenceDate;
      if (!occDate) return false;

      const yearMatch = filterYears.length === 0 || filterYears.includes(occDate.getFullYear().toString());
      const monthMatch = filterMonths.length === 0 || filterMonths.includes((occDate.getMonth() + 1).toString());
      const typeMatch = filterTypes.length === 0 || filterTypes.includes(occ.occurrenceType);
      const locationMatch = filterLocations.length === 0 || filterLocations.includes(occ.occurrenceLocation);
      const analysisMatch = filterAnalyses.length === 0 || filterAnalyses.includes(occ.analysis);
      const nameMatch = !filterName || occ.involvedPersonName?.toLowerCase().includes(filterName.toLowerCase());

      return yearMatch && monthMatch && typeMatch && locationMatch && analysisMatch && nameMatch;
    });
  }, [occurrences, filterYears, filterMonths, filterTypes, filterLocations, filterName, filterAnalyses]);

  const clearFilters = () => {
    setFilterYears([]);
    setFilterMonths([]);
    setFilterTypes([]);
    setFilterLocations([]);
    setFilterName('');
    setFilterAnalyses([]);
  }

  const handleDelete = async (occurrenceId: string) => {
    if (!firestore || !user) {
      toast({ variant: 'destructive', title: 'Erro', description: 'Usuário não autenticado.'});
      return;
    }
    setIsDeleting(occurrenceId);
    try {
      const docRef = doc(firestore, 'users', user.uid, 'occurrences', occurrenceId);
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
    setOccurrenceToEdit(occurrence);
    setActivePage('register-occurrence');
  };

  const renderSkeletons = () => (
    Array.from({ length: 5 }).map((_, i) => (
      <TableRow key={i}>
        <TableCell><Skeleton className="h-5 w-24" /></TableCell>
        <TableCell><Skeleton className="h-5 w-32" /></TableCell>
        <TableCell><Skeleton className="h-5 w-32" /></TableCell>
        <TableCell><Skeleton className="h-5 w-32" /></TableCell>
        <TableCell><Skeleton className="h-5 w-16" /></TableCell>
        <TableCell><Skeleton className="h-5 w-20" /></TableCell>
      </TableRow>
    ))
  )

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
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            <MultiSelectFilter
              placeholder="Filtrar por Ano"
              options={availableYears.map(y => ({ value: y, label: y }))}
              selected={filterYears}
              onChange={setFilterYears}
              disabled={availableYears.length === 0}
            />
            <MultiSelectFilter
              placeholder="Filtrar por Mês"
              options={months}
              selected={filterMonths}
              onChange={setFilterMonths}
            />
            <MultiSelectFilter
              placeholder="Filtrar por Tipo"
              options={occurrenceTypes.map(t => ({ value: t, label: t }))}
              selected={filterTypes}
              onChange={setFilterTypes}
              disabled={!occurrenceTypes || occurrenceTypes.length === 0}
            />
            <MultiSelectFilter
              placeholder="Filtrar por Local"
              options={locations.map(l => ({ value: l, label: l }))}
              selected={filterLocations}
              onChange={setFilterLocations}
              disabled={!locations || locations.length === 0}
            />
            <MultiSelectFilter
              placeholder="Filtrar por Análise"
              options={analysisOptions}
              selected={filterAnalyses}
              onChange={setFilterAnalyses}
            />
            
            <Input
              placeholder="Filtrar por Nome"
              value={filterName}
              onChange={(e) => setFilterName(e.target.value)}
              className="md:col-span-2 lg:col-span-2"
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
                    <TableCell>
                      {occ.analysis && analysisMapping[occ.analysis] ? (
                          <Badge className={cn(analysisMapping[occ.analysis].className)}>
                              {analysisMapping[occ.analysis].label}
                          </Badge>
                      ) : 'N/A'}
                    </TableCell>
                    <TableCell className="text-right">
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
                  <TableCell colSpan={6} className="h-24 text-center">
                    {occurrences.length === 0 ? "Nenhuma ocorrência registrada ainda." : "Nenhuma ocorrência encontrada com os filtros selecionados."}
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
