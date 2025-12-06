'use client';

import { useState, useEffect, useCallback, useRef, type MouseEvent } from 'react';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  CardFooter
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
import { doc, getDoc, addDoc, collection, serverTimestamp } from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';
import Image from 'next/image';
import { Separator } from './ui/separator';

type Marker = { x: number; y: number } | null;

export function RegisterOccurrence() {
  const [occurrenceDate, setOccurrenceDate] = useState<Date>();
  const [occurrenceTypes, setOccurrenceTypes] = useState<string[]>([]);
  const [locations, setLocations] = useState<string[]>([]);
  const [isLoadingTypes, setIsLoadingTypes] = useState(true);
  const [isLoadingLocations, setIsLoadingLocations] = useState(true);

  const [mapUrl, setMapUrl] = useState<string | null>(null);
  const [isLoadingMap, setIsLoadingMap] = useState(true);
  const [marker, setMarker] = useState<Marker>(null);
  const mapContainerRef = useRef<HTMLDivElement>(null);
  
  const [isSubmitting, setIsSubmitting] = useState(false);

  const firestore = useFirestore();
  const { user } = useUser();
  const { toast } = useToast();

  const getSettingsDocRef = useCallback((collectionName: string) => {
    if (!firestore || !user) return null;
    return doc(firestore, 'users', user.uid, 'settings', collectionName);
  }, [firestore, user]);

  useEffect(() => {
    const fetchSelectOptions = async (docName: string, setData: (data: string[]) => void, setLoading: (loading: boolean) => void, entityName: string) => {
      const docRef = getSettingsDocRef(docName);
      if (!docRef) {
        setLoading(false);
        return;
      }
      try {
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
          const data = docSnap.data();
          setData(data.types || data.locations || []);
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
    fetchSelectOptions('occurrenceTypes', setOccurrenceTypes, setIsLoadingTypes, 'tipos de ocorrência');
    fetchSelectOptions('locations', setLocations, setIsLoadingLocations, 'locais');
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
  
  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!firestore || !user) {
        toast({ variant: 'destructive', title: 'Erro', description: 'Você não está autenticado.' });
        return;
    }

    setIsSubmitting(true);
    
    const formData = new FormData(e.currentTarget);
    const data = Object.fromEntries(formData.entries());

    const occurrenceData = {
        ...data,
        occurrenceDate,
        mapMarker: marker,
        userId: user.uid,
        createdAt: serverTimestamp()
    };

    try {
        const occurrencesCollectionRef = collection(firestore, 'users', user.uid, 'occurrences');
        await addDoc(occurrencesCollectionRef, occurrenceData);
        
        toast({ title: 'Sucesso!', description: 'Ocorrência registrada com sucesso.' });
        
        setOccurrenceDate(undefined);
        setMarker(null);
        e.currentTarget.reset();

    } catch (error) {
        console.error("Error saving occurrence:", error);
        toast({ variant: 'destructive', title: 'Erro ao salvar', description: 'Não foi possível registrar a ocorrência.'});
    } finally {
        setIsSubmitting(false);
    }
  };


  return (
    <Card className="w-full">
      <form onSubmit={handleSubmit}>
        <CardHeader>
          <CardTitle>Registro de Ocorrência</CardTitle>
          <CardDescription>
            Preencha os campos abaixo para registrar um novo acidente ou incidente.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-8">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <Label htmlFor="occurrence-date">Data da Ocorrência</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant={'outline'}
                    className={cn(
                      'w-full justify-start text-left font-normal',
                      !occurrenceDate && 'text-muted-foreground'
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {occurrenceDate ? (
                      format(occurrenceDate, 'dd/MM/yyyy')
                    ) : (
                      <span>Escolha uma data</span>
                    )}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0">
                  <Calendar
                    mode="single"
                    selected={occurrenceDate}
                    onSelect={setOccurrenceDate}
                    locale={ptBR}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            </div>
            <div className="space-y-2">
              <Label htmlFor="occurrence-location">Local da Ocorrência</Label>
              <Select name="occurrenceLocation" required disabled={isLoadingLocations || locations.length === 0}>
                <SelectTrigger id="occurrence-location">
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
             <div className="space-y-2">
              <Label htmlFor="occurrence-type">Tipo de Ocorrência</Label>
              <Select name="occurrenceType" required disabled={isLoadingTypes || occurrenceTypes.length === 0}>
                <SelectTrigger id="occurrence-type">
                  <SelectValue placeholder={
                    isLoadingTypes ? "Carregando..." : 
                    occurrenceTypes.length === 0 ? "Nenhum tipo cadastrado" : "Selecione o tipo"
                  } />
                </SelectTrigger>
                <SelectContent>
                  {isLoadingTypes ? (
                    <div className="flex items-center justify-center p-2">
                      <Loader2 className="h-4 w-4 animate-spin" />
                    </div>
                  ) : (
                    occurrenceTypes.map((type) => (
                      <SelectItem key={type} value={type}>
                        {type}
                      </SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Faixa Etária</Label>
              <Select name="ageGroup" required>
                  <SelectTrigger>
                      <SelectValue placeholder="Selecione a faixa etária" />
                  </SelectTrigger>
                  <SelectContent>
                      <SelectItem value="crianca">Criança (0-12 anos)</SelectItem>
                      <SelectItem value="adolescente">Adolescente (13-17 anos)</SelectItem>
                      <SelectItem value="adulto1">Adulto (18-39 anos)</SelectItem>
                      <SelectItem value="adulto2">Adulto (40-59 anos)</SelectItem>
                      <SelectItem value="idoso">Idoso (60+ anos)</SelectItem>
                  </SelectContent>
              </Select>
            </div>
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="description">Descrição da Ocorrência</Label>
            <Textarea
              id="description"
              name="description"
              placeholder="Descreva detalhadamente o que aconteceu."
              className="min-h-[100px]"
              required
            />
          </div>

          <Separator />
          <div className="text-center">
              <h3 className="text-lg font-semibold text-foreground">Informação da Pessoa Envolvida</h3>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              <div className="space-y-2">
                  <Label htmlFor="full-name">Nome Completo</Label>
                  <Input name="involvedPersonName" id="full-name" placeholder="Nome completo do envolvido" required />
              </div>
              <div className="space-y-2">
                  <Label htmlFor="birth-date">Data de Nascimento</Label>
                  <Input name="birthDate" id="birth-date" placeholder="dd/mm/aaaa" />
              </div>
              <div className="space-y-2">
                  <Label htmlFor="cpf">CPF</Label>
                  <Input name="cpf" id="cpf" placeholder="000.000.000-00" />
              </div>
              <div className="space-y-2">
                  <Label htmlFor="city">Cidade</Label>
                  <Input name="city" id="city" placeholder="Cidade de residência" />
              </div>
              <div className="space-y-2">
                  <Label htmlFor="state">Estado</Label>
                  <Input name="state" id="state" placeholder="UF" />
              </div>
              <div className="space-y-2">
                  <Label htmlFor="phone">Fone</Label>
                  <Input name="phone" id="phone" placeholder="(00) 00000-0000" />
              </div>
          </div>

          <Separator />
          <div className="space-y-3">
              <Label>Análise da Ocorrência</Label>
              <RadioGroup name="analysis" required className="flex items-center space-x-4 pt-2">
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
                          Clique no mapa para marcar o ponto exato da ocorrência.
                      </p>
                  </div>
                  {marker && (
                    <Button variant="ghost" size="sm" onClick={() => setMarker(null)}>
                        <X className="mr-2 h-4 w-4" />
                        Limpar Marcação
                    </Button>
                  )}
              </div>
               <p className="text-sm text-destructive">
                Importante: Se a imagem do mapa for alterada futuramente, as marcações de ocorrências já salvas não serão atualizadas para a nova imagem.
              </p>
              <div
                ref={mapContainerRef}
                onClick={handleMapClick}
                className="relative w-full h-auto min-h-[500px] border-2 border-dashed rounded-md cursor-pointer bg-muted/20 flex items-center justify-center overflow-hidden"
              >
                {isLoadingMap ? (
                  <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                ) : mapUrl ? (
                  <>
                    <Image
                      src={mapUrl}
                      alt="Mapa de ocorrências"
                      layout="fill"
                      objectFit="contain"
                      className="rounded-md"
                    />
                    {marker && (
                      <div
                        className="absolute pointer-events-none"
                        style={{
                          left: `${marker.x}%`,
                          top: `${marker.y}%`,
                          transform: 'translate(-50%, -100%)',
                        }}
                        aria-label="Marcador de ocorrência"
                      >
                         <MapPin className="h-8 w-8 fill-red-500 stroke-white stroke-2 drop-shadow-lg" />
                      </div>
                    )}
                  </>
                ) : (
                  <p className="text-muted-foreground text-center p-4">
                    Nenhum mapa foi carregado. <br />Vá para "Configurações" > "Gerenciar Mapa" para fazer o upload.
                  </p>
                )}
              </div>
           </div>

        </CardContent>
        <CardFooter>
          <Button type="submit" className="w-full" disabled={isSubmitting}>
            {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Salvar Ocorrência
          </Button>
        </CardFooter>
      </form>
    </Card>
  );
}
