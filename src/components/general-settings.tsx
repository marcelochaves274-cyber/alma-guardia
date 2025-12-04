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
import { useState } from 'react';

export function GeneralSettings() {
  const [localAppName, setLocalAppName] = useState('');

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
          <div className="space-y-2">
            <Label htmlFor="app-name">Nome da Empresa/Usuário</Label>
            <Input
              id="app-name"
              value={localAppName}
              onChange={(e) => setLocalAppName(e.target.value)}
              placeholder="Digite o nome da sua empresa ou usuário"
            />
          </div>
        </CardContent>
        <CardFooter className="border-t px-6 py-4">
          <Button>Salvar Nome</Button>
        </CardFooter>
      </Card>
    </main>
  );
}
