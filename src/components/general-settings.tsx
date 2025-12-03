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

export function GeneralSettings() {
  const { appName, setAppName } = useAppSettings();
  const [localAppName, setLocalAppName] = useState(appName);
  const { toast } = useToast();

  useEffect(() => {
    setLocalAppName(appName);
  }, [appName]);

  const handleSave = () => {
    setAppName(localAppName);
    console.log('App name saved:', localAppName);
    toast({
      title: 'Sucesso!',
      description: 'As configurações foram salvas.',
    });
    setLocalAppName(''); // Limpa o campo de texto
  };

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
              />
            </div>
          </div>
        </CardContent>
        <CardFooter className="border-t px-6 py-4">
          <Button onClick={handleSave}>Salvar</Button>
        </CardFooter>
      </Card>
    </main>
  );
}
