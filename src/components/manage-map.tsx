
'use client';

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useState, useEffect, useRef, useCallback } from 'react';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Upload, X } from 'lucide-react';
import NextImage from 'next/image';
import { Skeleton } from './ui/skeleton';
import { useFirestore, useUser } from '@/firebase';
import { doc, getDoc, setDoc } from 'firebase/firestore';

export function ManageMap() {
  const { toast } = useToast();
  const firestore = useFirestore();
  const { user, isUserLoading } = useUser();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [mapUrl, setMapUrl] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  const getSettingsDocRef = useCallback(() => {
    if (!firestore || !user) return null;
    return doc(firestore, 'sgs_genius', user.uid, 'settings', 'mapDetails');
  }, [firestore, user]);

  useEffect(() => {
    if (isUserLoading || !user) {
      if (!isUserLoading) setIsLoading(false);
      return;
    }

    const settingsDocRef = getSettingsDocRef();
    if (!settingsDocRef) return;

    setIsLoading(true);
    getDoc(settingsDocRef)
      .then((docSnap) => {
        if (docSnap.exists()) {
          const data = docSnap.data();
          setMapUrl(data.mapUrl || null);
        }
      })
      .catch((error: any) => {
        if (error.code !== 'permission-denied') console.error('Error fetching map:', error);
      })
      .finally(() => setIsLoading(false));
  }, [user, isUserLoading, getSettingsDocRef]);

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      // Limite de 800KB para segurança, pois o Firestore aceita documentos de até 1MB
      if (file.size > 0.8 * 1024 * 1024) { 
        toast({
          variant: 'destructive',
          title: 'Imagem muito pesada',
          description: 'Para salvar no banco de dados, a imagem deve ter menos de 800KB.',
        });
        return;
      }
      const reader = new FileReader();
      reader.onloadend = () => {
        setMapUrl(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSaveMap = async () => {
    const settingsDocRef = getSettingsDocRef();
    if (!settingsDocRef) {
      toast({ variant: 'destructive', title: 'Erro', description: 'Usuário não autenticado.' });
      return;
    }

    setIsSaving(true);

    try {
      await setDoc(settingsDocRef, { mapUrl: mapUrl }, { merge: true });
      toast({ title: 'Sucesso!', description: 'O mapa foi salvo.' });
    } catch (error: any) {
      console.error('Error saving map:', error);
      // This is a more specific error message for the old method.
      if (error.code === 'invalid-argument') {
          toast({
            variant: 'destructive',
            title: 'Erro: Arquivo Muito Grande',
            description: 'O arquivo de imagem é muito grande para ser salvo diretamente. Tente uma imagem menor (abaixo de 1MB).',
          });
      } else {
         toast({
            variant: 'destructive',
            title: 'Erro ao Salvar Mapa',
            description: 'Não foi possível salvar o mapa. Verifique sua conexão e tente novamente.',
          });
      }
    } finally {
      setIsSaving(false);
    }
  };
  
  const handleRemoveImage = () => {
    setMapUrl(null);
    if(fileInputRef.current) {
        fileInputRef.current.value = "";
    }
  }


  if (isLoading) {
    return (
      <Card className="w-full">
        <CardHeader>
          <Skeleton className="h-6 w-1/2" />
          <Skeleton className="h-4 w-3/4" />
        </CardHeader>
        <CardContent>
          <Skeleton className="h-48 w-full" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle>Gerenciar Mapa</CardTitle>
        <CardDescription>
          Faça o upload da imagem que será usada como base para marcações de ocorrências e riscos.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-4 rounded-lg border p-4">
          <div className="flex flex-col items-start gap-4 sm:flex-row sm:items-center">
            {mapUrl ? (
              <div className="relative">
                <NextImage
                  src={mapUrl}
                  alt="Pré-visualização do Mapa"
                  width={128}
                  height={128}
                  className="rounded-md border object-contain"
                />
                <Button
                  variant="destructive"
                  size="icon"
                  className="absolute -right-2 -top-2 h-6 w-6 rounded-full"
                  onClick={handleRemoveImage}
                  disabled={isSaving}
                  aria-label="Remover Mapa"
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            ) : (
              <div className="flex h-32 w-32 items-center justify-center rounded-md border border-dashed">
                <span className="text-center text-xs text-muted-foreground">
                  Sem mapa
                </span>
              </div>
            )}
            <div className="flex flex-col gap-2">
              <Button
                variant="outline"
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={isSaving}
              >
                 <Upload className="mr-2 h-4 w-4" />
                Carregar Imagem
              </Button>
              <input
                type="file"
                ref={fileInputRef}
                className="hidden"
                onChange={handleFileChange}
                accept="image/png, image/jpeg, image/gif, image/webp"
              />
              <p className="text-xs text-muted-foreground">
                Recomendado: Imagem com boa resolução, máx 800KB.
              </p>
            </div>
          </div>
           <div className="flex justify-end">
              <Button onClick={handleSaveMap} disabled={isSaving}>
                  {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                  {isSaving ? 'Salvando...' : 'Salvar Mapa'}
              </Button>
           </div>
        </div>
      </CardContent>
    </Card>
  );
}
