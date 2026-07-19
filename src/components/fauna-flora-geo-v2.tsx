'use client';

import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import {
  Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter,
} from '@/components/ui/card';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogClose, DialogDescription,
} from "@/components/ui/dialog";
import {
  Popover, PopoverContent, PopoverTrigger,
} from '@/components/ui/popover';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useFirestore, useUser } from '@/firebase';
import { collection, getDoc, doc, Timestamp, deleteDoc, onSnapshot, addDoc, updateDoc, serverTimestamp, GeoPoint } from 'firebase/firestore';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Skeleton } from './ui/skeleton';
import { Badge } from './ui/badge';
import { Button } from './ui/button';
import { Pencil, Trash2, Loader2, Eye, Calendar as CalendarIcon, MapPin, ZoomIn, ZoomOut } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import { Label } from './ui/label';
import { ScrollArea } from './ui/scroll-area';
import { SheetFilter } from './sheet-filter';
import { MapSelector, type LocationData } from './map-selector';
import { Textarea } from './ui/textarea';
import { Separator } from './ui/separator';
import { RadioGroup, RadioGroupItem } from './ui/radio-group';
import { Calendar } from './ui/calendar';
import { ErrorModal } from './ErrorModal';
import NextImage from 'next/image';
import { APIProvider, Map as GoogleMap, AdvancedMarker, useMap } from '@vis.gl/react-google-maps';

// Interfaces
interface FaunaFloraGeoRecord {
  id: string;
  date: Date;
  speciesType: string;
  locationName: string;
  analysis: 'alta' | 'media' | 'baixa';
  description: string;
  location?: LocationData;
  mapMarker?: { x: number; y: number }; // Backwards compatibility
}

interface Cluster {
  records: FaunaFloraGeoRecord[];
  x: number;
  y: number;
}

interface GeoCluster {
  records: FaunaFloraGeoRecord[];
  lat: number;
  lng: number;
}

interface ImageRenderMetrics {
  offsetX: number;
  offsetY: number;
  renderedWidth: number;
  renderedHeight: number;
}

// Constants
const analysisMapping: Record<string, { label: string, className: string }> = {
    alta: { label: 'Alta', className: 'bg-red-500 text-white hover:bg-red-600' },
    media: { label: 'Média', className: 'bg-orange-500 text-white hover:bg-orange-600' },
    baixa: { label: 'Baixa', className: 'bg-yellow-500 text-black hover:bg-yellow-600' }
};

const monthOptions = [
  { value: '0', label: 'Janeiro' }, { value: '1', label: 'Fevereiro' }, { value: '2', label: 'Março' },
  { value: '3', label: 'Abril' }, { value: '4', label: 'Maio' }, { value: '5', label: 'Junho' },
  { value: '6', label: 'Julho' }, { value: '7', label: 'Agosto' }, { value: '8', label: 'Setembro' },
  { value: '9', label: 'Outubro' }, { value: '10', label: 'Novembro' }, { value: '11', label: 'Dezembro' },
];

const YEAR_COLORS = ['fill-red-500', 'fill-blue-500', 'fill-green-500', 'fill-orange-500', 'fill-purple-500', 'fill-yellow-500'];

const getYearColor = (year: number, allYears: string[]) => {
  const sortedYears = [...allYears].sort((a,b) => Number(b) - Number(a));
  const index = sortedYears.indexOf(year.toString());
  if (index === -1) return 'fill-gray-500';
  return YEAR_COLORS[index % YEAR_COLORS.length];
};

const GOOGLE_MAPS_API_KEY = "AIzaSyAHSWMrKodwOLXO7VGTq35r6vFgOJ-AH9I";

// ############################################################################
// # 1. REGISTER COMPONENT LOGIC (Based on RegisterOccurrence)
// ############################################################################

interface RegisterFaunaFloraGeoV2Props {
  recordToEdit: any | null;
  setPage: (page: string) => void;
}

