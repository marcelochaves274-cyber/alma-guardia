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
import { useAppSettings } from '@/context/app-settings-context';
import Image from 'next/image';
import { Skeleton } from './ui/skeleton';
import { ThemeSelector } from './theme-selector';

export function GeneralSettings() {
  const { toast } = useToast();
  const {
    appName,
    setAppName,
    logoUrl,
    setLogoUrl,
    isSavingLogo,
    saveLogo,
    removeLogo,
    isLoading: isSettingsLoading,
  } = useAppSettings();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [localAppName, setLocalAppName] = useState(appName);
  const [isSavingName, setIsSavingName] = useState(false);

  useEffect(() => {
    setLocalAppName(appName);
  }, [appName]);

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
  
  const handleSaveName = async () => {
    setIsSavingName(true);
    try {
      await setAppName(localAppName);
      toast({
        title: 'Sucesso!',
        description: 'O nome da empresa/usuário foi salvo.',
      });
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: 'Erro ao salvar',
        description:
          error.message || 'Não foi possível salvar o nome.',
      });
    } finally {
      setIsSavingName(false);
    }
  };

  if (isSettingsLoading) {
    return (
      <div className="space-y-6">
        <Card className="w-full">
          <CardHeader>
            <Skeleton className="h-6 w-1/2" />
            <Skeleton className="h-4 w-3/4" />
          </CardHeader>
          <CardContent>
            <div className="flex items-center space-x-4">
              <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
              <p>Carregando configurações...</p>
            </div>
          </CardContent>
        </Card>
        <Card className="w-full">
          <CardHeader>
             <Skeleton className="h-6 w-1/3" />
             <Skeleton className="h-4 w-1/2" />
          </CardHeader>
          <CardContent>
             <Skeleton className="h-24 w-full" />
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Card className="w-full">
        <CardHeader>
          <CardTitle>Identidade Visual</CardTitle>
          <CardDescription>
            Personalize o nome e o logotipo do seu aplicativo. O nome e o logotipo aparecerão no cabeçalho.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-2">
            <Label htmlFor="app-name">Nome da Empresa/Usuário</Label>
            <Input
              id="app-name"
              value={localAppName}
              onChange={(e) => setLocalAppName(e.target.value)}
              placeholder="Digite o nome"
              disabled={isSavingName}
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
          <Button onClick={handleSaveName} disabled={isSavingName}>
            {isSavingName && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {isSavingName ? 'Salvando...' : 'Salvar Nome'}
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
