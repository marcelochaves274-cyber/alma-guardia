'use client';

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  CardFooter
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useState, useEffect, useRef, useCallback, type ChangeEvent } from 'react';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Upload, X } from 'lucide-react';
import NextImage from 'next/image';
import { Skeleton } from './ui/skeleton';
import { useFirestore, useUser } from '@/firebase';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Separator } from './ui/separator';

interface MapInfo {
  id: string;
  name: string;
  url: string | null;
}

const resizeImage = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (event) => {
      if (!event.target?.result) {
        return reject(new Error('FileReader did not successfully read the file.'));
      }
      const img = new Image();
      img.onload = () => {
        const MAX_WIDTH = 800;
        const MAX_HEIGHT = 800;
        let width = img.width;
        let height = img.height;

        if (width > height) {
          if (width > MAX_WIDTH) {
            height *= MAX_WIDTH / width;
            width = MAX_WIDTH;
          }
        } else {
          if (height > MAX_HEIGHT) {
            width *= MAX_HEIGHT / height;
            height = MAX_HEIGHT;
          }
        }

        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          return reject(new Error('Could not get canvas context'));
        }
        ctx.drawImage(img, 0, 0, width, height);
        // Use JPEG with quality 0.7 for smaller size
        const dataUrl = canvas.toDataURL('image/jpeg', 0.7);
        resolve(dataUrl);
      };
      img.onerror = reject;
      img.src = event.target.result as string;
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
};