function RegisterFaunaFloraGeoV2({ recordToEdit, setPage }: RegisterFaunaFloraGeoV2Props) {
  const isEditing = !!recordToEdit;

  const [date, setDate] = useState<Date | undefined>(new Date());
  const [locationName, setLocationName] = useState(recordToEdit?.locationName || '');
  const [speciesType, setSpeciesType] = useState(recordToEdit?.speciesType || '');
  const [analysis, setAnalysis] = useState(recordToEdit?.analysis || '');
  const [description, setDescription] = useState(recordToEdit?.description || '');
  const [location, setLocation] = useState<LocationData | null>(null);

  const [isCalendarOpen, setIsCalendarOpen] = useState(false);
  const [speciesTypes, setSpeciesTypes] = useState<string[]>([]);
  const [locations, setLocations] = useState<string[]>([]);
  const [isLoadingTypes, setIsLoadingTypes] = useState(true);
  const [isLoadingLocations, setIsLoadingLocations] = useState(true);
  const [mapUrl, setMapUrl] = useState<string | null>(null);
  const [mapCenter, setMapCenter] = useState<{ lat: number; lng: number } | undefined>(undefined);
  const [isLoadingMap, setIsLoadingMap] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isErrorOpen, setIsErrorOpen] = useState(false);

  const firestore = useFirestore();
  const { user } = useUser();
  const { toast } = useToast();

  useEffect(() => {
    if (isEditing && recordToEdit) {
      const recordDate = recordToEdit.date;
      setDate(recordDate instanceof Timestamp ? recordDate.toDate() : recordDate);
      setLocationName(recordToEdit.locationName || '');
      setSpeciesType(recordToEdit.speciesType || '');
      setAnalysis(recordToEdit.analysis || '');
      setDescription(recordToEdit.description || '');
      
      if (recordToEdit.location) {
        setLocation(recordToEdit.location);
      } else if (recordToEdit.mapMarker) {
        setLocation({ mapType: 'ludico', ludico: recordToEdit.mapMarker });
      } else {
        setLocation(null);
      }
    } else {
        resetForm();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isEditing, recordToEdit]);

  const getSettingsDocRef = useCallback((collectionName: string) => {
    if (!firestore || !user) return null;
    return doc(firestore, 'sgs_genius', user.uid, 'settings', collectionName);
  }, [firestore, user]);

  useEffect(() => {
    const fetchSelectOptions = async (docName: string, setData: (data: string[]) => void, setLoading: (loading: boolean) => void, field: 'types' | 'locations') => {
      const docRef = getSettingsDocRef(docName);
      if (!docRef) { setLoading(false); return; }
      try {
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
          setData((docSnap.data()[field] || []).sort((a: string, b: string) => a.localeCompare(b)));
        }
      } catch (error) {
        console.error(`Error fetching ${field}:`, error);
      } finally {
        setLoading(false);
      }
    };
    fetchSelectOptions('faunaFloraGeoTypes', setSpeciesTypes, setIsLoadingTypes, 'types');
    fetchSelectOptions('locations', setLocations, setIsLoadingLocations, 'locations');
  }, [getSettingsDocRef]);
  
  useEffect(() => {
    const fetchMap = async () => {
      const docRef = getSettingsDocRef('mapDetails');
      if (!docRef) { setIsLoadingMap(false); return; }
      try {
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
          setMapUrl(docSnap.data().mapUrl || null);
          setMapCenter(docSnap.data().defaultCenter || undefined);
        }
      } catch (error) {
        console.error("Error fetching map:", error);
      } finally {
        setIsLoadingMap(false);
      }
    };
    fetchMap();
  }, [getSettingsDocRef]);

  const resetForm = () => {
    setDate(new Date());
    setLocationName('');
    setSpeciesType('');
    setAnalysis('');
    setDescription('');
    setLocation(null);
  }

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!firestore || !user) {
        toast({ variant: 'destructive', title: 'Erro', description: 'Você não está autenticado.' });
        return;
    }
    if (!description || !date || !locationName || !speciesType || !analysis || (!location?.ludico && !location?.geo)) {
      setIsErrorOpen(true);
      return;
    }

    setIsSubmitting(true);
    
    const recordData = {
        date: Timestamp.fromDate(date),
        locationName,
        speciesType,
        description,
        analysis,
        location,
        userId: user.uid,
    };

    try {
      if (isEditing && recordToEdit) {
        const docRef = doc(firestore, 'sgs_genius', user.uid, 'fauna_flora_geo', recordToEdit.id);
        await updateDoc(docRef, { ...recordData, updatedAt: serverTimestamp() });
        toast({ title: 'Sucesso!', description: 'Registro atualizado com sucesso.' });
        setPage('report');
      } else {
        const collectionRef = collection(firestore, 'sgs_genius', user.uid, 'fauna_flora_geo');
        await addDoc(collectionRef, { ...recordData, createdAt: serverTimestamp() });
        toast({ title: 'Sucesso!', description: 'Registro salvo com sucesso.' });
        resetForm();
      }
    } catch (error) {
        console.error("Error saving record:", error);
        setIsErrorOpen(true);
    } finally {
        setIsSubmitting(false);
    }
  };

  return (
    <Card className="w-full">
      <form onSubmit={handleSubmit}>
        <CardHeader>
          <CardTitle>{isEditing ? 'Editar Registro F/F/G' : 'Registrar Fauna, Flora ou Geo'}</CardTitle>
          <CardDescription>
            {isEditing ? 'Altere os dados do registro abaixo.' : 'Preencha os campos para registrar um novo item.'}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-8">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <Label htmlFor="date">Data do Registro</Label>
              <Popover open={isCalendarOpen} onOpenChange={setIsCalendarOpen}>
                <PopoverTrigger asChild>
                  <Button variant={'outline'} className={cn('w-full justify-start text-left font-normal', !date && 'text-muted-foreground')}>
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {date ? format(date, 'dd/MM/yyyy') : <span>Escolha uma data</span>}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0">
                  <Calendar mode="single" selected={date} onSelect={(d) => { if(d) setDate(d); setIsCalendarOpen(false); }} locale={ptBR} initialFocus />
                </PopoverContent>
              </Popover>
            </div>
            <div className="space-y-2">
              <Label htmlFor="locationName">Local</Label>
              <Select name="locationName" required disabled={isLoadingLocations || locations.length === 0} onValueChange={setLocationName} value={locationName}>
                <SelectTrigger id="location"><SelectValue placeholder={isLoadingLocations ? "Carregando..." : "Selecione o local"} /></SelectTrigger>
                <SelectContent>{locations.map((loc) => (<SelectItem key={loc} value={loc}>{loc}</SelectItem>))}</SelectContent>
              </Select>
            </div>
            <div className="space-y-2 md:col-span-2">
              <Label htmlFor="species-type">Espécie / Tipo</Label>
              <Select name="speciesType" required disabled={isLoadingTypes || speciesTypes.length === 0} onValueChange={setSpeciesType} value={speciesType}>
                <SelectTrigger id="species-type"><SelectValue placeholder={isLoadingTypes ? "Carregando..." : "Selecione o tipo"} /></SelectTrigger>
                <SelectContent>{speciesTypes.map((type) => (<SelectItem key={type} value={type}>{type}</SelectItem>))}</SelectContent>
              </Select>
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="description">Descrição</Label>
            <Textarea id="description" placeholder="Descreva detalhadamente o registro..." className="min-h-[100px]" required value={description} onChange={(e) => setDescription(e.target.value)} />
          </div>
          <Separator />
          <div className="space-y-3">
              <Label>Análise da Situação</Label>
              <RadioGroup name="analysis" required className="flex flex-wrap items-center gap-4 pt-2" onValueChange={setAnalysis} value={analysis}>
                  <div className="flex items-center space-x-2"><RadioGroupItem value="alta" id="alta" className="border-red-500 text-red-500 focus:ring-red-500" /><Label htmlFor="alta" className="font-bold text-red-500">Alta</Label></div>
                  <div className="flex items-center space-x-2"><RadioGroupItem value="media" id="media" className="border-orange-500 text-orange-500 focus:ring-orange-500" /><Label htmlFor="media" className="font-bold text-orange-500">Média</Label></div>
                  <div className="flex items-center space-x-2"><RadioGroupItem value="baixa" id="baixa" className="border-yellow-500 text-yellow-500 focus:ring-yellow-500" /><Label htmlFor="baixa" className="font-bold text-yellow-500">Baixa</Label></div>
              </RadioGroup>
          </div>
          <Separator />
           <div className="space-y-4">
              <h3 className="text-lg font-semibold text-foreground">Localização no Mapa (Obrigatório)</h3>
              {isLoadingMap ? (
                <div className="flex items-center justify-center w-full h-[500px] bg-muted border rounded-md"><Loader2 className="h-8 w-8 animate-spin text-muted-foreground" /></div>
              ) : (
                <MapSelector key={recordToEdit?.id || 'new-fauna'} ludicMapUrl={mapUrl} onLocationChange={setLocation} initialLocation={location} defaultCenter={mapCenter} />
              )}
           </div>
        </CardContent>
        <CardFooter className="flex flex-col gap-2">
          <Button type="submit" className="w-full" disabled={isSubmitting}>
            {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {isEditing ? 'Salvar Alterações' : 'Salvar Registro'}
          </Button>
            {isEditing && (<Button variant="outline" type="button" className="w-full" onClick={() => setPage('report')}>Cancelar Edição</Button>)}
        </CardFooter>
      </form>
      <ErrorModal isOpen={isErrorOpen} onClose={() => setIsErrorOpen(false)} message="Preencha todos os campos obrigatórios, incluindo a marcação no mapa." />
    </Card>
  );
}

// ############################################################################
// # 2. REPORT COMPONENT LOGIC (Based on OccurrenceReport)
// ############################################################################

