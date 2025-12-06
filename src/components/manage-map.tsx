'use client';

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useState, useEffect, useRef } from 'react';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Upload, X } from 'lucide-react';
import Image from 'next/image';
import { Skeleton } from './ui/skeleton';
import { useFirestore, useUser } from '@/firebase';
import { doc, getDoc, setDoc, updateDoc } from 'firebase/firestore';
import { Input } from './ui/input';

export function ManageMap() {
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [mapUrl, setMapUrl] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  const firestore = useFirestore();
  const { user } = useUser();

  useEffect(() => {
    let isMounted = true;
    if (!user || !firestore) {
      setIsLoading(false);
      return;
    }

    const settingsDocRef = doc(firestore, 'users', user.uid, 'settings', 'mapDetails');
    getDoc(settingsDocRef)
      .then((docSnap) => {
        if (isMounted && docSnap.exists()) {
          setMapUrl(docSnap.data().mapUrl || null);
        }
      })
      .catch((error) => console.error("Error fetching map:", error))
      .finally(() => {
        if (isMounted) setIsLoading(false);
      });
      
    return () => { isMounted = false; }
  }, [user, firestore]);

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      if (file.size > 2 * 1024 * 1024) { // 2MB limit
        toast({
          variant: 'destructive',
          title: 'Arquivo muito grande',
          description: 'Por favor, escolha uma imagem menor que 2MB.',
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
    if (!firestore || !user) {
      toast({ variant: 'destructive', title: 'Erro', description: 'Usuário não autenticado.' });
      return;
    }
    if (!mapUrl) {
      toast({ variant: 'destructive', title: 'Nenhum mapa', description: 'Carregue uma imagem do mapa primeiro.' });
      return;
    }

    setIsSaving(true);
    const settingsDocRef = doc(firestore, 'users', user.uid, 'settings', 'mapDetails');
    try {
      await setDoc(settingsDocRef, { mapUrl }, { merge: true });
      toast({ title: 'Sucesso!', description: 'O mapa foi salvo.' });
    } catch (error) {
      console.error("Error saving map:", error);
      toast({ variant: 'destructive', title: 'Erro ao salvar', description: 'Não foi possível salvar o mapa.' });
    } finally {
      setIsSaving(false);
    }
  };

  const handleRemoveMap = async () => {
    if (!firestore || !user) {
      toast({ variant: 'destructive', title: 'Erro', description: 'Usuário não autenticado.' });
      return;
    }

    setIsSaving(true);
    const settingsDocRef = doc(firestore, 'users', user.uid, 'settings', 'mapDetails');
    try {
      await updateDoc(settingsDocRef, { mapUrl: null });
      setMapUrl(null);
      toast({ title: 'Mapa Removido', description: 'O mapa foi removido com sucesso.' });
    } catch (error) {
      console.error("Error removing map:", error);
      toast({ variant: 'destructive', title: 'Erro ao remover', description: 'Não foi possível remover o mapa.' });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle>Gerenciar Mapa de Ocorrências</CardTitle>
        <CardDescription>
          Faça o upload de uma imagem (planta baixa, mapa, etc.) para marcar a localização exata das ocorrências.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-8">
        <div className="space-y-4">
          <Label>Imagem do Mapa</Label>
          <div className="flex items-center gap-4">
            {isLoading ? (
              <Skeleton className="h-32 w-32 rounded-md" />
            ) : mapUrl ? (
              <div className="relative">
                <Image src={mapUrl} alt="Pré-visualização do Mapa" width={128} height={128} className="rounded-md border object-contain" />
                <Button
                  variant="destructive"
                  size="icon"
                  className="absolute -right-2 -top-2 h-6 w-6 rounded-full"
                  onClick={handleRemoveMap}
                  disabled={isSaving}
                  aria-label="Remover mapa"
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            ) : (
              <div className="flex h-32 w-32 items-center justify-center rounded-md border border-dashed">
                <span className="text-center text-xs text-muted-foreground">Sem mapa</span>
              </div>
            )}
            <Button variant="outline" onClick={() => fileInputRef.current?.click()} disabled={isSaving}>
              <Upload className="mr-2 h-4 w-4" />
              Carregar Imagem
            </Button>
            <Input
              type="file"
              ref={fileInputRef}
              className="hidden"
              onChange={handleFileChange}
              accept="image/png, image/jpeg, image/gif, image/svg+xml"
            />
          </div>
          <p className="text-xs text-muted-foreground">Recomendado: Imagem com boa resolução, máx 2MB.</p>
          <Button onClick={handleSaveMap} disabled={isSaving || !mapUrl} className="w-full sm:w-auto">
            {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
            {isSaving ? 'Salvando...' : 'Salvar Mapa'}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
