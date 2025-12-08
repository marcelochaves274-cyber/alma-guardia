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
import { doc, getDoc, addDoc, collection, serverTimestamp } from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';
import { Loader2 } from 'lucide-react';
import type { PopDocument } from './manage-pops';

export function RegisterActivity() {
  const [activityName, setActivityName] = useState('');
  const [pop, setPop] = useState('');
  const [tcr, setTcr] = useState('');
  const [riskAssessmentLocation, setRiskAssessmentLocation] = useState('');
  
  const [allDocs, setAllDocs] = useState<PopDocument[]>([]);
  const [locations, setLocations] = useState<string[]>([]);

  const [isLoadingDocs, setIsLoadingDocs] = useState(true);
  const [isLoadingLocations, setIsLoadingLocations] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const firestore = useFirestore();
  const { user } = useUser();
  const { toast } = useToast();

  const getSettingsDocRef = useCallback((collectionName: string) => {
    if (!firestore || !user) return null;
    return doc(firestore, 'sgs_genius', user.uid, 'settings', collectionName);
  }, [firestore, user]);

  useEffect(() => {
    const fetchDocs = async () => {
      const docRef = getSettingsDocRef('pops');
      if (!docRef) {
        setIsLoadingDocs(false);
        return;
      }
      try {
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
          const data = docSnap.data();
          const fetchedDocs = (data.documents || []).map((item: any): PopDocument => {
            return {
              name: item.name || '',
              popContent: item.popContent || '',
              tcrContent: item.tcrContent || '',
            };
          });
          setAllDocs(fetchedDocs);
        }
      } catch (error) {
        console.error("Error fetching documents:", error);
      } finally {
        setIsLoadingDocs(false);
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
          const data = docSnap.data();
          setLocations(data.locations || []);
        }
      } catch (error) {
        console.error("Error fetching locations:", error);
      } finally {
        setIsLoadingLocations(false);
      }
    };
    
    fetchDocs();
    fetchLocations();
  }, [getSettingsDocRef]);
  
  const resetForm = () => {
    setActivityName('');
    setPop('');
    setTcr('');
    setRiskAssessmentLocation('');
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!firestore || !user) {
        toast({ variant: 'destructive', title: 'Erro', description: 'Você não está autenticado.' });
        return;
    }

    if (!activityName || !pop || !tcr || !riskAssessmentLocation) {
        toast({ variant: 'destructive', title: 'Campos obrigatórios', description: 'Por favor, preencha todos os campos.' });
        return;
    }

    setIsSubmitting(true);
    
    const activityData = {
        userId: user.uid,
        activityName,
        pop,
        tcr,
        riskAssessmentLocation,
        createdAt: serverTimestamp(),
    };
    
    try {
        const collectionRef = collection(firestore, 'sgs_genius', user.uid, 'activities');
        await addDoc(collectionRef, activityData);
        toast({ title: 'Sucesso!', description: 'Atividade registrada com sucesso.' });
        resetForm();
    } catch (error) {
        console.error("Error saving activity:", error);
        toast({ variant: 'destructive', title: 'Erro ao salvar', description: 'Não foi possível registrar a atividade.'});
    } finally {
        setIsSubmitting(false);
    }
  };
  
  const isLoading = isLoadingDocs || isLoadingLocations;

  return (
    <Card className="w-full max-w-2xl mx-auto">
      <form onSubmit={handleSubmit}>
        <CardHeader>
          <CardTitle>Registrar Atividade</CardTitle>
          <CardDescription>
            Selecione a atividade, POP, TCR e avaliação de risco para registrar.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
            <div className="space-y-2">
                <Label htmlFor="activity-name">Atividade</Label>
                <Select
                    name="activityName"
                    required
                    onValueChange={setActivityName}
                    value={activityName}
                    disabled={isLoading || allDocs.length === 0}
                >
                    <SelectTrigger id="activity-name">
                    <SelectValue placeholder={
                        isLoading ? "Carregando..." : 
                        allDocs.length === 0 ? "Nenhuma atividade cadastrada" : "Selecione a atividade"
                    } />
                    </SelectTrigger>
                    <SelectContent>
                        {allDocs.map((doc) => (
                        <SelectItem key={doc.name} value={doc.name}>
                            {doc.name.replace(/^POP\/TCR\s/, '')}
                        </SelectItem>
                        ))}
                    </SelectContent>
                </Select>
            </div>
            
            <div className="space-y-2">
                <Label htmlFor="pop">POP</Label>
                <Select name="pop" required onValueChange={setPop} value={pop} disabled={isLoading || allDocs.length === 0}>
                    <SelectTrigger id="pop">
                    <SelectValue placeholder={isLoading ? "Carregando..." : "Selecione o POP"} />
                    </SelectTrigger>
                    <SelectContent>
                        {allDocs.map((doc) => (
                            <SelectItem key={doc.name} value={doc.name}>{doc.name}</SelectItem>
                        ))}
                    </SelectContent>
                </Select>
            </div>
            
            <div className="space-y-2">
                <Label htmlFor="tcr">TCR</Label>
                <Select name="tcr" required onValueChange={setTcr} value={tcr} disabled={isLoading || allDocs.length === 0}>
                    <SelectTrigger id="tcr">
                    <SelectValue placeholder={isLoading ? "Carregando..." : "Selecione o TCR"} />
                    </SelectTrigger>
                    <SelectContent>
                        {allDocs.map((doc) => (
                            <SelectItem key={doc.name} value={doc.name}>{doc.name}</SelectItem>
                        ))}
                    </SelectContent>
                </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="risk-assessment">Avaliação de Risco</Label>
              <Select name="riskAssessmentLocation" required disabled={isLoading || locations.length === 0} onValueChange={setRiskAssessmentLocation} value={riskAssessmentLocation}>
                <SelectTrigger id="risk-assessment">
                  <SelectValue placeholder={isLoading ? "Carregando..." : locations.length === 0 ? "Nenhuma avaliação cadastrada" : "Selecione o local da avaliação"} />
                </SelectTrigger>
                <SelectContent>
                    {locations.map((loc) => (
                        <SelectItem key={loc} value={loc}>
                            {loc}
                        </SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </div>

        </CardContent>
        <CardFooter>
            <Button type="submit" className="w-full" disabled={isSubmitting || isLoading}>
                {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Registrar
            </Button>
        </CardFooter>
      </form>
    </Card>
  );
}
