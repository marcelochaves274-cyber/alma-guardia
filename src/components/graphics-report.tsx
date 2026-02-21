
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Button } from './ui/button';
import { Label } from './ui/label';
import { useFirestore, useUser } from '@/firebase';
import { collection, onSnapshot, doc, getDoc, Timestamp, getDocs } from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';
import { Bar, BarChart, ResponsiveContainer, Tooltip as RechartsTooltip, XAxis, YAxis } from 'recharts';
import { SheetFilter } from './sheet-filter';
import { Skeleton } from './ui/skeleton';
import { Separator } from './ui/separator';
import {
  Activity,
  Ambulance,
  Bird,
  Bug,
  ClipboardList,
  Droplets,
  Fish,
  Flame,
  Footprints,
  HeartPulse,
  Leaf,
  Mountain,
  Siren,
  Skull,
  TreeDeciduous,
  Bone,
  Car,
  Bike,
  HardHat,
  Zap,
  Wind,
  Sun,
  Brain,
  PersonStanding,
  Swords,
  FlaskConical,
  Info,
} from 'lucide-react';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';


// Data types from other components
interface Occurrence {
  id: string;
  occurrenceDate: Timestamp;
  occurrenceType: string;
  occurrenceLocation: string;
}

interface Treatment {
  id: string;
  treatmentDate: Timestamp;
  treatmentType: string;
  treatmentLocation: string;
  riskLevel: number;
  situation: 'pendente' | 'finalizado';
  completionDate?: Timestamp;
}

interface FaunaFloraGeoRecord {
  id: string;
  date: Timestamp;
  speciesType: string;
  location: string;
  analysis: 'alta' | 'media' | 'baixa';
}

type ReportType = 'occurrences' | 'treatments' | 'faunaFloraGeo';

const reportTypeOptions = [
  { value: 'occurrences', label: 'Acidentes/Incidentes' },
  { value: 'treatments', label: 'Tratamentos de Risco' },
  { value: 'faunaFloraGeo', label: 'Fauna Flora Geo' },
];

const months = [
  'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
];

const monthColors = [
  '#FF6384', '#36A2EB', '#FFCE56', '#4BC0C0', '#9966FF', '#FF9F40',
  '#E7E9ED', '#8BC34A', '#CDDC39', '#FFEB3B', '#FFC107', '#FF5722'
];

const CustomTooltip = ({ active, payload, label, filters }: any) => {
    if (active && payload && payload.length) {
      const { filteredData, reportType } = filters;
      const typeName = label;

      // --- Total ---
      const totalCount = payload.reduce((sum: number, p: any) => sum + p.value, 0);
  
      // --- Location Breakdown ---
      const locationField = reportType === 'occurrences' ? 'occurrenceLocation' : reportType === 'treatments' ? 'treatmentLocation' : 'location';
      const typeField = reportType === 'occurrences' ? 'occurrenceType' : reportType === 'treatments' ? 'treatmentType' : 'speciesType';
      const itemsForType = filteredData.filter((item: any) => (item[typeField] || 'Outros') === typeName);
      
      const countsByLocation: Record<string, number> = itemsForType.reduce((acc: Record<string, number>, item: any) => {
          const loc = item[locationField] || 'Sem Local';
          acc[loc] = (acc[loc] || 0) + 1;
          return acc;
      }, {});
      const locationEntries = Object.entries(countsByLocation).filter(([, count]) => (count as number) > 0);

      // --- Month Breakdown ---
      const monthPayload = payload.map((p: { dataKey: string; value: number; fill: string; }) => ({ month: p.dataKey, count: p.value, color: p.fill })).filter((p: {count: number}) => p.count > 0);
  
      return (
        <div className="p-3 bg-card/95 backdrop-blur-sm border rounded-lg shadow-xl text-sm min-w-[320px] max-w-sm">
          <div className="border-b pb-2 mb-2">
              <p className="font-bold text-lg text-foreground">{label}</p>
          </div>
          
          {monthPayload.length > 0 && (
            <div className="my-3">
              <div className="flex justify-between items-center mb-1.5">
                <p className="font-bold text-muted-foreground">Por Mês:</p>
                <p className="font-bold text-muted-foreground">Total: <span className="font-semibold text-foreground">{totalCount}</span></p>
              </div>
              <ul className="list-none p-0 space-y-1.5">
              {monthPayload.map(({ month, count, color }: { month: string, count: number, color: string }, index: number) => (
                  <li key={`month-${index}`} className="flex items-center justify-between">
                  <div className="flex items-center">
                      <span className="w-2.5 h-2.5 rounded-full mr-2" style={{ backgroundColor: color }} />
                      <span className="text-muted-foreground">{month}</span>
                  </div>
                  <span className="font-semibold text-foreground">{count}</span>
                  </li>
              ))}
              </ul>
            </div>
          )}

          {locationEntries.length > 0 && monthPayload.length > 0 && <Separator className="my-3" />}

          {locationEntries.length > 0 && (
            <div className="my-3">
               <div className="flex justify-between items-center mb-1.5">
                <p className="font-bold text-muted-foreground">Por Local:</p>
                 <p className="font-bold text-muted-foreground">Total: <span className="font-semibold text-foreground">{totalCount}</span></p>
              </div>
              <ul className="list-none p-0 space-y-1.5">
              {locationEntries.map(([location, count], index: number) => (
                  <li key={`loc-${index}`} className="flex items-center justify-between">
                  <div className="flex items-center">
                      <span className="w-2.5 h-2.5 rounded-full mr-2 bg-muted" />
                      <span className="text-muted-foreground">{location}</span>
                  </div>
                  <span className="font-semibold text-foreground">{count as number}</span>
                  </li>
              ))}
              </ul>
            </div>
          )}
        </div>
      );
    }
    return null;
  };

