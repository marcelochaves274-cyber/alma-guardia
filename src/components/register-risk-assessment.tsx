'use client';

import { useState, useEffect, useCallback } from 'react';
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
import { Calendar as CalendarIcon, Loader2 } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { useFirestore, useUser } from '@/firebase';
import { doc, getDoc, addDoc, updateDoc, collection, serverTimestamp, Timestamp } from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';
import { Separator } from './ui/separator';
import { Badge } from './ui/badge';

interface RegisterRiskAssessmentProps {
  assessmentToEdit: any | null;
  setPage: (page: string) => void;
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


export function RegisterRiskAssessment({ assessmentToEdit, setPage }: RegisterRiskAssessmentProps) {
  const isEditing = !!assessmentToEdit;

  // Form states
  const [assessmentDate, setAssessmentDate] = useState<Date | undefined>();
  const [location, setLocation] = useState('');
  const [riskType, setRiskType] = useState('');
  const [taskDescription, setTaskDescription] = useState('');
  const [riskSource, setRiskSource] = useState('');
  const [effects, setEffects] = useState('');
  const [existingControls, setExistingControls] = useState('');
  const [recommendedControls, setRecommendedControls] = useState('');
  const [probability, setProbability] = useState('');
  const [consequence, setConsequence] = useState('');
  const [situation, setSituation] = useState(isEditing ? '' : 'finalizado');
  const [completionDate, setCompletionDate] = useState<Date | undefined>();


  // UI/Data loading states
  const [isCalendarOpen, setIsCalendarOpen] = useState(false);
  const [isCompletionCalendarOpen, setIsCompletionCalendarOpen] = useState(false);
  const [riskTypes, setRiskTypes] = useState<string[]>([]);
  const [locations, setLocations] = useState<string[]>([]);
  const [isLoadingTypes, setIsLoadingTypes] = useState(true);
  const [isLoadingLocations, setIsLoadingLocations] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const firestore = useFirestore();
  const { user } = useUser();
  const { toast } = useToast();

  // Populate form if we are editing
  useEffect(() => {
    if (isEditing && assessmentToEdit) {
      const date = assessmentToEdit.assessmentDate;
      const compDate = assessmentToEdit.completionDate;
      setAssessmentDate(date instanceof Timestamp ? date.toDate() : date);
      setCompletionDate(compDate instanceof Timestamp ? compDate.toDate() : compDate);
      setLocation(assessmentToEdit.location || '');
      setRiskType(assessmentToEdit.riskType || '');
      setTaskDescription(assessmentToEdit.taskDescription || '');
      setRiskSource(assessmentToEdit.riskSource || '');
      setEffects(assessmentToEdit.effects || '');
      setExistingControls(assessmentToEdit.existingControls || '');
      setRecommendedControls(assessmentToEdit.recommendedControls || '');
      setProbability(assessmentToEdit.probability || '');
      setConsequence(assessmentToEdit.consequence || '');
      setSituation(assessmentToEdit.situation || 'finalizado');
    }
  }, [isEditing, assessmentToEdit]);

  const getSettingsDocRef = useCallback((collectionName: string) => {
    if (!firestore || !user) return null;
    return doc(firestore, 'sgs_genius', user.uid, 'settings', collectionName);
  }, [firestore, user]);

  useEffect(() => {
    const fetchSelectOptions = async (docName: string, setData: (data: string[]) => void, setLoading: (loading: boolean) => void, field: 'types' | 'locations') => {
      const docRef = getSettingsDocRef(docName);
      if (!docRef) {
        setLoading(false);
        return;
      }
      try {
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
          const data = docSnap.data();
          setData(data[field] || []);
        }
      } catch (error) {
        console.error(`Error fetching ${field}:`, error);
        toast({
          variant: "destructive",
          title: "Erro ao carregar dados",
          description: `Não foi possível buscar ${field}.`
        });
      } finally {
        setLoading(false);
      }
    };
    fetchSelectOptions('occurrenceTypes', setRiskTypes, setIsLoadingTypes, 'types');
    fetchSelectOptions('locations', setLocations, setIsLoadingLocations, 'locations');
  }, [getSettingsDocRef, toast]);
  
