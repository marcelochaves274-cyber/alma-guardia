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

export function GeneralSettings() {
  const { appName, setAppName } = useAppSettings();
  const { toast } = useToast();

  const handleSave = () => {
    // Here you would typically save the settings to a backend or localStorage
    console.log('App name saved:', appName);
    toast({
      title: 'Sucesso!',
      description: 'As configurações foram salvas.',
    });
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
                value={appName}
                onChange={(e) => setAppName(e.target.value)}
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
