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
import { collection, Timestamp, getDocs, doc, getDoc } from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';
import { Bar, BarChart, ResponsiveContainer, XAxis, Tooltip as RechartsTooltip } from 'recharts';
import { SheetFilter } from './sheet-filter';
import { Skeleton } from './ui/skeleton';
import { ClipboardList } from 'lucide-react';
import { Separator } from './ui/separator';

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

const CustomBarTooltip = ({ active, payload, label, chartData }: any) => {
    if (active && payload && payload.length && chartData) {
      const data = chartData.find((d: any) => d.name === label);
      if (!data) return null;

      const total = Object.keys(data)
        .filter(key => months.includes(key))
        .reduce((sum, key) => sum + (data[key] || 0), 0);
      
      const locationEntries = data.locations ? Object.entries(data.locations) : [];

      return (
        <div className="rounded-lg border bg-popover p-3 text-popover-foreground shadow-sm max-w-xs">
          <p className="text-sm font-bold mb-2">{label}</p>
          
          <p className="text-xs font-semibold text-muted-foreground mt-2">Por Mês:</p>
          <ul className="space-y-1 text-xs mt-1">
            {months.map((month, index) => {
              if (!data[month] || data[month] === 0) return null;
              return (
                <li key={month} className="flex justify-between items-center">
                    <div className="flex items-center">
                    <span className="block h-2 w-2 rounded-full mr-2" style={{ backgroundColor: monthColors[index % monthColors.length] }}></span>
                    <span>{month}:</span>
                    </div>
                    <span className="font-semibold">{data[month]}</span>
                </li>
              );
            })}
          </ul>
          
          {locationEntries.length > 0 && <Separator className="my-2" />}
          {locationEntries.length > 0 && <p className="text-xs font-semibold text-muted-foreground">Por Local:</p>}
          <ul className="space-y-1 text-xs mt-1">
            {locationEntries.map(([location, count]) => (
              <li key={location} className="flex justify-between items-center">
                <span>{location}:</span>
                <span className="font-semibold">{count as number}</span>
              </li>
            ))}
          </ul>
           
           <Separator className="my-2" />
            <p className="flex justify-between text-sm font-bold">
                <span>Total:</span>
                <span>{total}</span>
            </p>
        </div>
      );
    }
    return null;
};

