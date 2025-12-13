

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
import { MultiSelectFilter } from './multi-select-filter';

interface Treatment {
  id: string;
  treatmentDate: Date;
  treatmentType: string;
  treatmentLocation: string;
  riskLevel: number;
  situation: 'pendente' | 'finalizado' | 'reaberto';
  mapMarker?: { x: number; y: number };
}

interface Cluster {
  treatments: Treatment[];
  x: number;
  y: number;
}

const riskLevelOptions = [
    { value: 'alta', label: 'Alta' },
    { value: 'media', label: 'Média' },
    { value: 'baixa', label: 'Baixa' },
];

const situationOptions = [
    { value: 'pendente', label: 'Pendente' },
    { value: 'finalizado', label: 'Finalizado' },
    { value: 'reaberto', label: 'Reaberto' },
];

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
    if (!isClient) return [];
    return treatments.filter(occ => {
      const occDate = occ.treatmentDate;
      if (!occDate) return false;

      const yearMatch = filterYear.length === 0 || filterYear.includes(occDate.getFullYear().toString());
      const monthMatch = filterMonths.length === 0 || filterMonths.includes(occDate.getMonth().toString());
      const typeMatch = filterType.length === 0 || filterType.includes(occ.treatmentType);
      const locationMatch = filterLocation.length === 0 || filterLocation.includes(occ.treatmentLocation);
      const situationMatch = filterSituation.length === 0 || filterSituation.includes(occ.situation);

       const riskLevelMatch = filterRiskLevel.length === 0 || filterRiskLevel.some((riskLevel) => {
        const score = occ.riskLevel;
        if (riskLevel === 'alta') return score >= 15;
        if (riskLevel === 'media') return score >= 8 && score < 15;
        if (riskLevel === 'baixa') return score > 0 && score < 8;
        return false;
      });

      return yearMatch && monthMatch && typeMatch && locationMatch && riskLevelMatch && situationMatch && !!occ.mapMarker;
    });
  }, [treatments, filterYear, filterMonths, filterType, filterLocation, filterRiskLevel, filterSituation, isClient]);

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
                    className="absolute cursor-pointer"
                    style={{
                    left: `${cluster.x}%`,
                    top: `${cluster.y}%`,
                    transform: 'translate(-50%, -100%)',
                    }}
                >
                    <MapPin className={cn("h-8 w-8 stroke-white stroke-2 drop-shadow-lg", pinColorClass)} />
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
                    {cluster.treatments.map(occ => (
                        <div key={occ.id} className="text-sm p-2 border rounded-md">
                            <p><strong className="font-medium">Data:</strong> {format(occ.treatmentDate, 'dd/MM/yy HH:mm', { locale: ptBR })}</p>
                            <p><strong className="font-medium">Tipo:</strong> {occ.treatmentType}</p>
                            <p><strong className="font-medium">Local:</strong> {occ.treatmentLocation}</p>
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
                <MultiSelectFilter
                    placeholder='Selecione o(s) ano(s)'
                    options={availableYears.map(y => ({ value: y, label: y }))}
                    selected={filterYear}
                    onChange={setFilterYear}
                    disabled={isLoading || availableYears.length === 0}
                />
            </div>
            <div className="space-y-2">
                <Label>Filtrar por Tipo de Risco</Label>
                <MultiSelectFilter
                    placeholder='Selecione o(s) tipo(s)'
                    options={treatmentTypes.map(t => ({ value: t, label: t }))}
                    selected={filterType}
                    onChange={setFilterType}
                    disabled={!treatmentTypes || treatmentTypes.length === 0}
                />
            </div>
            <div className="space-y-2">
                <Label>Nível de Risco (PxC)</Label>
                <MultiSelectFilter
                    placeholder='Selecione o(s) nível(is)'
                    options={riskLevelOptions}
                    selected={filterRiskLevel}
                    onChange={setFilterRiskLevel}
                />
            </div>
            <div className="space-y-2">
                <Label>Filtrar por Local</Label>
                <MultiSelectFilter
                    placeholder='Selecione o(s) local(is)'
                    options={locations.map(l => ({ value: l, label: l }))}
                    selected={filterLocation}
                    onChange={setFilterLocation}
                    disabled={!locations || locations.length === 0}
                />
            </div>
            <div className="space-y-2">
                <Label>Filtrar por Situação</Label>
                <MultiSelectFilter
                    placeholder='Selecione a(s) situação(ões)'
                    options={situationOptions}
                    selected={filterSituation}
                    onChange={setFilterSituation}
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
                    alt="Mapa de tratamentos"
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
