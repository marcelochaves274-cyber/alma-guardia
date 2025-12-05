'use client';

import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { useState, useEffect, useRef } from 'react';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Upload, X } from 'lucide-react';
import { useFirestore, useUser } from '@/firebase';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { ThemeSelector } from './theme-selector';
import { useAppSettings } from '@/context/app-settings-context';
import Image from 'next/image';
import { Skeleton } from './ui/skeleton';

export function GeneralSettings() {
  const { toast } = useToast();
  const firestore = useFirestore();
  const { user, isLoading: isUserLoading } = useUser();
  const {
    logoUrl,
    setLogoUrl,
    isSavingLogo,
    saveLogo,
    removeLogo,
    isLoading: isSettingsLoading,
  } = useAppSettings();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [appName, setAppName] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    let isMounted = true;
    if (user === undefined || isUserLoading) {
      return;
    }
    if (!user || !firestore) {
      setIsLoading(false);
      return;
    }

    const settingsDocRef = doc(
      firestore,
      'users',
      user.uid,
      'settings',
      'appDetails'
    );
    getDoc(settingsDocRef)
      .then((docSnap) => {
        if (isMounted && docSnap.exists()) {
          setAppName(docSnap.data().name || '');
        }
      })
      .catch((error) => {
        console.error('Error fetching app settings:', error);
        toast({
          variant: 'destructive',
          title: 'Erro ao carregar',
          description: 'Não foi possível buscar as configurações salvas.',
        });
      })
      .finally(() => {
        if (isMounted) {
          setIsLoading(false);
        }
      });

    return () => {
      isMounted = false;
    };
  }, [user, isUserLoading, firestore, toast]);

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      if (file.size > 1024 * 1024) { // 1MB limit
        toast({
          variant: 'destructive',
          title: 'Arquivo muito grande',
          description: 'Por favor, escolha uma imagem menor que 1MB.',
        });
        return;
      }
      const reader = new FileReader();
      reader.onloadend = () => {
        setLogoUrl(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };
  
  const handleSave = async () => {
    if (!firestore || !user) {
      toast({
        variant: 'destructive',
        title: 'Erro de Autenticação',
        description: 'Você precisa estar logado para salvar.',
      });
      return;
    }

    setIsSaving(true);
    try {
      const settingsDocRef = doc(
        firestore,
        'users',
        user.uid,
        'settings',
        'appDetails'
      );
      await setDoc(settingsDocRef, { name: appName }, { merge: true });
      toast({
        title: 'Sucesso!',
        description: 'O nome da empresa/usuário foi salvo.',
      });
    } catch (error) {
      console.error('Error saving app name:', error);
      toast({
        variant: 'destructive',
        title: 'Erro ao salvar',
        description:
          'Não foi possível salvar o nome. Verifique as regras de segurança do Firestore.',
      });
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading || isSettingsLoading) {
    return (
      <div className="grid gap-6 md:grid-cols-3">
        <Card className="md:col-span-3">
          <CardHeader>
            <CardTitle>Configurações Gerais</CardTitle>
            <CardDescription>
              Gerencie as configurações gerais do seu aplicativo.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center space-x-4">
              <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
              <p>Carregando configurações...</p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 gap-6">
      <Card>
        <CardHeader>
          <CardTitle>Nome e Logo</CardTitle>
          <CardDescription>
            Personalize a identidade visual do seu aplicativo.
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-6 md:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="app-name">Nome da Empresa/Usuário</Label>
            <Input
              id="app-name"
              value={appName}
              onChange={(e) => setAppName(e.target.value)}
              placeholder="Digite o nome da sua empresa ou usuário"
              disabled={isSaving}
            />
          </div>
           <div className="space-y-2">
              <Label>Logo</Label>
              <div className="flex items-center gap-4">
                {isSettingsLoading ? <Skeleton className="h-16 w-16 rounded-md" /> : logoUrl ? (
                  <div className="relative">
                    <Image src={logoUrl} alt="Logo preview" width={64} height={64} className="rounded-md border object-contain" />
                    <Button
                      variant="destructive"
                      size="icon"
                      className="absolute -right-2 -top-2 h-6 w-6 rounded-full"
                      onClick={removeLogo}
                      disabled={isSavingLogo}
                      aria-label="Remover logo"
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                ) : (
                  <div className="flex h-16 w-16 items-center justify-center rounded-md border border-dashed">
                    <span className="text-xs text-muted-foreground">Sem logo</span>
                  </div>
                )}
                <Button variant="outline" onClick={() => fileInputRef.current?.click()} disabled={isSavingLogo}>
                  <Upload className="mr-2 h-4 w-4" />
                  Carregar
                </Button>
                <Input 
                  type="file" 
                  ref={fileInputRef} 
                  className="hidden" 
                  onChange={handleFileChange}
                  accept="image/png, image/jpeg, image/gif, image/svg+xml"
                />
              </div>
               <p className="text-xs text-muted-foreground">Recomendado: 128x128px, máx 1MB.</p>
            </div>
        </CardContent>
        <CardFooter className="border-t px-6 py-4 flex justify-start gap-4">
          <Button onClick={handleSave} disabled={isSaving}>
            {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {isSaving ? 'Salvando...' : 'Salvar Nome'}
          </Button>
          <Button onClick={saveLogo} disabled={isSavingLogo}>
            {isSavingLogo && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {isSavingLogo ? 'Salvando...' : 'Salvar Logo'}
          </Button>
        </CardFooter>
      </Card>
      <ThemeSelector />
    </div>
  );
}
