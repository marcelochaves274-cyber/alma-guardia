
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
import { useProfile } from '@/context/profile-context';

interface RameContent {
  peContent: string;
  paeContent: string;
}

export function ViewRame() {
  const firestore = useFirestore();
  const { user } = useUser();
  const { toast } = useToast();
  const { profile } = useProfile();

  const [selectedPlan, setSelectedPlan] = useState<'pe' | 'pae' | null>(null);
  const [content, setContent] = useState('');
  const [dbContent, setDbContent] = useState<RameContent>({ peContent: '', paeContent: '' });
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isEditing, setIsEditing] = useState(false);

  const getSettingsDocRef = useCallback(() => {
    if (!firestore || !user) return null;
    return doc(firestore, 'sgs_genius', user.uid, 'settings', 'rame');
  }, [firestore, user]);

  useEffect(() => {
    const fetchContent = async () => {
      setIsLoading(true);
      const docRef = getSettingsDocRef();
      if (!docRef) {
        setIsLoading(false);
        return;
      }
      try {
        const docSnap = await getDoc(docRef);
        let initialContent: RameContent = {
          peContent: 'Seu texto aqui',
          paeContent: 'Seu texto aqui'
        };
        if (docSnap.exists()) {
          const data = docSnap.data();
          initialContent.peContent = data.peContent || 'Seu texto aqui';
          initialContent.paeContent = data.paeContent || 'Seu texto aqui';
        }
        setDbContent(initialContent);

      } catch (error) {
        console.error("Error fetching RAME content:", error);
        toast({
          variant: "destructive",
          title: "Erro ao carregar",
          description: "Não foi possível buscar os planos de emergência.",
        });
      } finally {
        setIsLoading(false);
      }
    };
    if (user) {
      fetchContent();
    }
  }, [getSettingsDocRef, toast, user]);
  
  const handleSelectPlan = (plan: 'pe' | 'pae') => {
    setSelectedPlan(plan);
    setContent(plan === 'pe' ? dbContent.peContent : dbContent.paeContent);
    setIsEditing(false);
  };

  const handleSaveContent = async () => {
    if (!selectedPlan) return;

    const docRef = getSettingsDocRef();
    if (!docRef) {
      toast({ variant: 'destructive', title: 'Erro', description: 'Usuário não autenticado.' });
      return;
    }

    setIsSaving(true);
    try {
      const updatedContent = {
        ...dbContent,
        [selectedPlan === 'pe' ? 'peContent' : 'paeContent']: content,
      };

      await setDoc(docRef, updatedContent, { merge: true });
      setDbContent(updatedContent);
      toast({
        title: 'Sucesso!',
        description: `Conteúdo do ${selectedPlan.toUpperCase()} foi salvo.`,
      });
      setIsEditing(false);
    } catch (error) {
      console.error(`Error saving ${selectedPlan.toUpperCase()} content:`, error);
      toast({
        variant: 'destructive',
        title: 'Erro ao salvar',
        description: `Não foi possível salvar o conteúdo do ${selectedPlan.toUpperCase()}.`,
      });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle>RAME - Recurso de Atendimento Médico de Emergência</CardTitle>
        <CardDescription>
          Selecione um plano para visualizar ou editar seu conteúdo.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="space-y-2">
          <Select
            onValueChange={(value: 'pe' | 'pae') => handleSelectPlan(value)}
            disabled={isLoading}
            value={selectedPlan || ""}
          >
            <SelectTrigger className="max-w-xs">
              <SelectValue placeholder={isLoading ? "Carregando..." : "Selecione um plano"} />
            </SelectTrigger>
            <SelectContent>
              {isLoading ? (
                <div className="flex items-center justify-center p-2">
                  <Loader2 className="h-4 w-4 animate-spin" />
                </div>
              ) : (
                <>
                  <SelectItem value="pe">PE - Plano de Emergência</SelectItem>
                  <SelectItem value="pae">PAE - Plano de Atendimento a Emergência</SelectItem>
                </>
              )}
            </SelectContent>
          </Select>
        </div>

        {selectedPlan && (
          <div className="space-y-4">
             <p className="text-sm text-muted-foreground bg-muted p-3 rounded-md border">
              O conteúdo exibido abaixo destina-se à leitura e conferência. O documento original e assinado encontra-se arquivado com o responsável pelo SGS.
            </p>
            <Textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder={isEditing ? `Digite o conteúdo do ${selectedPlan.toUpperCase()} aqui...` : 'Selecione um plano para ver seu conteúdo.'}
              className="min-h-[400px] text-base"
              readOnly={!isEditing}
              disabled={isSaving}
            />
          </div>
        )}
      </CardContent>
      {selectedPlan && profile === 'admin' && (
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
