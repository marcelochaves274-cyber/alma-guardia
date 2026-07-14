
'use client';

import { useState, useEffect, useCallback, useRef, type MouseEvent } from 'react';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardFooter,
  CardTitle,
} from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { cn } from '@/lib/utils';
import { Calendar as CalendarIcon, Loader2, MapPin, X } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { useFirestore, useUser } from '@/firebase';
import { doc, getDoc, addDoc, updateDoc, collection, serverTimestamp, Timestamp } from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';
import Image from 'next/image';
import { Separator } from './ui/separator';
import { HelpTooltip } from './ui/help-tooltip'; 
import { MapSelector, type LocationData } from './map-selector';
import { ErrorModal } from './ErrorModal';

interface RegisterFaunaFloraGeoProps {
  recordToEdit: any | null;
  setPage: (page: string) => void;
  prefillData?: any | null;
}

export function RegisterFaunaFloraGeo({ recordToEdit, setPage, prefillData }: RegisterFaunaFloraGeoProps) {
  const isEditing = !!recordToEdit;

  // Form states
  const [date, setDate] = useState<Date | undefined>(
    recordToEdit?.date ? (recordToEdit.date instanceof Timestamp ? recordToEdit.date.toDate() : recordToEdit.date) :
    (prefillData?.date ? (prefillData.date instanceof Timestamp ? prefillData.date.toDate() : prefillData.date) : new Date())
  );
  const [locationName, setLocationName] = useState(recordToEdit?.location || prefillData?.location || '');
  const [speciesType, setSpeciesType] = useState(recordToEdit?.speciesType || '');
  const [analysis, setAnalysis] = useState(recordToEdit?.analysis || '');
  const [description, setDescription] = useState(recordToEdit?.description || prefillData?.description || '');
  const [mapLocation, setMapLocation] = useState<LocationData | null>(null);

  // UI/Data loading states
  const [isCalendarOpen, setIsCalendarOpen] = useState(false);
  const [speciesTypes, setSpeciesTypes] = useState<string[]>([]);
  const [locations, setLocations] = useState<string[]>([]);
  const [isLoadingTypes, setIsLoadingTypes] = useState(true);
  const [isLoadingLocations, setIsLoadingLocations] = useState(true);
  const [mapUrl, setMapUrl] = useState<string | null>(null);
  const [mapCenter, setMapCenter] = useState<{ lat: number; lng: number } | undefined>(undefined);
  const [isLoadingMap, setIsLoadingMap] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isErrorOpen, setIsErrorOpen] = useState(false);

  const firestore = useFirestore();
  const { user } = useUser();
  const { toast } = useToast();

  useEffect(() => {
    if (prefillData) {
      setDescription(prefillData.description || '');
      setLocationName(prefillData.location || '');
      if (prefillData.mapLocation) {
        setMapLocation(prefillData.mapLocation);
      } else if (prefillData.mapMarker) { // Backwards compatibility
        setMapLocation({
          mapType: 'ludico',
          ludico: prefillData.mapMarker,
        });
      }
    }
  }, [prefillData]);

  // Populate form if we are editing
  useEffect(() => {
    if (isEditing && recordToEdit) {
      const recordDate = recordToEdit.date;
      setDate(recordDate instanceof Timestamp ? recordDate.toDate() : recordDate);
      setLocationName(recordToEdit.locationName || recordToEdit.location || ''); // Compatibility
      setSpeciesType(recordToEdit.speciesType || '');
      setAnalysis(recordToEdit.analysis || '');
      setDescription(recordToEdit.description || '');
      if (recordToEdit.mapLocation) {
        setMapLocation(recordToEdit.mapLocation);
      } else if (recordToEdit.mapMarker) { // Backwards compatibility
        setMapLocation({
          mapType: 'ludico',
          ludico: recordToEdit.mapMarker,
        });
      } else {
        setMapLocation(null);
      }
    }
  }, [isEditing, recordToEdit]);

  const getSettingsDocRef = useCallback((collectionName: string) => {
    if (!firestore || !user) return null;
    return doc(firestore, 'sgs_genius', user.uid, 'settings', collectionName);
  }, [firestore, user]);

  useEffect(() => {
    const fetchSelectOptions = async (docName: string, setData: (data: string[]) => void, setLoading: (loading: boolean) => void, entityName: string, field: 'types' | 'locations') => {
      const docRef = getSettingsDocRef(docName);
      if (!docRef) {
        setLoading(false);
        return;
      }
      try {
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
          const data = docSnap.data();
          setData((data[field] || []).sort((a: string, b: string) => a.localeCompare(b)));
        }
      } catch (error) {
        console.error(`Error fetching ${entityName}:`, error);
        toast({
          variant: "destructive",
          title: "Erro ao carregar dados",
          description: `Não foi possível buscar ${entityName}.`
        });
      } finally {
        setLoading(false);
      }
    };
    fetchSelectOptions('faunaFloraGeoTypes', setSpeciesTypes, setIsLoadingTypes, 'tipos de fauna/flora/geo', 'types');
    fetchSelectOptions('locations', setLocations, setIsLoadingLocations, 'locais', 'locations');
  }, [getSettingsDocRef, toast]);
  
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

  const resetForm = () => {
    setDate(undefined);
    setLocationName(''); // Corrigido
    setSpeciesType('');
    setAnalysis('');
    setDescription('');
    setMapLocation(null); // Corrigido
  }

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!firestore || !user) {
        toast({ variant: 'destructive', title: 'Erro', description: 'Você não está autenticado.' });
        return;
    }
    if (!description || !date || !locationName || !speciesType || !analysis || (!mapLocation?.ludico && !mapLocation?.geo)) {
      setIsErrorOpen(true);
      setIsSubmitting(false);
      return;
    }    

    setIsSubmitting(true);
    
    const recordData = {
        date: Timestamp.fromDate(date),
        locationName: locationName,
        speciesType,
        description,
        analysis,
        location: mapLocation,
        userId: user.uid,
    };

    try {
      if (isEditing && recordToEdit) {
        const docRef = doc(firestore, 'sgs_genius', user.uid, 'fauna_flora_geo', recordToEdit.id);
        await updateDoc(docRef, {
          ...recordData,
          updatedAt: serverTimestamp()
        });
        toast({ title: 'Sucesso!', description: 'Registro atualizado com sucesso.' });
        setPage('fauna-flora-geo-report');
      } else {
        const collectionRef = collection(firestore, 'sgs_genius', user.uid, 'fauna_flora_geo');
        await addDoc(collectionRef, {
            ...recordData,
            createdAt: serverTimestamp()
        });
        // If created from a notice, update the notice status
        if (prefillData?.noticeId) {
          const noticeRef = doc(firestore, 'sgs_genius', user.uid, 'notices', prefillData.noticeId);
          await updateDoc(noticeRef, { status: 'finalizado' });
        }
        toast({ title: 'Sucesso!', description: 'Registro salvo com sucesso.' });
        resetForm();
      }

    } catch (error) {
        console.error("Error saving record:", error);
        setIsErrorOpen(true);
    } finally {
        setIsSubmitting(false);
    }
  };


  return (
    <Card className="w-full">
      <form onSubmit={handleSubmit}>
        <CardHeader>
          <CardTitle>{isEditing ? 'Editar Registro' : 'Registrar Fauna, Flora ou Geo'}</CardTitle>
          <CardDescription>
            {isEditing ? 'Altere os dados do registro abaixo.' : 'Preencha os campos para registrar um novo item de fauna, flora ou geodiversidade.'}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-8">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <Label htmlFor="date">Data do Registro</Label>
              <Popover open={isCalendarOpen} onOpenChange={setIsCalendarOpen}>
                <PopoverTrigger asChild>
                  <Button
                    variant={'outline'}
                    className={cn(
                      'w-full justify-start text-left font-normal',
                      !date && 'text-muted-foreground'
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {date ? (
                      format(date, 'dd/MM/yyyy')
                    ) : (
                      <span>Escolha uma data</span>
                    )}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0">
                  <Calendar
                    mode="single"
                    selected={date}
                    onSelect={(d) => {
                        if(d) setDate(d);
                        setIsCalendarOpen(false);
                    }}
                    locale={ptBR}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            </div>
            <div className="space-y-2">
              <Label htmlFor="locationName">Local</Label>
              <Select name="locationName" required disabled={isLoadingLocations || locations.length === 0} onValueChange={setLocationName} value={locationName}>
                <SelectTrigger id="location">
                  <SelectValue placeholder={
                    isLoadingLocations ? "Carregando..." : 
                    locations.length === 0 ? "Nenhum local cadastrado" : "Selecione o local"
                  } />
                </SelectTrigger>
                <SelectContent>
                  {isLoadingLocations ? (
                    <div className="flex items-center justify-center p-2">
                      <Loader2 className="h-4 w-4 animate-spin" />
                    </div>
                  ) : (
                    locations.map((loc) => (
                      <SelectItem key={loc} value={loc}>
                        {loc}
                      </SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
            </div>
             <div className="space-y-2 md:col-span-2">
              <Label htmlFor="species-type">Espécie / Tipo</Label>
              <Select name="speciesType" required disabled={isLoadingTypes || speciesTypes.length === 0} onValueChange={setSpeciesType} value={speciesType}>
                <SelectTrigger id="species-type">
                  <SelectValue placeholder={
                    isLoadingTypes ? "Carregando..." : 
                    speciesTypes.length === 0 ? "Nenhum tipo cadastrado" : "Selecione o tipo"
                  } />
                </SelectTrigger>
                <SelectContent>
                  {isLoadingTypes ? (
                    <div className="flex items-center justify-center p-2">
                      <Loader2 className="h-4 w-4 animate-spin" />
                    </div>
                  ) : (
                    speciesTypes.map((type) => (
                      <SelectItem key={type} value={type}>
                        {type}
                      </SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
            </div>
          </div>
          
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Label htmlFor="description">Descrição</Label>
              <HelpTooltip content="Descreva detalhadamente o registro (e.g., condição, quantidade, comportamento)." />
            </div>
            <Textarea
              id="description"
              name="description"
              placeholder="Descreva detalhadamente o registro (e.g., condição, quantidade)."
              className="min-h-[100px]"
              required
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </div>

          <Separator />
          <div className="space-y-3">
              <Label>Análise da Situação</Label>
              <RadioGroup name="analysis" required className="flex flex-wrap items-center gap-4 pt-2" onValueChange={setAnalysis} value={analysis}>
                  <div className="flex items-center space-x-2">
                      <RadioGroupItem value="alta" id="alta" className="border-red-500 text-red-500 focus:ring-red-500" />
                      <Label htmlFor="alta" className="font-bold text-red-500">Alta</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                      <RadioGroupItem value="media" id="media" className="border-orange-500 text-orange-500 focus:ring-orange-500" />
                      <Label htmlFor="media" className="font-bold text-orange-500">Média</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                      <RadioGroupItem value="baixa" id="baixa" className="border-yellow-500 text-yellow-500 focus:ring-yellow-500" />
                      <Label htmlFor="baixa" className="font-bold text-yellow-500">Baixa</Label>
                  </div>
              </RadioGroup>
          </div>
          
          <Separator />
           <div className="space-y-4">
              <h3 className="text-lg font-semibold text-foreground">Localização no Mapa (Obrigatório)</h3>
              {isEditing && !recordToEdit?.mapLocation && !recordToEdit?.mapMarker && (
                <p className="text-sm text-amber-600 bg-amber-100 p-2 rounded-md border border-amber-200">
                  Este registro antigo ainda não possui marcação no mapa. Edite o local abaixo para salvá-lo.
                </p>
              )}
              {isLoadingMap ? (
                <div className="flex items-center justify-center w-full h-[500px] bg-muted border rounded-md">
                  <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                </div>
              ) : (
                <MapSelector 
                  ludicMapUrl={mapUrl} 
                  onLocationChange={setMapLocation} 
                  initialLocation={mapLocation} 
                  defaultCenter={mapCenter} 
                />
              )}
           </div>
        </CardContent>
        <CardFooter className="flex flex-col gap-2">
          <Button type="submit" className="w-full" disabled={isSubmitting}>
            {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {isEditing ? 'Salvar Alterações' : 'Salvar Registro'}
          </Button>
            {isEditing && (
                <Button 
                  variant="outline" 
                  type="button" 
                  className="w-full" 
                  onClick={() => setPage('fauna-flora-geo-report')}
                >
                  Cancelar Edição
                </Button>
            )}
        </CardFooter>
      </form>
      <ErrorModal 
        isOpen={isErrorOpen} 
        onClose={() => setIsErrorOpen(false)} 
        message="Preencha todos os campos, inclusive os mapas." 
      />
    </Card>
  );
}