export function ManageMap() {
  const { toast } = useToast();

  const [maps, setMaps] = useState<MapInfo[]>([
    { id: 'map1', name: 'Mapa 1', url: null },
    { id: 'map2', name: 'Mapa 2', url: null },
    { id: 'map3', name: 'Mapa 3', url: null },
  ]);
  const [isSaving, setIsSaving] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  const fileInputRefs = {
    map1: useRef<HTMLInputElement>(null),
    map2: useRef<HTMLInputElement>(null),
    map3: useRef<HTMLInputElement>(null),
  };

  const firestore = useFirestore();
  const { user, isUserLoading } = useUser();

  const getSettingsDocRef = useCallback(() => {
    if (!firestore || !user) return null;
    return doc(firestore, 'sgs_genius', user.uid, 'settings', 'mapDetails');
  }, [firestore, user]);

  useEffect(() => {
    let isMounted = true;
    if (isUserLoading || !user || !firestore) {
      if (!isUserLoading) setIsLoading(false);
      return;
    }

    const settingsDocRef = getSettingsDocRef();
    if (!settingsDocRef) {
      setIsLoading(false);
      return;
    }

    getDoc(settingsDocRef)
      .then((docSnap) => {
        if (isMounted) {
          if (docSnap.exists()) {
            const data = docSnap.data();
            // Check for the new 'maps' array first (forward compatibility)
            if (data.maps && Array.isArray(data.maps) && data.maps.length > 0) {
                const fetchedMaps = data.maps;
                const newMapsState: MapInfo[] = [
                    { id: 'map1', name: 'Mapa 1', url: null },
                    { id: 'map2', name: 'Mapa 2', url: null },
                    { id: 'map3', name: 'Mapa 3', url: null },
                ];
                fetchedMaps.forEach((fm: MapInfo) => {
                    const index = newMapsState.findIndex(m => m.id === fm.id);
                    if (index !== -1) {
                        newMapsState[index] = { ...newMapsState[index], name: fm.name, url: fm.url };
                    }
                });
                setMaps(newMapsState);
            } else if (data.mapUrl) {
              // Backward compatibility: old 'mapUrl' exists. Migrate it to the first slot.
              setMaps([
                { id: 'map1', name: 'Mapa Principal', url: data.mapUrl },
                { id: 'map2', name: 'Mapa 2', url: null },
                { id: 'map3', name: 'Mapa 3', url: null },
              ]);
            }
          }
        }
      })
      .catch((error: any) => {
        if (error.code !== 'permission-denied') {
          console.error("Error fetching maps:", error);
        }
      })
      .finally(() => {
        if (isMounted) setIsLoading(false);
      });

    return () => { isMounted = false; }
  }, [user, firestore, isUserLoading, getSettingsDocRef]);

  const handleFileChange = async (event: ChangeEvent<HTMLInputElement>, mapId: string) => {
    const file = event.target.files?.[0];
    if (file) {
      if (file.size > 10 * 1024 * 1024) { // 10MB limit for raw upload
        toast({
          variant: 'destructive',
          title: 'Arquivo muito grande',
          description: 'Por favor, escolha uma imagem menor que 10MB.',
        });
        return;
      }
      
      setIsSaving(true);
      try {
        const resizedDataUrl = await resizeImage(file);
        setMaps(prevMaps =>
          prevMaps.map(m => m.id === mapId ? { ...m, url: resizedDataUrl } : m)
        );
      } catch (error) {
        console.error("Image resize error:", error);
        toast({
          variant: 'destructive',
          title: 'Erro ao processar imagem',
          description: 'Não foi possível redimensionar a imagem. Tente um arquivo diferente.'
        });
      } finally {
        setIsSaving(false);
      }
    }
  };

  const handleNameChange = (newName: string, mapId: string) => {
    setMaps(prevMaps =>
      prevMaps.map(m => m.id === mapId ? { ...m, name: newName } : m)
    );
  };
  
  const handleRemoveImage = (mapId: string) => {
    setMaps(prevMaps => 
      prevMaps.map(m => m.id === mapId ? { ...m, url: null } : m)
    );
    const ref = fileInputRefs[mapId as keyof typeof fileInputRefs];
    if (ref.current) {
        ref.current.value = "";
    }
  };

  const handleSaveMaps = async () => {
    const settingsDocRef = getSettingsDocRef();
    if (!settingsDocRef) {
      toast({ variant: 'destructive', title: 'Erro', description: 'Usuário não autenticado.' });
      return;
    }

    setIsSaving(true);
    try {
       const mapsToSave = maps.map(m => ({
            id: m.id,
            name: m.name.trim() || `Mapa ${m.id.replace('map', '')}`,
            url: m.url
       }));

       // Ensure backward compatibility by also saving the first map's URL to the old field.
       const primaryMapUrl = mapsToSave.find(m => m.id === 'map1')?.url || null;

      await setDoc(settingsDocRef, { 
          maps: mapsToSave,
          mapUrl: primaryMapUrl // Keep the old field updated
      }, { merge: true });
      toast({ title: 'Sucesso!', description: 'Os mapas foram salvos.' });
    } catch (error: any) {
      console.error("Error saving maps:", error);
      toast({ variant: 'destructive', title: 'Erro ao salvar', description: error.message || 'Não foi possível salvar os mapas.' });
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
        <Card className="w-full">
            <CardHeader>
                <Skeleton className="h-6 w-1/2" />
                <Skeleton className="h-4 w-3/4" />
            </CardHeader>
            <CardContent className="space-y-8">
               <Skeleton className="h-48 w-full" />
               <Skeleton className="h-48 w-full" />
               <Skeleton className="h-48 w-full" />
            </CardContent>
             <CardFooter>
                 <Skeleton className="h-10 w-32" />
            </CardFooter>
        </Card>
    );
  }

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle>Gerenciar Mapas</CardTitle>
        <CardDescription>
          Faça o upload de até 3 imagens (planta baixa, mapa, etc.) para usar como base para marcações de ocorrências.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-8">
        {maps.map((map, index) => (
          <div key={map.id}>
             <div className="space-y-4">
                <div className='space-y-2'>
                    <Label htmlFor={`map-name-${map.id}`}>Nome do Mapa {index + 1}</Label>
                    <Input 
                        id={`map-name-${map.id}`}
                        value={map.name}
                        onChange={(e) => handleNameChange(e.target.value, map.id)}
                        placeholder={`Nome para o Mapa ${index + 1}`}
                    />
                </div>
              <Label>Imagem do Mapa</Label>
              <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
                {map.url ? (
                  <div className="relative">
                    <NextImage src={map.url} alt={`Pré-visualização do ${map.name}`} width={128} height={128} className="rounded-md border object-contain" />
                    <Button
                      variant="destructive"
                      size="icon"
                      className="absolute -right-2 -top-2 h-6 w-6 rounded-full"
                      onClick={() => handleRemoveImage(map.id)}
                      disabled={isSaving}
                      aria-label={`Remover ${map.name}`}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                ) : (
                  <div className="flex h-32 w-32 items-center justify-center rounded-md border border-dashed">
                    <span className="text-center text-xs text-muted-foreground">Sem mapa</span>
                  </div>
                )}
                <div className='flex flex-col gap-2'>
                    <Button 
                        variant="outline" 
                        onClick={() => fileInputRefs[map.id as keyof typeof fileInputRefs].current?.click()} 
                        disabled={isSaving}>
                      {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Upload className="mr-2 h-4 w-4" />}
                      Carregar Imagem
                    </Button>
                    <p className="text-xs text-muted-foreground">Recomendado: Imagem com boa resolução, máx 10MB.</p>
                </div>
                <Input
                  type="file"
                  ref={fileInputRefs[map.id as keyof typeof fileInputRefs]}
                  className="hidden"
                  onChange={(e) => handleFileChange(e, map.id)}
                  accept="image/png, image/jpeg, image/gif, image/svg+xml"
                />
              </div>
            </div>
            {index < maps.length - 1 && <Separator className="mt-8" />}
          </div>
        ))}
      </CardContent>
      <CardFooter>
          <Button onClick={handleSaveMaps} disabled={isSaving}>
            {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
            {isSaving ? 'Salvando...' : 'Salvar Alterações'}
          </Button>
      </CardFooter>
    </Card>
  );
}