const getIconForLabel = (label: string): React.ReactElement => {
    if (!label) return <Info className="h-5 w-5" />;
    const lowerLabel = label.toLowerCase();
    
    // Specific
    if (lowerLabel.includes('mal súbito') || lowerLabel.includes('hipotensão')) return <HeartPulse className="h-5 w-5 text-red-500" />;
    if (lowerLabel.includes('resgate') || lowerLabel.includes('remoção')) return <Ambulance className="h-5 w-5" />;
    if (lowerLabel.includes('morte') || lowerLabel.includes('óbito') || lowerLabel.includes('fatalidade')) return <Skull className="h-5 w-5" />;
    if (lowerLabel.includes('psicológico') || lowerLabel.includes('estresse') || lowerLabel.includes('stress')) return <Brain className="h-5 w-5" />;
    if (lowerLabel.includes('ataque') || lowerLabel.includes('briga')) return <Swords className="h-5 w-5" />;
    if (lowerLabel.includes('exposição') || lowerLabel.includes('sol')) return <Sun className="h-5 w-5 text-yellow-500" />;
    if (lowerLabel.includes('fogo') || lowerLabel.includes('incêndio') || lowerLabel.includes('queimadura')) return <Flame className="h-5 w-5 text-orange-500" />;
    if (lowerLabel.includes('água') || lowerLabel.includes('afogamento')) return <Droplets className="h-5 w-5 text-blue-500" />;
    if (lowerLabel.includes('asfixia') || lowerLabel.includes('sufocamento')) return <Wind className="h-5 w-5" />;
    if (lowerLabel.includes('alergia')) return <ClipboardList className="h-5 w-5 text-pink-500" />;
    if (lowerLabel.includes('químico')) return <FlaskConical className="h-5 w-5" />;
    if (lowerLabel.includes('elétrico') || lowerLabel.includes('eletricidade')) return <Zap className="h-5 w-5 text-yellow-400" />;
    if (lowerLabel.includes('ergonômico')) return <PersonStanding className="h-5 w-5" />;


    // Broader categories
    if (lowerLabel.includes('queda')) return <Activity className="h-5 w-5" />;
    if (lowerLabel.includes('picada') || lowerLabel.includes('inseto') || lowerLabel.includes('animal')) return <Bug className="h-5 w-5" />;
    if (lowerLabel.includes('corte') || lowerLabel.includes('lesão') || lowerLabel.includes('fratura') || lowerLabel.includes('torção')) return <Bone className="h-5 w-5" />;
    if (lowerLabel.includes('incidente') || lowerLabel.includes('acidente')) return <Siren className="h-5 w-5 text-red-500" />;
    if (lowerLabel.includes('veículo') || lowerLabel.includes('carro') || lowerLabel.includes('moto')) return <Car className="h-5 w-5" />;
    if (lowerLabel.includes('bicicleta')) return <Bike className="h-5 w-5" />;
    if (lowerLabel.includes('epi')) return <HardHat className="h-5 w-5" />;

    // Environmental
    if (lowerLabel.includes('árvore') || lowerLabel.includes('galho')) return <TreeDeciduous className="h-5 w-5 text-green-600" />;
    if (lowerLabel.includes('planta') || lowerLabel.includes('folha') || lowerLabel.includes('flora')) return <Leaf className="h-5 w-5 text-green-500" />;
    if (lowerLabel.includes('geo') || lowerLabel.includes('rocha') || lowerLabel.includes('montanha')) return <Mountain className="h-5 w-5" />;
    if (lowerLabel.includes('fauna') || lowerLabel.includes('bicho')) return <Footprints className="h-5 w-5" />;
    if (lowerLabel.includes('ave')) return <Bird className="h-5 w-5" />;
    if (lowerLabel.includes('peixe')) return <Fish className="h-5 w-5" />;


    return <Info className="h-5 w-5" />; // Default icon
};


