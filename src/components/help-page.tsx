
'use client';

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { useHelp } from '@/context/help-context';

export function HelpPage() {
  const { helpEnabled, setHelpEnabled } = useHelp();

  return (
    <Card className="w-full max-w-lg mx-auto">
      <CardHeader>
        <CardTitle>Modo Ajuda</CardTitle>
        <CardDescription>
          Ative o Modo Ajuda para exibir dicas e explicações nos campos dos formulários. 
          Isso pode ser útil para novos usuários ou para entender melhor cada campo.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="flex items-center justify-between rounded-lg border p-4">
            <Label htmlFor="help-mode" className="font-semibold">
                Ativar Modo Ajuda
            </Label>
            <Switch 
                id="help-mode" 
                checked={helpEnabled} 
                onCheckedChange={setHelpEnabled} 
            />
        </div>
      </CardContent>
    </Card>
  );
}
