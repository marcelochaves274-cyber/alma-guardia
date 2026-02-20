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
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import { MonthSelector } from './month-selector';
import { SheetFilter } from './sheet-filter';
import { Skeleton } from './ui/skeleton';
import { startOfDay, isBefore } from 'date-fns';

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

const CustomTooltip = ({ active, payload, label, filterSummary }: any) => {
  if (active && payload && payload.length) {
    const filteredPayload = payload.filter((p: any) => p.value > 0);
    if (filteredPayload.length === 0) return null;

    return (
      <div className="p-2 bg-card border rounded-md shadow-lg text-sm max-w-xs">
        {filterSummary && <p className="text-xs text-muted-foreground mb-2">{filterSummary}</p>}
        <p className="font-bold text-card-foreground">{label}</p>
        <ul className="list-none p-0 mt-1">
          {filteredPayload.map((entry: any, index: number) => (
            <li key={`item-${index}`} style={{ color: entry.color }}>
              {`${entry.name}: ${entry.value}`}
            </li>
          ))}
        </ul>
      </div>
    );
  }
  return null;
};

export function GraphicsReport() {
  const { toast } = useToast();
  const firestore = useFirestore();
  const { user } = useUser();

  const [reportType, setReportType] = useState<ReportType>('occurrences');
  
  // Data
  const [occurrences, setOccurrences] = useState<Occurrence[]>([]);
  const [treatments, setTreatments] = useState<Treatment[]>([]);
  const [faunaFloraGeo, setFaunaFloraGeo] = useState<FaunaFloraGeoRecord[]>([]);

  // Loading states
  const [isLoading, setIsLoading] = useState(true);
  const [isClient, setIsClient] = useState(false);
  const [clientToday, setClientToday] = useState<Date | null>(null);

  // Filter states
  const [filterYear, setFilterYear] = useState<string[]>([]);
  const [filterMonths, setFilterMonths] = useState<string[]>([]);
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
    setClientToday(startOfDay(new Date()));
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
    setFilterMonths([]);
    setFilterType([]);
    setFilterLocation([]);
  };

  const filteredData = useMemo(() => {
    if (!isClient) return [];
    let data;
    switch (reportType) {
      case 'occurrences': data = occurrences; break;
      case 'treatments': data = treatments; break;
      case 'faunaFloraGeo': data = faunaFloraGeo; break;
      default: data = [];
    }

    const dateField = reportType === 'occurrences' ? 'occurrenceDate' : reportType === 'treatments' ? 'treatmentDate' : 'date';

    return data.filter((item: any) => {
      const itemDate = item[dateField];
      if (!itemDate) return false;
      const yearMatch = filterYear.length === 0 || filterYear.includes(itemDate.getFullYear().toString());
      const monthMatch = filterMonths.length === 0 || filterMonths.includes(itemDate.getMonth().toString());
      const locationMatch = filterLocation.length === 0 || filterLocation.includes(item.occurrenceLocation || item.treatmentLocation || item.location);
      const typeMatch = filterType.length === 0 || filterType.includes(item.occurrenceType || item.treatmentType || item.speciesType);
      
      return yearMatch && monthMatch && locationMatch && typeMatch;
    });

  }, [reportType, occurrences, treatments, faunaFloraGeo, filterYear, filterMonths, filterLocation, filterType, isClient]);

  const chartData = useMemo(() => {
    const groupedData: { [key: string]: { [month: string]: number } & { name: string } } = {};
    const typeField = reportType === 'occurrences' ? 'occurrenceType' : reportType === 'treatments' ? 'treatmentType' : 'speciesType';
    const dateField = reportType === 'occurrences' ? 'occurrenceDate' : reportType === 'treatments' ? 'treatmentDate' : 'date';

    filteredData.forEach((item: any) => {
      const type = item[typeField] || 'Outros';
      const monthIndex = item[dateField].getMonth();
      const monthName = months[monthIndex];

      if (!groupedData[type]) {
        groupedData[type] = { name: type };
        months.forEach(m => groupedData[type][m] = 0);
      }
      groupedData[type][monthName]++;
    });

    return Object.values(groupedData);
  }, [filteredData, reportType]);
  
  const filterSummary = useMemo(() => {
    const yearText = filterYear.length > 0 ? filterYear.join(', ') : 'Todos';
    const monthLabels = filterMonths.map(m => months[parseInt(m, 10)]).join(', ');
    const monthText = filterMonths.length > 0 ? monthLabels : 'Todos';

    let typeOptions: { value: string, label: string }[] = [];
    if (reportType === 'occurrences') typeOptions = occurrenceTypes.map(t => ({value: t, label: t}));
    if (reportType === 'treatments') typeOptions = treatmentTypes.map(t => ({value: t, label: t}));
    if (reportType === 'faunaFloraGeo') typeOptions = faunaFloraGeoTypes.map(t => ({value: t, label: t}));
    const typeLabels = filterType.map(v => typeOptions.find(o => o.value === v)?.label || v).join(', ');
    const typeText = filterType.length > 0 ? typeLabels : 'Todos';
    
    const locationLabels = filterLocation.join(', ');
    const locationText = filterLocation.length > 0 ? locationLabels : 'Todos';

    return `Ano(s): ${yearText} | Mês(es): ${monthText} | Tipo(s): ${typeText} | Local(is): ${locationText}`;
  }, [filterYear, filterMonths, filterType, filterLocation, reportType, occurrenceTypes, treatmentTypes, faunaFloraGeoTypes]);


  const renderFilters = () => {
    let typeOptions: { value: string, label: string }[] = [];
    if (reportType === 'occurrences') typeOptions = occurrenceTypes.map(t => ({value: t, label: t}));
    if (reportType === 'treatments') typeOptions = treatmentTypes.map(t => ({value: t, label: t}));
    if (reportType === 'faunaFloraGeo') typeOptions = faunaFloraGeoTypes.map(t => ({value: t, label: t}));

    return (
      <div className="space-y-4">
        <div className="space-y-2">
            <Label>Filtrar por Mês</Label>
            <MonthSelector selectedMonths={filterMonths} onMonthChange={setFilterMonths} />
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 items-end">
            <div className="space-y-2">
                <Label>Filtrar Ano</Label>
                <SheetFilter title='Filtrar Anos' options={availableYears.map(y => ({ value: y, label: y }))} selected={filterYear} onChange={setFilterYear} disabled={isLoading} buttonText='Filtrar por Ano' />
            </div>
            <div className="space-y-2">
                <Label>Filtrar por Tipo</Label>
                <SheetFilter title='Filtrar Tipos' options={typeOptions} selected={filterType} onChange={setFilterType} disabled={isLoading || typeOptions.length === 0} buttonText='Filtrar por Tipo' />
            </div>
             <div className="space-y-2">
                <Label>Filtrar por Local</Label>
                <SheetFilter title='Filtrar Locais' options={locations.map(l => ({ value: l, label: l }))} selected={filterLocation} onChange={setFilterLocation} disabled={isLoading || locations.length === 0} buttonText='Filtrar por Local' />
            </div>
            <Button onClick={clearFilters} variant="outline" className="w-full">Limpar Filtros</Button>
        </div>
      </div>
    );
  };
  
  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Gráficos</CardTitle>
          <CardDescription>Selecione o tipo de relatório e aplique filtros para visualizar os dados em um gráfico de barras.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-2 max-w-sm">
            <Label>Tipo de Relatório</Label>
            <Select onValueChange={(v: ReportType) => setReportType(v)} value={reportType}>
              <SelectTrigger>
                <SelectValue placeholder="Selecione um tipo de relatório" />
              </SelectTrigger>
              <SelectContent>
                {reportTypeOptions.map(opt => <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          {renderFilters()}
        </CardContent>
      </Card>
      
      <Card>
        <CardContent className="pt-6">
            {isLoading ? (
                <Skeleton className="h-[400px] w-full" />
            ) : chartData.length > 0 ? (
                <ResponsiveContainer width="100%" height={400}>
                    <BarChart data={chartData} margin={{ top: 5, right: 20, left: -20, bottom: 5 }}>
                        <XAxis dataKey="name" tickLine={false} axisLine={false} tick={{ fontSize: 12 }} />
                        <YAxis width={0} />
                        <Tooltip cursor={{ fill: 'hsl(var(--accent))', opacity: 0.5 }} content={<CustomTooltip filterSummary={filterSummary} />} />
                        {months.map((month, index) => (
                          <Bar key={month} dataKey={month} stackId="a" fill={monthColors[index]} radius={[4, 4, 0, 0]} />
                        ))}
                    </BarChart>
                </ResponsiveContainer>
            ) : (
                <div className="h-[400px] flex items-center justify-center text-muted-foreground">
                    Nenhum dado para exibir com os filtros selecionados.
                </div>
            )}
        </CardContent>
      </Card>
    </div>
  )
}