const CustomXAxisTick = (props: any) => {
  const { x, y, payload } = props;

  if (payload && payload.value) {
    const icon = getIconForLabel(payload.value);

    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <g transform={`translate(${x},${y})`} className="cursor-pointer">
              {/* This rect is an invisible trigger area for the tooltip */}
              <rect x={-20} y={0} width={40} height={30} fill="transparent" />
              {/* The visual icon, with pointer events disabled to not interfere with the trigger */}
              <foreignObject x={-12} y={5} width={24} height={24} className="pointer-events-none">
                <div className="flex h-full w-full items-center justify-center">
                  {icon}
                </div>
              </foreignObject>
            </g>
          </TooltipTrigger>
          <TooltipContent>
            <p>{payload.value}</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  }
  return null;
};

export function GraphicsReport() {
  const { toast } = useToast();
  const firestore = useFirestore();
  const { user } = useUser();

  const [reportType, setReportType] = useState<ReportType | null>(null);
  
  // Data
  const [occurrences, setOccurrences] = useState<Occurrence[]>([]);
  const [treatments, setTreatments] = useState<Treatment[]>([]);
  const [faunaFloraGeo, setFaunaFloraGeo] = useState<FaunaFloraGeoRecord[]>([]);

  // Loading states
  const [isLoading, setIsLoading] = useState(true);
  const [isClient, setIsClient] = useState(false);

  // Filter states
  const [filterYear, setFilterYear] = useState<string[]>([]);
  const [filterType, setFilterType] = useState<string[]>([]);
  const [filterLocation, setFilterLocation] = useState<string[]>([]);

  // Filter options
  const [availableYears, setAvailableYears] = useState<string[]>([]);
  const [occurrenceTypes, setOccurrenceTypes] = useState<string[]>([]);
  const [treatmentTypes, setTreatmentTypes] = useState<string[]>([]);
  const [faunaFloraGeoTypes, setFaunaFloraGeoTypes] = useState<string[]>([]);
  const [locations, setLocations] = useState<string[]>([]);

  useEffect(() => {
    setIsClient(true);
  }, []);

  const getSettingsDocRef = useCallback((collectionName: string) => {
    if (!firestore || !user) return null;
    return doc(firestore, 'sgs_genius', user.uid, 'settings', collectionName);
  }, [firestore, user]);

  // Fetch filter options
  useEffect(() => {
    const fetchOptions = async (docName: string, setData: (data: string[]) => void, field: 'types' | 'locations') => {
      const docRef = getSettingsDocRef(docName);
      if (!docRef) return;
      try {
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
          const data = docSnap.data();
          setData((data[field] || []).sort());
        }
      } catch (error) {
        console.error(`Error fetching ${docName}:`, error);
      }
    };
    fetchOptions('occurrenceTypes', setOccurrenceTypes, 'types');
    fetchOptions('occurrenceTypes', setTreatmentTypes, 'types'); // Re-using for now
    fetchOptions('faunaFloraGeoTypes', setFaunaFloraGeoTypes, 'types');
    fetchOptions('locations', setLocations, 'locations');
  }, [getSettingsDocRef]);

  // Fetch all data
  useEffect(() => {
    if (!user || !firestore) return;
    
    const collectionsToFetch = [
      { ref: collection(firestore, 'sgs_genius', user.uid, 'chat_messages'), setter: setOccurrences, dateField: 'occurrenceDate' },
      { ref: collection(firestore, 'sgs_genius', user.uid, 'risk_treatments'), setter: setTreatments, dateField: 'treatmentDate' },
      { ref: collection(firestore, 'sgs_genius', user.uid, 'fauna_flora_geo'), setter: setFaunaFloraGeo, dateField: 'date' },
    ];

    setIsLoading(true);
    const unsubscribes = collectionsToFetch.map(({ ref, setter, dateField }) => {
      return onSnapshot(ref, (snapshot) => {
        const data = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data(),
          [dateField]: doc.data()[dateField] instanceof Timestamp ? doc.data()[dateField].toDate() : new Date(0),
        })) as any[];
        setter(data);
      }, (error) => {
        console.error(`Error fetching collection:`, error);
        toast({
          variant: "destructive",
          title: "Erro de conexão",
          description: "Não foi possível buscar os dados para os gráficos."
        });
      });
    });

    // Combine all data to calculate available years
    Promise.all([
      getDocs(collectionsToFetch[0].ref),
      getDocs(collectionsToFetch[1].ref),
      getDocs(collectionsToFetch[2].ref)
    ]).then(snapshots => {
        const allYears = new Set<string>();
        snapshots.forEach((snapshot, index) => {
            snapshot.docs.forEach(doc => {
                const date = doc.data()[collectionsToFetch[index].dateField];
                if (date instanceof Timestamp) {
                    allYears.add(date.toDate().getFullYear().toString());
                }
            })
        });
        setAvailableYears(Array.from(allYears).sort((a,b) => Number(b) - Number(a)));
        setIsLoading(false);
    });

    return () => unsubscribes.forEach(unsub => unsub());

  }, [user, firestore, toast]);

  const clearFilters = () => {
    setFilterYear([]);
    setFilterType([]);
    setFilterLocation([]);
  };

  const filteredData = useMemo(() => {
    if (!isClient || !reportType) return [];
    let data: any[] = [];
    switch (reportType) {
      case 'occurrences': data = occurrences; break;
      case 'treatments': data = treatments; break;
      case 'faunaFloraGeo': data = faunaFloraGeo; break;
    }

    const dateField = reportType === 'occurrences' ? 'occurrenceDate' : reportType === 'treatments' ? 'treatmentDate' : 'date';

    return data.filter((item: any) => {
      const itemDate = item[dateField];
      if (!itemDate) return false;
      const yearMatch = filterYear.length === 0 || filterYear.includes(itemDate.getFullYear().toString());
      const locationMatch = filterLocation.length === 0 || filterLocation.includes(item.occurrenceLocation || item.treatmentLocation || item.location);
      const typeMatch = filterType.length === 0 || filterType.includes(item.occurrenceType || item.treatmentType || item.speciesType);
      
      return yearMatch && locationMatch && typeMatch;
    });

  }, [reportType, occurrences, treatments, faunaFloraGeo, filterYear, filterLocation, filterType, isClient]);

  const chartData = useMemo(() => {
    if (!isClient || !reportType || filteredData.length === 0) return [];
    
    const typeField = reportType === 'occurrences' ? 'occurrenceType' : reportType === 'treatments' ? 'treatmentType' : 'speciesType';
    const dateField = reportType === 'occurrences' ? 'occurrenceDate' : reportType === 'treatments' ? 'treatmentDate' : 'date';
    
    const uniqueTypes = Array.from(new Set(filteredData.map((item: any) => item[typeField] || 'Outros'))).sort();

    const dataByType = uniqueTypes.map(type => {
        const typeEntry: { name: string; [key: string]: number | string } = { name: type };
        
        months.forEach((monthName) => {
            typeEntry[monthName] = 0;
        });

        filteredData.forEach((item: any) => {
            if ((item[typeField] || 'Outros') === type) {
                const monthIndex = item[dateField].getMonth();
                const monthName = months[monthIndex];
                (typeEntry[monthName] as number)++;
            }
        });
        return typeEntry;
    });

    return dataByType.filter(entry => {
      return months.some(month => (entry[month] as number) > 0);
    });
  }, [filteredData, reportType, isClient]);
  
  const typeOptions = useMemo(() => {
    let options: {value: string, label: string}[] = [];
    if (reportType === 'occurrences') options = occurrenceTypes.map(t => ({value: t, label: t}));
    if (reportType === 'treatments') options = treatmentTypes.map(t => ({value: t, label: t}));
    if (reportType === 'faunaFloraGeo') options = faunaFloraGeoTypes.map(t => ({value: t, label: t}));
    return options;
  }, [reportType, occurrenceTypes, treatmentTypes, faunaFloraGeoTypes]);
  
  const filtersForTooltip = {
    filteredData,
    reportType,
  };

  const areAllFiltersActive = filterYear.length > 0 && filterType.length > 0 && filterLocation.length > 0;
  
  const renderFilters = () => {
    return (
      <div className="space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 items-end">
          <div className="space-y-2">
            <Label>Filtrar Ano</Label>
            <SheetFilter
              title="Filtrar Anos"
              options={availableYears.map((y) => ({ value: y, label: y }))}
              selected={filterYear}
              onChange={setFilterYear}
              disabled={isLoading}
              buttonText="Filtrar por Ano"
            />
          </div>
          <div className="space-y-2">
            <Label>Filtrar por Tipo</Label>
            <SheetFilter
              title="Filtrar Tipos"
              options={typeOptions}
              selected={filterType}
              onChange={setFilterType}
              disabled={isLoading || typeOptions.length === 0}
              buttonText="Filtrar por Tipo"
            />
          </div>
          <div className="space-y-2">
            <Label>Filtrar por Local</Label>
            <SheetFilter
              title="Filtrar Locais"
              options={locations.map((l) => ({ value: l, label: l }))}
              selected={filterLocation}
              onChange={setFilterLocation}
              disabled={isLoading || locations.length === 0}
              buttonText="Filtrar por Local"
            />
          </div>
          <div className="flex gap-2">
            <Button onClick={clearFilters} variant="outline" className="w-full">
              Limpar Filtros
            </Button>
          </div>
        </div>
      </div>
    );
  };
  
  const showChart = !isLoading && reportType && areAllFiltersActive && chartData.length > 0;
  const showNoDataMessage = !isLoading && reportType && areAllFiltersActive && chartData.length === 0;

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Gráficos</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-2 max-w-sm">
            <Label>Tipo de Relatório</Label>
            <Select onValueChange={(v: ReportType) => { setReportType(v); clearFilters(); }} value={reportType ?? ''}>
              <SelectTrigger>
                <SelectValue placeholder="Selecione o tipo de Relatório" />
              </SelectTrigger>
              <SelectContent>
                {reportTypeOptions.map(opt => <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          {reportType && (
            <>
              {renderFilters()}
              <p className="text-sm text-muted-foreground pt-2 text-center">Para exibir o gráfico, é necessário ter ao menos uma seleção em todos os filtros: Ano, Tipo e Local.</p>
            </>
          )}
        </CardContent>
      </Card>
      
      <Card>
        <CardHeader>
            {showChart && filterYear.length > 0 && (
                <CardTitle className="text-foreground">
                    Exibindo: {filterYear.join(' - ')}
                </CardTitle>
            )}
        </CardHeader>
        <CardContent className="pt-0">
            <div className="min-h-[600px] h-auto flex items-center justify-center text-muted-foreground">
                {isLoading ? (
                     <Skeleton className="h-[600px] w-full" />
                ) : showChart ? (
                    <ResponsiveContainer width="100%" height={Math.max(600, chartData.length * 50)}>
                        <BarChart data={chartData} margin={{ top: 5, right: 20, left: 0, bottom: 60 }} barGap={4}>
                            <XAxis 
                                dataKey="name" 
                                tickLine={false} 
                                axisLine={false} 
                                tick={<CustomXAxisTick />}
                                height={80}
                                interval={0}
                            />
                            <YAxis axisLine={false} tickLine={false} width={0} />
                            <RechartsTooltip cursor={{ fill: 'hsl(var(--accent))', opacity: 0.5 }} content={<CustomTooltip filters={filtersForTooltip} />} />
                            {months.map((month, index) => (
                              <Bar key={month} dataKey={month} stackId="a" fill={monthColors[index % monthColors.length]} radius={[4, 4, 0, 0]} />
                            ))}
                        </BarChart>
                    </ResponsiveContainer>
                ) : !reportType ? (
                    "Selecione um tipo de relatório para começar."
                ) : showNoDataMessage ? (
                    "Nenhum dado para exibir com os filtros selecionados."
                ) : (
                    reportType && null
                )}
            </div>
        </CardContent>
      </Card>
    </div>
  )
}

    