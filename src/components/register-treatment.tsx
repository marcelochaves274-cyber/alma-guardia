
'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  CardFooter,
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
import { Calendar as CalendarIcon, Loader2 } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { useFirestore, useUser } from '@/firebase';
import { doc, getDoc, addDoc, updateDoc, collection, serverTimestamp, Timestamp } from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';
import { Separator } from './ui/separator';
import { Badge } from './ui/badge';
import { HelpTooltip } from './ui/help-tooltip';
import { MapSelector, type LocationData } from './map-selector';
import { ErrorModal } from './ErrorModal';


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
  const [treatmentDate, setTreatmentDate] = useState<Date | undefined>(
    treatmentToEdit?.treatmentDate ? (treatmentToEdit.treatmentDate instanceof Timestamp ? treatmentToEdit.treatmentDate.toDate() : treatmentToEdit.treatmentDate) :
    (prefillData?.date ? (prefillData.date instanceof Timestamp ? prefillData.date.toDate() : prefillData.date) : new Date())
  );
  const [treatmentLocation, setTreatmentLocation] = useState(treatmentToEdit?.treatmentLocation || prefillData?.location || '');
  const [treatmentType, setTreatmentType] = useState(treatmentToEdit?.treatmentType || '');
  const [description, setDescription] = useState(treatmentToEdit?.description || prefillData?.description || '');
  const [proposedTreatment, setProposedTreatment] = useState(treatmentToEdit?.proposedTreatment || '');
  const [actionTaken, setActionTaken] = useState(treatmentToEdit?.actionTaken || '');
  const [location, setLocation] = useState<LocationData | null>(null);
  const [probability, setProbability] = useState(treatmentToEdit?.probability || '');
  const [consequence, setConsequence] = useState(treatmentToEdit?.consequence || '');
  const [situation, setSituation] = useState(treatmentToEdit?.situation || 'pendente');
  const [completionDate, setCompletionDate] = useState<Date | undefined>(
    treatmentToEdit?.completionDate instanceof Timestamp 
      ? treatmentToEdit.completionDate.toDate() 
      : undefined
  );


  // UI/Data loading states
  const [isCalendarOpen, setIsCalendarOpen] = useState(false);
  const [isCompletionCalendarOpen, setIsCompletionCalendarOpen] = useState(false);
  const [treatmentTypes, setTreatmentTypes] = useState<string[]>([]);
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
      setTreatmentLocation(prefillData.location || '');
      // Set map location from prefill
      if (prefillData.mapLocation) {
        setLocation(prefillData.mapLocation);
      } else if (prefillData.mapMarker) { // Backward compatibility
        setLocation({
          mapType: 'ludico',
          ludico: prefillData.mapMarker,
        });
      }
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
      
      // Handle both new `location` and old `mapMarker` fields
      if (treatmentToEdit.location) {
        setLocation(treatmentToEdit.location);
      } else if (treatmentToEdit.mapMarker) {
        setLocation({
          mapType: 'ludico',
          ludico: treatmentToEdit.mapMarker,
        });
      } else {
        setLocation(null);
      }
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
    setTreatmentDate(undefined);
    setTreatmentLocation('');
    setTreatmentType('');
    setDescription('');
    setProposedTreatment('');
    setActionTaken('');
    setProbability('');
    setConsequence('');    
    setLocation(null);
    setSituation('finalizado');
    setCompletionDate(undefined);
  }

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!firestore || !user) {
        toast({ variant: 'destructive', title: 'Erro', description: 'Você não está autenticado.' });
        return;
    }
    
    // Validação manual unificada, incluindo o mapa
    if (!description || !treatmentDate || !treatmentLocation || !treatmentType || !probability || !consequence || (!location?.ludico && !location?.geo)) {
      setIsErrorOpen(true);
      setIsSubmitting(false);
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
        location: location,
        userId: user.uid,
        situation,
        completionDate: completionDate && situation === 'pendente' ? Timestamp.fromDate(completionDate) : null,
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
        // If created from a notice, update the notice status
        if (prefillData?.noticeId) {
          const noticeRef = doc(firestore, 'sgs_genius', user.uid, 'notices', prefillData.noticeId);
          await updateDoc(noticeRef, { status: 'finalizado' });
        }
        toast({ title: 'Sucesso!', description: 'Tratamento de risco registrado com sucesso.' });
        resetForm();
      }

    } catch (error) {
        console.error("ERRO DETALHADO:", error);
        setIsErrorOpen(true);
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
              <Select name="treatmentLocation" disabled={isLoadingLocations || locations.length === 0} onValueChange={setTreatmentLocation} value={treatmentLocation}>
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
              <Select name="treatmentType" disabled={isLoadingTypes || treatmentTypes.length === 0} onValueChange={setTreatmentType} value={treatmentType}>
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
            <div className="flex items-center gap-2">
              <Label htmlFor="description">Descrição do Risco</Label>
              <HelpTooltip content="Descreva o risco que foi identificado, incluindo a fonte geradora, a atividade relacionada e o potencial de dano." />
            </div>
            <Textarea
              id="description"
              name="description"
              placeholder="Descreva o risco identificado."
              className="min-h-[100px]"
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
                    <Select name="probability" onValueChange={setProbability} value={probability}>
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
                    <Select name="consequence" onValueChange={setConsequence} value={consequence}>
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
             <div className="flex items-center gap-2">
              <Label htmlFor="proposed-treatment">Tratamento Proposto</Label>
              <HelpTooltip content="Detalhe as medidas que foram sugeridas para eliminar ou reduzir o risco a um nível aceitável." />
            </div>
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
             <div className="flex items-center gap-2">
              <Label htmlFor="action-taken">Ação Realizada</Label>
               <HelpTooltip content="Descreva a ação que foi efetivamente implementada para tratar o risco. Seja claro e objetivo." />
            </div>
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
              <h3 className="text-lg font-semibold text-foreground">Localização no Mapa</h3>
              {isEditing && !treatmentToEdit?.location && !treatmentToEdit?.mapMarker && (
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
                  onLocationChange={setLocation} 
                  initialLocation={location} 
                  defaultCenter={mapCenter} />
              )}
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
                        </SelectContent>
                    </Select>
                </div>
                {situation === 'pendente' && (
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
        </CardContent>
        <CardFooter className="flex flex-col gap-2">
          <Button type="submit" className="w-full" disabled={isSubmitting}>
            {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {isEditing ? 'Salvar Alterações' : 'Salvar Tratamento'}
          </Button>
           {isEditing && (
            <Button variant="outline" className="w-full" onClick={() => setPage('treatment-report')}>
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
