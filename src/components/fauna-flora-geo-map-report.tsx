
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

interface FaunaFloraGeoRecord {
  id: string;
  date: Date;
  speciesType: string;
  location: string;
  analysis: 'alta' | 'media' | 'baixa';
  description: string;
  mapMarker?: { x: number; y: number };
}

interface Cluster {
  records: FaunaFloraGeoRecord[];
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

export function FaunaFloraGeoMapReport() {
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
  const [modalActivePopoverKey, setModalActivePopoverKey] = useState<string | null>(null);


  // Filter states
  const [filterYear, setFilterYear] = useState<string[]>([]);
  const [filterMonths, setFilterMonths] = useState<string[]>([]);
  const [filterType, setFilterType] = useState<string[]>([]);
  const [filterLocation, setFilterLocation] = useState<string[]>([]);

  // Dynamic options for selects
  const [availableYears, setAvailableYears] = useState<string[]>([]);
  const [speciesTypes, setSpeciesTypes] = useState<string[]>([]);
  const [locations, setLocations] = useState<string[]>([]);
  const [isClient, setIsClient] = useState(false);

  const [naturalImageDimensions, setNaturalImageDimensions] = useState<{width: number, height: number} | null>(null);

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
        }
      } catch (error: unknown) {
        // Error handled - fallback to default
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

        return {
          id: doc.id,
          ...data,
          date: recordDate,
        } as FaunaFloraGeoRecord;
      });
      
      const years = new Set(
        recordsData
          .map(rec => rec.date?.getFullYear())
          .filter((year): year is number => !!year)
          .map(String)
      );
      setAvailableYears(Array.from(years).sort((a, b) => Number(b) - Number(a)));
      
      setRecords(recordsData);
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

  const filteredRecords = useMemo(() => {
    if (!isClient) return [];
    return records.filter(rec => {
      const recDate = rec.date;
      if (!recDate) return false;

      const yearMatch = filterYear.length === 0 || filterYear.includes(recDate.getFullYear().toString());
      const monthMatch = filterMonths.length === 0 || filterMonths.includes(recDate.getMonth().toString());
      const typeMatch = filterType.length === 0 || filterType.includes(rec.speciesType);
      const locationMatch = filterLocation.length === 0 || filterLocation.includes(rec.location);

      return yearMatch && monthMatch && typeMatch && locationMatch && !!rec.mapMarker;
    });
  }, [records, filterYear, filterMonths, filterType, filterLocation, isClient]);

  const clusters = useMemo(() => {
    const points = filteredRecords.filter(rec => rec.mapMarker);
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
                cluster.records.push(point);
                // Recalculate cluster center
                cluster.x = cluster.records.reduce((sum, rec) => sum + (rec.mapMarker?.x || 0), 0) / cluster.records.length;
                cluster.y = cluster.records.reduce((sum, rec) => sum + (rec.mapMarker?.y || 0), 0) / cluster.records.length;
                foundCluster = true;
                break;
            }
        }
        if (!foundCluster && point.mapMarker) {
            clusters.push({
                records: [point],
                x: point.mapMarker.x,
                y: point.mapMarker.y,
            });
        }
    });

    return clusters;
  }, [filteredRecords]);
  
  const clearFilters = () => {
    setFilterYear([]);
    setFilterMonths([]);
    setFilterType([]);
    setFilterLocation([]);
  }
  
  const handleImageLoad = (e: React.SyntheticEvent<HTMLImageElement>) => {
    setNaturalImageDimensions({ width: e.currentTarget.naturalWidth, height: e.currentTarget.naturalHeight });
  };

  const calculateMetrics = useCallback((container: HTMLDivElement | null, naturalDims: {width: number, height: number} | null) => {
    if (!container || !naturalDims) return null;

    // Use clientWidth/Height to exclude border dimensions from calculations
    const containerWidth = container.clientWidth;
    const containerHeight = container.clientHeight;

    if (containerWidth === 0 || containerHeight === 0) return null;

    const { width: naturalWidth, height: naturalHeight } = naturalDims;
    const imageAspectRatio = naturalWidth / naturalHeight;
    const containerAspectRatio = containerWidth / containerHeight;
    
    let renderedWidth: number;
    let renderedHeight: number;
    let offsetX = 0;
    let offsetY = 0;

    if (imageAspectRatio > containerAspectRatio) {
      renderedWidth = containerWidth;
      renderedHeight = renderedWidth / imageAspectRatio;
      offsetY = (containerHeight - renderedHeight) / 2;
    } else {
      renderedHeight = containerHeight;
      renderedWidth = renderedHeight * imageAspectRatio;
      offsetX = (containerWidth - renderedWidth) / 2;
    }

    return { offsetX, offsetY, renderedWidth, renderedHeight, naturalWidth, naturalHeight };
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
    
    let target = e.target as HTMLElement;
    while (target && target !== e.currentTarget) {
      if (target.dataset.pin) {
        return;
      }
      target = target.parentElement as HTMLElement;
    }

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

  const renderPins = (isModal: boolean) => {
    if (!isClient || isLoading) return null;

    const activeKey = isModal ? modalActivePopoverKey : activePopoverKey;
    const setActiveKey = isModal ? setModalActivePopoverKey : setActivePopoverKey;
    
    return clusters.map((cluster, index) => {
      const clusterKey = `fauna-cluster-${index}`;
      const clusterYear = cluster.records[0]?.date.getFullYear();
      const pinColorClass = clusterYear ? getYearColor(clusterYear, availableYears) : 'fill-gray-500';
      
      return (
        <div
            key={clusterKey}
            data-pin="true"
            className="absolute"
            style={{
            left: `${cluster.x}%`,
            top: `${cluster.y}%`,
            transform: 'translate(-50%, -100%)',
            }}
            onMouseDown={(e) => e.stopPropagation()}
        >
        <Popover open={activeKey === clusterKey} onOpenChange={(open) => setActiveKey(open ? clusterKey : null)}>
            <PopoverTrigger asChild>
                <div className="cursor-pointer">
                    <MapPin className={cn("h-5 w-5 stroke-white stroke-2 drop-shadow-lg", pinColorClass)} />
                    {cluster.records.length > 1 && (
                        <Badge variant="destructive" className="absolute -right-2 -top-2 h-5 w-5 justify-center rounded-full p-0">
                            {cluster.records.length}
                        </Badge>
                    )}
                </div>
            </PopoverTrigger>
            <PopoverContent className="w-80 z-[60]" onOpenAutoFocus={(e) => e.preventDefault()}>
                <div className="grid gap-4">
                <div className="space-y-2">
                    <h4 className="font-medium leading-none">{cluster.records.length > 1 ? 'Registros Agrupados' : 'Detalhes do Registro'}</h4>
                    <p className="text-sm text-muted-foreground">
                        {cluster.records.length} registro(s) neste local.
                    </p>
                </div>
                <ScrollArea className="h-48">
                <div className="grid gap-2 pr-4">
                    {cluster.records.map(rec => (
                        <div key={rec.id} className="text-sm p-2 border rounded-md flex justify-between items-center">
                          <div>
                            <p><strong className="font-medium">Data:</strong> {format(rec.date, 'dd/MM/yyyy', { locale: ptBR })}</p>
                            <p><strong className="font-medium">Tipo:</strong> {rec.speciesType}</p>
                            <p><strong className="font-medium">Local:</strong> {rec.location}</p>
                          </div>
                          <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0" onClick={() => {
                              setActiveKey(null);
                              setDetailedRecord(rec);
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
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Mapa Fauna, Flora & Geo</CardTitle>
          <CardDescription>
            Filtre e visualize a localização dos registros ambientais no mapa.
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
                  {isLoading ? 'Carregando...' : `Foram encontrados ${filteredRecords.length} registros com marcação no mapa, agrupados em ${clusters.length} pontos.`}
                </CardDescription>
              </div>
              <DialogTrigger asChild>
                  <Button variant="outline" disabled={isLoadingMap || !mapUrl || clusters.length === 0}>
                      <ZoomIn className="mr-2 h-4 w-4" /> Ampliar Mapa
                  </Button>
              </DialogTrigger>
            </div>
          </CardHeader>
          <CardContent>
            <div ref={mainMapContainerRef} className="relative w-full aspect-video border-2 border-dashed rounded-md bg-muted/20 flex items-center justify-center overflow-hidden">
              {isLoadingMap || isLoading ? (
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
              ) : mapUrl ? (
                <>
                    <NextImage
                        src={mapUrl}
                        alt="Mapa de registros"
                        fill
                        className="object-contain"
                        onLoad={handleImageLoad}
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
                          {renderPins(false)}
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
        <DialogContent showClose={false} className="max-w-7xl h-[90vh] flex flex-col p-0">
            <DialogHeader className="p-4 border-b">
                <DialogTitle>Mapa Interativo de Fauna, Flora & Geo</DialogTitle>
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
                                onLoad={handleImageLoad}
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
                                    {renderPins(true)}
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
            <div className="absolute top-4 right-4 flex flex-col items-center gap-2">
                <DialogClose asChild>
                    <Button variant="outline">Fechar modo ampliado</Button>
                </DialogClose>
                <div className="mt-2 flex flex-col gap-2">
                    <Button variant="outline" size="icon" onClick={() => handleZoom('in')} disabled={!modalImageRenderMetrics || transform.scale >= 5}><ZoomIn/></Button>
                    <Button variant="outline" size="icon" onClick={() => handleZoom('out')} disabled={!modalImageRenderMetrics || transform.scale <= 1}><ZoomOut/></Button>
                </div>
            </div>
        </DialogContent>
      </Dialog>
      <Dialog open={isDetailModalOpen} onOpenChange={(isOpen) => {
        if (!isOpen) {
          setDetailedRecord(null);
        }
        setIsDetailModalOpen(isOpen);
      }}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Detalhes do Registro</DialogTitle>
            <DialogDescription>
              Visualização detalhada do registro ambiental.
            </DialogDescription>
          </DialogHeader>
          {detailedRecord && (
            <>
              <ScrollArea className="max-h-[70vh] pr-6">
                <div className="space-y-4 py-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <Label className="font-semibold text-muted-foreground">Data do Registro</Label>
                        <p>{format(detailedRecord.date, 'dd/MM/yyyy', { locale: ptBR })}</p>
                      </div>
                      <div>
                        <Label className="font-semibold text-muted-foreground">Local</Label>
                        <p>{detailedRecord.location}</p>
                      </div>
                      <div>
                        <Label className="font-semibold text-muted-foreground">Espécie / Tipo</Label>
                        <p>{detailedRecord.speciesType}</p>
                      </div>
                      <div>
                        <Label className="font-semibold text-muted-foreground">Análise</Label>
                        <div>
                          {analysisMapping[detailedRecord.analysis] ? (
                              <Badge className={cn(analysisMapping[detailedRecord.analysis].className)}>
                                  {analysisMapping[detailedRecord.analysis].label}
                              </Badge>
                          ) : 'N/A'}
                        </div>
                      </div>
                  </div>
                  <div>
                      <Label className="font-semibold text-muted-foreground">Descrição</Label>
                      <p className="whitespace-pre-wrap">{detailedRecord.description}</p>
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
