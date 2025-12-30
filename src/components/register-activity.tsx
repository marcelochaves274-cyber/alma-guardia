
'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  CardFooter
} from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useFirestore, useUser } from '@/firebase';
import { doc, getDoc, addDoc, collection, serverTimestamp, updateDoc } from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';
import { Loader2 } from 'lucide-react';
import type { PopDocument } from './manage-pops';
import type { TcrDocument } from './manage-tcrs';
import { SheetFilter } from './sheet-filter';

interface RegisterActivityProps {
  activityToEdit: any | null;
  setPage: (page: string) => void;
}

export function RegisterActivity({ activityToEdit, setPage }: RegisterActivityProps) {
  const isEditing = !!activityToEdit;

  const [activityName, setActivityName] = useState('');
  const [pop, setPop] = useState('');
  const [tcr, setTcr] = useState('');
  const [riskAssessmentLocations, setRiskAssessmentLocations] = useState<string[]>([]);
  
  const [allPops, setAllPops] = useState<PopDocument[]>([]);
  const [allTcrs, setAllTcrs] = useState<TcrDocument[]>([]);
  const [locations, setLocations] = useState<string[]>([]);

  const [isLoadingPops, setIsLoadingPops] = useState(true);
  const [isLoadingTcrs, setIsLoadingTcrs] = useState(true);
  const [isLoadingLocations, setIsLoadingLocations] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const firestore = useFirestore();
  const { user } = useUser();
  const { toast } = useToast();

  useEffect(() => {
    if (activityToEdit) {
      setActivityName(activityToEdit.activityName || '');
      setPop(activityToEdit.pop || '');
      setTcr(activityToEdit.tcr || '');
      setRiskAssessmentLocations(Array.isArray(activityToEdit.riskAssessmentLocation) ? activityToEdit.riskAssessmentLocation : []);
    } else {
        // Reset form when not in edit mode or when activityToEdit is cleared
        setActivityName('');
        setPop('');
        setTcr('');
        setRiskAssessmentLocations([]);
    }
  }, [activityToEdit]);

  const getSettingsDocRef = useCallback((collectionName: string) => {
    if (!firestore || !user) return null;
    return doc(firestore, 'sgs_genius', user.uid, 'settings', collectionName);
  }, [firestore, user]);

  useEffect(() => {
    const fetchPops = async () => {
      const docRef = getSettingsDocRef('pops');
      if (!docRef) {
        setIsLoadingPops(false);
        return;
      }
      try {
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
          setAllPops((docSnap.data().documents || []) as PopDocument[]);
        }
      } catch (error) {
        console.error("Error fetching POPs:", error);
      } finally {
        setIsLoadingPops(false);
      }
    };
    
    const fetchTcrs = async () => {
      const docRef = getSettingsDocRef('tcrs');
      if (!docRef) {
        setIsLoadingTcrs(false);
        return;
      }
      try {
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
          setAllTcrs((docSnap.data().documents || []) as TcrDocument[]);
        }
      } catch (error) {
        console.error("Error fetching TCRs:", error);
      } finally {
        setIsLoadingTcrs(false);
      }
    };


    const fetchLocations = async () => {
      const docRef = getSettingsDocRef('locations');
      if (!docRef) {
        setIsLoadingLocations(false);
        return;
      }
      try {
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
          setLocations(docSnap.data().locations || []);
        }
      } catch (error) {
        console.error("Error fetching locations:", error);
      } finally {
        setIsLoadingLocations(false);
      }
    };
    
    fetchPops();
    fetchTcrs();
    fetchLocations();
  }, [getSettingsDocRef]);
  
  const resetForm = () => {
    setActivityName('');
    setPop('');
    setTcr('');
    setRiskAssessmentLocations([]);
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!firestore || !user) {
        toast({ variant: 'destructive', title: 'Erro', description: 'Você não está autenticado.' });
        return;
    }

    if (!activityName || !pop || !tcr || riskAssessmentLocations.length === 0) {
        toast({ variant: 'destructive', title: 'Campos obrigatórios', description: 'Por favor, preencha todos os campos.' });
        return;
    }

    setIsSubmitting(true);
    
    const activityData = {
        userId: user.uid,
        activityName,
        pop,
        tcr,
        riskAssessmentLocation: riskAssessmentLocations,
    };
    
    try {
      if (isEditing && activityToEdit) {
        const docRef = doc(firestore, 'sgs_genius', user.uid, 'activities', activityToEdit.id);
        await updateDoc(docRef, { ...activityData, updatedAt: serverTimestamp() });
        toast({ title: 'Sucesso!', description: 'Atividade atualizada com sucesso.' });
        setPage('activity-report');
      } else {
        const collectionRef = collection(firestore, 'sgs_genius', user.uid, 'activities');
        await addDoc(collectionRef, { ...activityData, createdAt: serverTimestamp() });
        toast({ title: 'Sucesso!', description: 'Atividade registrada com sucesso.' });
        resetForm();
      }
    } catch (error) {
        console.error("Error saving activity:", error);
        toast({ variant: 'destructive', title: 'Erro ao salvar', description: 'Não foi possível salvar a atividade.'});
    } finally {
        setIsSubmitting(false);
    }
  };
  
  const isLoading = isLoadingPops || isLoadingTcrs || isLoadingLocations;

  const popOptions = allPops.map(doc => ({
    label: doc.name.replace(/^POP\s/, ''),
    value: doc.name
  }));

  return (
    <Card className="w-full max-w-2xl mx-auto">
      <form onSubmit={handleSubmit}>
        <CardHeader>
          <CardTitle>{isEditing ? 'Editar Atividade' : 'Registrar Atividade'}</CardTitle>
          <CardDescription>
            {isEditing ? 'Altere os dados da atividade abaixo.' : 'Selecione a atividade, POP, TCR e avaliação de risco para registrar.'}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
            <div className="space-y-2">
                <Label htmlFor="activity-name">Atividade</Label>
                <Select
                    name="activityName"
                    required
                    onValueChange={(value) => {
                      const selectedPop = allPops.find(p => p.name === value);
                      if(selectedPop) {
                        setActivityName(selectedPop.name);
                        setPop(selectedPop.name);
                      }
                    }}
                    value={activityName}
                    disabled={isLoadingPops || allPops.length === 0}
                >
                    <SelectTrigger id="activity-name">
                    <SelectValue placeholder={
                        isLoadingPops ? "Carregando..." : 
                        allPops.length === 0 ? "Nenhuma atividade cadastrada" : "Selecione a atividade"
                    } />
                    </SelectTrigger>
                    <SelectContent>
                        {popOptions.map((opt) => (
                          <SelectItem key={opt.value} value={opt.value}>
                            {opt.label}
                          </SelectItem>
                        ))}
                    </SelectContent>
                </Select>
            </div>
            
            <div className="space-y-2">
                <Label htmlFor="pop">POP</Label>
                <Select name="pop" required onValueChange={setPop} value={pop} disabled={isLoadingPops || allPops.length === 0}>
                    <SelectTrigger id="pop">
                    <SelectValue placeholder={isLoadingPops ? "Carregando..." : "Selecione o POP"} />
                    </SelectTrigger>
                    <SelectContent>
                        {allPops.map((doc) => (
                            <SelectItem key={doc.name} value={doc.name}>{doc.name}</SelectItem>
                        ))}
                    </SelectContent>
                </Select>
            </div>
            
            <div className="space-y-2">
                <Label htmlFor="tcr">TCR</Label>
                <Select name="tcr" required onValueChange={setTcr} value={tcr} disabled={isLoadingTcrs || allTcrs.length === 0}>
                    <SelectTrigger id="tcr">
                    <SelectValue placeholder={isLoadingTcrs ? "Carregando..." : "Selecione o TCR"} />
                    </SelectTrigger>
                    <SelectContent>
                        {allTcrs.map((doc) => (
                            <SelectItem key={doc.name} value={doc.name}>{doc.name}</SelectItem>
                        ))}
                    </SelectContent>
                </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="risk-assessment">Avaliação de Risco (Locais)</Label>
                <SheetFilter
                    title='Selecionar Locais de Risco'
                    options={locations.map(l => ({ value: l, label: l }))}
                    selected={riskAssessmentLocations}
                    onChange={setRiskAssessmentLocations}
                    disabled={isLoading || locations.length === 0}
                    buttonText={isLoading ? "Carregando..." : locations.length === 0 ? "Nenhuma avaliação cadastrada" : "Selecione o(s) local(is) da avaliação"}
                />
            </div>

        </CardContent>
        <CardFooter className="flex justify-end gap-2">
            {isEditing && (
              <Button variant="outline" type="button" onClick={() => setPage('activity-report')}>
                Cancelar
              </Button>
            )}
            <Button type="submit" disabled={isSubmitting || isLoading}>
                {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {isEditing ? 'Salvar Alterações' : 'Registrar'}
            </Button>
        </CardFooter>
      </form>
    </Card>
  );
}
