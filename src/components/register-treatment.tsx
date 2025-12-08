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
import { cn } from '@/lib/utils';
import { Calendar as CalendarIcon, Loader2, MapPin, X } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { useFirestore, useUser } from '@/firebase';
import { doc, getDoc, addDoc, updateDoc, collection, serverTimestamp, Timestamp } from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';
import Image from 'next/image';
import { Separator } from './ui/separator';
import { Badge } from './ui/badge';

type Marker = { x: number; y: number } | null;

interface RegisterTreatmentProps {
  treatmentToEdit: any | null;
  setPage: (page: string) => void;
  prefillData?: any | null;
}

const probabilityOptions = [
  { value: '1', label: '1 - Quase Improvável' },
  { value: '2', label: '2 - Improvável' },
  { value: '3', label: '3 - Pouco Provável' },
  { value: '4', label: '4 - Provável' },
  { value: '5', label: '5 - Quase Certo' },
];

const consequenceOptions = [
  { value: '1', label: '1 - Insignificante' },
  { value: '2', label: '2 - Baixa' },
  { value: '3', label: '3 - Moderada' },
  { value: '4', label: '4 - Alta' },
  { value: '5', label: '5 - Catastrófica' },
];

const getRiskLevel = (probability: number, consequence: number) => {
    const score = probability * consequence;
    if (score >= 15) return { label: 'Alta', color: 'bg-red-600 text-white', score };
    if (score >= 8) return { label: 'Média', color: 'bg-orange-500 text-white', score };
    if (score > 0) return { label: 'Baixa', color: 'bg-yellow-400 text-black', score };
    return { label: 'Não calculado', color: 'bg-muted text-muted-foreground', score: 0 };
};


