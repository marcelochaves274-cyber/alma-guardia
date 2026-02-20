
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

const CustomTooltip = ({ active, payload, label, reportType, filteredData, filters }: any) => {
  if (active && payload && payload.length) {
    const typeName = label;
    const { filterYear, filterMonths, filterType, filterLocation, typeOptions, locationOptions } = filters;

    const locationField = reportType === 'occurrences' ? 'occurrenceLocation' : reportType === 'treatments' ? 'treatmentLocation' : 'location';
    const typeField = reportType === 'occurrences' ? 'occurrenceType' : reportType === 'treatments' ? 'treatmentType' : 'speciesType';

    const itemsForType = filteredData.filter((item: any) => (item[typeField] || 'Outros') === typeName);

    const countsByLocation = itemsForType.reduce((acc: any, item: any) => {
        const loc = item[locationField] || 'Sem Local';
        acc[loc] = (acc[loc] || 0) + 1;
        return acc;
    }, {});
    
    const locationEntries = Object.entries(countsByLocation).filter(([, count]) => (count as number) > 0);


    const renderFilterList = (title: string, selected: string[], allOptions?: {label:string, value:string}[]) => {
      if (selected.length === 0) return null;
      
      const labels = allOptions 
        ? selected.map(v => allOptions.find(o => o.value === v)?.label || v)
        : selected;

      return (
        <div>
          <p className="font-semibold text-muted-foreground/80">{title}:</p>
          <p className="text-xs pl-2 text-foreground">{labels.join(', ')}</p>
        </div>
      )
    }

    const hasFilters = filterYear.length > 0 || filterMonths.length > 0 || filterType.length > 0 || filterLocation.length > 0;

    return (
      <div className="p-3 bg-card/95 backdrop-blur-sm border rounded-lg shadow-xl text-sm min-w-[220px] max-w-xs">
        <div className="border-b pb-2 mb-2">
            <p className="font-bold text-lg text-card-foreground">{label}</p>
        </div>
        
        {locationEntries.length > 0 && (
            <ul className="list-none p-0 my-3 space-y-1.5">
            {locationEntries.map(([location, count], index) => (
                <li key={`item-${index}`} className="flex items-center justify-between">
                <div className="flex items-center">
                    <span className="w-2.5 h-2.5 rounded-full mr-2" style={{ backgroundColor: payload[0].color }} />
                    <span className="text-muted-foreground">{location}</span>
                </div>
                <span className="font-semibold text-foreground">{count as number}</span>
                </li>
            ))}
            </ul>
        )}

        {hasFilters && (
            <div className="border-t pt-2 mt-2 space-y-1.5 text-xs">
                <p className="font-bold text-muted-foreground text-center mb-2">Filtros Aplicados</p>
                {renderFilterList('Ano(s)', filterYear)}
                {renderFilterList('Mês(es)', filterMonths.map(m => months[parseInt(m,10)]))}
                {renderFilterList('Tipo(s)', filterType, typeOptions)}
                {renderFilterList('Local(is)', filterLocation, locationOptions)}
            </div>
        )}
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
    if (!isClient || !reportType) return [];
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
  
  const locationOptions = useMemo(() => locations.map(l => ({value: l, label: l})), [locations]);

  const filtersForTooltip = {
    filterYear,
    filterMonths,
    filterType,
    filterLocation,
    typeOptions,
    locationOptions,
  };

  const renderFilters = () => {
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
                <SheetFilter title='Filtrar Locais' options={locationOptions} selected={filterLocation} onChange={setFilterLocation} disabled={isLoading || locations.length === 0} buttonText='Filtrar por Local' />
            </div>
            <div className="flex gap-2">
                <Button onClick={clearFilters} variant="outline" className="w-full">Limpar Filtros</Button>
            </div>
        </div>
      </div>
    );
  };
  
  const areAllFiltersActive = filterYear.length > 0 && filterMonths.length > 0 && filterType.length > 0 && filterLocation.length > 0;
  const showChart = !isLoading && reportType && areAllFiltersActive && chartData.length > 0;
  const showNoDataMessage = !isLoading && reportType && areAllFiltersActive && chartData.length === 0;

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
            <Select onValueChange={(v: ReportType) => { setReportType(v); clearFilters(); }} value={reportType ?? ''}>
              <SelectTrigger>
                <SelectValue placeholder="Selecione um tipo de relatório" />
              </SelectTrigger>
              <SelectContent>
                {reportTypeOptions.map(opt => <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          {reportType && renderFilters()}
        </CardContent>
      </Card>
      
      <Card>
        <CardHeader>
            <CardTitle>Resultados</CardTitle>
            {showChart && (
                <CardDescription>
                    Exibindo: {filterYear.join(' - ')}
                </CardDescription>
            )}
        </CardHeader>
        <CardContent className="pt-0">
            <div className="h-[400px] flex items-center justify-center text-muted-foreground">
                {isLoading ? (
                     <Skeleton className="h-full w-full" />
                ) : showChart ? (
                    <ResponsiveContainer width="100%" height={400}>
                        <BarChart data={chartData} margin={{ top: 5, right: 20, left: -20, bottom: 5 }}>
                            <XAxis dataKey="name" tickLine={false} axisLine={false} tick={{ fontSize: 12 }} />
                            <YAxis width={0} axisLine={false} tickLine={false} />
                            <Tooltip cursor={{ fill: 'hsl(var(--accent))', opacity: 0.5 }} content={<CustomTooltip reportType={reportType} filteredData={filteredData} filters={filtersForTooltip} />} />
                            {months.map((month, index) => (
                              <Bar key={month} dataKey={month} stackId="a" fill={monthColors[index % monthColors.length]} radius={[4, 4, 0, 0]} />
                            ))}
                        </BarChart>
                    </ResponsiveContainer>
                ) : showNoDataMessage ? (
                    "Nenhum dado para exibir com os filtros selecionados."
                ) : !reportType ? (
                    "Selecione um tipo de relatório para começar."
                ) : (
                    "Todos os filtros (Ano, Mês, Tipo e Local) devem ser selecionados para exibir o gráfico."
                )}
            </div>
        </CardContent>
      </Card>
    </div>
  )
}