export function GraphicsReport() {
  const { toast } = useToast();
  const firestore = useFirestore();
  const { user } = useUser();

  const [reportType, setReportType] = useState<ReportType | null>(null);
  
  const [occurrences, setOccurrences] = useState<Occurrence[]>([]);
  const [treatments, setTreatments] = useState<Treatment[]>([]);
  const [faunaFloraGeo, setFaunaFloraGeo] = useState<FaunaFloraGeoRecord[]>([]);

  const [isLoading, setIsLoading] = useState(true);
  const [isClient, setIsClient] = useState(false);

  const [filterYear, setFilterYear] = useState<string[]>([]);
  const [filterType, setFilterType] = useState<string[]>([]);
  const [filterLocation, setFilterLocation] = useState<string[]>([]);
  
  const [iconTooltip, setIconTooltip] = useState({
    visible: false,
    content: '',
    x: 0,
    y: 0,
  });
  
  const [availableYears, setAvailableYears] = useState<string[]>([]);
  const [occurrenceTypes, setOccurrenceTypes] = useState<string[]>([]);
  const [treatmentTypes, setTreatmentTypes] = useState<string[]>([]);
  const [faunaFloraGeoTypes, setFaunaFloraGeoTypes] = useState<string[]>([]);
  const [locations, setLocations] = useState<string[]>([]);
  
  const CustomXAxisTick = useCallback((props: any) => {
    const { x, y, payload } = props;
    
    return (
      <g
        transform={`translate(${x},${y})`}
        onMouseEnter={(e) => {
            setIconTooltip({
              visible: true,
              content: payload.value,
              x: e.clientX,
              y: e.clientY,
            });
        }}
        onMouseLeave={() => setIconTooltip({ ...iconTooltip, visible: false })}
      >
        <foreignObject x={-20} y={0} width={40} height={40}>
          <div
            className="flex h-full w-full items-center justify-center"
          >
            <ClipboardList className="h-5 w-5 text-muted-foreground" />
          </div>
        </foreignObject>
      </g>
    );
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    setIsClient(true);
  }, []);

  const getSettingsDocRef = useCallback((collectionName: string) => {
    if (!firestore || !user) return null;
    return doc(firestore, 'sgs_genius', user.uid, 'settings', collectionName);
  }, [firestore, user]);

  useEffect(() => {
    const fetchData = async () => {
        if (!user || !firestore) {
            setIsLoading(false);
            return;
        }
        setIsLoading(true);

        try {
            // Fetch main data collections
            const [
                occurrencesSnap, 
                treatmentsSnap, 
                faunaFloraGeoSnap
            ] = await Promise.all([
                getDocs(collection(firestore, 'sgs_genius', user.uid, 'chat_messages')),
                getDocs(collection(firestore, 'sgs_genius', user.uid, 'risk_treatments')),
                getDocs(collection(firestore, 'sgs_genius', user.uid, 'fauna_flora_geo')),
            ]);

            // Fetch settings documents
            const getSettingsList = async (docName: string, field: 'types' | 'locations') => {
                const docRef = getSettingsDocRef(docName);
                if (!docRef) return [];
                const docSnap = await getDoc(docRef);
                return docSnap.exists() ? (docSnap.data()[field] || []) : [];
            };

            const [
              occurrenceTypesList,
              treatmentTypesList,
              faunaFloraGeoTypesList,
              locationsList
            ] = await Promise.all([
              getSettingsList('occurrenceTypes', 'types'),
              getSettingsList('occurrenceTypes', 'types'), // Using occurrence types for treatments
              getSettingsList('faunaFloraGeoTypes', 'types'),
              getSettingsList('locations', 'locations'),
            ]);
            
            setOccurrenceTypes(occurrenceTypesList);
            setTreatmentTypes(treatmentTypesList);
            setFaunaFloraGeoTypes(faunaFloraGeoTypesList);
            setLocations(locationsList);

            const safeToDate = (timestamp: any) => timestamp instanceof Timestamp ? timestamp.toDate() : new Date(0);

            const occurrencesData = occurrencesSnap.docs.map(d => ({ id: d.id, ...d.data(), occurrenceDate: safeToDate(d.data().occurrenceDate) })) as Occurrence[];
            const treatmentsData = treatmentsSnap.docs.map(d => ({ id: d.id, ...d.data(), treatmentDate: safeToDate(d.data().treatmentDate) })) as Treatment[];
            const faunaFloraGeoData = faunaFloraGeoSnap.docs.map(d => ({ id: d.id, ...d.data(), date: safeToDate(d.data().date) })) as FaunaFloraGeoRecord[];
            
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
  // eslint-disable-next-line react-hooks/exhaustive-deps
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
    const locationField = reportType === 'occurrences' ? 'occurrenceLocation' : reportType === 'treatments' ? 'treatmentLocation' : 'location';
    const typeField = reportType === 'occurrences' ? 'occurrenceType' : reportType === 'treatments' ? 'treatmentType' : 'speciesType';

    return data.filter((item: any) => {
      const itemDate = item[dateField];
      if (!itemDate) return false;
      const yearMatch = filterYear.length === 0 || filterYear.includes(itemDate.getFullYear().toString());
      const locationMatch = filterLocation.length === 0 || filterLocation.includes(item[locationField]);
      const typeMatch = filterType.length === 0 || filterType.includes(item[typeField]);
      
      return yearMatch && locationMatch && typeMatch;
    });

  }, [reportType, occurrences, treatments, faunaFloraGeo, filterYear, filterLocation, filterType, isClient]);

  const chartData = useMemo(() => {
    if (!isClient || !reportType || filteredData.length === 0) return [];
    
    const typeField = reportType === 'occurrences' ? 'occurrenceType' : reportType === 'treatments' ? 'treatmentType' : 'speciesType';
    const dateField = reportType === 'occurrences' ? 'occurrenceDate' : reportType === 'treatments' ? 'treatmentDate' : 'date';
    const locationField = reportType === 'occurrences' ? 'occurrenceLocation' : reportType === 'treatments' ? 'treatmentLocation' : 'location';
    
    const uniqueTypes = Array.from(new Set(filteredData.map((item: any) => item[typeField] || 'Outros'))).sort();

    const dataByType = uniqueTypes.map(type => {
        const typeEntry: { name: string; locations: Record<string, number>; [key: string]: number | string | Record<string, number> } = { 
            name: type,
            locations: {}
        };
        
        months.forEach((monthName) => {
            typeEntry[monthName] = 0;
        });

        filteredData.forEach((item: any) => {
            if ((item[typeField] || 'Outros') === type) {
                // Month count
                const itemDate = item[dateField];
                if(itemDate && itemDate.getFullYear() > 1970) {
                  const monthIndex = itemDate.getMonth();
                  const monthName = months[monthIndex];
                  (typeEntry[monthName] as number)++;
                }

                // Location count
                const itemLocation = item[locationField] || 'Não especificado';
                if (typeEntry.locations[itemLocation]) {
                    (typeEntry.locations[itemLocation] as number)++;
                } else {
                    typeEntry.locations[itemLocation] = 1;
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
    return options.sort((a,b) => a.label.localeCompare(b.label));
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
      {iconTooltip.visible && (
        <div
          className="pointer-events-none fixed z-50 rounded-md border bg-popover px-3 py-1.5 text-sm text-popover-foreground shadow-md"
          style={{
              left: iconTooltip.x + 15,
              top: iconTooltip.y + 15,
          }}
        >
          {iconTooltip.content}
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
                                  content={<CustomBarTooltip chartData={chartData} />}
                                  cursor={{ fill: 'hsl(var(--accent))', opacity: 0.5 }}
                              />
                              <XAxis 
                                  dataKey="name" 
                                  tickLine={false} 
                                  axisLine={false} 
                                  tick={<CustomXAxisTick />}
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
