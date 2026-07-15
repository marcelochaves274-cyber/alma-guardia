
'use client';

import { useState, useEffect, useMemo, useCallback, useRef, useLayoutEffect } from 'react';
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
import { APIProvider, Map as GoogleMap, AdvancedMarker, useMap } from '@vis.gl/react-google-maps';
import { collection, getDoc, doc, Timestamp, onSnapshot, GeoPoint } from 'firebase/firestore';
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

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
  location?: {
    mapType: 'ludico' | 'geo';
    ludico?: { x: number; y: number };
    geo?: { lat: number; lng: number };
  };
}

interface Cluster {
  treatments: Treatment[];
  x: number;
  y: number;
}

interface GeoCluster {
  treatments: Treatment[];
  lat: number;
  lng: number;
}

interface ImageRenderMetrics {
  offsetX: number;
  offsetY: number;
  renderedWidth: number;
  renderedHeight: number;
  naturalWidth: number;
  naturalHeight: number;
}

const MapBoundsUpdater = ({ points }: { points: { lat: number; lng: number }[] }) => {
  const map = useMap();

  useLayoutEffect(() => {
    if (!map || points.length === 0) return;

    if (points.length === 1) {
      map.moveCamera({ center: points[0], zoom: 15 });
      return;
    }

    const bounds = new google.maps.LatLngBounds();
    points.forEach(point => bounds.extend(point));
    map.fitBounds(bounds, 100); // 100 is padding in pixels
  }, [map, points]);

  return null;
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
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [activePopoverKey, setActivePopoverKey] = useState<string | null>(null);
  const [modalActivePopoverKey, setModalActivePopoverKey] = useState<string | null>(null);
  const [activeGeoPopoverKey, setActiveGeoPopoverKey] = useState<string | null>(null);


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
  const [mapView, setMapView] = useState<'ludico' | 'geo'>('ludico');

  const [mapCenter, setMapCenter] = useState<{ lat: number; lng: number } | undefined>(undefined);

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
        
        let locationData = data.location;
        // Backwards compatibility for old mapMarker format
        if (data.mapMarker && !data.location) {
          locationData = {
            mapType: 'ludico',
            ludico: data.mapMarker,
          }
        } else if (locationData?.geo instanceof GeoPoint) {
          locationData.geo = { lat: locationData.geo.latitude, lng: locationData.geo.longitude };
        }

        return {
          id: doc.id,
          ...data,
          treatmentDate: treatmentDate,
          location: locationData,
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

      const hasMarker = mapView === 'ludico' ? !!occ.location?.ludico : !!occ.location?.geo;

      return yearMatch && monthMatch && typeMatch && locationMatch && riskLevelMatch && situationMatch && hasMarker;
    });
  }, [treatments, filterYear, filterMonths, filterType, filterLocation, filterRiskLevel, filterSituation, isClient, clientToday, mapView]);

  const clusters = useMemo(() => {
    if (mapView !== 'ludico') return [];
    const points = filteredTreatments.filter(occ => occ.location?.ludico);
    const clusters: Cluster[] = [];
    const distanceThreshold = 5; 

    points.forEach(point => {
        let foundCluster = false;
        for (const cluster of clusters) {
            const distance = Math.sqrt(
                Math.pow(cluster.x - (point.location?.ludico?.x || 0), 2) +
                Math.pow(cluster.y - (point.location?.ludico?.y || 0), 2)
            );
            if (distance < distanceThreshold) {
                cluster.treatments.push(point);
                cluster.x = cluster.treatments.reduce((sum, occ) => sum + (occ.location?.ludico?.x || 0), 0) / cluster.treatments.length;
                cluster.y = cluster.treatments.reduce((sum, occ) => sum + (occ.location?.ludico?.y || 0), 0) / cluster.treatments.length;
                foundCluster = true;
                break;
            }
        }
        if (!foundCluster && point.location?.ludico) {
            clusters.push({
                treatments: [point],
                x: point.location.ludico.x,
                y: point.location.ludico.y,
            });
        }
    });

    return clusters;
  }, [filteredTreatments, mapView]);

  const geoClusters = useMemo(() => {
    if (mapView !== 'geo') return [];
    const points = filteredTreatments.filter(occ => occ.location?.geo);
    const clusters: GeoCluster[] = [];
    const distanceThreshold = 0.0001; // Reduced threshold for more precise clustering

    points.forEach(point => {
        let foundCluster = false;
        for (const cluster of clusters) {
            const distance = Math.sqrt(
                Math.pow(cluster.lat - (point.location?.geo?.lat || 0), 2) +
                Math.pow(cluster.lng - (point.location?.geo?.lng || 0), 2)
            );
            if (distance < distanceThreshold) {
                cluster.treatments.push(point);
                cluster.lat = cluster.treatments.reduce((sum, occ) => sum + (occ.location?.geo?.lat || 0), 0) / cluster.treatments.length;
                cluster.lng = cluster.treatments.reduce((sum, occ) => sum + (occ.location?.geo?.lng || 0), 0) / cluster.treatments.length;
                foundCluster = true;
                break;
            }
        }
        if (!foundCluster && point.location?.geo) {
            clusters.push({
                treatments: [point],
                lat: point.location.geo.lat,
                lng: point.location.geo.lng,
            });
        }
    });
    return clusters;
  }, [filteredTreatments, mapView]);

  const geoPointsForBounds = useMemo(() => {
    if (mapView !== 'geo') return [];
    return filteredTreatments
      .map(occ => occ.location?.geo)
      .filter((geo): geo is { lat: number; lng: number } => !!geo);
  }, [filteredTreatments, mapView]);
  
  const clearFilters = () => {
    setFilterYear([]);
    setFilterMonths([]);
    setFilterType([]);
    setFilterLocation([]);
    setFilterRiskLevel([]);
    setFilterSituation([]);
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
        return; // It's a pin, don't start panning.
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

  const renderLudicPins = (isModal: boolean) => {
    if (!isClient || isLoading) return null;

    const activeKey = isModal ? modalActivePopoverKey : activePopoverKey;
    const setActiveKey = isModal ? setModalActivePopoverKey : setActivePopoverKey;

    const totalPoints = mapView === 'ludico' ? clusters.length : geoClusters.length;
    if (totalPoints === 0) return null;

    return clusters.map((cluster, index) => {
      const clusterKey = `treatment-cluster-${index}`;
      const clusterYear = cluster.treatments[0]?.treatmentDate.getFullYear();
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
                  {cluster.treatments.length > 1 && (
                      <Badge variant="default" className="absolute -right-2 -top-2 h-5 w-5 justify-center rounded-full p-0 bg-blue-600 hover:bg-blue-700">
                          {cluster.treatments.length}
                      </Badge>
                  )}
                </div>
            </PopoverTrigger>
            <PopoverContent className="w-80 z-[60]" onOpenAutoFocus={(e) => e.preventDefault()}>
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
                            {t.location?.geo && (
                              <p className="text-xs text-muted-foreground">
                                Lat: {t.location.geo.lat.toFixed(6)}, Lng: {t.location.geo.lng.toFixed(6)}
                              </p>
                            )}
                          </div>
                          <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0" onClick={() => {
                                setActiveKey(null);
                                setDetailedTreatment(t);
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
    })
  };
  
  const renderGeoPins = () => {
    if (!isClient || isLoading || geoClusters.length === 0) return null;

    return geoClusters.map((cluster, index) => {
      const clusterKey = `geo-treatment-cluster-${index}`;
      const clusterYear = cluster.treatments[0]?.treatmentDate.getFullYear();
      const pinColor = clusterYear ? getYearColor(clusterYear, availableYears).replace('fill-', '') : 'gray-500';

      return (
        <AdvancedMarker
          key={clusterKey}
          position={{ lat: cluster.lat, lng: cluster.lng }}
          onClick={() => setActiveGeoPopoverKey(clusterKey)}
        >
          <Popover open={activeGeoPopoverKey === clusterKey} onOpenChange={(open) => setActiveGeoPopoverKey(open ? clusterKey : null)}>
            <PopoverTrigger asChild>
              <div className="cursor-pointer relative">
                <MapPin className={cn("h-6 w-6 stroke-white stroke-2 drop-shadow-lg", `fill-${pinColor}`)} />
                {cluster.treatments.length > 1 && (
                  <Badge variant="default" className="absolute -right-2 -top-2 h-5 w-5 justify-center rounded-full p-0 bg-blue-600 hover:bg-blue-700">
                    {cluster.treatments.length}
                  </Badge>
                )}
              </div>
            </PopoverTrigger>
            <PopoverContent className="w-80 z-[60]" onOpenAutoFocus={(e) => e.preventDefault()}>
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
                          {t.location?.geo && (
                            <p className="text-xs text-muted-foreground">
                              Lat: {t.location.geo.lat.toFixed(6)}, Lng: {t.location.geo.lng.toFixed(6)}
                            </p>
                          )}
                        </div>
                        <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0" onClick={() => {
                          setActiveGeoPopoverKey(null);
                          setDetailedTreatment(t);
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
        </AdvancedMarker>
      );
    });
  };

  const GOOGLE_MAPS_API_KEY = "AIzaSyAHSWMrKodwOLXO7VGTq35r6vFgOJ-AH9I";

  return (
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
                  <CardTitle>Visualização no Mapa</CardTitle>
                  <CardDescription>
                    {isLoading ? 'Carregando...' : `Foram encontrados ${filteredTreatments.length} tratamentos com marcação para o mapa selecionado.`}
                  </CardDescription>
                </div>
                {mapView === 'ludico' && (
                  <DialogTrigger asChild>
                    <Button variant="outline" disabled={isLoadingMap || !mapUrl || clusters.length === 0}>
                        <ZoomIn className="mr-2 h-4 w-4" /> Ampliar Mapa
                    </Button>
                  </DialogTrigger>
                )}
              </div>
            </CardHeader>
            <CardContent>
              <Tabs value={mapView} onValueChange={(v) => setMapView(v as 'ludico' | 'geo')} className="w-full">
                <TabsList className="grid w-full grid-cols-2">
                  <TabsTrigger value="ludico">Mapa Lúdico</TabsTrigger>
                  <TabsTrigger value="geo">Mapa Georreferenciado</TabsTrigger>
                </TabsList>
                <TabsContent value="ludico">
                  <div ref={mainMapContainerRef} className="relative mt-4 w-full aspect-video border-2 border-dashed rounded-md bg-muted/20 flex items-center justify-center overflow-hidden">
                    {isLoadingMap || isLoading ? (
                      <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                    ) : mapUrl ? (
                      <>
                        <NextImage
                            src={mapUrl}
                            alt="Mapa de tratamentos"
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
                                {renderLudicPins(false)}
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
                </TabsContent>
                <TabsContent value="geo">
                  <div className="relative mt-4 w-full aspect-video border-2 border-dashed rounded-md bg-muted/20 flex items-center justify-center overflow-hidden">
                    {GOOGLE_MAPS_API_KEY ? (
                      <APIProvider apiKey={GOOGLE_MAPS_API_KEY} libraries={['marker']}>
                        <MapBoundsUpdater points={geoPointsForBounds} />
                        <GoogleMap defaultCenter={mapCenter || { lat: -25.0945, lng: -50.1633 }} defaultZoom={15} mapId={'b3b3c3e8f9b9a9e'} mapTypeId={'satellite'} gestureHandling="greedy">
                          {renderGeoPins()}
                        </GoogleMap>
                      </APIProvider>
                    ) : (
                      <p className="text-destructive text-center p-4">Chave de API do Google Maps não configurada.</p>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground text-center p-2 border rounded-md mt-4 bg-muted/50">
                    <strong>Dica do Street View:</strong> Para uma visão em 360°, clique e arraste o "bonequinho" (Pegman) localizado no canto inferior do mapa para o ponto desejado. As imagens do Street View são fornecidas diretamente pelo Google Maps; por isso, esteja ciente de que, em alguns locais, os registros visuais podem estar desatualizados em relação ao cenário atual.
                  </p>
                </TabsContent>
              </Tabs>
            </CardContent>
        </Card>
        <DialogContent showClose={false} className="max-w-7xl h-[90vh] flex flex-col p-0">
            <DialogHeader className="p-4 border-b">
                <DialogTitle>Mapa Interativo de Tratamentos de Risco</DialogTitle>
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
                                    {renderLudicPins(true)}
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
          setDetailedTreatment(null);
        }
        setIsDetailModalOpen(isOpen);
      }}>
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
                  {detailedTreatment.location?.geo && (
                    <div className="mt-4 p-3 bg-muted rounded-md text-sm col-span-1 md:col-span-3">
                      <p><span className="font-semibold">Latitude:</span> {detailedTreatment.location.geo.lat.toFixed(6)}</p>
                      <p><span className="font-semibold">Longitude:</span> {detailedTreatment.location.geo.lng.toFixed(6)}</p>
                    </div>
                  )}
                  {detailedTreatment.location?.ludico && (
                    <div className="mt-4 p-3 bg-muted rounded-md text-sm col-span-1 md:col-span-3">
                      <p className="font-semibold">Coordenadas no Mapa Lúdico</p>
                      <p>
                        <span className="font-semibold">X:</span> {detailedTreatment.location.ludico.x.toFixed(2)}% | 
                        <span className="font-semibold ml-2">Y:</span> {detailedTreatment.location.ludico.y.toFixed(2)}%
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
      </Dialog>
    </div>
  );
}
