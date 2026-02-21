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
import { Bar, BarChart, ResponsiveContainer, XAxis, Tooltip as RechartsTooltip } from 'recharts';
import { SheetFilter } from './sheet-filter';
import { Skeleton } from './ui/skeleton';
import { ClipboardList } from 'lucide-react';

interface Occurrence {
  id: string;
  occurrenceDate: Date;
  occurrenceType: string;
  occurrenceLocation: string;
}

interface Treatment {
  id: string;
  treatmentDate: Date;
  treatmentType: string;
  treatmentLocation: string;
  riskLevel: number;
  situation: 'pendente' | 'finalizado';
  completionDate?: Timestamp;
}

interface FaunaFloraGeoRecord {
  id: string;
  date: Date;
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

const getIconForLabel = (label: string): React.ReactElement => {
    return <ClipboardList className="h-5 w-5" />;
};

const CustomXAxisTick = (props: any) => {
  const { x, y, payload, onMouseEnter, onMouseLeave } = props;

  if (payload && payload.value) {
    const icon = getIconForLabel(payload.value);
    
    // A ForeignObject is used to embed HTML within an SVG, which is needed to render the icon component.
    // A transparent rectangle is placed behind to ensure mouse events are captured reliably.
    return (
      <g
        transform={`translate(${x},${y})`}
        onMouseEnter={(e) => onMouseEnter(e, payload.value)}
        onMouseLeave={onMouseLeave}
      >
        <rect x={-20} y={0} width={40} height={40} fill="transparent" />
        <foreignObject x={-20} y={0} width={40} height={40} style={{ pointerEvents: 'none' }}>
          <div className="flex h-full w-full items-center justify-center">
            {icon}
          </div>
        </foreignObject>
      </g>
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
  
  const [tooltip, setTooltip] = useState({
    visible: false,
    content: '',
    x: 0,
    y: 0,
  });

  const handleTickMouseEnter = (e: React.MouseEvent, content: string) => {
    setTooltip({
        visible: true,
        content,
        x: e.clientX,
        y: e.clientY,
    });
  };

  const handleTickMouseLeave = () => {
      setTooltip({ ...tooltip, visible: false });
  };


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
    const fetchData = async () => {
        if (!user || !firestore) {
            setIsLoading(false);
            return;
        }
        setIsLoading(true);

        try {
            const [occurrencesSnap, treatmentsSnap, faunaFloraGeoSnap] = await Promise.all([
                getDocs(collection(firestore, 'sgs_genius', user.uid, 'chat_messages')),
                getDocs(collection(firestore, 'sgs_genius', user.uid, 'risk_treatments')),
                getDocs(collection(firestore, 'sgs_genius', user.uid, 'fauna_flora_geo')),
            ]);

            const safeToDate = (timestamp: any) => timestamp instanceof Timestamp ? timestamp.toDate() : new Date(0);

            const occurrencesData = occurrencesSnap.docs.map(doc => ({ id: doc.id, ...doc.data(), occurrenceDate: safeToDate(doc.data().occurrenceDate) })) as Occurrence[];
            const treatmentsData = treatmentsSnap.docs.map(doc => ({ id: doc.id, ...doc.data(), treatmentDate: safeToDate(doc.data().treatmentDate) })) as Treatment[];
            const faunaFloraGeoData = faunaFloraGeoSnap.docs.map(doc => ({ id: doc.id, ...doc.data(), date: safeToDate(doc.data().date) })) as FaunaFloraGeoRecord[];

            setOccurrences(occurrencesData);
            setTreatments(treatmentsData);
            setFaunaFloraGeo(faunaFloraGeoData);

            const allYears = new Set<string>();
            const processYears = (items: any[], dateField: string) => {
                items.forEach(item => {
                    const date = item[dateField];
                    if (date && date.getFullYear() > 1970) {
                        allYears.add(date.getFullYear().toString());
                    }
                });
            };

            processYears(occurrencesData, 'occurrenceDate');
            processYears(treatmentsData, 'treatmentDate');
            processYears(faunaFloraGeoData, 'date');
            
            setAvailableYears(Array.from(allYears).sort((a, b) => Number(b) - Number(a)));

        } catch (error) {
            console.error("Error fetching data for charts:", error);
            toast({
                variant: "destructive",
                title: "Erro de conexão",
                description: "Não foi possível buscar os dados para os gráficos."
            });
        } finally {
            setIsLoading(false);
        }
    };

    if(user && firestore) {
      fetchData();
    }
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
                const itemDate = item[dateField];
                if(itemDate && itemDate.getFullYear() > 1970) {
                  const monthIndex = itemDate.getMonth();
                  const monthName = months[monthIndex];
                  (typeEntry[monthName] as number)++;
                }
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
    <div>
      {tooltip.visible && (
        <div
          className="pointer-events-none fixed z-50 rounded-md border bg-popover px-3 py-1.5 text-sm text-popover-foreground shadow-md"
          style={{
              left: tooltip.x + 15,
              top: tooltip.y + 15,
          }}
        >
          {tooltip.content}
        </div>
      )}
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
                              <RechartsTooltip 
                                cursor={{ fill: 'hsl(var(--accent))', opacity: 0.5 }}
                                contentStyle={{
                                  background: 'hsl(var(--background))',
                                  borderColor: 'hsl(var(--border))',
                                  borderRadius: 'var(--radius)',
                                }}
                              />
                              <XAxis 
                                  dataKey="name" 
                                  tickLine={false} 
                                  axisLine={false} 
                                  tick={<CustomXAxisTick onMouseEnter={handleTickMouseEnter} onMouseLeave={handleTickMouseLeave} />}
                                  height={80}
                                  interval={0}
                              />
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
    </div>
  )
}
