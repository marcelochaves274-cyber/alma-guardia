
'use client';

import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
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
import { Pencil, Trash2, Loader2, Eye, MapPin } from 'lucide-react';
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
import { MapSelector, type LocationData } from './map-selector';
import NextImage from 'next/image';
import { SheetFilter } from './sheet-filter';

interface FaunaFloraGeoRecord {
  id: string;
  date: Date;
  speciesType: string;
  locationName: string;
  analysis: 'alta' | 'media' | 'baixa';
  description: string;
  mapLocation?: LocationData;
  mapMarker?: { x: number; y: number };
}

interface FaunaFloraGeoReportProps {
  onEdit: (record: FaunaFloraGeoRecord, scrollPosition: number) => void;
  initialScrollPosition?: number; // Add this prop
}

const analysisMapping: Record<string, { label: string, className: string }> = {
    alta: { label: 'Alta', className: 'bg-red-500 text-white hover:bg-red-600' },
    media: { label: 'Média', className: 'bg-orange-500 text-white hover:bg-orange-600' },
    baixa: { label: 'Baixa', className: 'bg-yellow-500 text-black hover:bg-yellow-600' }
};

export function FaunaFloraGeoReport({ onEdit, initialScrollPosition }: FaunaFloraGeoReportProps) {
  const firestore = useFirestore();
  const { user } = useUser();
  const { toast } = useToast();
  
  const [records, setRecords] = useState<FaunaFloraGeoRecord[]>([]);
  const [selectedRecord, setSelectedRecord] = useState<FaunaFloraGeoRecord | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isDeleting, setIsDeleting] = useState<string | null>(null);
  const [isClient, setIsClient] = useState(false);
  const scrollContainerRef = useRef<HTMLDivElement>(null); // Add useRef

  // Filter states
  const [filterYear, setFilterYear] = useState<string[]>([]);
  const [filterMonths, setFilterMonths] = useState<string[]>([]);
  const [filterType, setFilterType] = useState<string[]>([]);
  const [filterLocation, setFilterLocation] = useState<string[]>([]);
  const [filterAnalysis, setFilterAnalysis] = useState<string[]>([]);
  
  // Dynamic options for selects
  const [availableYears, setAvailableYears] = useState<string[]>([]);
  const [speciesTypes, setSpeciesTypes] = useState<string[]>([]);
  const [locations, setLocations] = useState<string[]>([]);
  const [mapUrl, setMapUrl] = useState<string | null>(null);
  const [mapCenter, setMapCenter] = useState<{ lat: number; lng: number } | undefined>(undefined);
  const [isLoadingMap, setIsLoadingMap] = useState(true);

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
          setData((data[field] || []).sort((a: string, b: string) => a.localeCompare(b)));
        }
      } catch (error: unknown) {
        // Error handled silently
      }
    };
    fetchSelectOptions('faunaFloraGeoTypes', setSpeciesTypes, 'types');
    fetchSelectOptions('locations', setLocations, 'locations');
  }, [getSettingsDocRef]);

  useEffect(() => {
    const fetchMap = async () => {
      const docRef = getSettingsDocRef('mapDetails');
      if (!docRef) {
        setIsLoadingMap(false);
        return;
      }
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
  
  // Fetch all records with real-time updates
  useEffect(() => {
    if (!user || !firestore) return;
    setIsLoading(true);

    const recordsCollectionRef = collection(firestore, 'sgs_genius', user.uid, 'fauna_flora_geo');
    
    const unsubscribe = onSnapshot(recordsCollectionRef, (querySnapshot) => {
      const recordsData = querySnapshot.docs.map(doc => {
        const data = doc.data();
        const recordDate = data.date instanceof Timestamp 
          ? data.date.toDate() 
          : new Date(0); 
        
        let locationData = data.location;
        // Backwards compatibility for old mapMarker format
        if (data.mapMarker && !data.location) {
          locationData = {
            mapType: 'ludico',
            ludico: data.mapMarker,
          }
        }

        return {
          id: doc.id,
          ...data,
          locationName: data.locationName || data.location, // Compatibilidade com campo antigo
          date: recordDate,
          mapLocation: locationData,
        } as unknown as FaunaFloraGeoRecord;
      });
      
      const years = new Set(
        recordsData
          .map(rec => rec.date?.getFullYear()) // Corrected from rec.date to rec.date
          .filter((year): year is number => !!year)
          .map(String)
      );
      setAvailableYears(Array.from(years).sort((a, b) => Number(b) - Number(a)));

      setRecords(recordsData.sort((a, b) => b.date.getTime() - a.date.getTime()));
      setIsLoading(false);
    }, (error: unknown) => {
        toast({
            variant: "destructive",
            title: "Erro de conexão",
            description: "Não foi possível buscar os registros em tempo real."
        });
        setIsLoading(false);
    });
    
    return () => unsubscribe();
  }, [user, firestore, toast]);

  // Efeito para garantir que o scroll comece no topo (último lançamento) ao carregar
  useEffect(() => {
    if (!isLoading) {
      const timer = setTimeout(() => {
        if (scrollContainerRef.current) {
          scrollContainerRef.current.scrollTop = 0; 
        }
        const element = document.getElementById('report-top');
        if (element) {
          element.scrollIntoView({ behavior: 'auto', block: 'start' });
        }
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [isLoading]);

  // Efeito para garantir que o scroll volte ao topo ao fechar o modal (olhinho)
  useEffect(() => {
    if (!selectedRecord && !isLoading) {
      if (scrollContainerRef.current) {
        scrollContainerRef.current.scrollTop = 0;
      }
      const element = document.getElementById('report-top');
      if (element) {
        element.scrollIntoView({ behavior: 'auto', block: 'start' });
      }
    }
  }, [selectedRecord, isLoading]);

  const filteredRecords = useMemo(() => {
    return records.filter(rec => {
      const recDate = rec.date;
      if (!recDate || !isClient) return false;

      const yearMatch = filterYear.length === 0 || filterYear.includes(recDate.getFullYear().toString());
      const monthMatch = filterMonths.length === 0 || filterMonths.includes(recDate.getMonth().toString());
      const typeMatch = filterType.length === 0 || filterType.includes(rec.speciesType);
      const locationMatch = filterLocation.length === 0 || filterLocation.includes(rec.locationName);
      const analysisMatch = filterAnalysis.length === 0 || filterAnalysis.includes(rec.analysis);

      return yearMatch && monthMatch && typeMatch && locationMatch && analysisMatch;
    });
  }, [records, filterYear, filterMonths, filterType, filterLocation, filterAnalysis, isClient]);

  const clearFilters = () => {
    setFilterYear([]);
    setFilterMonths([]);
    setFilterType([]);
    setFilterLocation([]);
    setFilterAnalysis([]);
  }

  const handleDelete = async (recordId: string) => {
    if (!firestore || !user) {
      toast({ variant: 'destructive', title: 'Erro', description: 'Usuário não autenticado.'});
      return;
    }
    setIsDeleting(recordId);
    try {
      const docRef = doc(firestore, 'sgs_genius', user.uid, 'fauna_flora_geo', recordId);
      await deleteDoc(docRef);
      
      toast({
        title: 'Sucesso!',
        description: 'Registro excluído com sucesso.',
      });
    } catch (error: unknown) {
      toast({
        variant: 'destructive',
        title: 'Erro ao excluir',
        description: 'Não foi possível excluir o registro.',
      });
    } finally {
      setIsDeleting(null);
    }
  };

  const handleEdit = (record: FaunaFloraGeoRecord) => {
    onEdit(record, 0); // Always pass 0 for scroll position
  };
  
  const renderSkeletons = () => (
    Array.from({ length: 5 }).map((_, i) => (
      <TableRow key={i}>
        <TableCell><Skeleton className="h-5 w-24" /></TableCell>
        <TableCell><Skeleton className="h-5 w-32" /></TableCell>
        <TableCell><Skeleton className="h-5 w-32" /></TableCell>
        <TableCell><Skeleton className="h-5 w-16" /></TableCell>
        <TableCell><Skeleton className="h-5 w-20" /></TableCell>
      </TableRow>
    ))
  );

  return (
    <Dialog onOpenChange={(isOpen) => { if (!isOpen) setSelectedRecord(null); }}>
      <div id="report-top" className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Relatório de Fauna, Flora &amp; Geo</CardTitle>
          <CardDescription>
            Filtre e visualize os registros do sistema.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>Filtrar por Mês</Label>
            <MonthSelector selectedMonths={filterMonths} onMonthChange={setFilterMonths} />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 items-end">
            <div className='space-y-2'>
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
             <div className='space-y-2'>
                <Label>Filtrar Espécie/Tipo</Label>
                <SheetFilter
                    title='Filtrar Espécies/Tipos'
                    options={speciesTypes.map(t => ({ value: t, label: t }))}
                    selected={filterType}
                    onChange={setFilterType}
                    disabled={!speciesTypes || speciesTypes.length === 0}
                    buttonText='Filtrar por Tipo'
                />
            </div>
             <div className='space-y-2'>
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
              Foram encontrados {filteredRecords.length} registros.
            </CardDescription>
          </CardHeader>
          <CardContent className="p-0 md:p-6 md:pt-0">
            <div ref={scrollContainerRef} className="max-h-[65vh] overflow-y-auto md:max-h-none overflow-x-auto">
              <Table>
                <TableHeader className="sticky top-0 bg-card z-10 shadow-sm">
                  <TableRow>
                    <TableHead>Data</TableHead>
                    <TableHead>Espécie/Tipo</TableHead>
                    <TableHead>Local</TableHead>
                    <TableHead>Análise</TableHead>
                    <TableHead className="text-right">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {isLoading ? (
                    renderSkeletons()
                  ) : filteredRecords.length > 0 ? (
                    filteredRecords.map((rec) => (
                      <TableRow key={rec.id} className={cn(rec.analysis === 'alta' && 'bg-destructive/10 hover:bg-destructive/20')}>
                        <TableCell>{rec.date ? format(rec.date, 'dd/MM/yyyy', { locale: ptBR }) : 'N/A'}</TableCell>
                        <TableCell>{rec.speciesType || 'N/A'}</TableCell>
                        <TableCell>{rec.locationName || 'N/A'}</TableCell>
                        <TableCell>
                          {rec.analysis && analysisMapping[rec.analysis] ? (
                              <Badge className={cn(analysisMapping[rec.analysis].className)}>
                                  {analysisMapping[rec.analysis].label}
                              </Badge>
                          ) : 'N/A'}
                        </TableCell>
                        <TableCell className="text-right">
                          <DialogTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-primary" aria-label="Visualizar registro" onClick={() => setSelectedRecord(rec)}>
                                <Eye className="h-4 w-4" />
                            </Button>
                          </DialogTrigger>
                          <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-primary" aria-label="Editar registro" onClick={() => onEdit(rec, 0)}>
                              <Pencil className="h-4 w-4" />
                          </Button>
                          <AlertDialog>
                              <AlertDialogTrigger asChild>
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-8 w-8 text-muted-foreground hover:text-destructive"
                                    aria-label="Excluir registro"
                                    disabled={isDeleting === rec.id}
                                  >
                                    {isDeleting === rec.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
                                </Button>
                              </AlertDialogTrigger>
                              <AlertDialogContent>
                                  <AlertDialogHeader>
                                      <AlertDialogTitle>Você tem certeza?</AlertDialogTitle>
                                      <AlertDialogDescription>
                                      Esta ação não pode ser desfeita. Isso excluirá permanentemente o registro de <span className="font-semibold">{rec.speciesType}</span> do dia <span className="font-semibold">{rec.date ? format(rec.date, 'dd/MM/yyyy') : ''}</span>.
                                      </AlertDialogDescription>
                                  </AlertDialogHeader>
                                  <AlertDialogFooter>
                                      <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                      <AlertDialogAction 
                                          onClick={() => handleDelete(rec.id)}
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
                      <TableCell colSpan={5} className="h-24 text-center">
                        {records.length === 0 ? "Nenhum registro encontrado." : "Nenhum registro encontrado com os filtros selecionados."}
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
        <DialogContent className="max-w-2xl" onCloseAutoFocus={(e) => e.preventDefault()}>
          <DialogHeader>
            <DialogTitle>Detalhes do Registro</DialogTitle>
             <DialogDescription>
              Visualização detalhada do registro ambiental.
            </DialogDescription>
          </DialogHeader>
          {selectedRecord && (
            <>
              <ScrollArea className="max-h-[70vh] pr-6">
                <div className="space-y-4 py-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <Label className="font-semibold text-muted-foreground">Data do Registro</Label>
                        <p>{format(selectedRecord.date, 'dd/MM/yyyy', { locale: ptBR })}</p>
                      </div>
                      <div>
                        <Label className="font-semibold text-muted-foreground">Local</Label>
                        <p>{selectedRecord.locationName}</p>
                      </div>
                      <div>
                        <Label className="font-semibold text-muted-foreground">Espécie / Tipo</Label>
                        <p>{selectedRecord.speciesType}</p>
                      </div>
                      <div>
                        <Label className="font-semibold text-muted-foreground">Análise</Label>
                        <div>
                          {analysisMapping[selectedRecord.analysis] ? (
                              <Badge className={cn(analysisMapping[selectedRecord.analysis].className)}>
                                  {analysisMapping[selectedRecord.analysis].label}
                              </Badge>
                          ) : 'N/A'}
                        </div>
                      </div>
                  </div>
                  <div>
                      <Label className="font-semibold text-muted-foreground">Descrição</Label>
                      <p className="whitespace-pre-wrap">{selectedRecord.description}</p>
                  </div>
                  {selectedRecord.mapLocation?.geo && (
                    <div className="mt-4 p-3 bg-muted rounded-md text-sm">
                      <p><span className="font-semibold">Latitude:</span> {selectedRecord.mapLocation.geo.lat.toFixed(6)}</p>
                      <p><span className="font-semibold">Longitude:</span> {selectedRecord.mapLocation.geo.lng.toFixed(6)}</p>
                    </div>
                  )}
                  {selectedRecord.mapLocation?.ludico && (
                    <div className="mt-4 p-3 bg-muted rounded-md text-sm">
                      <p className="font-semibold">Coordenadas no Mapa Lúdico</p>
                      <p>
                        <span className="font-semibold">X:</span> {selectedRecord.mapLocation.ludico.x.toFixed(2)}% | 
                        <span className="font-semibold ml-2">Y:</span> {selectedRecord.mapLocation.ludico.y.toFixed(2)}%
                      </p>
                    </div>
                  )}
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
      </div>
    </Dialog>
  );
}

    