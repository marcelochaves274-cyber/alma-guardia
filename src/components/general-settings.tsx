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
import { useAppSettings } from '@/context/app-settings-context';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { useState, useEffect } from 'react';
import { Loader2 } from 'lucide-react';

export function GeneralSettings() {
  const { appName, setAppName, logoUrl, setLogoUrl, isLoading: isAppLoading } = useAppSettings();
  const [localAppName, setLocalAppName] = useState('');
  const [localLogoUrl, setLocalLogoUrl] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    setLocalAppName(appName);
    setLocalLogoUrl(logoUrl);
  }, [appName, logoUrl]);

  const handleSave = async () => {
    setIsSaving(true);
    try {
      await Promise.all([
        setAppName(localAppName),
        setLogoUrl(localLogoUrl)
      ]);
      
      toast({
        title: 'Sucesso!',
        description: 'As configurações foram salvas.',
      });
    } catch (error) {
      console.error("Failed to save app settings:", error);
      toast({
        variant: 'destructive',
        title: 'Erro!',
        description: 'Não foi possível salvar as configurações.',
      });
    } finally {
      setIsSaving(false);
    }
  };

  const isLoading = isAppLoading || isSaving;

  return (
    <main className="flex flex-1 flex-col overflow-hidden p-4 md:p-6">
      <Card>
        <CardHeader>
          <CardTitle>Configurações Gerais</CardTitle>
          <CardDescription>
            Gerencie as configurações gerais do seu aplicativo.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="app-name">Nome da Empresa/Usuário</Label>
              <Input
                id="app-name"
                value={localAppName}
                onChange={(e) => setLocalAppName(e.target.value)}
                placeholder="Digite o nome da sua empresa ou usuário"
                disabled={isLoading}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="logo-url">URL da Logo</Label>
              <Input
                id="logo-url"
                value={localLogoUrl}
                onChange={(e) => setLocalLogoUrl(e.target.value)}
                placeholder="https://example.com/logo.png"
                disabled={isLoading}
              />
            </div>
          </div>
        </CardContent>
        <CardFooter className="border-t px-6 py-4">
          <Button onClick={handleSave} disabled={isLoading}>
            {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Salvar
          </Button>
        </CardFooter>
      </Card>
    </main>
  );
}
