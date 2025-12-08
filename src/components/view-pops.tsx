'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useFirestore, useUser } from '@/firebase';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';
import { Loader2 } from 'lucide-react';
import type { PopDocument } from './manage-pops';

export function ViewPops() {
  const firestore = useFirestore();
  const { user } = useUser();
  const { toast } = useToast();

  const [pops, setPops] = useState<PopDocument[]>([]);
  const [selectedPopName, setSelectedPopName] = useState<string | null>(null);
  const [popContent, setPopContent] = useState('');
  const [isLoadingPops, setIsLoadingPops] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  const getSettingsDocRef = useCallback(() => {
    if (!firestore || !user) return null;
    return doc(firestore, 'sgs_genius', user.uid, 'settings', 'pops');
  }, [firestore, user]);

  useEffect(() => {
    const fetchPops = async () => {
      const docRef = getSettingsDocRef();
      if (!docRef) {
        setIsLoadingPops(false);
        return;
      }
      try {
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
          const data = docSnap.data();
          const fetchedPops = (data.documents || []).map((item: any) =>
            typeof item === 'string' ? { name: item, content: '' } : item
          );
          setPops(fetchedPops);
        }
      } catch (error) {
        console.error("Error fetching POPs:", error);
        toast({
          variant: "destructive",
          title: "Erro ao carregar",
          description: "Não foi possível buscar os POPs cadastrados.",
        });
      } finally {
        setIsLoadingPops(false);
      }
    };
    fetchPops();
  }, [getSettingsDocRef, toast]);

  const handleSelectPop = (popName: string) => {
    setSelectedPopName(popName);
    const selected = pops.find(p => p.name === popName);
    setPopContent(selected?.content || '');
  };

  const handleSaveContent = async () => {
    if (!selectedPopName) return;

    const docRef = getSettingsDocRef();
    if (!docRef) {
      toast({ variant: 'destructive', title: 'Erro', description: 'Usuário não autenticado.' });
      return;
    }

    setIsSaving(true);
    try {
      const updatedPops = pops.map(p =>
        p.name === selectedPopName ? { ...p, content: popContent } : p
      );
      await setDoc(docRef, { documents: updatedPops });
      setPops(updatedPops); // Update local state
      toast({
        title: 'Sucesso!',
        description: `Conteúdo do ${selectedPopName} foi salvo.`,
      });
    } catch (error) {
      console.error("Error saving POP content:", error);
      toast({
        variant: 'destructive',
        title: 'Erro ao salvar',
        description: 'Não foi possível salvar o conteúdo do POP.',
      });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle>Procedimentos Operacionais Padrão (POPs)</CardTitle>
        <CardDescription>
          Selecione um documento para visualizar ou editar seu conteúdo.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="space-y-2">
          <Select
            onValueChange={handleSelectPop}
            disabled={isLoadingPops || pops.length === 0}
          >
            <SelectTrigger>
              <SelectValue placeholder={
                isLoadingPops ? "Carregando POPs..." :
                pops.length === 0 ? "Nenhum POP cadastrado" : "Selecione um documento"
              } />
            </SelectTrigger>
            <SelectContent>
              {isLoadingPops ? (
                <div className="flex items-center justify-center p-2">
                  <Loader2 className="h-4 w-4 animate-spin" />
                </div>
              ) : (
                pops.map((pop) => (
                  <SelectItem key={pop.name} value={pop.name}>
                    {pop.name}
                  </SelectItem>
                ))
              )}
            </SelectContent>
          </Select>
        </div>

        {selectedPopName && (
          <div className="space-y-2">
            <Textarea
              value={popContent}
              onChange={(e) => setPopContent(e.target.value)}
              placeholder={`Digite o conteúdo do ${selectedPopName} aqui...`}
              className="min-h-[400px] text-base"
              disabled={isSaving}
            />
          </div>
        )}
      </CardContent>
      {selectedPopName && (
        <CardFooter>
          <Button onClick={handleSaveContent} disabled={isSaving}>
            {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {isSaving ? 'Salvando...' : 'Salvar Conteúdo'}
          </Button>
        </CardFooter>
      )}
    </Card>
  );
}
