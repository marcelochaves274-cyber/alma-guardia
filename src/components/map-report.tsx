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
import { Checkbox } from "@/components/ui/checkbox";
import { useFirestore, useUser } from '@/firebase';
import { collection, getDoc, doc, Timestamp, onSnapshot } from 'firebase/firestore';
import { Skeleton } from './ui/skeleton';
import { Button } from './ui/button';
import { Loader2, MapPin } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import Image from 'next/image';
import { Badge } from './ui/badge';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { ScrollArea } from './ui/scroll-area';

interface Occurrence {
  id: string;
  occurrenceDate: Date;
  occurrenceType: string;
  occurrenceLocation: string;
  mapMarker?: { x: number; y: number };
}

interface Cluster {
  occurrences: Occurrence[];
  x: number;
  y: number;
}

const months = [
    { value: '1', label: 'Janeiro' }, { value: '2', label: 'Fevereiro' }, { value: '3', label: 'Março' },
    { value: '4', label: 'Abril' }, { value: '5', label: 'Maio' }, { value: '6', label: 'Junho' },
    { value: '7', label: 'Julho' }, { value: '8', label: 'Agosto' }, { value: '9', label: 'Setembro' },
    { value: '10', label: 'Outubro' }, { value: '11', label: 'Novembro' }, { value: '12', label: 'Dezembro' }
];

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
      <PopoverContent className="w-[var(--radix-popover-trigger-width)] p-0">
        <ScrollArea className="max-h-60">
        <div className="p-1">
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
        </ScrollArea>
      </PopoverContent>
    </Popover>
  );
}

export function MapReport() {
  const firestore = useFirestore();
  const { user } = useUser();
  const { toast } = useToast();
  
  const [occurrences, setOccurrences] = useState<Occurrence[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [mapUrl, setMapUrl] = useState<string | null>(null);
  const [isLoadingMap, setIsLoadingMap] = useState(true);

  // Filter states
  const [filterYears, setFilterYears] = useState<string[]>([]);
  const [filterMonths, setFilterMonths] = useState<string[]>([]);
  const [filterTypes, setFilterTypes] = useState<string[]>([]);
  const [filterLocations, setFilterLocations] = useState<string[]>([]);

  // Dynamic options for selects
  const [availableYears, setAvailableYears] = useState<string[]>([]);
  const [occurrenceTypes, setOccurrenceTypes] = useState<string[]>([]);
  const [locations, setLocations] = useState<string[]>([]);

  const getSettingsDocRef = useCallback((collectionName: string) => {
    if (!firestore || !user) return null;
    return doc(firestore, 'sgs_genius', user.uid, 'settings', collectionName);
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
          : new Date();

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
    return occurrences.filter(occ => {
      const occDate = occ.occurrenceDate;
      if (!occDate) return false;

      const yearMatch = filterYears.length === 0 || filterYears.includes(occDate.getFullYear().toString());
      const monthMatch = filterMonths.length === 0 || filterMonths.includes((occDate.getMonth() + 1).toString());
      const typeMatch = filterTypes.length === 0 || filterTypes.includes(occ.occurrenceType);
      const locationMatch = filterLocations.length === 0 || filterLocations.includes(occ.occurrenceLocation);

      return yearMatch && monthMatch && typeMatch && locationMatch && !!occ.mapMarker;
    });
  }, [occurrences, filterYears, filterMonths, filterTypes, filterLocations]);

  const clusters = useMemo(() => {
    const points = filteredOccurrences.filter(occ => occ.mapMarker);
    const clusters: Cluster[] = [];
    const distanceThreshold = 5; // 5% of map dimensions

    points.forEach(point => {
        let foundCluster = false;
        for (const cluster of clusters) {
            const distance = Math.sqrt(
                Math.pow(cluster.x - (point.mapMarker?.x || 0), 2) +
                Math.pow(cluster.y - (point.mapMarker?.y || 0), 2)
            );
            if (distance < distanceThreshold) {
                cluster.occurrences.push(point);
                // Recalculate cluster center (optional, but good for accuracy)
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
    setFilterYears([]);
    setFilterMonths([]);
    setFilterTypes([]);
    setFilterLocations([]);
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Relatório de Mapa</CardTitle>
          <CardDescription>
            Filtre e visualize a localização das ocorrências no mapa.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
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
            
            <Button onClick={clearFilters} variant="outline" className="w-full">
              Limpar Filtros
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Resultados no Mapa</CardTitle>
          <CardDescription>
            {isLoading ? 'Carregando...' : `Foram encontradas ${filteredOccurrences.length} ocorrências com marcação no mapa, agrupadas em ${clusters.length} pontos.`}
          </CardDescription>
        </CardHeader>
        <CardContent>
           <div className="relative w-full h-auto min-h-[600px] border-2 border-dashed rounded-md bg-muted/20 flex items-center justify-center overflow-hidden">
                {isLoadingMap || isLoading ? (
                  <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                ) : mapUrl ? (
                  <>
                    <Image
                      src={mapUrl}
                      alt="Mapa de ocorrências"
                      fill
                      style={{objectFit:"cover"}}
                      className="rounded-md"
                      priority
                    />
                    {clusters.map((cluster, index) => (
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
                                    <MapPin className="h-8 w-8 fill-red-500 stroke-white stroke-2 drop-shadow-lg" />
                                    {cluster.occurrences.length > 1 && (
                                        <Badge variant="destructive" className="absolute -right-2 -top-2 h-5 w-5 justify-center rounded-full p-0">
                                            {cluster.occurrences.length}
                                        </Badge>
                                    )}
                                </div>
                            </PopoverTrigger>
                            <PopoverContent className="w-80">
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
                                        <div key={occ.id} className="text-sm p-2 border rounded-md">
                                            <p><strong className="font-medium">Data:</strong> {format(occ.occurrenceDate, 'dd/MM/yy HH:mm', { locale: ptBR })}</p>
                                            <p><strong className="font-medium">Tipo:</strong> {occ.occurrenceType}</p>
                                            <p><strong className="font-medium">Local:</strong> {occ.occurrenceLocation}</p>
                                        </div>
                                    ))}
                                </div>
                                </ScrollArea>
                                </div>
                            </PopoverContent>
                        </Popover>
                    ))}
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
