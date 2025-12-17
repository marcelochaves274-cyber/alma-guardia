
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
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { useFirestore, useUser } from '@/firebase';
import { collection, getDoc, doc, Timestamp, onSnapshot } from 'firebase/firestore';
import { Button } from './ui/button';
import { Loader2, MapPin } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import Image from 'next/image';
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
  mapMarker?: { x: number; y: number };
}

interface Cluster {
  records: FaunaFloraGeoRecord[];
  x: number;
  y: number;
}

const YEAR_COLORS = ['fill-red-500', 'fill-blue-500', 'fill-green-500', 'fill-orange-500', 'fill-purple-500', 'fill-yellow-500'];

const getYearColor = (year: number, allYears: string[]) => {
  const sortedYears = [...allYears].sort((a,b) => Number(b) - Number(a));
  const index = sortedYears.indexOf(year.toString());
  if (index === -1) return 'fill-gray-500'; // Fallback color
  return YEAR_COLORS[index % YEAR_COLORS.length];
};

export function FaunaFloraGeoMapReport() {
  const firestore = useFirestore();
  const { user } = useUser();
  const { toast } = useToast();
  
  const [records, setRecords] = useState<FaunaFloraGeoRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [mapUrl, setMapUrl] = useState<string | null>(null);
  const [isLoadingMap, setIsLoadingMap] = useState(true);

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
    }, (error) => {
        console.error("Error fetching real-time records:", error);
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

  const renderedPins = useMemo(() => {
    if (!isClient || isLoading) {
      return null;
    }
    return clusters.map((cluster, index) => {
      const clusterYear = cluster.records[0]?.date.getFullYear();
      const pinColorClass = clusterYear ? getYearColor(clusterYear, availableYears) : 'fill-gray-500';
      
      return (
        <Popover key={index}>
            <PopoverTrigger asChild>
                <div
                    className="absolute cursor-pointer"
                    style={{
                    left: `${cluster.x}%`,
                    top: `${cluster.y}%`,
                    transform: 'translate(-50%, -100%)',
                    }}
                >
                    <MapPin className={cn("h-5 w-5 stroke-white stroke-2 drop-shadow-lg", pinColorClass)} />
                    {cluster.records.length > 1 && (
                        <Badge variant="destructive" className="absolute -right-2 -top-2 h-5 w-5 justify-center rounded-full p-0">
                            {cluster.records.length}
                        </Badge>
                    )}
                </div>
            </PopoverTrigger>
            <PopoverContent className="w-80">
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
                        <div key={rec.id} className="text-sm p-2 border rounded-md">
                            <p><strong className="font-medium">Data:</strong> {format(rec.date, 'dd/MM/yy HH:mm', { locale: ptBR })}</p>
                            <p><strong className="font-medium">Tipo:</strong> {rec.speciesType}</p>
                            <p><strong className="font-medium">Local:</strong> {rec.location}</p>
                        </div>
                    ))}
                </div>
                </ScrollArea>
                </div>
            </PopoverContent>
        </Popover>
      )
    });
  }, [clusters, isClient, availableYears, isLoading]);

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

      <Card>
        <CardHeader>
           <div className='flex justify-between items-center gap-4'>
            <div>
              <CardTitle>Resultados no Mapa</CardTitle>
              <CardDescription>
                {isLoading ? 'Carregando...' : `Foram encontrados ${filteredRecords.length} registros com marcação no mapa, agrupados em ${clusters.length} pontos.`}
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
           <div className="relative w-full aspect-video border-2 border-dashed rounded-md bg-muted/20 flex items-center justify-center overflow-hidden">
              {isLoadingMap || isLoading ? (
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
              ) : mapUrl ? (
                <>
                  <Image
                    src={mapUrl}
                    alt="Mapa de registros"
                    fill
                    className="object-cover"
                  />
                  {renderedPins}
                </>
              ) : (
                <p className="text-muted-foreground text-center p-4">
                  Nenhum mapa foi carregado. <br />Vá para "Configurações" &gt; "Gerenciar Mapa" para fazer o upload.
                </p>
              )}
            </div>
        </CardContent>
      </Card>
    </div>
  );
}
