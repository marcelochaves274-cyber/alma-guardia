
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
import { doc, getDoc } from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';
import { Loader2 } from 'lucide-react';
import type { PopDocument } from './manage-pops';

export function RegisterActivity() {
  const [activityName, setActivityName] = useState('');
  
  const [allDocs, setAllDocs] = useState<PopDocument[]>([]);
  const [isLoadingDocs, setIsLoadingDocs] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const firestore = useFirestore();
  const { user } = useUser();
  const { toast } = useToast();

  const getSettingsDocRef = useCallback(() => {
    if (!firestore || !user) return null;
    return doc(firestore, 'sgs_genius', user.uid, 'settings', 'pops');
  }, [firestore, user]);

  useEffect(() => {
    const fetchDocs = async () => {
      const docRef = getSettingsDocRef();
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
        toast({
          variant: "destructive",
          title: "Erro ao carregar",
          description: "Não foi possível buscar as atividades cadastradas.",
        });
      } finally {
        setIsLoadingDocs(false);
      }
    };
    fetchDocs();
  }, [getSettingsDocRef, toast]);
  
  const resetForm = () => {
    setActivityName('');
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!firestore || !user) {
        toast({ variant: 'destructive', title: 'Erro', description: 'Você não está autenticado.' });
        return;
    }

    if (!activityName) {
        toast({ variant: 'destructive', title: 'Campo obrigatório', description: 'Por favor, selecione uma atividade.' });
        return;
    }

    setIsSubmitting(true);
    
    // In a real scenario, you'd save this activity record to a new collection
    // For now, we'll just log it and show a toast
    console.log({
        activityName,
        registeredAt: new Date(),
        userId: user.uid,
    });
    
    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 1000));

    toast({ title: 'Sucesso!', description: 'Atividade registrada (simulação).' });
    resetForm();
    setIsSubmitting(false);
  };

  return (
    <Card className="w-full max-w-2xl mx-auto">
      <form onSubmit={handleSubmit}>
        <CardHeader>
          <CardTitle>Registrar Atividade</CardTitle>
          <CardDescription>
            Selecione a atividade que está sendo realizada.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
            <div className="space-y-2">
                <Label htmlFor="activity-name" className='text-base'>Atividade</Label>
                <Select
                    name="activityName"
                    required
                    onValueChange={setActivityName}
                    value={activityName}
                    disabled={isLoadingDocs || allDocs.length === 0}
                >
                    <SelectTrigger id="activity-name">
                    <SelectValue placeholder={
                        isLoadingDocs ? "Carregando..." : 
                        allDocs.length === 0 ? "Nenhuma atividade cadastrada" : "Selecione a atividade"
                    } />
                    </SelectTrigger>
                    <SelectContent>
                    {isLoadingDocs ? (
                        <div className="flex items-center justify-center p-2">
                        <Loader2 className="h-4 w-4 animate-spin" />
                        </div>
                    ) : (
                        allDocs.map((doc) => (
                        <SelectItem key={doc.name} value={doc.name}>
                            {doc.name.replace(/^POP\/TCR\s/, '')}
                        </SelectItem>
                        ))
                    )}
                    </SelectContent>
                </Select>
            </div>

            {/* Other fields for the activity registration would go here */}

        </CardContent>
        <CardFooter>
            <Button type="submit" className="w-full" disabled={isSubmitting || !activityName}>
                {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Registrar
            </Button>
        </CardFooter>
      </form>
    </Card>
  );
}
