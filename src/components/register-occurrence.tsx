
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
import { doc, getDoc, addDoc, updateDoc, collection, serverTimestamp, Timestamp } from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';
import Image from 'next/image';
import { Separator } from './ui/separator';
import { HelpTooltip } from './ui/help-tooltip'; 
import { MapSelector, type LocationData } from './map-selector'; // 1. Importar o MapSelector e seu tipo
import { ErrorModal } from './ErrorModal';

interface RegisterOccurrenceProps {
  occurrenceToEdit: any | null;
  setPage: (page: string) => void;
  prefillData?: any | null;
}

export function RegisterOccurrence({ occurrenceToEdit, setPage, prefillData }: RegisterOccurrenceProps) {
  const isEditing = !!occurrenceToEdit;

  // Form states
  const [occurrenceDate, setOccurrenceDate] = useState<Date | undefined>(
    occurrenceToEdit?.occurrenceDate ? (occurrenceToEdit.occurrenceDate instanceof Timestamp ? occurrenceToEdit.occurrenceDate.toDate() : occurrenceToEdit.occurrenceDate) :
    (prefillData?.date ? (prefillData.date instanceof Timestamp ? prefillData.date.toDate() : prefillData.date) : new Date())
  );
  const [occurrenceLocation, setOccurrenceLocation] = useState(occurrenceToEdit?.occurrenceLocation || prefillData?.location || '');
  const [occurrenceType, setOccurrenceType] = useState(occurrenceToEdit?.occurrenceType || '');
  const [ageGroup, setAgeGroup] = useState(occurrenceToEdit?.ageGroup || '');
  const [analysis, setAnalysis] = useState(occurrenceToEdit?.analysis || '');
  const [description, setDescription] = useState(occurrenceToEdit?.description || prefillData?.description || '');
  const [involvedPersonName, setInvolvedPersonName] = useState(occurrenceToEdit?.involvedPersonName || prefillData?.collaboratorName || '');
  const [birthDate, setBirthDate] = useState(occurrenceToEdit?.birthDate || '');
  const [cpf, setCpf] = useState(occurrenceToEdit?.cpf || '');
  const [city, setCity] = useState(occurrenceToEdit?.city || '');
  const [state, setState] = useState(occurrenceToEdit?.state || '');
  const [phone, setPhone] = useState(occurrenceToEdit?.phone || '');
  // 2. Substituir o estado 'marker' pelo novo estado 'location'
  const [location, setLocation] = useState<LocationData | null>(occurrenceToEdit?.location || prefillData?.location || null);

  // UI/Data loading states
  const [isCalendarOpen, setIsCalendarOpen] = useState(false);
  const [occurrenceTypes, setOccurrenceTypes] = useState<string[]>([]);
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
      setInvolvedPersonName(prefillData.collaboratorName || '');
      setOccurrenceLocation(prefillData.location || '');
      setLocation(prefillData.mapLocation || null); // Corrigido para usar mapLocation
    }
  }, [prefillData]);

  // Populate form if we are editing
  useEffect(() => {
    if (isEditing && occurrenceToEdit) {
      const date = occurrenceToEdit.occurrenceDate;
      setOccurrenceDate(date instanceof Timestamp ? date.toDate() : date);
      setOccurrenceLocation(occurrenceToEdit.occurrenceLocation || '');
      setOccurrenceType(occurrenceToEdit.occurrenceType || '');
      setAgeGroup(occurrenceToEdit.ageGroup || '');
      setAnalysis(occurrenceToEdit.analysis || '');
      setDescription(occurrenceToEdit.description || '');
      setInvolvedPersonName(occurrenceToEdit.involvedPersonName || '');
      setBirthDate(occurrenceToEdit.birthDate || '');
      setCpf(occurrenceToEdit.cpf || '');
      setCity(occurrenceToEdit.city || '');
      setState(occurrenceToEdit.state || '');
      setPhone(occurrenceToEdit.phone || '');
      setLocation(occurrenceToEdit.location || null); // Atualizado para o novo estado
    }
  }, [isEditing, occurrenceToEdit]);

  const getSettingsDocRef = useCallback((collectionName: string) => {
    if (!firestore || !user) return null;
    return doc(firestore, 'sgs_genius', user.uid, 'settings', collectionName);
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
          setData((data.types || data.locations || []).sort((a: string, b: string) => a.localeCompare(b)));
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
  
  const handleBirthDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let value = e.target.value.replace(/\D/g, ''); // Remove non-digits
    if (value.length > 2) {
      value = `${value.slice(0, 2)}/${value.slice(2)}`;
    }
    if (value.length > 5) {
      value = `${value.slice(0, 5)}/${value.slice(5)}`;
    }
    setBirthDate(value.slice(0, 10)); // Limit to 10 chars (dd/mm/yyyy)
  };
  
  const resetForm = () => {
    setOccurrenceDate(undefined);
    setOccurrenceLocation('');
    setOccurrenceType('');
    setAgeGroup('');
    setAnalysis('');
    setDescription('');
    setInvolvedPersonName('');
    setBirthDate('');
    setCpf('');
    setCity('');
    setState('');
    setPhone('');
    setLocation(null);
  }
  

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    e.stopPropagation();
    if (!firestore || !user) {
        toast({ variant: 'destructive', title: 'Erro', description: 'Você não está autenticado.' });
        return;
    }

    // Forçar Verificação Prévia: Adiciona a validação do mapa
    if (!description || !occurrenceDate || !analysis || !occurrenceLocation || !occurrenceType || !ageGroup || !involvedPersonName || (!location?.ludico && !location?.geo)) {
      setIsErrorOpen(true);
      setIsSubmitting(false);
      return;
    }
    
    setIsSubmitting(true);

    const occurrenceData = {
        occurrenceDate: Timestamp.fromDate(occurrenceDate),
        occurrenceLocation,
        occurrenceType,
        ageGroup,
        description,
        involvedPersonName,
        birthDate,
        cpf,
        city,
        state,
        phone,
        analysis,
        location: location, // 5. Salvar o objeto 'location'
        userId: user.uid,
    };

    // Log para depuração: verifica o objeto antes de enviar
    console.log('Dados enviados:', occurrenceData);

    try {
      if (isEditing && occurrenceToEdit) {
        const docRef = doc(firestore, 'sgs_genius', user.uid, 'chat_messages', occurrenceToEdit.id);
        await updateDoc(docRef, {
          ...occurrenceData,
          updatedAt: serverTimestamp()
        });
        toast({ title: 'Sucesso!', description: 'Ocorrência atualizada com sucesso.' });
        setPage('occurrence-report');
      } else {
        const occurrencesCollectionRef = collection(firestore, 'sgs_genius', user.uid, 'chat_messages');
        await addDoc(occurrencesCollectionRef, {
            ...occurrenceData,
            createdAt: serverTimestamp()
        });
        // If created from a notice, update the notice status
        if (prefillData?.noticeId) {
          const noticeRef = doc(firestore, 'sgs_genius', user.uid, 'notices', prefillData.noticeId);
          await updateDoc(noticeRef, { status: 'finalizado' });
        }
        toast({ title: 'Sucesso!', description: 'Ocorrência registrada com sucesso.' });
        resetForm();
      }

    } catch (error) {
        // Log detalhado do erro no console do navegador
        console.error('ERRO DETALHADO:', error);
        // Em vez de toast, abre o modal de erro centralizado
        setIsErrorOpen(true);
    } finally {
        setIsSubmitting(false);
    }
  };


  return (
    <Card className="w-full">
      <form onSubmit={handleSubmit}>
        <CardHeader>
          <CardTitle>{isEditing ? 'Editar Ocorrência' : 'Registro de Ocorrência'}</CardTitle>
          <CardDescription>
            {isEditing ? 'Altere os dados da ocorrência abaixo.' : 'Preencha os campos abaixo para registrar um novo acidente ou incidente.'}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-8">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <Label htmlFor="occurrence-date">Data da Ocorrência</Label>
              <Popover open={isCalendarOpen} onOpenChange={setIsCalendarOpen}>
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
                    onSelect={(date) => {
                        if(date) setOccurrenceDate(date);
                        setIsCalendarOpen(false);
                    }}
                    locale={ptBR}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            </div>
            <div className="space-y-2">
              <Label htmlFor="occurrence-location">Local da Ocorrência</Label>
              <Select name="occurrenceLocation" required disabled={isLoadingLocations || locations.length === 0} onValueChange={setOccurrenceLocation} value={occurrenceLocation}>
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
              <Select name="occurrenceType" required disabled={isLoadingTypes || occurrenceTypes.length === 0} onValueChange={setOccurrenceType} value={occurrenceType}>
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
              <Select name="ageGroup" required onValueChange={setAgeGroup} value={ageGroup}>
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
            <div className="flex items-center gap-2">
              <Label htmlFor="description">Descrição da Ocorrência</Label>
              <HelpTooltip content="Descreva em detalhes o que aconteceu, incluindo a sequência dos eventos, pessoas envolvidas e quaisquer danos materiais." />
            </div>
            <Textarea
              id="description"
              name="description"
              placeholder="Descreva detalhadamente o que aconteceu."
              className="min-h-[100px]"
              required
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </div>

          <Separator />
          <div className="text-center">
              <h3 className="text-lg font-semibold text-foreground">Informação da Pessoa Envolvida</h3>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              <div className="space-y-2">
                  <Label htmlFor="full-name">Nome Completo</Label>
                  <Input name="involvedPersonName" id="full-name" placeholder="Nome completo do envolvido" required value={involvedPersonName} onChange={(e) => setInvolvedPersonName(e.target.value)} />
              </div>
              <div className="space-y-2">
                  <Label htmlFor="birth-date">Data de Nascimento</Label>
                   <Input 
                    name="birthDate" 
                    id="birth-date" 
                    placeholder="dd/mm/aaaa"
                    value={birthDate}
                    onChange={handleBirthDateChange}
                    maxLength={10}
                  />
              </div>
              <div className="space-y-2">
                  <Label htmlFor="cpf">CPF</Label>
                  <Input name="cpf" id="cpf" placeholder="000.000.000-00" value={cpf} onChange={(e) => setCpf(e.target.value)} />
              </div>
              <div className="space-y-2">
                  <Label htmlFor="city">Cidade</Label>
                  <Input name="city" id="city" placeholder="Cidade de residência" value={city} onChange={(e) => setCity(e.target.value)} />
              </div>
              <div className="space-y-2">
                  <Label htmlFor="state">Estado</Label>
                  <Input name="state" id="state" placeholder="UF" value={state} onChange={(e) => setState(e.target.value)} />
              </div>
              <div className="space-y-2">
                  <Label htmlFor="phone">Fone</Label>
                  <Input name="phone" id="phone" placeholder="(00) 00000-0000" value={phone} onChange={(e) => setPhone(e.target.value)} />
              </div>
          </div>

          <Separator />
          <div className="space-y-3">
              <Label>Análise da Ocorrência</Label>
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
              {/* 3. Substituir o bloco do mapa antigo pelo novo componente */}
              <h3 className="text-lg font-semibold text-foreground">Localização no Mapa (Obrigatório)</h3>
              {isEditing && !occurrenceToEdit?.location && (
                <p className="text-sm text-amber-600 bg-amber-100 p-2 rounded-md border border-amber-200">
                  Este registro antigo ainda não possui marcação no mapa. Edite o local abaixo para salvá-lo.
                </p>
              )}
              {isLoadingMap ? (
                <div className="flex items-center justify-center w-full h-[500px] bg-muted border rounded-md">
                  <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                </div>
              ) : (
                // 4. Passar as props necessárias para o MapSelector
                <MapSelector ludicMapUrl={mapUrl} onLocationChange={setLocation} initialLocation={location} defaultCenter={mapCenter} />
              )}
           </div>

        </CardContent>
        <CardFooter className="flex flex-col gap-2">
          <Button type="submit" className="w-full" disabled={isSubmitting}>
            {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {isEditing ? 'Salvar Alterações' : 'Salvar Ocorrência'}
          </Button>
           {isEditing && (
            <Button variant="outline" className="w-full" onClick={() => setPage('occurrence-report')}>
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