interface FaunaFloraGeoReportV2Props {
  onEdit: (record: FaunaFloraGeoRecord, scrollPosition: number) => void;
  initialScrollPosition?: number;
}

function FaunaFloraGeoReportV2({ onEdit, initialScrollPosition }: FaunaFloraGeoReportV2Props) {
  const firestore = useFirestore();
  const { user } = useUser();
  const { toast } = useToast();

  const [records, setRecords] = useState<FaunaFloraGeoRecord[]>([]);
  const [selectedRecord, setSelectedRecord] = useState<FaunaFloraGeoRecord | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isDeleting, setIsDeleting] = useState<string | null>(null);
  const [isClient, setIsClient] = useState(false);
  
  const [filterYear, setFilterYear] = useState<string[]>([]);
  const [filterMonths, setFilterMonths] = useState<string[]>([]);
  const [filterType, setFilterType] = useState<string[]>([]);
  const [filterLocation, setFilterLocation] = useState<string[]>([]);
  const [filterAnalysis, setFilterAnalysis] = useState<string[]>([]);
  
  const [availableYears, setAvailableYears] = useState<string[]>([]);
  const [speciesTypes, setSpeciesTypes] = useState<string[]>([]);
  const [locations, setLocations] = useState<string[]>([]);
  const [mapUrl, setMapUrl] = useState<string | null>(null);
  const [mapCenter, setMapCenter] = useState<{ lat: number; lng: number } | undefined>(undefined);

  useEffect(() => { setIsClient(true); }, []);

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
          setData((docSnap.data()[field] || []).sort((a: string, b: string) => a.localeCompare(b)));
        }
      } catch (error) { console.error(`Error fetching ${docName}:`, error); }
    };
    fetchSelectOptions('faunaFloraGeoTypes', setSpeciesTypes, 'types');
    fetchSelectOptions('locations', setLocations, 'locations');

    const fetchMap = async () => {
      const docRef = getSettingsDocRef('mapDetails');
      if (!docRef) return;
      try {
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
          setMapUrl(docSnap.data().mapUrl || null);
          setMapCenter(docSnap.data().defaultCenter || undefined);
        }
      } catch (error) { console.error("Error fetching map:", error); }
    };
    fetchMap();
  }, [getSettingsDocRef]);
  
  useEffect(() => {
    if (!user || !firestore) return;
    setIsLoading(true);
    const recordsCollectionRef = collection(firestore, 'sgs_genius', user.uid, 'fauna_flora_geo');
    
    const unsubscribe = onSnapshot(recordsCollectionRef, (querySnapshot) => {
      const recordsData = querySnapshot.docs.map(doc => {
        const data = doc.data();
        return { id: doc.id, ...data, date: data.date instanceof Timestamp ? data.date.toDate() : new Date(0) } as FaunaFloraGeoRecord;
      });
      
      const years = new Set(recordsData.map(rec => rec.date?.getFullYear()).filter((year): year is number => !!year).map(String));
      setAvailableYears(Array.from(years).sort((a, b) => Number(b) - Number(a)));

      setRecords(recordsData.sort((a, b) => b.date.getTime() - a.date.getTime()));
      setIsLoading(false);
    }, (error) => {
        toast({ variant: "destructive", title: "Erro de conexão", description: "Não foi possível buscar os registros." });
        setIsLoading(false);
    });
    
    return () => unsubscribe();
  }, [user, firestore, toast]);

  const filteredRecords = useMemo(() => {
    return records.filter(rec => {
      if (!rec.date || !isClient) return false;
      const yearMatch = filterYear.length === 0 || filterYear.includes(rec.date.getFullYear().toString());
      const monthMatch = filterMonths.length === 0 || filterMonths.includes(rec.date.getMonth().toString());
      const typeMatch = filterType.length === 0 || filterType.includes(rec.speciesType);
      const locationMatch = filterLocation.length === 0 || filterLocation.includes(rec.locationName);
      const analysisMatch = filterAnalysis.length === 0 || filterAnalysis.includes(rec.analysis);
      return yearMatch && monthMatch && typeMatch && locationMatch && analysisMatch;
    });
  }, [records, filterYear, filterMonths, filterType, filterLocation, filterAnalysis, isClient]);

  const clearFilters = () => {
    setFilterYear([]); setFilterMonths([]); setFilterType([]); setFilterLocation([]); setFilterAnalysis([]);
  }

  const handleDelete = async (recordId: string) => {
    if (!firestore || !user) return;
    setIsDeleting(recordId);
    try {
      await deleteDoc(doc(firestore, 'sgs_genius', user.uid, 'fauna_flora_geo', recordId));
      toast({ title: 'Sucesso!', description: 'Registro excluído.' });
    } catch (error) {
      toast({ variant: 'destructive', title: 'Erro ao excluir', description: 'Não foi possível excluir o registro.' });
    } finally {
      setIsDeleting(null);
    }
  };

  const renderSkeletons = () => Array.from({ length: 5 }).map((_, i) => (
    <TableRow key={i}>
      <TableCell><Skeleton className="h-5 w-24" /></TableCell>
      <TableCell><Skeleton className="h-5 w-32" /></TableCell>
      <TableCell><Skeleton className="h-5 w-32" /></TableCell>
      <TableCell><Skeleton className="h-5 w-16" /></TableCell>
      <TableCell><Skeleton className="h-5 w-20" /></TableCell>
    </TableRow>
  ));

  return (
    <Dialog onOpenChange={(isOpen) => { if (!isOpen) setSelectedRecord(null); }}>
      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Relatório de Fauna, Flora & Geo</CardTitle>
            <CardDescription>Filtre e visualize os registros do sistema.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 items-end">
              <div className='space-y-2'><Label>Filtrar Mês(es)</Label><SheetFilter title='Filtrar Meses' options={monthOptions} selected={filterMonths} onChange={setFilterMonths} buttonText='Filtrar por Mês' /></div>
              <div className='space-y-2'><Label>Filtrar Ano</Label><SheetFilter title='Filtrar Anos' options={availableYears.map(y => ({ value: y, label: y }))} selected={filterYear} onChange={setFilterYear} disabled={isLoading} buttonText='Filtrar por Ano' /></div>
              <div className='space-y-2'><Label>Filtrar Espécie/Tipo</Label><SheetFilter title='Filtrar Espécies/Tipos' options={speciesTypes.map(t => ({ value: t, label: t }))} selected={filterType} onChange={setFilterType} disabled={!speciesTypes || speciesTypes.length === 0} buttonText='Filtrar por Tipo' /></div>
              <div className='space-y-2'><Label>Filtrar por Local</Label><SheetFilter title='Filtrar Locais' options={locations.map(l => ({ value: l, label: l }))} selected={filterLocation} onChange={setFilterLocation} disabled={!locations || locations.length === 0} buttonText='Filtrar por Local' /></div>
              <div className='space-y-2'><Label>Filtrar por Análise</Label><SheetFilter title='Filtrar Análises' options={Object.entries(analysisMapping).map(([key, {label}]) => ({ value: key, label: label }))} selected={filterAnalysis} onChange={setFilterAnalysis} buttonText='Filtrar por Análise' /></div>
              <Button onClick={clearFilters} variant="outline" className="w-full">Limpar Filtros</Button>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle>Resultados</CardTitle><CardDescription>Foram encontrados {filteredRecords.length} registros.</CardDescription></CardHeader>
          <CardContent className="p-0 md:p-6 md:pt-0">
            <div className="max-h-[65vh] overflow-y-auto md:max-h-none overflow-x-auto">
              <Table>
                <TableHeader className="sticky top-0 bg-card z-10 shadow-sm">
                  <TableRow>
                    <TableHead>Data</TableHead><TableHead>Espécie/Tipo</TableHead><TableHead>Local</TableHead><TableHead>Análise</TableHead><TableHead className="text-right">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {isLoading ? renderSkeletons() : filteredRecords.length > 0 ? (
                    filteredRecords.map((rec) => (
                      <TableRow key={rec.id}>
                        <TableCell>{rec.date ? format(rec.date, 'dd/MM/yyyy', { locale: ptBR }) : 'N/A'}</TableCell>
                        <TableCell>{rec.speciesType || 'N/A'}</TableCell>
                        <TableCell>{rec.locationName || 'N/A'}</TableCell>
                        <TableCell>{rec.analysis && analysisMapping[rec.analysis] ? (<Badge className={cn(analysisMapping[rec.analysis].className)}>{analysisMapping[rec.analysis].label}</Badge>) : 'N/A'}</TableCell>
                        <TableCell className="text-right">
                          <DialogTrigger asChild><Button variant="ghost" size="icon" className="h-8 w-8" aria-label="Visualizar" onClick={() => setSelectedRecord(rec)}><Eye className="h-4 w-4" /></Button></DialogTrigger>
                          <Button variant="ghost" size="icon" className="h-8 w-8" aria-label="Editar" onClick={() => onEdit(rec, 0)}><Pencil className="h-4 w-4" /></Button>
                          <AlertDialog>
                              <AlertDialogTrigger asChild><Button variant="ghost" size="icon" className="h-8 w-8 hover:text-destructive" aria-label="Excluir" disabled={isDeleting === rec.id}>{isDeleting === rec.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}</Button></AlertDialogTrigger>
                              <AlertDialogContent>
                                  <AlertDialogHeader><AlertDialogTitle>Você tem certeza?</AlertDialogTitle><AlertDialogDescription>Esta ação não pode ser desfeita e excluirá permanentemente o registro.</AlertDialogDescription></AlertDialogHeader>
                                  <AlertDialogFooter><AlertDialogCancel>Cancelar</AlertDialogCancel><AlertDialogAction onClick={() => handleDelete(rec.id)} className="bg-destructive hover:bg-destructive/90">Sim, excluir</AlertDialogAction></AlertDialogFooter>
                              </AlertDialogContent>
                          </AlertDialog>
                        </TableCell>
                      </TableRow>
                    ))
                  ) : (
                    <TableRow><TableCell colSpan={5} className="h-24 text-center">Nenhum registro encontrado.</TableCell></TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
        <DialogContent className="max-w-2xl">
          <DialogHeader><DialogTitle>Detalhes do Registro</DialogTitle></DialogHeader>
          {selectedRecord && (
            <>
              <ScrollArea className="max-h-[70vh] pr-6">
                <div className="space-y-4 py-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div><Label className="font-semibold text-muted-foreground">Data</Label><p>{format(selectedRecord.date, 'dd/MM/yyyy', { locale: ptBR })}</p></div>
                      <div><Label className="font-semibold text-muted-foreground">Local</Label><p>{selectedRecord.locationName}</p></div>
                      <div><Label className="font-semibold text-muted-foreground">Espécie / Tipo</Label><p>{selectedRecord.speciesType}</p></div>
                      <div><Label className="font-semibold text-muted-foreground">Análise</Label><div>{analysisMapping[selectedRecord.analysis] ? (<Badge className={cn(analysisMapping[selectedRecord.analysis].className)}>{analysisMapping[selectedRecord.analysis].label}</Badge>) : 'N/A'}</div></div>
                  </div>
                  <div><Label className="font-semibold text-muted-foreground">Descrição</Label><p className="whitespace-pre-wrap">{selectedRecord.description}</p></div>
                  {(selectedRecord.location || selectedRecord.mapMarker) && (
                      <div className="md:col-span-2">
                          <Label className="font-semibold text-muted-foreground">Localização no Mapa</Label>
                          <div className="mt-2 h-[400px] w-full rounded-md border relative">
                              <MapSelector key={selectedRecord.id} ludicMapUrl={mapUrl} initialLocation={selectedRecord.location || { mapType: 'ludico', ludico: selectedRecord.mapMarker! }} defaultCenter={mapCenter} onLocationChange={() => {}} />
                          </div>
                      </div>
                  )}
                </div>
              </ScrollArea>
              <div className="flex justify-end pt-2"><DialogClose asChild><Button type="button" variant="secondary">Fechar</Button></DialogClose></div>
            </>            
          )}
        </DialogContent>
      </div>
    </Dialog>
  );
}

// ############################################################################
// # 3. MAP COMPONENT LOGIC (Based on MapReport)
// ############################################################################

const MapBoundsUpdater = ({ points }: { points: { lat: number; lng: number }[] }) => {
  const map = useMap();
  useEffect(() => {
    if (!map || points.length === 0) return;
    if (points.length === 1) {
      map.moveCamera({ center: points[0], zoom: 15 });
      return;
    }
    const bounds = new google.maps.LatLngBounds();
    points.forEach(point => bounds.extend(point));
    map.fitBounds(bounds, 100);
  }, [map, points]);
  return null;
};

function FaunaFloraGeoMapReportV2() {
  const firestore = useFirestore();
  const { user } = useUser();
  const { toast } = useToast();
  
  const [records, setRecords] = useState<FaunaFloraGeoRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [mapUrl, setMapUrl] = useState<string | null>(null);
  const [isLoadingMap, setIsLoadingMap] = useState(true);
  const [detailedRecord, setDetailedRecord] = useState<FaunaFloraGeoRecord | null>(null);
  const [isMapModalOpen, setIsMapModalOpen] = useState(false);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [activePopoverKey, setActivePopoverKey] = useState<string | null>(null);
  const [activeGeoPopoverKey, setActiveGeoPopoverKey] = useState<string | null>(null);
  const [modalActivePopoverKey, setModalActivePopoverKey] = useState<string | null>(null);

  const [filterYear, setFilterYear] = useState<string[]>([]);
  const [filterMonths, setFilterMonths] = useState<string[]>([]);
  const [filterType, setFilterType] = useState<string[]>([]);
  const [filterLocation, setFilterLocation] = useState<string[]>([]);
  const [mapView, setMapView] = useState<'ludico' | 'geo'>('ludico');

  const [availableYears, setAvailableYears] = useState<string[]>([]);
  const [speciesTypes, setSpeciesTypes] = useState<string[]>([]);
  const [locations, setLocations] = useState<string[]>([]);
  const [isClient, setIsClient] = useState(false);

  const [mapCenter, setMapCenter] = useState<{ lat: number; lng: number } | undefined>(undefined);
  const [naturalImageDimensions, setNaturalImageDimensions] = useState<{width: number, height: number} | null>(null);

  const [mainMapRenderMetrics, setMainMapRenderMetrics] = useState<ImageRenderMetrics | null>(null);
  const mainMapContainerRef = useRef<HTMLDivElement>(null);
  
  const [transform, setTransform] = useState({ scale: 1, x: 0, y: 0 });
  const [modalImageRenderMetrics, setModalImageRenderMetrics] = useState<ImageRenderMetrics | null>(null);
  const modalMapContainerRef = useRef<HTMLDivElement>(null);
  const [isPanning, setIsPanning] = useState(false);
  const panStart = useRef<{ x: number; y: number, startX: number, startY: number } | null>(null);

  useEffect(() => { setIsClient(true); }, []);

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
          setData((docSnap.data()[field] || []).sort((a: string, b: string) => a.localeCompare(b)));
        }
      } catch (error) { console.error(`Error fetching ${docName}:`, error); }
    };
    fetchSelectOptions('faunaFloraGeoTypes', setSpeciesTypes, 'types');
    fetchSelectOptions('locations', setLocations, 'locations');
  }, [getSettingsDocRef]);
  
  useEffect(() => {
    const fetchMap = async () => {
      const docRef = getSettingsDocRef('mapDetails');
      if (!docRef) { setIsLoadingMap(false); return; }
      try {
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
          setMapUrl(docSnap.data().mapUrl || null);
          setMapCenter(docSnap.data().defaultCenter || undefined);
        }
      } catch (error) { console.error("Error fetching map:", error); } 
      finally { setIsLoadingMap(false); }
    };
    fetchMap();
  }, [getSettingsDocRef]);
  
  useEffect(() => {
    if (!user || !firestore) return;
    setIsLoading(true);
    const recordsCollectionRef = collection(firestore, 'sgs_genius', user.uid, 'fauna_flora_geo');
    
    const unsubscribe = onSnapshot(recordsCollectionRef, (querySnapshot) => {
      const recordsData = querySnapshot.docs.map(doc => {
        const data = doc.data();
        const recordDate = data.date instanceof Timestamp ? data.date.toDate() : new Date(0);
        
        let locationData = data.location;
        if (data.mapMarker && !data.location) {
          locationData = { mapType: 'ludico', ludico: data.mapMarker };
        } else if (locationData?.geo instanceof GeoPoint) {
          locationData.geo = { lat: locationData.geo.latitude, lng: locationData.geo.longitude };
        }

        return { id: doc.id, ...data, date: recordDate, location: locationData } as FaunaFloraGeoRecord;
      });
      
      const years = new Set(recordsData.map(rec => rec.date?.getFullYear()).filter((year): year is number => !!year).map(String));
      setAvailableYears(Array.from(years).sort((a, b) => Number(b) - Number(a)));
      
      setRecords(recordsData);
      setIsLoading(false);
    }, (error) => {
        toast({ variant: "destructive", title: "Erro de conexão", description: "Não foi possível buscar os registros." });
        setIsLoading(false);
    });
    
    return () => unsubscribe();
  }, [user, firestore, toast]);

  const filteredRecords = useMemo(() => {
    if (!isClient) return [];
    return records.filter(rec => {
      if (!rec.date) return false;
      const yearMatch = filterYear.length === 0 || filterYear.includes(rec.date.getFullYear().toString());
      const monthMatch = filterMonths.length === 0 || filterMonths.includes(rec.date.getMonth().toString());
      const typeMatch = filterType.length === 0 || filterType.includes(rec.speciesType);
      const locationMatch = filterLocation.length === 0 || filterLocation.includes(rec.locationName);
      const hasMarker = mapView === 'ludico' ? !!rec.location?.ludico : !!rec.location?.geo;
      return yearMatch && monthMatch && typeMatch && locationMatch && hasMarker;
    });
  }, [records, filterYear, filterMonths, filterType, filterLocation, isClient, mapView]);

  const clusters = useMemo(() => {
    if (mapView !== 'ludico') return [];
    const points = filteredRecords.filter(rec => rec.location?.ludico);
    const clusters: Cluster[] = [];
    const distanceThreshold = 5; 

    points.forEach(point => {
        let foundCluster = false;
        for (const cluster of clusters) {
            const distance = Math.sqrt(Math.pow(cluster.x - (point.location?.ludico?.x || 0), 2) + Math.pow(cluster.y - (point.location?.ludico?.y || 0), 2));
            if (distance < distanceThreshold) {
                cluster.records.push(point);
                cluster.x = cluster.records.reduce((sum, rec) => sum + (rec.location?.ludico?.x || 0), 0) / cluster.records.length;
                cluster.y = cluster.records.reduce((sum, rec) => sum + (rec.location?.ludico?.y || 0), 0) / cluster.records.length;
                foundCluster = true;
                break;
            }
        }
        if (!foundCluster && point.location?.ludico) {
            clusters.push({ records: [point], x: point.location.ludico.x, y: point.location.ludico.y });
        }
    });
    return clusters;
  }, [filteredRecords, mapView]);

  const geoClusters = useMemo(() => {
    if (mapView !== 'geo') return [];
    const points = filteredRecords.filter(rec => rec.location?.geo);
    const clusters: GeoCluster[] = [];
    const distanceThreshold = 0.0001;

    points.forEach(point => {
        let foundCluster = false;
        for (const cluster of clusters) {
            const distance = Math.sqrt(Math.pow(cluster.lat - (point.location?.geo?.lat || 0), 2) + Math.pow(cluster.lng - (point.location?.geo?.lng || 0), 2));
            if (distance < distanceThreshold) {
                cluster.records.push(point);
                cluster.lat = cluster.records.reduce((sum, rec) => sum + (rec.location?.geo?.lat || 0), 0) / cluster.records.length;
                cluster.lng = cluster.records.reduce((sum, rec) => sum + (rec.location?.geo?.lng || 0), 0) / cluster.records.length;
                foundCluster = true;
                break;
            }
        }
        if (!foundCluster && point.location?.geo) {
            clusters.push({ records: [point], lat: point.location.geo.lat, lng: point.location.geo.lng });
        }
    });
    return clusters;
  }, [filteredRecords, mapView]);

  const geoPointsForBounds = useMemo(() => {
    if (mapView !== 'geo') return [];
    return filteredRecords.map(rec => rec.location?.geo).filter((geo): geo is { lat: number; lng: number } => !!geo);
  }, [filteredRecords, mapView]);

  const clearFilters = () => {
    setFilterYear([]); setFilterMonths([]); setFilterType([]); setFilterLocation([]);
  }

  const handleImageLoad = (e: React.SyntheticEvent<HTMLImageElement>) => {
    setNaturalImageDimensions({ width: e.currentTarget.naturalWidth, height: e.currentTarget.naturalHeight });
  };

  const calculateMetrics = useCallback((container: HTMLDivElement | null, naturalDims: {width: number, height: number} | null) => {
    if (!container || !naturalDims) return null;
    const containerWidth = container.clientWidth;
    const containerHeight = container.clientHeight;
    if (containerWidth === 0 || containerHeight === 0) return null;
    const { width: naturalWidth, height: naturalHeight } = naturalDims;
    const imageAspectRatio = naturalWidth / naturalHeight;
    const containerAspectRatio = containerWidth / containerHeight;
    let renderedWidth: number, renderedHeight: number, offsetX = 0, offsetY = 0;

    if (imageAspectRatio > containerAspectRatio) {
      renderedWidth = containerWidth;
      renderedHeight = renderedWidth / imageAspectRatio;
      offsetY = (containerHeight - renderedHeight) / 2;
    } else {
      renderedHeight = containerHeight;
      renderedWidth = renderedHeight * imageAspectRatio;
      offsetX = (containerWidth - renderedWidth) / 2;
    }
    return { offsetX, offsetY, renderedWidth, renderedHeight };
  }, []);

  useEffect(() => {
    const container = mainMapContainerRef.current;
    if (!container || !naturalImageDimensions) return;
    const observerCallback = () => {
        const metrics = calculateMetrics(container, naturalImageDimensions);
        if (metrics) setMainMapRenderMetrics(metrics);
    }
    const resizeObserver = new ResizeObserver(observerCallback);
    resizeObserver.observe(container);
    return () => resizeObserver.disconnect();
  }, [naturalImageDimensions, calculateMetrics]);

  useEffect(() => {
    if (!isMapModalOpen) return;
    const container = modalMapContainerRef.current;
    if (!container || !naturalImageDimensions) return;
    const observerCallback = () => {
        const metrics = calculateMetrics(container, naturalImageDimensions);
        if (metrics) setModalImageRenderMetrics(metrics);
    }
    const resizeObserver = new ResizeObserver(observerCallback);
    resizeObserver.observe(container);
    return () => resizeObserver.disconnect();
  }, [naturalImageDimensions, calculateMetrics, isMapModalOpen]);

  const clampPosition = useCallback((pos: {x: number; y: number; scale: number}) => {
    if (!modalMapContainerRef.current || !modalImageRenderMetrics) return pos;
    const containerRect = modalMapContainerRef.current.getBoundingClientRect();
    const { renderedWidth, renderedHeight } = modalImageRenderMetrics;
    const { scale } = pos;
    const scaledWidth = renderedWidth * scale;
    const scaledHeight = renderedHeight * scale;
    const overflowX = Math.max(0, (scaledWidth - containerRect.width) / 2);
    const overflowY = Math.max(0, (scaledHeight - containerRect.height) / 2);
    const clampedX = Math.max(-overflowX, Math.min(pos.x, overflowX));
    const clampedY = Math.max(-overflowY, Math.min(pos.y, overflowY));
    return { scale: pos.scale, x: scaledWidth < containerRect.width ? 0 : clampedX, y: scaledHeight < containerRect.height ? 0 : clampedY };
  }, [modalImageRenderMetrics]);

  const handleZoom = (direction: 'in' | 'out') => {
    if (!modalImageRenderMetrics || !modalMapContainerRef.current) return;
    setTransform(prev => {
        const newScale = Math.max(1, Math.min(direction === 'in' ? prev.scale * 1.2 : prev.scale / 1.2, 5));
        const newX = 0 - (0 - prev.x) * (newScale / prev.scale);
        const newY = 0 - (0 - prev.y) * (newScale / prev.scale);
        return clampPosition({ scale: newScale, x: newX, y: newY });
    });
  };
  
  const handlePanStart = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    if (e.button !== 0 || !modalImageRenderMetrics) return;
    let target = e.target as HTMLElement;
    while (target && target !== e.currentTarget) {
      if (target.dataset.pin) return;
      target = target.parentElement as HTMLElement;
    }
    document.body.classList.add('dragging-map');
    panStart.current = { x: e.clientX, y: e.clientY, startX: transform.x, startY: transform.y };
    setIsPanning(true);
    
    const handlePanMove = (moveEvent: globalThis.MouseEvent) => {
      moveEvent.preventDefault();
      if (!panStart.current) return;
      const dx = moveEvent.clientX - panStart.current.x;
      const dy = moveEvent.clientY - panStart.current.y;
      setTransform(prev => clampPosition({ ...prev, x: panStart.current!.startX + dx, y: panStart.current!.startY + dy }));
    };

    const handlePanEnd = () => {
      panStart.current = null;
      setIsPanning(false);
      document.body.classList.remove('dragging-map');
      window.removeEventListener('mousemove', handlePanMove);
      window.removeEventListener('mouseup', handlePanEnd);
    };

    window.addEventListener('mousemove', handlePanMove);
    window.addEventListener('mouseup', handlePanEnd);
  }, [transform.x, transform.y, modalImageRenderMetrics, clampPosition]);

  const renderLudicPins = (isModal: boolean) => {
    if (!isClient || isLoading) return null;
    const activeKey = isModal ? modalActivePopoverKey : activePopoverKey;
    const setActiveKey = isModal ? setModalActivePopoverKey : setActivePopoverKey;

    return clusters.map((cluster, index) => {
      const clusterKey = `fauna-cluster-${index}-${isModal}`;
      const clusterYear = cluster.records[0]?.date?.getFullYear();
      const pinColorClass = clusterYear ? getYearColor(clusterYear, availableYears) : 'fill-gray-500';

      return (
        <div key={clusterKey} data-pin="true" className="absolute" style={{ left: `${cluster.x}%`, top: `${cluster.y}%`, transform: 'translate(-50%, -100%)' }} onMouseDown={(e) => e.stopPropagation()}>
          <Popover open={activeKey === clusterKey} onOpenChange={(open) => setActiveKey(open ? clusterKey : null)}>
            <PopoverTrigger asChild>
              <div className="cursor-pointer relative">
                <MapPin className={cn("h-6 w-6 stroke-white stroke-2 drop-shadow-lg", pinColorClass)} />
                {cluster.records.length > 1 && (<Badge variant="destructive" className="absolute -right-2 -top-2 h-5 w-5 justify-center rounded-full p-0">{cluster.records.length}</Badge>)}
              </div>
            </PopoverTrigger>
            <PopoverContent className="w-80 z-[60]" onOpenAutoFocus={(e) => e.preventDefault()}>
                <div className="grid gap-4">
                  <div className="space-y-2"><h4 className="font-medium leading-none">{cluster.records.length > 1 ? 'Registros Agrupados' : 'Detalhes do Registro'}</h4><p className="text-sm text-muted-foreground">{cluster.records.length} registro(s) neste local.</p></div>
                  <ScrollArea className="h-48"><div className="grid gap-2 pr-4">
                    {cluster.records.map(rec => (
                        <div key={rec.id} className="text-sm p-2 border rounded-md flex justify-between items-center">
                          <div>
                            <p><strong className="font-medium">Data:</strong> {format(rec.date, 'dd/MM/yyyy', { locale: ptBR })}</p>
                            <p><strong className="font-medium">Tipo:</strong> {rec.speciesType || 'N/A'}</p>
                            <p><strong className="font-medium">Local:</strong> {rec.locationName || 'N/A'}</p>
                          </div>
                          <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0" onClick={() => { setActiveKey(null); setDetailedRecord(rec); setIsDetailModalOpen(true); }}><Eye className="h-4 w-4" /></Button>
                        </div>
                    ))}
                  </div></ScrollArea>
                </div>
            </PopoverContent>
          </Popover>
        </div>
      );
    });
  };

  const renderGeoPins = () => {
    if (!isClient || isLoading || geoClusters.length === 0) return null;
    return geoClusters.map((cluster, index) => {
      const clusterKey = `geo-fauna-cluster-${index}`;
      const clusterYear = cluster.records[0]?.date.getFullYear();
      const pinColor = clusterYear ? getYearColor(clusterYear, availableYears).replace('fill-', '') : 'gray-500';

      return (
        <AdvancedMarker key={clusterKey} position={{ lat: cluster.lat, lng: cluster.lng }} onClick={() => setActiveGeoPopoverKey(clusterKey)}>
          <Popover open={activeGeoPopoverKey === clusterKey} onOpenChange={(open) => setActiveGeoPopoverKey(open ? clusterKey : null)}>
            <PopoverTrigger asChild>
              <div className="cursor-pointer relative">
                <MapPin className={cn("h-6 w-6 stroke-white stroke-2 drop-shadow-lg", `fill-${pinColor}`)} />
                {cluster.records.length > 1 && (<Badge variant="destructive" className="absolute -right-2 -top-2 h-5 w-5 justify-center rounded-full p-0">{cluster.records.length}</Badge>)}
              </div>
            </PopoverTrigger>
            <PopoverContent className="w-80 z-[60]" onOpenAutoFocus={(e) => e.preventDefault()}>
              <div className="grid gap-4">
                <div className="space-y-2"><h4 className="font-medium leading-none">{cluster.records.length > 1 ? 'Registros Agrupados' : 'Detalhes do Registro'}</h4><p className="text-sm text-muted-foreground">{cluster.records.length} registro(s) neste local.</p></div>
                <ScrollArea className="h-48"><div className="grid gap-2 pr-4">
                    {cluster.records.map(rec => (
                      <div key={rec.id} className="text-sm p-2 border rounded-md flex justify-between items-center">
                        <div>
                          <p><strong className="font-medium">Data:</strong> {format(rec.date, 'dd/MM/yyyy', { locale: ptBR })}</p>
                          <p><strong className="font-medium">Tipo:</strong> {rec.speciesType || 'N/A'}</p>
                          <p><strong className="font-medium">Local:</strong> {rec.locationName || 'N/A'}</p>
                        </div>
                        <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0" onClick={() => { setActiveGeoPopoverKey(null); setDetailedRecord(rec); setIsDetailModalOpen(true); }}><Eye className="h-4 w-4" /></Button>
                      </div>
                    ))}
                </div></ScrollArea>
              </div>
            </PopoverContent>
          </Popover>
        </AdvancedMarker>
      );
    });
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Mapa Fauna, Flora & Geo</CardTitle>
          <CardDescription>Filtre e visualize a localização dos registros ambientais no mapa.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2"><Label>Filtrar por Mês</Label><MonthSelector selectedMonths={filterMonths} onMonthChange={setFilterMonths} /></div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 items-end">
            <div className="space-y-2"><Label>Filtrar por Ano</Label><SheetFilter title='Filtrar Anos' options={availableYears.map(y => ({ value: y, label: y }))} selected={filterYear} onChange={setFilterYear} disabled={isLoading || availableYears.length === 0} buttonText='Filtrar por Ano' /></div>
            <div className="space-y-2"><Label>Filtrar Espécie/Tipo</Label><SheetFilter title='Filtrar Espécies/Tipos' options={speciesTypes.map(t => ({ value: t, label: t }))} selected={filterType} onChange={setFilterType} disabled={!speciesTypes || speciesTypes.length === 0} buttonText='Filtrar por Tipo' /></div>
            <div className="space-y-2"><Label>Filtrar por Local</Label><SheetFilter title='Filtrar Locais' options={locations.map(l => ({ value: l, label: l }))} selected={filterLocation} onChange={setFilterLocation} disabled={!locations || locations.length === 0} buttonText='Filtrar por Local' /></div>
            <Button onClick={clearFilters} variant="outline" className="w-full">Limpar Filtros</Button>
          </div>
        </CardContent>
      </Card>

      <Dialog onOpenChange={(isOpen) => { setIsMapModalOpen(isOpen); if (isOpen) setTransform({ scale: 1, x: 0, y: 0 }); }} open={isMapModalOpen}>
        <Card>
          <CardHeader>
            <div className='flex justify-between items-center gap-4'>
              <div><CardTitle>Resultados no Mapa</CardTitle><CardDescription>{isLoading ? 'Carregando...' : `Foram encontrados ${filteredRecords.length} registros.`}</CardDescription></div>
              {mapView === 'ludico' && (<DialogTrigger asChild><Button variant="outline" disabled={isLoadingMap || !mapUrl || clusters.length === 0}><ZoomIn className="mr-2 h-4 w-4" /> Ampliar Mapa</Button></DialogTrigger>)}
            </div>
          </CardHeader>
          <CardContent>
            <Tabs value={mapView} onValueChange={(v) => setMapView(v as 'ludico' | 'geo')} className="w-full">
              <TabsList className="grid w-full grid-cols-2"><TabsTrigger value="ludico">Mapa Lúdico</TabsTrigger><TabsTrigger value="geo">Mapa Georreferenciado</TabsTrigger></TabsList>
              <TabsContent value="ludico">
                <div ref={mainMapContainerRef} className="relative mt-4 w-full aspect-video border-2 border-dashed rounded-md bg-muted/20 flex items-center justify-center overflow-hidden">
                  {isLoadingMap || isLoading ? ( <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                  ) : mapUrl ? (
                    <>
                        <NextImage src={mapUrl} alt="Mapa de registros" fill className="object-contain" onLoad={handleImageLoad} onDragStart={(e) => e.preventDefault()} />
                        {mainMapRenderMetrics && (
                          <div className="absolute" style={{ width: `${mainMapRenderMetrics.renderedWidth}px`, height: `${mainMapRenderMetrics.renderedHeight}px`, top: `${mainMapRenderMetrics.offsetY}px`, left: `${mainMapRenderMetrics.offsetX}px` }}>
                            <div className="relative w-full h-full">{renderLudicPins(false)}</div>
                          </div>
                        )}
                    </>
                  ) : (<p className="text-muted-foreground text-center p-4">Nenhum mapa foi carregado.</p>)}
                </div>
              </TabsContent>
              <TabsContent value="geo">
                <div className="relative mt-4 w-full aspect-video border-2 border-dashed rounded-md bg-muted/20 flex items-center justify-center overflow-hidden">
                  {GOOGLE_MAPS_API_KEY ? (
                    <APIProvider apiKey={GOOGLE_MAPS_API_KEY} libraries={['marker']}>
                      <MapBoundsUpdater points={geoPointsForBounds} />
                      <GoogleMap defaultCenter={mapCenter || { lat: -25.0945, lng: -50.1633 }} defaultZoom={15} mapId={'b3b3c3e8f9b9a9e'} mapTypeId={'satellite'} gestureHandling="greedy">{renderGeoPins()}</GoogleMap>
                    </APIProvider>
                  ) : (<p className="text-destructive text-center p-4">Chave de API do Google Maps não configurada.</p>)}
                </div>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
        <DialogContent showClose={false} className="max-w-7xl h-[90vh] flex flex-col p-0">
            <DialogHeader className="p-4 border-b"><DialogTitle>Mapa Interativo de Fauna, Flora & Geo</DialogTitle><DialogDescription>Clique e arraste para mover. Dê um clique em um pino para ver os detalhes.</DialogDescription></DialogHeader>
            <div ref={modalMapContainerRef} className={cn("flex-1 relative overflow-hidden bg-muted/80 flex justify-center items-center w-full h-full", isPanning ? 'dragging-map' : 'cursor-grab')} onMouseDown={handlePanStart}>
                {mapUrl ? (
                    <div style={{ width: '100%', height: '100%', transform: `translate(${transform.x}px, ${transform.y}px) scale(${transform.scale})` }} onDragStart={(e) => e.preventDefault()}>
                        <div className="relative w-full h-full">
                            <NextImage src={mapUrl} alt="Mapa ampliado" fill className="object-contain" onLoad={handleImageLoad} />
                            {modalImageRenderMetrics && (
                            <div className="absolute" style={{ width: `${modalImageRenderMetrics.renderedWidth}px`, height: `${modalImageRenderMetrics.renderedHeight}px`, top: `${modalImageRenderMetrics.offsetY}px`, left: `${modalImageRenderMetrics.offsetX}px` }}>
                                <div className="relative w-full h-full">{renderLudicPins(true)}</div>
                            </div>
                            )}
                        </div>
                      </div>
                ) : isLoadingMap ? (<Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />) : (<p className="text-center p-4">Mapa não disponível.</p>)}
            </div>
            <div className="absolute top-4 right-4 flex flex-col items-center gap-2">
                <DialogClose asChild><Button variant="outline">Fechar modo ampliado</Button></DialogClose>
                <div className="mt-2 flex flex-col gap-2">
                    <Button variant="outline" size="icon" onClick={() => handleZoom('in')} disabled={!modalImageRenderMetrics || transform.scale >= 5}><ZoomIn/></Button>
                    <Button variant="outline" size="icon" onClick={() => handleZoom('out')} disabled={!modalImageRenderMetrics || transform.scale <= 1}><ZoomOut/></Button>
                </div>
            </div>
        </DialogContent>
      </Dialog>
      <Dialog open={isDetailModalOpen} onOpenChange={(isOpen) => { if (!isOpen) setDetailedRecord(null); setIsDetailModalOpen(isOpen); }}>
        <DialogContent className="max-w-2xl">
          <DialogHeader><DialogTitle>Detalhes do Registro</DialogTitle><DialogDescription>Visualização detalhada do registro ambiental.</DialogDescription></DialogHeader>
          {detailedRecord && (
            <>
              <ScrollArea className="max-h-[70vh] pr-6"><div className="space-y-4 py-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div><Label className="font-semibold text-muted-foreground">Data</Label><p>{format(detailedRecord.date, 'dd/MM/yyyy', { locale: ptBR })}</p></div>
                      <div><Label className="font-semibold text-muted-foreground">Local</Label><p>{detailedRecord.locationName}</p></div>
                      <div><Label className="font-semibold text-muted-foreground">Espécie / Tipo</Label><p>{detailedRecord.speciesType}</p></div>
                      <div><Label className="font-semibold text-muted-foreground">Análise</Label><div>{analysisMapping[detailedRecord.analysis] ? (<Badge className={cn(analysisMapping[detailedRecord.analysis].className)}>{analysisMapping[detailedRecord.analysis].label}</Badge>) : 'N/A'}</div></div>
                  </div>
                  <div><Label className="font-semibold text-muted-foreground">Descrição</Label><p className="whitespace-pre-wrap">{detailedRecord.description}</p></div>
              </div></ScrollArea>
              <div className="flex justify-end pt-2"><DialogClose asChild><Button type="button" variant="secondary">Fechar</Button></DialogClose></div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ############################################################################
// # 4. MAIN CONTAINER COMPONENT
// ############################################################################

export function FaunaFloraGeoV2() {
  const [activeTab, setActiveTab] = useState('report');
  const [recordToEdit, setRecordToEdit] = useState<any | null>(null);

  const handleEdit = (record: any) => {
    setRecordToEdit(record);
    setActiveTab('register');
  };

  const handleSetPage = (page: 'report' | 'register' | 'map') => {
    if (page !== 'register') {
      setRecordToEdit(null);
    }
    setActiveTab(page);
  };

  return (
    <Tabs value={activeTab} onValueChange={(value) => handleSetPage(value as any)} className="w-full">
      <TabsList className="grid w-full grid-cols-3">
        <TabsTrigger value="register">Registrar</TabsTrigger>
        <TabsTrigger value="report">Relatório</TabsTrigger>
        <TabsTrigger value="map">Mapa</TabsTrigger>
      </TabsList>
      <TabsContent value="register" className="mt-6">
        <RegisterFaunaFloraGeoV2 
          recordToEdit={recordToEdit} 
          setPage={(page) => handleSetPage(page as any)} 
        />
      </TabsContent>
      <TabsContent value="report" className="mt-6">
        <FaunaFloraGeoReportV2 
          onEdit={handleEdit} 
        />
      </TabsContent>
      <TabsContent value="map" className="mt-6">
        <FaunaFloraGeoMapReportV2 />
      </TabsContent>
    </Tabs>
  );
}