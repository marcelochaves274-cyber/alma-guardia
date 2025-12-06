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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useFirestore, useUser } from '@/firebase';
import { collection, getDocs, doc, getDoc, Timestamp, deleteDoc } from 'firebase/firestore';
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

interface Occurrence {
  id: string;
  occurrenceDate: Timestamp;
  occurrenceType: string;
  occurrenceLocation: string;
  involvedPersonName: string;
  analysis: 'alta' | 'media' | 'baixa';
  description: string;
}

const analysisMapping: Record<string, { label: string, variant: 'destructive' | 'secondary' | 'default' }> = {
    alta: { label: 'Alta', variant: 'destructive' },
    media: { label: 'Média', variant: 'secondary' },
    baixa: { label: 'Baixa', variant: 'default' }
};

const months = [
    { value: '1', label: 'Janeiro' }, { value: '2', label: 'Fevereiro' }, { value: '3', label: 'Março' },
    { value: '4', label: 'Abril' }, { value: '5', label: 'Maio' }, { value: '6', label: 'Junho' },
    { value: '7', label: 'Julho' }, { value: '8', label: 'Agosto' }, { value: '9', label: 'Setembro' },
    { value: '10', label: 'Outubro' }, { value: '11', label: 'Novembro' }, { value: '12', label: 'Dezembro' }
];

export function OccurrenceReport() {
  const firestore = useFirestore();
  const { user } = useUser();
  const { toast } = useToast();
  
  const [occurrences, setOccurrences] = useState<Occurrence[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isDeleting, setIsDeleting] = useState<string | null>(null);

  // Filter states
  const [filterYear, setFilterYear] = useState<string>('');
  const [filterMonth, setFilterMonth] = useState<string>('');
  const [filterType, setFilterType] = useState<string>('');
  const [filterLocation, setFilterLocation] = useState<string>('');
  const [filterName, setFilterName] = useState<string>('');
  const [filterAnalysis, setFilterAnalysis] = useState<string>('');

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
  
  // Fetch all occurrences
  useEffect(() => {
    if (!user || !firestore) return;
    setIsLoading(true);

    const occurrencesCollectionRef = collection(firestore, 'users', user.uid, 'occurrences');
    getDocs(occurrencesCollectionRef).then((querySnapshot) => {
      const occurrencesData = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
      } as Occurrence));
      
      const years = new Set(
        occurrencesData
          .map(occ => occ.occurrenceDate?.toDate().getFullYear())
          .filter((year): year is number => !!year)
          .map(String)
      );
      setAvailableYears(Array.from(years).sort((a, b) => Number(b) - Number(a)));
      
      setOccurrences(occurrencesData.sort((a, b) => b.occurrenceDate.toMillis() - a.occurrenceDate.toMillis()));
      setIsLoading(false);
    });
  }, [user, firestore]);

  const filteredOccurrences = useMemo(() => {
    return occurrences.filter(occ => {
      const occDate = occ.occurrenceDate?.toDate();
      if (!occDate) return false;

      const yearMatch = !filterYear || occDate.getFullYear().toString() === filterYear;
      const monthMatch = !filterMonth || (occDate.getMonth() + 1).toString() === filterMonth;
      const typeMatch = !filterType || occ.occurrenceType === filterType;
      const locationMatch = !filterLocation || occ.occurrenceLocation === filterLocation;
      const analysisMatch = !filterAnalysis || occ.analysis === filterAnalysis;
      const nameMatch = !filterName || occ.involvedPersonName?.toLowerCase().includes(filterName.toLowerCase());

      return yearMatch && monthMatch && typeMatch && locationMatch && analysisMatch && nameMatch;
    });
  }, [occurrences, filterYear, filterMonth, filterType, filterLocation, filterName, filterAnalysis]);

  const clearFilters = () => {
    setFilterYear('');
    setFilterMonth('');
    setFilterType('');
    setFilterLocation('');
    setFilterName('');
    setFilterAnalysis('');
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

      setOccurrences(prev => prev.filter(occ => occ.id !== occurrenceId));
      
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
            {/* Year Filter */}
            <Select value={filterYear} onValueChange={setFilterYear} disabled={availableYears.length === 0}>
              <SelectTrigger><SelectValue placeholder="Filtrar por Ano" /></SelectTrigger>
              <SelectContent>
                {availableYears.map(year => <SelectItem key={year} value={year}>{year}</SelectItem>)}
              </SelectContent>
            </Select>

            {/* Month Filter */}
            <Select value={filterMonth} onValueChange={setFilterMonth}>
              <SelectTrigger><SelectValue placeholder="Filtrar por Mês" /></SelectTrigger>
              <SelectContent>
                {months.map(month => <SelectItem key={month.value} value={month.value}>{month.label}</SelectItem>)}
              </SelectContent>
            </Select>

            {/* Type Filter */}
            <Select value={filterType} onValueChange={setFilterType}>
              <SelectTrigger><SelectValue placeholder="Filtrar por Tipo" /></SelectTrigger>
              <SelectContent>
                {occurrenceTypes.map(type => <SelectItem key={type} value={type}>{type}</SelectItem>)}
              </SelectContent>
            </Select>

            {/* Location Filter */}
            <Select value={filterLocation} onValueChange={setFilterLocation}>
              <SelectTrigger><SelectValue placeholder="Filtrar por Local" /></SelectTrigger>
              <SelectContent>
                {locations.map(loc => <SelectItem key={loc} value={loc}>{loc}</SelectItem>)}
              </SelectContent>
            </Select>

            {/* Analysis Filter */}
            <Select value={filterAnalysis} onValueChange={setFilterAnalysis}>
              <SelectTrigger><SelectValue placeholder="Filtrar por Análise" /></SelectTrigger>
              <SelectContent>
                {Object.entries(analysisMapping).map(([key, {label}]) => <SelectItem key={key} value={key}>{label}</SelectItem>)}
              </SelectContent>
            </Select>
            
            {/* Name Filter */}
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
                    <TableCell>{occ.occurrenceDate ? format(occ.occurrenceDate.toDate(), 'dd/MM/yyyy') : 'N/A'}</TableCell>
                    <TableCell>{occ.occurrenceType}</TableCell>
                    <TableCell>{occ.occurrenceLocation}</TableCell>
                    <TableCell>{occ.involvedPersonName}</TableCell>
                    <TableCell>
                      {occ.analysis && analysisMapping[occ.analysis] ? (
                          <Badge variant={analysisMapping[occ.analysis].variant}>
                              {analysisMapping[occ.analysis].label}
                          </Badge>
                      ) : 'N/A'}
                    </TableCell>
                    <TableCell className="text-right">
                       <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-primary" aria-label="Editar ocorrência">
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
                                  Esta ação não pode ser desfeita. Isso excluirá permanentemente o registro da ocorrência de <span className="font-semibold">{occ.involvedPersonName}</span> do dia <span className="font-semibold">{format(occ.occurrenceDate.toDate(), 'dd/MM/yyyy')}</span>.
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
                    Nenhuma ocorrência encontrada com os filtros selecionados.
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
