'use client';

import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useAppSettings } from '@/context/app-settings-context';
import { Loader2, Check } from 'lucide-react';
import { cn } from '@/lib/utils';

export function ThemeSelector() {
  const { themes, selectedTheme, setSelectedTheme, isSavingTheme, saveTheme } =
    useAppSettings();

  return (
    <Card>
      <CardHeader>
        <CardTitle>Tema de Cores</CardTitle>
        <CardDescription>
          Escolha uma paleta de cores para o aplicativo.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-6">
          {themes.map((theme) => (
            <div key={theme.name} className="flex flex-col items-center">
              <button
                onClick={() => setSelectedTheme(theme.name)}
                className={cn(
                  'relative flex h-24 w-full flex-col items-center justify-center rounded-lg border-2 p-4 transition-all',
                  selectedTheme?.name === theme.name
                    ? 'border-primary'
                    : 'border-transparent hover:border-primary/50'
                )}
              >
                {selectedTheme?.name === theme.name && (
                  <div className="absolute right-1 top-1 flex h-5 w-5 items-center justify-center rounded-full bg-primary text-primary-foreground">
                    <Check className="h-4 w-4" />
                  </div>
                )}
                <div className="flex -space-x-2">
                  <div
                    className="h-8 w-8 rounded-full border-2 border-card"
                    style={{ backgroundColor: `hsl(${theme.primary})` }}
                  ></div>
                  <div
                    className="h-8 w-8 rounded-full border-2 border-card"
                    style={{ backgroundColor: `hsl(${theme.accent})` }}
                  ></div>
                </div>
              </button>
              <p className="mt-2 text-sm font-medium">{theme.displayName}</p>
            </div>
          ))}
        </div>
      </CardContent>
      <CardFooter className="border-t px-6 py-4">
        <Button onClick={saveTheme} disabled={isSavingTheme}>
          {isSavingTheme && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          {isSavingTheme ? 'Salvando...' : 'Salvar Tema'}
        </Button>
      </CardFooter>
    </Card>
  );
}
