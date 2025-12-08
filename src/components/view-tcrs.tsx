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

export function ViewTcrs() {
  const firestore = useFirestore();
  const { user } = useUser();
  const { toast } = useToast();

  const [allDocs, setAllDocs] = useState<PopDocument[]>([]);
  const [selectedTcrName, setSelectedTcrName] = useState<string | null>(null);
  const [tcrContent, setTcrContent] = useState('');
  const [isLoadingDocs, setIsLoadingDocs] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isEditing, setIsEditing] = useState(false);

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
           const fetchedDocs = (data.documents || []).map((item: any) => {
                if (typeof item === 'string') {
                    return { name: item, content: '', type: item.startsWith('POP:') ? 'POP' : 'TCR' };
                }
                return {
                    name: item.name,
                    content: item.content || '',
                    type: item.type || (item.name.startsWith('POP:') ? 'POP' : 'TCR'),
                };
            });
          setAllDocs(fetchedDocs);
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
    fetchDocs();
  }, [getSettingsDocRef, toast]);
  
  const tcrDocuments = allDocs.filter(doc => doc.type === 'TCR');


  const handleSelectTcr = (tcrName: string) => {
    setSelectedTcrName(tcrName);
    const selected = allDocs.find(p => p.name === tcrName);
    setTcrContent(selected?.content || '');
    setIsEditing(false);
  };

  const handleSaveContent = async () => {
    if (!selectedTcrName) return;

    const docRef = getSettingsDocRef();
    if (!docRef) {
      toast({ variant: 'destructive', title: 'Erro', description: 'Usuário não autenticado.' });
      return;
    }

    setIsSaving(true);
    try {
      const updatedDocs = allDocs.map(p =>
        p.name === selectedTcrName ? { ...p, content: tcrContent } : p
      );
      await setDoc(docRef, { documents: updatedDocs });
      setAllDocs(updatedDocs);
      toast({
        title: 'Sucesso!',
        description: `Conteúdo do ${selectedTcrName} foi salvo.`,
      });
      setIsEditing(false);
    } catch (error) {
      console.error("Error saving TCR content:", error);
      toast({
        variant: 'destructive',
        title: 'Erro ao salvar',
        description: 'Não foi possível salvar o conteúdo do TCR.',
      });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle>Termo de Conhecimento de Risco (TCR)</CardTitle>
        <CardDescription>
          Selecione um documento para visualizar ou editar seu conteúdo.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="space-y-2">
          <Select
            onValueChange={handleSelectTcr}
            disabled={isLoadingDocs || tcrDocuments.length === 0}
          >
            <SelectTrigger>
              <SelectValue placeholder={
                isLoadingDocs ? "Carregando TCRs..." :
                tcrDocuments.length === 0 ? "Nenhum TCR cadastrado" : "Selecione um TCR"
              } />
            </SelectTrigger>
            <SelectContent>
              {isLoadingDocs ? (
                <div className="flex items-center justify-center p-2">
                  <Loader2 className="h-4 w-4 animate-spin" />
                </div>
              ) : (
                tcrDocuments.map((doc) => (
                  <SelectItem key={doc.name} value={doc.name}>
                    {doc.name}
                  </SelectItem>
                ))
              )}
            </SelectContent>
          </Select>
        </div>

        {selectedTcrName && (
          <div className="space-y-4">
             <p className="text-sm text-muted-foreground bg-muted p-3 rounded-md border">
              O conteúdo exibido abaixo destina-se à leitura e conferência. O documento original e assinado encontra-se arquivado com o responsável pelo SGS.
            </p>
            <Textarea
              value={tcrContent}
              onChange={(e) => setTcrContent(e.target.value)}
              placeholder={isEditing ? `Digite o conteúdo do ${selectedTcrName} aqui...` : 'Selecione um TCR para ver seu conteúdo.'}
              className="min-h-[400px] text-base"
              readOnly={!isEditing}
              disabled={isSaving}
            />
          </div>
        )}
      </CardContent>
      {selectedTcrName && (
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
