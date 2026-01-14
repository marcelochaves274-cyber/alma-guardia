
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
import { Loader2, Pencil } from 'lucide-react';
import type { PopDocument } from './manage-pops';
import { useProfile } from '@/context/profile-context';

export function ViewPops() {
  const firestore = useFirestore();
  const { user } = useUser();
  const { toast } = useToast();
  const { profile } = useProfile();

  const [allDocs, setAllDocs] = useState<PopDocument[]>([]);
  const [selectedPopName, setSelectedPopName] = useState<string>("");
  const [popContent, setPopContent] = useState('');
  const [isLoadingDocs, setIsLoadingDocs] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isEditing, setIsEditing] = useState(false);

  const getSettingsDocRef = useCallback(() => {
    if (!firestore || !user) return null;
    return doc(firestore, 'sgs_genius', user.uid, 'settings', 'pops');
  }, [firestore, user]);

  useEffect(() => {
    const fetchDocs = async () => {
      setIsLoadingDocs(true);
      const docRef = getSettingsDocRef();
      if (!docRef) {
        setIsLoadingDocs(false);
        return;
      }
      try {
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
          const data = docSnap.data();
          if (data && data.documents) {
            const fetchedDocs = (data.documents || []).map((item: any): PopDocument => {
                return {
                    name: item.name || '',
                    popContent: item.popContent || 'Seu texto aqui',
                };
            });
            setAllDocs(fetchedDocs);
          }
        }
      } catch (error) {
        console.error("Error fetching documents:", error);
        toast({
          variant: "destructive",
          title: "Erro ao carregar",
          description: "Não foi possível buscar os documentos cadastrados.",
        });
      } finally {
        setIsLoadingDocs(false);
      }
    };
    if(user) {
      fetchDocs();
    }
  }, [getSettingsDocRef, toast, user]);

  const handleSelectPop = (popName: string) => {
    const selected = allDocs.find(p => p.name === popName);
    if (selected) {
        setSelectedPopName(popName);
        setPopContent(selected.popContent || 'Seu texto aqui');
    }
    setIsEditing(false);
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
      const updatedDocs = allDocs.map(p =>
        p.name === selectedPopName ? { ...p, popContent: popContent } : p
      );
      
      await setDoc(docRef, { documents: updatedDocs });
      setAllDocs(updatedDocs); 
      toast({
        title: 'Sucesso!',
        description: `Conteúdo do ${selectedPopName} foi salvo.`,
      });
      setIsEditing(false);
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
            disabled={isLoadingDocs || allDocs.length === 0}
            value={selectedPopName}
          >
            <SelectTrigger>
              <SelectValue placeholder={
                isLoadingDocs ? "Carregando POPs..." :
                allDocs.length === 0 ? "Nenhum POP cadastrado" : "Selecione um documento"
              } />
            </SelectTrigger>
            <SelectContent>
              {isLoadingDocs ? (
                <div className="flex items-center justify-center p-2">
                  <Loader2 className="h-4 w-4 animate-spin" />
                </div>
              ) : (
                allDocs.map((pop) => (
                  <SelectItem key={pop.name} value={pop.name}>
                    {pop.name}
                  </SelectItem>
                ))
              )}
            </SelectContent>
          </Select>
        </div>

        {selectedPopName && (
          <div className="space-y-4">
             <p className="text-sm text-muted-foreground bg-muted p-3 rounded-md border">
              O conteúdo exibido abaixo destina-se à leitura e conferência. O documento original e assinado encontra-se arquivado com o responsável pelo SGS.
            </p>
            <Textarea
              value={popContent}
              onChange={(e) => setPopContent(e.target.value)}
              placeholder={isEditing ? `Digite o conteúdo do ${selectedPopName} aqui...` : 'Selecione um POP para ver seu conteúdo.'}
              className="min-h-[400px] text-base"
              readOnly={!isEditing}
              disabled={isSaving || isLoadingDocs}
            />
          </div>
        )}
      </CardContent>
      {selectedPopName && profile === 'admin' && (
        <CardFooter className="flex justify-end">
           {isEditing ? (
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setIsEditing(false)} disabled={isSaving}>
                Cancelar
              </Button>
              <Button onClick={handleSaveContent} disabled={isSaving}>
                {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {isSaving ? 'Salvando...' : 'Salvar Alterações'}
              </Button>
            </div>
           ) : (
             <Button onClick={() => setIsEditing(true)}>
                <Pencil className="mr-2 h-4 w-4" />
                Editar Conteúdo
             </Button>
           )}
        </CardFooter>
      )}
    </Card>
  );
}
