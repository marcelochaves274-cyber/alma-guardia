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
import { useState, useEffect, useRef } from 'react';
import { Loader2, Upload, X } from 'lucide-react';
import Image from 'next/image';

export function GeneralSettings() {
  const { appName, setAppName, logoUrl, setLogoUrl, isLoading: isAppLoading } = useAppSettings();
  const [localAppName, setLocalAppName] = useState('');
  const [localLogoUrl, setLocalLogoUrl] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);

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

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setLocalLogoUrl(reader.result as string);
      };
      reader.readAsDataURL(file);
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
              <Label htmlFor="logo-url">Logo da Empresa</Label>
              <div className="flex items-center gap-4">
                <div className='relative w-24 h-24 border rounded-md flex items-center justify-center bg-muted/50'>
                  {localLogoUrl ? (
                    <>
                      <Image src={localLogoUrl} alt="Prévia da logo" fill className='object-contain rounded-md p-2' />
                       <Button
                        variant="ghost"
                        size="icon"
                        className="absolute top-0 right-0 h-6 w-6 bg-red-500/80 text-white hover:bg-red-600"
                        onClick={() => setLocalLogoUrl('')}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </>
                  ) : (
                    <span className='text-xs text-muted-foreground text-center'>Prévia</span>
                  )}
                </div>
                <div className='flex-1'>
                  <Input
                    id="logo-url"
                    value={localLogoUrl}
                    onChange={(e) => setLocalLogoUrl(e.target.value)}
                    placeholder="Cole uma URL ou faça upload"
                    disabled={isLoading}
                  />
                   <Button 
                    variant="outline"
                    className='mt-2'
                    onClick={() => fileInputRef.current?.click()}
                    disabled={isLoading}
                  >
                     <Upload className="mr-2 h-4 w-4" />
                     Fazer Upload
                   </Button>
                   <input
                    type="file"
                    ref={fileInputRef}
                    onChange={handleFileChange}
                    className="hidden"
                    accept="image/png, image/jpeg, image/gif, image/svg+xml"
                  />
                </div>
              </div>
               <p className='text-xs text-muted-foreground mt-2'>Faça o upload ou cole a URL da sua logo. A imagem será salva em formato de texto.</p>
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
