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
import { useState, useEffect } from 'react';
import { useAppSettings } from '@/context/app-settings-context';
import { useToast } from '@/hooks/use-toast';
import { Loader2 } from 'lucide-react';

export function GeneralSettings() {
  const { appName, setAppName, isLoading: isAppLoading } = useAppSettings();
  const { toast } = useToast();

  const [localAppName, setLocalAppName] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    // Sync local state when appName from context is loaded/changed
    setLocalAppName(appName);
  }, [appName]);

  const handleSave = async () => {
    setIsSaving(true);
    try {
      await setAppName(localAppName);
      toast({
        title: 'Sucesso!',
        description: 'O nome foi salvo.',
      });
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: 'Erro ao Salvar',
        description: error.message || 'Não foi possível salvar o nome. Tente novamente.',
      });
    } finally {
      setIsSaving(false);
    }
  };
  
  // The form should be disabled during the initial data load and during save operations.
  const isFormDisabled = isAppLoading || isSaving;

  return (
    <main className="flex flex-1 flex-col overflow-hidden p-4 md:p-6">
      <Card>
        <CardHeader>
          <CardTitle>Configurações Gerais</CardTitle>
          <CardDescription>
            Gerencie as configurações gerais do seu aplicativo. O nome e a logo
            salvos aqui aparecerão em todo o sistema.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <Label htmlFor="app-name">Nome da Empresa/Usuário</Label>
            {isAppLoading ? (
               <div className="h-10 w-full animate-pulse rounded-md bg-muted" />
            ) : (
               <Input
                id="app-name"
                value={localAppName}
                onChange={(e) => setLocalAppName(e.target.value)}
                placeholder="Digite o nome da sua empresa ou usuário"
                disabled={isFormDisabled}
              />
            )}
          </div>
        </CardContent>
        <CardFooter className="border-t px-6 py-4">
          <Button onClick={handleSave} disabled={isFormDisabled || appName === localAppName}>
             {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {isSaving ? 'Salvando...' : 'Salvar Nome'}
          </Button>
        </CardFooter>
      </Card>
    </main>
  );
}
