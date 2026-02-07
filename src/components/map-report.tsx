
'use client';

import { useState, useEffect, useMemo, useCallback, useRef, MouseEvent } from 'react';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogClose,
  DialogDescription,
  DialogTrigger,
} from "@/components/ui/dialog";
import { useFirestore, useUser } from '@/firebase';
import { collection, getDoc, doc, Timestamp, onSnapshot } from 'firebase/firestore';
import { Button } from './ui/button';
import { Loader2, MapPin, Eye, ZoomIn, ZoomOut } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import NextImage from 'next/image';
import { Badge } from './ui/badge';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { ScrollArea } from './ui/scroll-area';
import { MonthSelector } from './month-selector';
import { Label } from './ui/label';
import { cn } from '@/lib/utils';
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
  mapMarker?: { x: number; y: number };
}

interface Cluster {
  occurrences: Occurrence[];
  x: number;
  y: number;
}

interface ImageRenderMetrics {
  offsetX: number;
  offsetY: number;
  renderedWidth: number;
  renderedHeight: number;
  naturalWidth: number;
  naturalHeight: number;
}

const YEAR_COLORS = ['fill-red-500', 'fill-blue-500', 'fill-green-500', 'fill-orange-500', 'fill-purple-500', 'fill-yellow-500'];

const getYearColor = (year: number, allYears: string[]) => {
  const sortedYears = [...allYears].sort((a,b) => Number(b) - Number(a));
  const index = sortedYears.indexOf(year.toString());
  if (index === -1) return 'fill-gray-500'; // Fallback color
  return YEAR_COLORS[index % YEAR_COLORS.length];
};

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