  const resetForm = () => {
    setAssessmentDate(undefined);
    setLocation('');
    setRiskType('');
    setTaskDescription('');
    setRiskSource('');
    setEffects('');
    setExistingControls('');
    setRecommendedControls('');
    setProbability('');
    setConsequence('');
    setSituation('finalizado');
    setCompletionDate(undefined);
  }

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!firestore || !user) {
        toast({ variant: 'destructive', title: 'Erro', description: 'Você não está autenticado.' });
        return;
    }
    if (!assessmentDate) {
        toast({ variant: 'destructive', title: 'Campo obrigatório', description: 'Por favor, selecione a data da avaliação.' });
        return;
    }

    setIsSubmitting(true);
    
    const riskLevelData = getRiskLevel(Number(probability), Number(consequence));

    const assessmentData = {
        assessmentDate: Timestamp.fromDate(assessmentDate),
        location,
        riskType,
        taskDescription,
        riskSource,
        effects,
        existingControls,
        recommendedControls,
        probability,
        consequence,
        riskLevel: riskLevelData.score,
        userId: user.uid,
        situation,
        completionDate: completionDate && (situation === 'pendente' || situation === 'reaberto') ? Timestamp.fromDate(completionDate) : null,
    };

    try {
      if (isEditing && assessmentToEdit) {
        const docRef = doc(firestore, 'sgs_genius', user.uid, 'risk_assessments', assessmentToEdit.id);
        await updateDoc(docRef, {
          ...assessmentData,
          updatedAt: serverTimestamp()
        });
        toast({ title: 'Sucesso!', description: 'Avaliação de risco atualizada com sucesso.' });
        setPage('risk-assessment-report');
      } else {
        const assessmentsCollectionRef = collection(firestore, 'sgs_genius', user.uid, 'risk_assessments');
        await addDoc(assessmentsCollectionRef, {
            ...assessmentData,
            createdAt: serverTimestamp()
        });
        toast({ title: 'Sucesso!', description: 'Avaliação de risco registrada com sucesso.' });
        resetForm();
      }

    } catch (error) {
        console.error("Error saving assessment:", error);
        toast({ variant: 'destructive', title: 'Erro ao salvar', description: 'Não foi possível salvar a avaliação.'});
    } finally {
        setIsSubmitting(false);
    }
  };

  const riskLevel = getRiskLevel(Number(probability), Number(consequence));

  return (
    <Card className="w-full">
      <form onSubmit={handleSubmit}>
        <CardHeader>
          <CardTitle>{isEditing ? 'Editar Avaliação de Risco' : 'Registrar Avaliação de Risco'}</CardTitle>
          <CardDescription>
            {isEditing ? 'Altere os dados da avaliação abaixo.' : 'Preencha os campos para registrar uma nova avaliação de risco.'}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-8">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <div className="space-y-2">
              <Label htmlFor="assessment-date">Data da Avaliação</Label>
              <Popover open={isCalendarOpen} onOpenChange={setIsCalendarOpen}>
                <PopoverTrigger asChild>
                  <Button
                    variant={'outline'}
                    className={cn(
                      'w-full justify-start text-left font-normal',
                      !assessmentDate && 'text-muted-foreground'
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {assessmentDate ? (
                      format(assessmentDate, 'dd/MM/yyyy')
                    ) : (
                      <span>Escolha uma data</span>
                    )}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0">
                  <Calendar
                    mode="single"
                    selected={assessmentDate}
                    onSelect={(date) => {
                        if(date) setAssessmentDate(date);
                        setIsCalendarOpen(false);
                    }}
                    locale={ptBR}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            </div>
            <div className="space-y-2">
              <Label htmlFor="assessment-location">Local</Label>
              <Select name="assessmentLocation" required disabled={isLoadingLocations || locations.length === 0} onValueChange={setLocation} value={location}>
                <SelectTrigger id="assessment-location">
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
              <Label htmlFor="risk-type">Tipo de Risco</Label>
              <Select name="riskType" required disabled={isLoadingTypes || riskTypes.length === 0} onValueChange={setRiskType} value={riskType}>
                <SelectTrigger id="risk-type">
                  <SelectValue placeholder={
                    isLoadingTypes ? "Carregando..." : 
                    riskTypes.length === 0 ? "Nenhum tipo cadastrado" : "Selecione o tipo"
                  } />
                </SelectTrigger>
                <SelectContent>
                  {isLoadingTypes ? (
                    <div className="flex items-center justify-center p-2">
                      <Loader2 className="h-4 w-4 animate-spin" />
                    </div>
                  ) : (
                    riskTypes.map((type) => (
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
            <Label htmlFor="task-description">Descrição da Tarefa/Atividade</Label>
            <Textarea
              id="task-description"
              name="taskDescription"
              placeholder="Descreva a tarefa ou atividade que está sendo avaliada."
              value={taskDescription}
              onChange={(e) => setTaskDescription(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="risk-source">Risco(s) e Fonte(s) Geradora(s)</Label>
            <Textarea
              id="risk-source"
              name="riskSource"
              placeholder="Identifique os riscos e suas fontes."
              value={riskSource}
              onChange={(e) => setRiskSource(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="effects">Efeito(s) / Consequência(s)</Label>
            <Textarea
              id="effects"
              name="effects"
              placeholder="Descreva os possíveis efeitos e consequências."
              value={effects}
              onChange={(e) => setEffects(e.target.value)}
            />
          </div>
           
           <div className="space-y-2">
            <Label htmlFor="existing-controls">Controles Existentes</Label>
            <Textarea
              id="existing-controls"
              name="existingControls"
              placeholder="Liste os controles já implementados."
              value={existingControls}
              onChange={(e) => setExistingControls(e.target.value)}
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
                            <SelectValue placeholder="Selecione" />
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
                            <SelectValue placeholder="Selecione" />
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
            <Label htmlFor="recommended-controls">Controles Recomendados</Label>
            <Textarea
              id="recommended-controls"
              name="recommendedControls"
              placeholder="Descreva os controles recomendados para mitigar o risco."
              className="min-h-[100px]"
              value={recommendedControls}
              onChange={(e) => setRecommendedControls(e.target.value)}
            />
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
                    <Button variant="outline" type="button" onClick={() => setPage('risk-assessment-report')}>
                    Cancelar
                    </Button>
                )}
                <Button type="submit" disabled={isSubmitting}>
                    {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    {isEditing ? 'Salvar Alterações' : 'Salvar Avaliação'}
                </Button>
            </div>

        </CardContent>
      </form>
    </Card>
  );
}
