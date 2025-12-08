
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

type SectionKey = 
  | 'escopo'
  | 'termos'
  | 'contexto'
  | 'lideranca'
  | 'planejamento'
  | 'apoio'
  | 'operacao'
  | 'avaliacao'
  | 'melhoria';

interface SgsDocsContent {
  [key: string]: string;
}

const docSections: { key: SectionKey, label: string }[] = [
    { key: 'escopo', label: 'Escopo' },
    { key: 'termos', label: 'Termos e Definições' },
    { key: 'contexto', label: 'Contexto da Organização' },
    { key: 'lideranca', label: 'Liderança e Politica' },
    { key: 'planejamento', label: 'Planejamento do SGS' },
    { key: 'apoio', label: 'Apoio e Recurso' },
    { key: 'operacao', label: 'Operação' },
    { key: 'avaliacao', label: 'Avaliação e Desempenho' },
    { key: 'melhoria', label: 'Melhorias Contínuas' },
];

export function ViewSgsDocs() {
  const firestore = useFirestore();
  const { user } = useUser();
  const { toast } = useToast();

  const [selectedSection, setSelectedSection] = useState<SectionKey | null>(null);
  const [content, setContent] = useState('');
  const [dbContent, setDbContent] = useState<SgsDocsContent>({});
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isEditing, setIsEditing] = useState(false);

  const getSettingsDocRef = useCallback(() => {
    if (!firestore || !user) return null;
    return doc(firestore, 'sgs_genius', user.uid, 'settings', 'sgsDocs');
  }, [firestore, user]);

  useEffect(() => {
    const fetchContent = async () => {
      const docRef = getSettingsDocRef();
      if (!docRef) {
        setIsLoading(false);
        return;
      }
      try {
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
          setDbContent(docSnap.data());
        }
      } catch (error) {
        console.error("Error fetching SGS Docs content:", error);
        toast({
          variant: "destructive",
          title: "Erro ao carregar",
          description: "Não foi possível buscar os documentos do SGS.",
        });
      } finally {
        setIsLoading(false);
      }
    };
    fetchContent();
  }, [getSettingsDocRef, toast]);
  
  const handleSelectSection = (key: SectionKey) => {
    setSelectedSection(key);
    setContent(dbContent[key] || '');
    setIsEditing(false);
  };

  const handleSaveContent = async () => {
    if (!selectedSection) return;

    const docRef = getSettingsDocRef();
    if (!docRef) {
      toast({ variant: 'destructive', title: 'Erro', description: 'Usuário não autenticado.' });
      return;
    }

    setIsSaving(true);
    try {
      const updatedContent = {
        ...dbContent,
        [selectedSection]: content,
      };

      await setDoc(docRef, updatedContent, { merge: true });
      setDbContent(updatedContent);
      toast({
        title: 'Sucesso!',
        description: `Conteúdo da seção foi salvo.`,
      });
      setIsEditing(false);
    } catch (error) {
      console.error(`Error saving content:`, error);
      toast({
        variant: 'destructive',
        title: 'Erro ao salvar',
        description: `Não foi possível salvar o conteúdo.`,
      });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle>Documentos do SGS</CardTitle>
        <CardDescription>
          Selecione uma seção para visualizar ou editar seu conteúdo.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="space-y-2">
          <Select
            onValueChange={(value: SectionKey) => handleSelectSection(value)}
            disabled={isLoading}
          >
            <SelectTrigger className="max-w-sm">
              <SelectValue placeholder={isLoading ? "Carregando..." : "Selecione uma seção"} />
            </SelectTrigger>
            <SelectContent>
              {isLoading ? (
                <div className="flex items-center justify-center p-2">
                  <Loader2 className="h-4 w-4 animate-spin" />
                </div>
              ) : (
                docSections.map(section => (
                    <SelectItem key={section.key} value={section.key}>
                        {section.label}
                    </SelectItem>
                ))
              )}
            </SelectContent>
          </Select>
        </div>

        {selectedSection && (
          <div className="space-y-4">
             <p className="text-sm text-muted-foreground bg-muted p-3 rounded-md border">
              O conteúdo exibido abaixo destina-se à leitura e conferência. O documento original e assinado encontra-se arquivado com o responsável pelo SGS.
            </p>
            <Textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder={isEditing ? `Digite o conteúdo da seção aqui...` : 'Selecione uma seção para ver seu conteúdo.'}
              className="min-h-[400px] text-base"
              readOnly={!isEditing}
              disabled={isSaving}
            />
          </div>
        )}
      </CardContent>
      {selectedSection && (
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