export function RegisterTreatment({ treatmentToEdit, setPage, prefillData }: RegisterTreatmentProps) {
  const isEditing = !!treatmentToEdit;

  // Form states
  const [treatmentDate, setTreatmentDate] = useState<Date | undefined>(prefillData?.date ? (prefillData.date instanceof Timestamp ? prefillData.date.toDate() : prefillData.date) : new Date());
  const [treatmentLocation, setTreatmentLocation] = useState('');
  const [treatmentType, setTreatmentType] = useState('');
  const [description, setDescription] = useState('');
  const [proposedTreatment, setProposedTreatment] = useState('');
  const [actionTaken, setActionTaken] = useState('');
  const [marker, setMarker] = useState<Marker>(null);
  const [probability, setProbability] = useState('');
  const [consequence, setConsequence] = useState('');
  const [situation, setSituation] = useState(isEditing ? '' : 'pendente');
  const [completionDate, setCompletionDate] = useState<Date | undefined>();


  // UI/Data loading states
  const [isCalendarOpen, setIsCalendarOpen] = useState(false);
  const [isCompletionCalendarOpen, setIsCompletionCalendarOpen] = useState(false);
  const [treatmentTypes, setTreatmentTypes] = useState<string[]>([]);
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
      setTreatmentLocation(prefillData.location || '');
      setMarker(prefillData.mapMarker || null);
    }
  }, [prefillData]);

  // Populate form if we are editing
  useEffect(() => {
    if (isEditing && treatmentToEdit) {
      const date = treatmentToEdit.treatmentDate;
      const compDate = treatmentToEdit.completionDate;
      setTreatmentDate(date instanceof Timestamp ? date.toDate() : date);
      setCompletionDate(compDate instanceof Timestamp ? compDate.toDate() : compDate);
      setTreatmentLocation(treatmentToEdit.treatmentLocation || '');
      setTreatmentType(treatmentToEdit.treatmentType || '');
      setDescription(treatmentToEdit.description || '');
      setProposedTreatment(treatmentToEdit.proposedTreatment || '');
      setActionTaken(treatmentToEdit.actionTaken || '');
      setProbability(treatmentToEdit.probability || '');
      setConsequence(treatmentToEdit.consequence || '');
      setMarker(treatmentToEdit.mapMarker || null);
      setSituation(treatmentToEdit.situation || 'finalizado');
    }
  }, [isEditing, treatmentToEdit]);

  const getSettingsDocRef = useCallback((collectionName: string) => {
    if (!firestore || !user) return null;
    return doc(firestore, 'sgs_genius', user.uid, 'settings', collectionName);
  }, [firestore, user]);

  useEffect(() => {
    // Using occurrence types for now, this should be changed to treatment types
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
    fetchSelectOptions('occurrenceTypes', setTreatmentTypes, setIsLoadingTypes, 'tipos de risco');
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
  
  const resetForm = () => {
    setTreatmentDate(undefined);
    setTreatmentLocation('');
    setTreatmentType('');
    setDescription('');
    setProposedTreatment('');
    setActionTaken('');
    setProbability('');
    setConsequence('');
    setMarker(null);
    setSituation('finalizado');
    setCompletionDate(undefined);
  }

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!firestore || !user) {
        toast({ variant: 'destructive', title: 'Erro', description: 'Você não está autenticado.' });
        return;
    }
    if (!treatmentDate) {
        toast({ variant: 'destructive', title: 'Campo obrigatório', description: 'Por favor, selecione a data da identificação.' });
        return;
    }

    setIsSubmitting(true);
    
    const riskLevelData = getRiskLevel(Number(probability), Number(consequence));

    const treatmentData = {
        treatmentDate: Timestamp.fromDate(treatmentDate),
        treatmentLocation,
        treatmentType,
        description,
        proposedTreatment,
        actionTaken,
        probability,
        consequence,
        riskLevel: riskLevelData.score,
        mapMarker: marker,
        userId: user.uid,
        situation,
        completionDate: completionDate && (situation === 'pendente' || situation === 'reaberto') ? Timestamp.fromDate(completionDate) : null,
    };

    try {
      if (isEditing && treatmentToEdit) {
        const docRef = doc(firestore, 'sgs_genius', user.uid, 'risk_treatments', treatmentToEdit.id);
        await updateDoc(docRef, {
          ...treatmentData,
          updatedAt: serverTimestamp()
        });
        toast({ title: 'Sucesso!', description: 'Tratamento atualizado com sucesso.' });
        setPage('treatment-report');
      } else {
        const treatmentsCollectionRef = collection(firestore, 'sgs_genius', user.uid, 'risk_treatments');
        await addDoc(treatmentsCollectionRef, {
            ...treatmentData,
            createdAt: serverTimestamp()
        });
        toast({ title: 'Sucesso!', description: 'Tratamento de risco registrado com sucesso.' });
        resetForm();
      }

    } catch (error) {
        console.error("Error saving treatment:", error);
        toast({ variant: 'destructive', title: 'Erro ao salvar', description: 'Não foi possível salvar o tratamento de risco.'});
    } finally {
        setIsSubmitting(false);
    }
  };

  const riskLevel = getRiskLevel(Number(probability), Number(consequence));

  return (
    <Card className="w-full">
      <form onSubmit={handleSubmit}>
        <CardHeader>
          <CardTitle>{isEditing ? 'Editar Tratamento de Risco' : 'Registro de Tratamento de Risco'}</CardTitle>
          <CardDescription>
            {isEditing ? 'Altere os dados do tratamento abaixo.' : 'Preencha os campos abaixo para registrar um novo tratamento de risco.'}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-8">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <Label htmlFor="treatment-date">Data da Identificação</Label>
              <Popover open={isCalendarOpen} onOpenChange={setIsCalendarOpen}>
                <PopoverTrigger asChild>
                  <Button
                    variant={'outline'}
                    className={cn(
                      'w-full justify-start text-left font-normal',
                      !treatmentDate && 'text-muted-foreground'
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {treatmentDate ? (
                      format(treatmentDate, 'dd/MM/yyyy')
                    ) : (
                      <span>Escolha uma data</span>
                    )}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0">
                  <Calendar
                    mode="single"
                    selected={treatmentDate}
                    onSelect={(date) => {
                        if(date) setTreatmentDate(date);
                        setIsCalendarOpen(false);
                    }}
                    locale={ptBR}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            </div>
            <div className="space-y-2">
              <Label htmlFor="treatment-location">Local do Risco</Label>
              <Select name="treatmentLocation" required disabled={isLoadingLocations || locations.length === 0} onValueChange={setTreatmentLocation} value={treatmentLocation}>
                <SelectTrigger id="treatment-location">
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
              <Label htmlFor="treatment-type">Tipo de Risco</Label>
              <Select name="treatmentType" required disabled={isLoadingTypes || treatmentTypes.length === 0} onValueChange={setTreatmentType} value={treatmentType}>
                <SelectTrigger id="treatment-type">
                  <SelectValue placeholder={
                    isLoadingTypes ? "Carregando..." : 
                    treatmentTypes.length === 0 ? "Nenhum tipo cadastrado" : "Selecione o tipo"
                  } />
                </SelectTrigger>
                <SelectContent>
                  {isLoadingTypes ? (
                    <div className="flex items-center justify-center p-2">
                      <Loader2 className="h-4 w-4 animate-spin" />
                    </div>
                  ) : (
                    treatmentTypes.map((type) => (
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
            <Label htmlFor="description">Descrição do Risco</Label>
            <Textarea
              id="description"
              name="description"
              placeholder="Descreva o risco identificado."
              className="min-h-[100px]"
              required
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </div>

          <Separator />
          
          <div>
            <h3 className="text-lg font-semibold text-foreground mb-4">Nível de Risco (PxC)</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-end">
                <div className="space-y-2">
                    <Label htmlFor="probability">Probabilidade</Label>
                    <Select name="probability" required onValueChange={setProbability} value={probability}>
                        <SelectTrigger id="probability">
                            <SelectValue placeholder="Selecione a probabilidade" />
                        </SelectTrigger>
                        <SelectContent>
                            {probabilityOptions.map(opt => (
                                <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>
                <div className="space-y-2">
                    <Label htmlFor="consequence">Consequência</Label>
                    <Select name="consequence" required onValueChange={setConsequence} value={consequence}>
                        <SelectTrigger id="consequence">
                            <SelectValue placeholder="Selecione a consequência" />
                        </SelectTrigger>
                        <SelectContent>
                            {consequenceOptions.map(opt => (
                                <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>
                <div className="space-y-2">
                    <Label>Nível de Risco</Label>
                    <div className="flex items-center h-10">
                        <Badge className={cn("text-base px-4 py-2", riskLevel.color)}>
                            {riskLevel.label}
                        </Badge>
                    </div>
                </div>
            </div>
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="proposed-treatment">Tratamento Proposto</Label>
            <Textarea
              id="proposed-treatment"
              name="proposedTreatment"
              placeholder="Descreva o tratamento que foi proposto para mitigar o risco."
              className="min-h-[100px]"
              value={proposedTreatment}
              onChange={(e) => setProposedTreatment(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="action-taken">Ação Realizada</Label>
            <Textarea
              id="action-taken"
              name="actionTaken"
              placeholder="Descreva a ação que foi efetivamente realizada."
              className="min-h-[100px]"
              value={actionTaken}
              onChange={(e) => setActionTaken(e.target.value)}
            />
          </div>
          
          <Separator />
           <div className="space-y-4">
              <div className="flex justify-between items-start">
                  <div>
                      <h3 className="text-lg font-semibold text-foreground">Localização no Mapa</h3>
                      <p className="text-sm text-muted-foreground">
                          Clique no mapa para marcar o ponto exato da identificação do risco.
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
                Importante: Se a imagem do mapa for alterada futuramente, as marcações de riscos já salvas não serão atualizadas para a nova imagem.
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
                      alt="Mapa de tratamentos"
                      fill
                      style={{objectFit:"cover"}}
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
                        aria-label="Marcador de tratamento"
                      >
                         <MapPin className="h-8 w-8 fill-red-500 stroke-white stroke-2 drop-shadow-lg" />
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
           
           <Separator/>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-end">
                <div className="space-y-2">
                    <Label htmlFor="situation">Situação</Label>
                    <Select name="situation" onValueChange={setSituation} value={situation}>
                        <SelectTrigger id="situation">
                            <SelectValue placeholder="Selecione a situação" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="pendente">Pendente</SelectItem>
                            <SelectItem value="finalizado">Finalizado</SelectItem>
                            <SelectItem value="reaberto">Reaberto</SelectItem>
                        </SelectContent>
                    </Select>
                </div>
                {(situation === 'pendente' || situation === 'reaberto') && (
                  <div className="space-y-2">
                      <Label htmlFor="completion-date">Data para Conclusão</Label>
                      <Popover open={isCompletionCalendarOpen} onOpenChange={setIsCompletionCalendarOpen}>
                          <PopoverTrigger asChild>
                          <Button
                              variant={'outline'}
                              className={cn(
                              'w-full justify-start text-left font-normal',
                              !completionDate && 'text-muted-foreground'
                              )}
                          >
                              <CalendarIcon className="mr-2 h-4 w-4" />
                              {completionDate ? (
                              format(completionDate, 'dd/MM/yyyy')
                              ) : (
                              <span>Selecione a data</span>
                              )}
                          </Button>
                          </PopoverTrigger>
                          <PopoverContent className="w-auto p-0">
                          <Calendar
                              mode="single"
                              selected={completionDate}
                              onSelect={(date) => {
                                  if(date) setCompletionDate(date);
                                  setIsCompletionCalendarOpen(false);
                              }}
                              locale={ptBR}
                              initialFocus
                          />
                          </PopoverContent>
                      </Popover>
                  </div>
                )}
            </div>

            <div className="flex justify-end gap-4 pt-4">
                {isEditing && (
                    <Button variant="outline" type="button" onClick={() => setPage('treatment-report')}>
                    Cancelar
                    </Button>
                )}
                <Button type="submit" disabled={isSubmitting}>
                    {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    {isEditing ? 'Salvar Alterações' : 'Salvar Tratamento'}
                </Button>
            </div>

        </CardContent>
      </form>
    </Card>
  );
}
