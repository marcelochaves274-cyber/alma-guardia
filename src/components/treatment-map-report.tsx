
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
import { format, isBefore, startOfDay } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { ScrollArea } from './ui/scroll-area';
import { MonthSelector } from './month-selector';
import { Label } from './ui/label';
import { cn } from '@/lib/utils';
import { SheetFilter } from './sheet-filter';

interface Treatment {
  id: string;
  treatmentDate: Date;
  treatmentType: string;
  treatmentLocation: string;
  riskLevel: number;
  situation: 'pendente' | 'finalizado';
  description: string;
  proposedTreatment: string;
  actionTaken: string;
  probability: string;
  consequence: string;
  completionDate?: Timestamp;
  mapMarker?: { x: number; y: number };
}

interface Cluster {
  treatments: Treatment[];
  x: number;
  y: number;
}

interface ImageRenderMetrics {
  offsetX: number;
  offsetY: number;
  renderedWidth: number;
  renderedHeight: number;
}

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

const getRiskLevelProperties = (score: number) => {
    if (score >= 15) return { label: 'Alta', className: 'bg-red-600 text-white hover:bg-red-700' };
    if (score >= 8) return { label: 'Média', className: 'bg-orange-500 text-white hover:bg-orange-600' };
    if (score > 0) return { label: 'Baixa', className: 'bg-yellow-400 text-black hover:bg-yellow-600' };
    return { label: 'N/A', className: 'bg-muted text-muted-foreground' };
};

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

const YEAR_COLORS = ['fill-red-500', 'fill-blue-500', 'fill-green-500', 'fill-orange-500', 'fill-purple-500', 'fill-yellow-500'];

const getYearColor = (year: number, allYears: string[]) => {
  const sortedYears = [...allYears].sort((a,b) => Number(b) - Number(a));
  const index = sortedYears.indexOf(year.toString());
  if (index === -1) return 'fill-gray-500'; // Fallback color
  return YEAR_COLORS[index % YEAR_COLORS.length];
};

