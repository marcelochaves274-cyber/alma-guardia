
'use client';

import { useState, useEffect, useCallback, useRef, type MouseEvent } from 'react';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
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

type Marker = { x: number; y: number } | null;

interface RegisterFaunaFloraGeoProps {
  recordToEdit: any | null;
  setPage: (page: string) => void;
  prefillData?: any | null;
}

export function RegisterFaunaFloraGeo({ recordToEdit, setPage, prefillData }: RegisterFaunaFloraGeoProps) {
  const isEditing = !!recordToEdit;

  // Form states
  const [date, setDate] = useState<Date | undefined>(prefillData?.date ? (prefillData.date instanceof Timestamp ? prefillData.date.toDate() : prefillData.date) : new Date());
  const [location, setLocation] = useState('');
  const [speciesType, setSpeciesType] = useState('');
  const [analysis, setAnalysis] = useState('');
  const [description, setDescription] = useState('');
  const [marker, setMarker] = useState<Marker>(null);

  // UI/Data loading states
  const [isCalendarOpen, setIsCalendarOpen] = useState(false);
  const [speciesTypes, setSpeciesTypes] = useState<string[]>([]);
  const [locations, setLocations] = useState<string[]>([]);
  const [isLoadingTypes, setIsLoadingTypes] = useState(true);
  const [isLoadingLocations, setIsLoadingLocations] = useState(true);
  const [mapUrl, setMapUrl] = useState<string | null>(null);
  const [isLoadingMap, setIsLoadingMap] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const mapContainerRef = useRef<HTMLDivElement>(null);
  
  const firestore = useFirestore();
  const { user } = useUser();
  const { toast } = useToast();

  useEffect(() => {
    if (prefillData) {
      setDescription(prefillData.description || '');
      setLocation(prefillData.location || '');
      setMarker(prefillData.mapMarker || null);
    }
  }, [prefillData]);

  // Populate form if we are editing
  useEffect(() => {
    if (isEditing && recordToEdit) {
      const recordDate = recordToEdit.date;
      setDate(recordDate instanceof Timestamp ? recordDate.toDate() : recordDate);
      setLocation(recordToEdit.location || '');
      setSpeciesType(recordToEdit.speciesType || '');
      setAnalysis(recordToEdit.analysis || '');
      setDescription(recordToEdit.description || '');
      setMarker(recordToEdit.mapMarker || null);
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
        }
      } catch (error) {
        console.error("Error fetching map:", error);
      } finally {
        setIsLoadingMap(false);
      }
    };
    fetchMap();
  }, [getSettingsDocRef]);

  const handleMapClick = (e: MouseEvent<HTMLDivElement>) => {
    if (!mapContainerRef.current) return;
    const rect = mapContainerRef.current.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 100;
    const y = ((e.clientY - rect.top) / rect.height) * 100;
    setMarker({ x, y });
  };
  
  const resetForm = () => {
    setDate(undefined);
    setLocation('');
    setSpeciesType('');
    setAnalysis('');
    setDescription('');
    setMarker(null);
  }

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!firestore || !user) {
        toast({ variant: 'destructive', title: 'Erro', description: 'Você não está autenticado.' });
        return;
    }
    if (!date) {
        toast({ variant: 'destructive', title: 'Campo obrigatório', description: 'Por favor, selecione a data do registro.' });
        return;
    }
    if (!analysis) {
        toast({ variant: 'destructive', title: 'Campo obrigatório', description: 'Por favor, selecione a análise da situação.' });
        return;
    }

    setIsSubmitting(true);
    
    const recordData = {
        date: Timestamp.fromDate(date),
        location,
        speciesType,
        description,
        analysis,
        mapMarker: marker,
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
        toast({ title: 'Sucesso!', description: 'Registro salvo com sucesso.' });
        resetForm();
      }

    } catch (error) {
        console.error("Error saving record:", error);
        toast({ variant: 'destructive', title: 'Erro ao salvar', description: 'Não foi possível salvar o registro.'});
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
              <Label htmlFor="location">Local</Label>
              <Select name="location" required disabled={isLoadingLocations || locations.length === 0} onValueChange={setLocation} value={location}>
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
              <RadioGroup name="analysis" required className="flex items-center space-x-4 pt-2" onValueChange={setAnalysis} value={analysis}>
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
              <div className="flex justify-between items-start">
                  <div>
                      <h3 className="text-lg font-semibold text-foreground">Localização no Mapa</h3>
                      <p className="text-sm text-muted-foreground">
                          Clique no mapa para marcar o ponto exato do registro.
                      </p>
                  </div>
                  {marker && (
                    <Button variant="ghost" size="sm" onClick={() => setMarker(null)}>
                        <X className="mr-2 h-4 w-4" />
                        Limpar Marcação
                    </Button>
                  )}
              </div>
              <div
                ref={mapContainerRef}
                onClick={handleMapClick}
                className="relative w-full aspect-video border-2 border-dashed rounded-md cursor-pointer bg-muted/20 flex items-center justify-center overflow-hidden"
              >
                {isLoadingMap ? (
                  <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                ) : mapUrl ? (
                  <>
                    <Image
                      src={mapUrl}
                      alt="Mapa de registros"
                      fill
                      className="object-cover"
                    />
                    {marker && (
                      <div
                        className="absolute pointer-events-none"
                        style={{
                          left: `${marker.x}%`,
                          top: `${marker.y}%`,
                          transform: 'translate(-50%, -100%)',
                        }}
                        aria-label="Marcador de registro"
                      >
                         <MapPin className="h-5 w-5 fill-red-500 stroke-white stroke-2 drop-shadow-lg" />
                      </div>
                    )}
                  </>
                ) : (
                  <p className="text-muted-foreground text-center p-4">
                    Nenhum mapa foi carregado. <br />Vá para "Configurações" &gt; "Gerenciar Mapa" para fazer o upload.
                  </p>
                )}
              </div>
           </div>
        </CardContent>
        <div className="flex justify-end gap-4 p-6 pt-0">
            {isEditing && (
                <Button variant="outline" type="button" onClick={() => setPage('fauna-flora-geo-report')}>
                Cancelar
                </Button>
            )}
            <Button type="submit" disabled={isSubmitting}>
                {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {isEditing ? 'Salvar Alterações' : 'Salvar Registro'}
            </Button>
        </div>
      </form>
    </Card>
  );
}