export function MapReport() {
  const firestore = useFirestore();
  const { user } = useUser();
  const { toast } = useToast();
  
  const [occurrences, setOccurrences] = useState<Occurrence[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [mapUrl, setMapUrl] = useState<string | null>(null);
  const [isLoadingMap, setIsLoadingMap] = useState(true);
  const [detailedOccurrence, setDetailedOccurrence] = useState<Occurrence | null>(null);
  const [isMapModalOpen, setIsMapModalOpen] = useState(false);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [activePopoverKey, setActivePopoverKey] = useState<string | null>(null);

  // Filter states
  const [filterYear, setFilterYear] = useState<string[]>([]);
  const [filterMonths, setFilterMonths] = useState<string[]>([]);
  const [filterType, setFilterType] = useState<string[]>([]);
  const [filterLocation, setFilterLocation] = useState<string[]>([]);

  // Dynamic options for selects
  const [availableYears, setAvailableYears] = useState<string[]>([]);
  const [occurrenceTypes, setOccurrenceTypes] = useState<string[]>([]);
  const [locations, setLocations] = useState<string[]>([]);
  const [isClient, setIsClient] = useState(false);

  // State for main map
  const [mainMapRenderMetrics, setMainMapRenderMetrics] = useState<ImageRenderMetrics | null>(null);
  const mainMapContainerRef = useRef<HTMLDivElement>(null);

  // State for modal map
  const [transform, setTransform] = useState({ scale: 1, x: 0, y: 0 });
  const [modalImageRenderMetrics, setModalImageRenderMetrics] = useState<ImageRenderMetrics | null>(null);
  const modalMapContainerRef = useRef<HTMLDivElement>(null);
  const [isPanning, setIsPanning] = useState(false);
  const panStart = useRef<{ x: number; y: number, startX: number, startY: number } | null>(null);

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
      } catch (error) {
        console.error(`Error fetching ${docName}:`, error);
      }
    };
    fetchSelectOptions('occurrenceTypes', setOccurrenceTypes, 'types');
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
        }
      } catch (error) {
        console.error("Error fetching map:", error);
      } finally {
        setIsLoadingMap(false);
      }
    };
    fetchMap();
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
      
      setOccurrences(occurrencesData);
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
    if (!isClient) return [];
    return occurrences.filter(occ => {
      const occDate = occ.occurrenceDate;
      if (!occDate) return false;

      const yearMatch = filterYear.length === 0 || filterYear.includes(occDate.getFullYear().toString());
      const monthMatch = filterMonths.length === 0 || filterMonths.includes(occDate.getMonth().toString());
      const typeMatch = filterType.length === 0 || filterType.includes(occ.occurrenceType);
      const locationMatch = filterLocation.length === 0 || filterLocation.includes(occ.occurrenceLocation);

      return yearMatch && monthMatch && typeMatch && locationMatch && !!occ.mapMarker;
    });
  }, [occurrences, filterYear, filterMonths, filterType, filterLocation, isClient]);

  const clusters = useMemo(() => {
    const points = filteredOccurrences.filter(occ => occ.mapMarker);
    const clusters: Cluster[] = [];
    const distanceThreshold = 5; 

    points.forEach(point => {
        let foundCluster = false;
        for (const cluster of clusters) {
            const distance = Math.sqrt(
                Math.pow(cluster.x - (point.mapMarker?.x || 0), 2) +
                Math.pow(cluster.y - (point.mapMarker?.y || 0), 2)
            );
            if (distance < distanceThreshold) {
                cluster.occurrences.push(point);
                cluster.x = cluster.occurrences.reduce((sum, occ) => sum + (occ.mapMarker?.x || 0), 0) / cluster.occurrences.length;
                cluster.y = cluster.occurrences.reduce((sum, occ) => sum + (occ.mapMarker?.y || 0), 0) / cluster.occurrences.length;
                foundCluster = true;
                break;
            }
        }
        if (!foundCluster && point.mapMarker) {
            clusters.push({
                occurrences: [point],
                x: point.mapMarker.x,
                y: point.mapMarker.y,
            });
        }
    });

    return clusters;
  }, [filteredOccurrences]);
  
  const clearFilters = () => {
    setFilterYear([]);
    setFilterMonths([]);
    setFilterType([]);
    setFilterLocation([]);
  }

  const handleImageLoad = (
    e: React.SyntheticEvent<HTMLImageElement>,
    containerRef: React.RefObject<HTMLDivElement>,
    setMetrics: React.Dispatch<React.SetStateAction<ImageRenderMetrics | null>>
  ) => {
      if (!containerRef.current) return;
      const { naturalWidth, naturalHeight } = e.currentTarget;
      const containerRect = containerRef.current.getBoundingClientRect();
      
      const imageAspectRatio = naturalWidth / naturalHeight;
      const containerAspectRatio = containerRect.width / containerRect.height;
      
      let renderedWidth: number;
      let renderedHeight: number;
      let offsetX = 0;
      let offsetY = 0;
  
      if (imageAspectRatio > containerAspectRatio) {
        renderedWidth = containerRect.width;
        renderedHeight = renderedWidth / imageAspectRatio;
        offsetY = (containerRect.height - renderedHeight) / 2;
      } else {
        renderedHeight = containerRect.height;
        renderedWidth = renderedHeight * imageAspectRatio;
        offsetX = (containerRect.width - renderedWidth) / 2;
      }
  
      setMetrics({ offsetX, offsetY, renderedWidth, renderedHeight, naturalWidth, naturalHeight });
  };

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
    
    return {
        scale: pos.scale,
        x: scaledWidth < containerRect.width ? 0 : clampedX,
        y: scaledHeight < containerRect.height ? 0 : clampedY,
    };
  }, [modalImageRenderMetrics]);


  const handleZoom = (direction: 'in' | 'out') => {
    if (!modalImageRenderMetrics || !modalMapContainerRef.current) return;
    
    setTransform(prev => {
        const newScale = Math.max(1, Math.min(direction === 'in' ? prev.scale * 1.2 : prev.scale / 1.2, 5));
        const center = { x: 0, y: 0 };
        const newX = center.x - (center.x - prev.x) * (newScale / prev.scale);
        const newY = center.y - (center.y - prev.y) * (newScale / prev.scale);
        
        return clampPosition({ scale: newScale, x: newX, y: newY });
    });
  };
  
  const handlePanStart = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    if (e.button !== 0 || !modalImageRenderMetrics) return;

    document.body.classList.add('dragging-map');

    panStart.current = { x: e.clientX, y: e.clientY, startX: transform.x, startY: transform.y };
    setIsPanning(true);
    
    const handlePanMove = (moveEvent: globalThis.MouseEvent) => {
      moveEvent.preventDefault();
      const localPanStart = panStart.current;
      if (!localPanStart) {
        return;
      }
      
      const dx = moveEvent.clientX - localPanStart.x;
      const dy = moveEvent.clientY - localPanStart.y;
      
      setTransform(prev => {
          const newX = localPanStart.startX + dx;
          const newY = localPanStart.startY + dy;
          return clampPosition({ ...prev, x: newX, y: newY });
      });
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
  
  const renderPins = useMemo(() => {
    if (!isClient || isLoading) return null;

    return clusters.map((cluster, index) => {
      const clusterKey = `occurrence-cluster-${index}`;
      const clusterYear = cluster.occurrences[0]?.occurrenceDate.getFullYear();
      const pinColorClass = clusterYear ? getYearColor(clusterYear, availableYears) : 'fill-gray-500';
      
      return (
        <div
          key={clusterKey}
          className="absolute"
          style={{
            left: `${cluster.x}%`,
            top: `${cluster.y}%`,
            transform: 'translate(-50%, -100%)',
          }}
        >
          <Popover open={activePopoverKey === clusterKey} onOpenChange={(open) => setActivePopoverKey(open ? clusterKey : null)}>
              <PopoverTrigger asChild>
                  <div
                    className="cursor-pointer"
                    onMouseDown={(e) => e.stopPropagation()}
                  >
                    <MapPin className={cn("h-5 w-5 stroke-white stroke-2 drop-shadow-lg", pinColorClass)} />
                    {cluster.occurrences.length > 1 && (
                        <Badge variant="destructive" className="absolute -right-2 -top-2 h-5 w-5 justify-center rounded-full p-0">
                            {cluster.occurrences.length}
                        </Badge>
                    )}
                  </div>
              </PopoverTrigger>
              <PopoverContent className="w-80 z-[60]">
                  <div className="grid gap-4">
                    <div className="space-y-2">
                        <h4 className="font-medium leading-none">{cluster.occurrences.length > 1 ? 'Ocorrências Agrupadas' : 'Detalhes da Ocorrência'}</h4>
                        <p className="text-sm text-muted-foreground">
                            {cluster.occurrences.length} ocorrência(s) neste local.
                        </p>
                    </div>
                    <ScrollArea className="h-48">
                    <div className="grid gap-2 pr-4">
                        {cluster.occurrences.map(occ => (
                            <div key={occ.id} className="text-sm p-2 border rounded-md flex justify-between items-center">
                              <div>
                                <p><strong className="font-medium">Data:</strong> {format(occ.occurrenceDate, 'dd/MM/yyyy', { locale: ptBR })}</p>
                                <p><strong className="font-medium">Tipo:</strong> {occ.occurrenceType}</p>
                                <p><strong className="font-medium">Local:</strong> {occ.occurrenceLocation}</p>
                              </div>
                              <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0" onClick={() => {
                                    setActivePopoverKey(null);
                                    setDetailedOccurrence(occ);
                                    setIsDetailModalOpen(true);
                                }}>
                                    <Eye className="h-4 w-4" />
                              </Button>
                            </div>
                        ))}
                    </div>
                    </ScrollArea>
                  </div>
              </PopoverContent>
          </Popover>
        </div>
      )
    });
  }, [clusters, isClient, availableYears, isLoading, activePopoverKey, setActivePopoverKey, setIsDetailModalOpen, setDetailedOccurrence]);

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Mapa de Ocorrências</CardTitle>
          <CardDescription>
            Filtre e visualize a localização das ocorrências (acidentes/incidentes) no mapa.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>Filtrar por Mês</Label>
            <MonthSelector selectedMonths={filterMonths} onMonthChange={setFilterMonths} />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 items-end">
            <div className="space-y-2">
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
            <div className="space-y-2">
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
            
            <Button onClick={clearFilters} variant="outline" className="w-full">
              Limpar Filtros
            </Button>
          </div>
        </CardContent>
      </Card>
      
      <Dialog onOpenChange={(isOpen) => {
        setIsMapModalOpen(isOpen);
        if (isOpen) {
          setTransform({ scale: 1, x: 0, y: 0 });
        }
      }} open={isMapModalOpen}>
        <Card>
            <CardHeader>
              <div className='flex justify-between items-center gap-4'>
                <div>
                  <CardTitle>Resultados no Mapa</CardTitle>
                  <CardDescription>
                    {isLoading ? 'Carregando...' : `Foram encontradas ${filteredOccurrences.length} ocorrências com marcação no mapa, agrupadas em ${clusters.length} pontos.`}
                  </CardDescription>
                </div>
                <DialogTrigger asChild>
                    <Button variant="outline" disabled={isLoadingMap || !mapUrl}>
                        <ZoomIn className="mr-2 h-4 w-4" /> Ampliar Mapa
                    </Button>
                </DialogTrigger>
              </div>
            </CardHeader>
            <CardContent>
              <div ref={mainMapContainerRef} className="relative w-full aspect-video border-2 border-dashed rounded-md bg-muted/20 flex items-center justify-center overflow-hidden">
                {isLoadingMap || isLoading ? ( <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                ) : mapUrl ? (
                  <>
                      <NextImage 
                        src={mapUrl} 
                        alt="Mapa de ocorrências" 
                        fill 
                        className="object-contain"
                        onLoad={(e) => handleImageLoad(e, mainMapContainerRef, setMainMapRenderMetrics)}
                        onDragStart={(e) => e.preventDefault()}
                      />
                      {mainMapRenderMetrics && (
                        <div className="absolute" style={{
                          width: `${mainMapRenderMetrics.renderedWidth}px`,
                          height: `${mainMapRenderMetrics.renderedHeight}px`,
                          top: `${mainMapRenderMetrics.offsetY}px`,
                          left: `${mainMapRenderMetrics.offsetX}px`,
                        }}>
                          <div className="relative w-full h-full">
                            {renderPins}
                          </div>
                        </div>
                      )}
                  </>
                ) : (
                  <p className="text-muted-foreground text-center p-4">
                    Nenhum mapa foi carregado. <br />Vá para "Configurações" &gt; "Gerenciar Mapa" para fazer o upload.
                  </p>
                )}
              </div>
            </CardContent>
        </Card>
        <DialogContent className="max-w-7xl h-[90vh] flex flex-col p-0">
            <DialogHeader className="p-4 border-b">
                <DialogTitle>Mapa Interativo de Ocorrências</DialogTitle>
                <DialogDescription>Clique e arraste para mover. Dê um clique em um pino para ver os detalhes.</DialogDescription>
            </DialogHeader>
            <div
                ref={modalMapContainerRef}
                className={cn("flex-1 relative overflow-hidden bg-muted/80 flex justify-center items-center w-full h-full", isPanning ? 'dragging-map' : 'cursor-grab')}
                onMouseDown={handlePanStart}
            >
                {mapUrl ? (
                    <div
                        style={{
                            width: '100%',
                            height: '100%',
                            transform: `translate(${transform.x}px, ${transform.y}px) scale(${transform.scale})`,
                        }}
                        onDragStart={(e) => e.preventDefault()}
                    >
                        <div className="relative w-full h-full">
                             <NextImage
                                src={mapUrl}
                                alt="Mapa ampliado"
                                fill
                                className="object-contain"
                                onLoad={(e) => handleImageLoad(e, modalMapContainerRef, setModalImageRenderMetrics)}
                            />
                            {modalImageRenderMetrics && (
                            <div
                                className="absolute"
                                style={{
                                    width: `${modalImageRenderMetrics.renderedWidth}px`,
                                    height: `${modalImageRenderMetrics.renderedHeight}px`,
                                    top: `${modalImageRenderMetrics.offsetY}px`,
                                    left: `${modalImageRenderMetrics.offsetX}px`,
                                }}
                            >
                                <div className="relative w-full h-full">
                                    {renderPins}
                                </div>
                            </div>
                            )}
                        </div>
                    </div>
                ) : isLoadingMap ? (
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                ) : (
                <p className="text-center p-4">Mapa não disponível.</p>
                )}
            </div>
            <div className="absolute top-20 right-4 flex flex-col items-center gap-2">
                <Button variant="outline" size="icon" onClick={() => handleZoom('in')} disabled={!modalImageRenderMetrics || transform.scale >= 5}><ZoomIn/></Button>
                <Button variant="outline" size="icon" onClick={() => handleZoom('out')} disabled={!modalImageRenderMetrics || transform.scale <= 1}><ZoomOut/></Button>
            </div>
        </DialogContent>
      </Dialog>
      
      <Dialog open={isDetailModalOpen} onOpenChange={(isOpen) => {
        if (!isOpen) {
          setDetailedOccurrence(null);
        }
        setIsDetailModalOpen(isOpen);
      }}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Detalhes da Ocorrência</DialogTitle>
            <DialogDescription>Visualização detalhada da ocorrência selecionada.</DialogDescription>
          </DialogHeader>
          {detailedOccurrence && (
            <>
              <ScrollArea className="max-h-[70vh] pr-6">
                <div className="space-y-4 py-4">
                  
                  <div className="space-y-2">
                    <h4 className="font-semibold text-foreground">Dados da Ocorrência</h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 rounded-md border p-4">
                      <div>
                        <Label className="text-muted-foreground">Data</Label>
                        <p>{format(detailedOccurrence.occurrenceDate, 'dd/MM/yyyy', { locale: ptBR })}</p>
                      </div>
                      <div>
                        <Label className="text-muted-foreground">Local</Label>
                        <p>{detailedOccurrence.occurrenceLocation}</p>
                      </div>
                      <div>
                        <Label className="text-muted-foreground">Tipo de Ocorrência</Label>
                        <p>{detailedOccurrence.occurrenceType}</p>
                      </div>
                      <div>
                        <Label className="text-muted-foreground">Análise</Label>
                        <div>
                          {analysisMapping[detailedOccurrence.analysis] ? (
                              <Badge className={cn(analysisMapping[detailedOccurrence.analysis].className)}>
                                  {analysisMapping[detailedOccurrence.analysis].label}
                              </Badge>
                          ) : 'N/A'}
                        </div>
                      </div>
                      <div className="col-span-1 md:col-span-2">
                        <Label className="text-muted-foreground">Descrição</Label>
                        <p className="whitespace-pre-wrap">{detailedOccurrence.description}</p>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <h4 className="font-semibold text-foreground">Dados do Envolvido</h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 rounded-md border p-4">
                        <div>
                          <Label className="text-muted-foreground">Nome Completo</Label>
                          <p>{detailedOccurrence.involvedPersonName}</p>
                        </div>
                        <div>
                          <Label className="text-muted-foreground">CPF</Label>
                          <p>{detailedOccurrence.cpf || 'Não informado'}</p>
                        </div>
                        <div>
                          <Label className="text-muted-foreground">Data de Nascimento</Label>
                          <p>{detailedOccurrence.birthDate || 'Não informado'}</p>
                        </div>
                        <div>
                          <Label className="text-muted-foreground">Faixa Etária</Label>
                          <p>{ageGroupOptions.find(o => o.value === detailedOccurrence.ageGroup)?.label || detailedOccurrence.ageGroup || 'Não informado'}</p>
                        </div>
                         <div>
                          <Label className="text-muted-foreground">Telefone</Label>
                          <p>{detailedOccurrence.phone || 'Não informado'}</p>
                        </div>
                        <div>
                          <Label className="text-muted-foreground">Cidade/Estado</Label>
                          <p>{detailedOccurrence.city || 'Não informado'} / {detailedOccurrence.state || 'N/A'}</p>
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
    </div>
  );
}