export function TreatmentMapReport() {
  const firestore = useFirestore();
  const { user } = useUser();
  const { toast } = useToast();
  
  const [treatments, setTreatments] = useState<Treatment[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [mapUrl, setMapUrl] = useState<string | null>(null);
  const [isLoadingMap, setIsLoadingMap] = useState(true);
  const [detailedTreatment, setDetailedTreatment] = useState<Treatment | null>(null);
  const [isMapModalOpen, setIsMapModalOpen] = useState(false);
  const [isDetailsModalOpen, setIsDetailsModalOpen] = useState(false);


  // Filter states
  const [filterYear, setFilterYear] = useState<string[]>([]);
  const [filterMonths, setFilterMonths] = useState<string[]>([]);
  const [filterType, setFilterType] = useState<string[]>([]);
  const [filterLocation, setFilterLocation] = useState<string[]>([]);
  const [filterRiskLevel, setFilterRiskLevel] = useState<string[]>([]);
  const [filterSituation, setFilterSituation] = useState<string[]>([]);

  // Dynamic options for selects
  const [availableYears, setAvailableYears] = useState<string[]>([]);
  const [treatmentTypes, setTreatmentTypes] = useState<string[]>([]);
  const [locations, setLocations] = useState<string[]>([]);
  const [isClient, setIsClient] = useState(false);
  const [clientToday, setClientToday] = useState<Date | null>(null);

  // Zoom and Pan state
  const [transform, setTransform] = useState({ scale: 1, x: 0, y: 0 });
  const [imageRenderMetrics, setImageRenderMetrics] = useState<ImageRenderMetrics | null>(null);
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const transformableWrapperRef = useRef<HTMLDivElement>(null);
  const panStart = useRef<{ x: number; y: number, startX: number, startY: number } | null>(null);
  const imageRef = useRef<HTMLImageElement>(null);
  const pinsContainerRef = useRef<HTMLDivElement>(null);


  useEffect(() => {
    setIsClient(true);
    setClientToday(startOfDay(new Date()));
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
    // Re-using occurrence types for now
    fetchSelectOptions('occurrenceTypes', setTreatmentTypes, 'types');
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
          treatmentDate: treatmentDate,
        } as Treatment;
      });
      
      const years = new Set(
        treatmentsData
          .map(occ => occ.treatmentDate?.getFullYear())
          .filter((year): year is number => !!year)
          .map(String)
      );
      setAvailableYears(Array.from(years).sort((a, b) => Number(b) - Number(a)));
      
      setTreatments(treatmentsData);
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
    if (!isClient || !clientToday) return [];
    return treatments.filter(occ => {
      const occDate = occ.treatmentDate;
      if (!occDate) return false;

      const yearMatch = filterYear.length === 0 || filterYear.includes(occDate.getFullYear().toString());
      const monthMatch = filterMonths.length === 0 || filterMonths.includes(occDate.getMonth().toString());
      const typeMatch = filterType.length === 0 || filterType.includes(occ.treatmentType);
      const locationMatch = filterLocation.length === 0 || filterLocation.includes(occ.treatmentLocation);
      
       const riskLevelMatch = filterRiskLevel.length === 0 || filterRiskLevel.some((riskLevel) => {
        const score = occ.riskLevel;
        if (riskLevel === 'alta') return score >= 15;
        if (riskLevel === 'media') return score >= 8 && score < 15;
        if (riskLevel === 'baixa') return score > 0 && score < 8;
        return false;
      });

      const isOverdue = occ.situation === 'pendente' && occ.completionDate && isBefore(startOfDay(occ.completionDate.toDate()), clientToday);

      const situationMatch = filterSituation.length === 0 || filterSituation.some(s => {
        if (s === 'atrasado') return isOverdue;
        if (s === 'pendente') return occ.situation === 'pendente' && !isOverdue;
        if (s === 'finalizado') return occ.situation === 'finalizado';
        return false;
      });

      return yearMatch && monthMatch && typeMatch && locationMatch && riskLevelMatch && situationMatch && !!occ.mapMarker;
    });
  }, [treatments, filterYear, filterMonths, filterType, filterLocation, filterRiskLevel, filterSituation, isClient, clientToday]);

  const clusters = useMemo(() => {
    const points = filteredTreatments.filter(occ => occ.mapMarker);
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
                cluster.treatments.push(point);
                cluster.x = cluster.treatments.reduce((sum, occ) => sum + (occ.mapMarker?.x || 0), 0) / cluster.treatments.length;
                cluster.y = cluster.treatments.reduce((sum, occ) => sum + (occ.mapMarker?.y || 0), 0) / cluster.treatments.length;
                foundCluster = true;
                break;
            }
        }
        if (!foundCluster && point.mapMarker) {
            clusters.push({
                treatments: [point],
                x: point.mapMarker.x,
                y: point.mapMarker.y,
            });
        }
    });

    return clusters;
  }, [filteredTreatments]);
  
  const clearFilters = () => {
    setFilterYear([]);
    setFilterMonths([]);
    setFilterType([]);
    setFilterLocation([]);
    setFilterRiskLevel([]);
    setFilterSituation([]);
  }

  const clampPosition = useCallback((x: number, y: number, scale: number) => {
    if (!mapContainerRef.current || !imageRenderMetrics) return { x, y };

    const containerRect = mapContainerRef.current.getBoundingClientRect();
    const { renderedWidth, renderedHeight } = imageRenderMetrics;

    const scaledWidth = renderedWidth * scale;
    const scaledHeight = renderedHeight * scale;

    const overflowX = Math.max(0, (scaledWidth - containerRect.width) / 2);
    const overflowY = Math.max(0, (scaledHeight - containerRect.height) / 2);

    const clampedX = Math.max(-overflowX, Math.min(x, overflowX));
    const clampedY = Math.max(-overflowY, Math.min(y, overflowY));

    return { x: clampedX, y: clampedY };
  }, [imageRenderMetrics]);

  const handleZoom = (direction: 'in' | 'out') => {
    setTransform(prev => {
        const newScale = Math.max(1, Math.min(direction === 'in' ? prev.scale * 1.2 : prev.scale / 1.2, 5));
        
        const clamped = clampPosition(prev.x, prev.y, newScale);

        return { scale: newScale, x: clamped.x, y: clamped.y };
    });
  };
  
  const handlePanStart = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    if (e.button !== 0 || !imageRenderMetrics) return;

    panStart.current = { x: e.clientX, y: e.clientY, startX: transform.x, startY: transform.y };
    
    const handlePanMove = (moveEvent: globalThis.MouseEvent) => {
      moveEvent.preventDefault();
      const currentPanStart = panStart.current;
      if (!currentPanStart) {
        return;
      }
      
      const dx = moveEvent.clientX - currentPanStart.x;
      const dy = moveEvent.clientY - currentPanStart.y;
      
      setTransform(prev => {
          const newX = currentPanStart.startX + dx;
          const newY = currentPanStart.startY + dy;
          const clamped = clampPosition(newX, newY, prev.scale);
          return { ...prev, x: clamped.x, y: clamped.y };
      });
    };

    const handlePanEnd = () => {
      panStart.current = null;
      window.removeEventListener('mousemove', handlePanMove);
      window.removeEventListener('mouseup', handlePanEnd);
    };

    window.addEventListener('mousemove', handlePanMove);
    window.addEventListener('mouseup', handlePanEnd);
  }, [transform.x, transform.y, imageRenderMetrics, clampPosition]);
  
  const handleImageLoad = (e: React.SyntheticEvent<HTMLImageElement>) => {
    if (!mapContainerRef.current) return;
    const { naturalWidth, naturalHeight } = e.currentTarget;
    const containerRect = mapContainerRef.current.getBoundingClientRect();
    
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

    setImageRenderMetrics({ offsetX, offsetY, renderedWidth, renderedHeight });
    setTransform({ scale: 1, x: 0, y: 0});

     if (pinsContainerRef.current) {
        pinsContainerRef.current.style.width = `${renderedWidth}px`;
        pinsContainerRef.current.style.height = `${renderedHeight}px`;
        pinsContainerRef.current.style.top = `${offsetY}px`;
        pinsContainerRef.current.style.left = `${offsetX}px`;
    }
  };

  const renderedPins = useMemo(() => {
    if (!isClient || isLoading) {
      return null;
    }
    return clusters.map((cluster, index) => {
      const clusterYear = cluster.treatments[0]?.treatmentDate.getFullYear();
      const pinColorClass = clusterYear ? getYearColor(clusterYear, availableYears) : 'fill-gray-500';
      
      return (
        <Popover key={index}>
            <PopoverTrigger asChild>
                <div
                    className="absolute cursor-pointer pointer-events-auto"
                    style={{
                    left: `${cluster.x}%`,
                    top: `${cluster.y}%`,
                    transform: 'translate(-50%, -100%)',
                    }}
                >
                    <MapPin className={cn("h-5 w-5 stroke-white stroke-2 drop-shadow-lg", pinColorClass)} />
                    {cluster.treatments.length > 1 && (
                        <Badge variant="default" className="absolute -right-2 -top-2 h-5 w-5 justify-center rounded-full p-0 bg-blue-600 hover:bg-blue-700">
                            {cluster.treatments.length}
                        </Badge>
                    )}
                </div>
            </PopoverTrigger>
            <PopoverContent className="w-80">
                <div className="grid gap-4">
                <div className="space-y-2">
                    <h4 className="font-medium leading-none">{cluster.treatments.length > 1 ? 'Tratamentos Agrupados' : 'Detalhes do Tratamento'}</h4>
                    <p className="text-sm text-muted-foreground">
                        {cluster.treatments.length} tratamento(s) neste local.
                    </p>
                </div>
                <ScrollArea className="h-48">
                <div className="grid gap-2 pr-4">
                    {cluster.treatments.map(t => (
                        <div key={t.id} className="text-sm p-2 border rounded-md flex justify-between items-center">
                          <div>
                            <p><strong className="font-medium">Data:</strong> {format(t.treatmentDate, 'dd/MM/yyyy', { locale: ptBR })}</p>
                            <p><strong className="font-medium">Tipo:</strong> {t.treatmentType}</p>
                            <p><strong className="font-medium">Local:</strong> {t.treatmentLocation}</p>
                          </div>
                          <DialogTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0" onClick={() => {
                                setDetailedTreatment(t);
                                setIsDetailsModalOpen(true);
                            }}>
                                <Eye className="h-4 w-4" />
                            </Button>
                          </DialogTrigger>
                        </div>
                    ))}
                </div>
                </ScrollArea>
                </div>
            </PopoverContent>
        </Popover>
      )
    })
  }, [clusters, isClient, availableYears, isLoading]);
  
  return (
    <>
      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Mapa de Tratamentos</CardTitle>
            <CardDescription>
              Filtre e visualize a localização dos tratamentos de risco no mapa.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Filtrar por Mês</Label>
              <MonthSelector selectedMonths={filterMonths} onMonthChange={setFilterMonths} />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 items-end">
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

        
        <Card>
          <CardHeader>
            <div className='flex justify-between items-center gap-4'>
              <div>
                <CardTitle>Resultados no Mapa</CardTitle>
                <CardDescription>
                  {isLoading ? 'Carregando...' : `Foram encontrados ${filteredTreatments.length} tratamentos com marcação no mapa, agrupados em ${clusters.length} pontos.`}
                </CardDescription>
              </div>
               <Dialog open={isMapModalOpen} onOpenChange={setIsMapModalOpen}>
                 <DialogTrigger asChild>
                    <Button variant="outline" disabled={isLoadingMap || !mapUrl}>
                        <ZoomIn className="mr-2 h-4 w-4" /> Ampliar Mapa
                    </Button>
                 </DialogTrigger>
                 <DialogContent className="max-w-7xl h-[90vh] flex flex-col p-0">
                     <DialogHeader className="p-4 border-b">
                         <DialogTitle>Mapa Interativo de Tratamentos de Risco</DialogTitle>
                         <DialogDescription>Use o scroll para ampliar e arraste para mover o mapa.</DialogDescription>
                     </DialogHeader>
                      <div
                          ref={mapContainerRef}
                          className="flex-1 relative overflow-hidden bg-muted flex justify-center items-center cursor-grab"
                          onMouseDown={handlePanStart}
                      >
                          {isLoadingMap && <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />}
                          {!isLoadingMap && !mapUrl && <p className="text-center p-4">Mapa não disponível.</p>}

                           {mapUrl && (
                             <div
                                ref={transformableWrapperRef}
                                className="absolute"
                                style={{
                                    transformOrigin: 'center center',
                                    transform: `translate(${transform.x}px, ${transform.y}px) scale(${transform.scale})`,
                                }}
                              >
                                  <NextImage
                                      ref={imageRef}
                                      src={mapUrl}
                                      alt="Mapa ampliado"
                                      width={1000}
                                      height={1000}
                                      className="object-contain pointer-events-none max-w-full max-h-full"
                                      onLoad={handleImageLoad}
                                      onDragStart={(e) => e.preventDefault()}
                                  />
                                   <div ref={pinsContainerRef} className="absolute top-0 left-0 pointer-events-none">
                                      {imageRenderMetrics && renderedPins}
                                  </div>
                              </div>
                          )}
                      </div>
                     <div className="absolute top-20 right-4 flex flex-col items-center gap-2">
                         <Button variant="outline" size="icon" onClick={() => handleZoom('in')} disabled={transform.scale >= 5}><ZoomIn/></Button>
                         <Button variant="outline" size="icon" onClick={() => handleZoom('out')} disabled={transform.scale <= 1}><ZoomOut/></Button>
                     </div>
                 </DialogContent>
               </Dialog>
            </div>
          </CardHeader>
          <CardContent>
            <div className="relative w-full aspect-video border-2 border-dashed rounded-md bg-muted/20 flex items-center justify-center overflow-hidden">
              {isLoadingMap || isLoading ? (
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
              ) : mapUrl ? (
                <Popover>
                  <div style={{ width: '100%', height: '100%' }}>
                      <NextImage
                          src={mapUrl}
                          alt="Mapa de tratamentos"
                          fill
                          className="object-contain"
                      />
                      {renderedPins}
                  </div>
                </Popover>
              ) : (
                <p className="text-muted-foreground text-center p-4">
                  Nenhum mapa foi carregado. <br />Vá para "Configurações" &gt; "Gerenciar Mapa" para fazer o upload.
                </p>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
      <Dialog open={isDetailsModalOpen} onOpenChange={setIsDetailsModalOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Detalhes do Tratamento de Risco</DialogTitle>
            <DialogDescription>
              Visualização detalhada do registro de tratamento de risco.
            </DialogDescription>
          </DialogHeader>
          {detailedTreatment && (
            <>
              <ScrollArea className="max-h-[70vh] pr-6">
                <div className="space-y-4 py-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <Label className="font-semibold text-muted-foreground">Data da Identificação</Label>
                        <p>{format(detailedTreatment.treatmentDate, 'dd/MM/yyyy', { locale: ptBR })}</p>
                      </div>
                      <div>
                        <Label className="font-semibold text-muted-foreground">Local</Label>
                        <p>{detailedTreatment.treatmentLocation}</p>
                      </div>
                      <div>
                        <Label className="font-semibold text-muted-foreground">Tipo de Risco</Label>
                        <p>{detailedTreatment.treatmentType}</p>
                      </div>
                      <div>
                        <Label className="font-semibold text-muted-foreground">Situação</Label>
                        <div>
                          <Badge className={cn(getSituationProperties(detailedTreatment.situation).className)}>
                            {getSituationProperties(detailedTreatment.situation).label}
                          </Badge>
                        </div>
                      </div>
                      {detailedTreatment.situation === 'pendente' && detailedTreatment.completionDate && (
                        <div>
                          <Label className="font-semibold text-muted-foreground">Prazo para Conclusão</Label>
                          <p>{format(detailedTreatment.completionDate.toDate(), 'dd/MM/yyyy', { locale: ptBR })}</p>
                        </div>
                      )}
                  </div>
                  <div>
                      <Label className="font-semibold text-muted-foreground">Descrição do Risco</Label>
                      <p className="whitespace-pre-wrap">{detailedTreatment.description || 'Não informado'}</p>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 border-t pt-4 mt-4">
                      <div>
                          <Label className="font-semibold text-muted-foreground">Probabilidade</Label>
                          <p>{detailedTreatment.probability}</p>
                      </div>
                      <div>
                          <Label className="font-semibold text-muted-foreground">Consequência</Label>
                          <p>{detailedTreatment.consequence}</p>
                      </div>
                      <div>
                          <Label className="font-semibold text-muted-foreground">Nível de Risco</Label>
                          <div>
                            <Badge className={cn(getRiskLevelProperties(detailedTreatment.riskLevel).className)}>
                                {getRiskLevelProperties(detailedTreatment.riskLevel).label}
                            </Badge>
                          </div>
                      </div>
                  </div>
                  <div>
                      <Label className="font-semibold text-muted-foreground">Tratamento Proposto</Label>
                      <p className="whitespace-pre-wrap">{detailedTreatment.proposedTreatment || 'Não informado'}</p>
                  </div>
                  <div>
                      <Label className="font-semibold text-muted-foreground">Ação Realizada</Label>
                      <p className="whitespace-pre-wrap">{detailedTreatment.actionTaken || 'Não informado'}</p>
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
    </>
  );
}
