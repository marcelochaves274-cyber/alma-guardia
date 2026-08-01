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
import { useFirestore, useUser } from '@/firebase';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Pencil } from 'lucide-react';
import { useProfile } from '@/context/profile-context';

export function ViewPae() {
  const firestore = useFirestore();
  const { user } = useUser();
  const { toast } = useToast();
  const { profile } = useProfile();

  const [content, setContent] = useState('');
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
        if (docSnap.exists()) {
          const data = docSnap.data();
          setContent(data.paeContent || 'Seu texto aqui');
        } else {
          setContent('Seu texto aqui');
        }
      } catch (error) {
        console.error("Error fetching PAE content:", error);
        toast({
          variant: "destructive",
          title: "Erro ao carregar",
          description: "Não foi possível buscar o Plano de Atendimento a Emergência.",
        });
      } finally {
        setIsLoading(false);
      }
    };
    if (user) {
      fetchContent();
    }
  }, [getSettingsDocRef, toast, user]);

  const handleSaveContent = async () => {
    const docRef = getSettingsDocRef();
    if (!docRef) {
      toast({ variant: 'destructive', title: 'Erro', description: 'Usuário não autenticado.' });
      return;
    }

    setIsSaving(true);
    try {
      await setDoc(docRef, { paeContent: content }, { merge: true });
      toast({
        title: 'Sucesso!',
        description: `Conteúdo do PAE foi salvo.`,
      });
      setIsEditing(false);
    } catch (error) {
      console.error(`Error saving PAE content:`, error);
      toast({
        variant: 'destructive',
        title: 'Erro ao salvar',
        description: `Não foi possível salvar o conteúdo do PAE.`,
      });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <div className="text-center mb-4">
          <CardTitle className="text-2xl">RAME - Recurso de Atendimento Médico de Emergência</CardTitle>
          <CardDescription>Gerencie os planos de emergência da sua operação.</CardDescription>
        </div>
        <CardTitle>PAE - Plano de Atendimento a Emergência</CardTitle>
        <CardDescription>Visualize ou edite o conteúdo do seu Plano de Atendimento a Emergência.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <p className="text-sm text-muted-foreground bg-muted p-3 rounded-md border">
          O conteúdo exibido abaixo destina-se à leitura e conferência. O documento original e assinado encontra-se arquivado com o responsável pelo SGS.
        </p>
        <Textarea value={content} onChange={(e) => setContent(e.target.value)} placeholder={isLoading ? "Carregando..." : "Digite o conteúdo do PAE aqui..."} className="min-h-[400px] text-base" readOnly={!isEditing} disabled={isSaving || isLoading} />
      </CardContent>
      {profile === 'admin' && (
        <CardFooter className="flex justify-end">
          {isEditing ? (
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setIsEditing(false)} disabled={isSaving}>Cancelar</Button>
              <Button onClick={handleSaveContent} disabled={isSaving}>{isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} {isSaving ? 'Salvando...' : 'Salvar Alterações'}</Button>
            </div>
          ) : (
            <Button onClick={() => setIsEditing(true)}><Pencil className="mr-2 h-4 w-4" /> Editar Conteúdo</Button>
          )}
        </CardFooter>
      )}
    </Card>
  );
}