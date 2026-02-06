
'use client';

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  CardFooter,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  useState,
  useEffect,
  useRef,
  useCallback,
  type ChangeEvent,
} from 'react';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Upload, X } from 'lucide-react';
import NextImage from 'next/image';
import { Skeleton } from './ui/skeleton';
import { useFirebaseApp, useFirestore, useUser } from '@/firebase';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import {
  getStorage,
  ref as storageRef,
  uploadString,
  getDownloadURL,
  deleteObject,
} from 'firebase/storage';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Separator } from './ui/separator';

interface MapInfo {
  id: string;
  name: string;
  url: string | null;
}

export function ManageMap() {
  const { toast } = useToast();

  const [maps, setMaps] = useState<MapInfo[]>([
    { id: 'map1', name: 'Mapa 1', url: null },
    { id: 'map2', name: 'Mapa 2', url: null },
    { id: 'map3', name: 'Mapa 3', url: null },
  ]);
  const [originalMaps, setOriginalMaps] = useState<MapInfo[]>([]);
  const [savingState, setSavingState] = useState<Record<string, boolean>>({});
  const [isLoading, setIsLoading] = useState(true);

  const fileInputRefs = {
    map1: useRef<HTMLInputElement>(null),
    map2: useRef<HTMLInputElement>(null),
    map3: useRef<HTMLInputElement>(null),
  };

  const firestore = useFirestore();
  const firebaseApp = useFirebaseApp();
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
          const newMapsState: MapInfo[] = [
            { id: 'map1', name: 'Mapa 1', url: null },
            { id: 'map2', name: 'Mapa 2', url: null },
            { id: 'map3', name: 'Mapa 3', url: null },
          ];

          if (docSnap.exists()) {
            const data = docSnap.data();
            if (data.maps && Array.isArray(data.maps) && data.maps.length > 0) {
              data.maps.forEach((fm: MapInfo) => {
                const index = newMapsState.findIndex((m) => m.id === fm.id);
                if (index !== -1) {
                  newMapsState[index] = { ...newMapsState[index], name: fm.name, url: fm.url };
                }
              });
            } else if (data.mapUrl) {
              // Compatibility for old structure
              newMapsState[0] = { id: 'map1', name: data.mapName || 'Mapa Principal', url: data.mapUrl };
            }
          }
          setMaps(newMapsState);
          setOriginalMaps(JSON.parse(JSON.stringify(newMapsState)));
        }
      })
      .catch((error: any) => {
        if (error.code !== 'permission-denied') {
          console.error('Error fetching maps:', error);
        }
      })
      .finally(() => {
        if (isMounted) setIsLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, [user, firestore, isUserLoading, getSettingsDocRef]);

  const handleFileChange = (
    event: ChangeEvent<HTMLInputElement>,
    mapId: string
  ) => {
    const file = event.target.files?.[0];
    if (file) {
      if (file.size > 2 * 1024 * 1024) { // 2MB limit
        toast({
          variant: 'destructive',
          title: 'Arquivo muito grande',
          description: 'Por favor, escolha uma imagem menor que 2MB.',
        });
        return;
      }
      
      const reader = new FileReader();
      reader.onloadend = () => {
        const result = reader.result as string;
        if (result) {
            setMaps((prevMaps) =>
                prevMaps.map((m) =>
                    m.id === mapId ? { ...m, url: result } : m
                )
            );
        } else {
           toast({
            variant: 'destructive',
            title: 'Erro de leitura',
            description: 'Não foi possível ler o arquivo de imagem.',
          });
        }
      };
       reader.onerror = () => {
        toast({
          variant: 'destructive',
          title: 'Erro de leitura',
          description: 'Ocorreu um erro ao tentar ler o arquivo.',
        });
      };
      reader.readAsDataURL(file);
    }
  };
  
  const handleNameChange = (newName: string, mapId: string) => {
    setMaps((prevMaps) =>
      prevMaps.map((m) => (m.id === mapId ? { ...m, name: newName } : m))
    );
  };

  const handleRemoveImage = (mapId: string) => {
    setMaps((prevMaps) =>
      prevMaps.map((m) => (m.id === mapId ? { ...m, url: null } : m))
    );
    const ref = fileInputRefs[mapId as keyof typeof fileInputRefs];
    if (ref.current) {
      ref.current.value = '';
    }
  };

  const handleSaveMap = async (mapId: string) => {
    const settingsDocRef = getSettingsDocRef();
    if (!settingsDocRef || !user) {
      toast({ variant: 'destructive', title: 'Erro', description: 'Usuário não autenticado.' });
      return;
    }

    setSavingState(s => ({ ...s, [mapId]: true }));
    
    const storage = getStorage(firebaseApp);
    const currentMap = maps.find(m => m.id === mapId);
    const originalMap = originalMaps.find(m => m.id === mapId);

    if (!currentMap) {
        setSavingState(s => ({ ...s, [mapId]: false }));
        return;
    }

    try {
        let finalUrl = currentMap.url;
        const originalUrl = originalMap?.url;

        // Handle image removal from storage
        if (originalUrl && !currentMap.url) {
            try {
                const oldRef = storageRef(storage, originalUrl);
                await deleteObject(oldRef);
            } catch (error: any) {
                if (error.code !== 'storage/object-not-found') {
                    console.warn(`Could not delete old map ${mapId}:`, error);
                }
            }
        }
        
        // Handle image addition/change in storage
        if (currentMap.url && currentMap.url.startsWith('data:')) {
            if (originalUrl) {
                try {
                    const oldRef = storageRef(storage, originalUrl);
                    await deleteObject(oldRef);
                } catch (error: any) {
                    if (error.code !== 'storage/object-not-found') {
                        console.warn(`Could not delete old map ${mapId}:`, error);
                    }
                }
            }
            const newImageRef = storageRef(storage, `maps/${user.uid}/${mapId}-${Date.now()}`);
            const uploadResult = await uploadString(newImageRef, currentMap.url, 'data_url');
            finalUrl = await getDownloadURL(uploadResult.ref);
        }

        const updatedMapData = {
            id: currentMap.id,
            name: currentMap.name.trim() || `Mapa ${currentMap.id.replace('map', '')}`,
            url: finalUrl,
        };
        
        // Atomically update Firestore document
        const docSnap = await getDoc(settingsDocRef);
        const firestoreMapsRaw = docSnap.exists() ? (docSnap.data().maps || []) : [];

        let newMapsForFirestore: MapInfo[] = [...firestoreMapsRaw];
        const existingMapIndex = newMapsForFirestore.findIndex(m => m.id === mapId);

        if (existingMapIndex > -1) {
            newMapsForFirestore[existingMapIndex] = updatedMapData;
        } else {
            newMapsForFirestore.push(updatedMapData);
        }
        
        // Ensure all map slots are present
        const allMapIds = ['map1', 'map2', 'map3'];
        allMapIds.forEach(id => {
          if (!newMapsForFirestore.some(m => m.id === id)) {
            const currentMapInState = maps.find(m => m.id === id);
            newMapsForFirestore.push({
              id: id,
              name: currentMapInState?.name || `Mapa ${id.replace('map', '')}`,
              url: currentMapInState?.url && !currentMapInState.url.startsWith('data:') ? currentMapInState.url : null
            });
          }
        });
        
        const primaryMapUrl = newMapsForFirestore.find(m => m.id === 'map1')?.url || null;
        await setDoc(settingsDocRef, { maps: newMapsForFirestore, mapUrl: primaryMapUrl }, { merge: true });

        // Update local state to reflect saved changes
        setMaps(newMapsForFirestore);
        setOriginalMaps(JSON.parse(JSON.stringify(newMapsForFirestore)));

        toast({ title: 'Sucesso!', description: `O mapa "${updatedMapData.name}" foi salvo.` });

    } catch (error: any) {
      console.error(`Error saving map ${mapId}:`, error);
      toast({ variant: 'destructive', title: 'Erro ao salvar', description: error.message || `Não foi possível salvar o mapa.` });
    } finally {
      setSavingState(s => ({ ...s, [mapId]: false }));
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
      </Card>
    );
  }

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle>Gerenciar Mapas</CardTitle>
        <CardDescription>
          Faça o upload de até 3 imagens (planta baixa, mapa, etc.) para usar
          como base para marcações de ocorrências. Salve cada mapa individualmente.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-8">
        {maps.map((map, index) => {
          const isMapSaving = savingState[map.id] || false;
          return (
            <div key={map.id}>
              <div className="space-y-4 rounded-lg border p-4">
                <div className="space-y-2">
                  <Label htmlFor={`map-name-${map.id}`}>
                    Nome do Mapa {index + 1}
                  </Label>
                  <Input
                    id={`map-name-${map.id}`}
                    value={map.name}
                    onChange={(e) => handleNameChange(e.target.value, map.id)}
                    placeholder={`Nome para o Mapa ${index + 1}`}
                    disabled={isMapSaving}
                  />
                </div>
                <Label>Imagem do Mapa</Label>
                <div className="flex flex-col items-start gap-4 sm:flex-row sm:items-center">
                  {map.url ? (
                    <div className="relative">
                      <NextImage
                        src={map.url}
                        alt={`Pré-visualização do ${map.name}`}
                        width={128}
                        height={128}
                        className="rounded-md border object-contain"
                      />
                      <Button
                        variant="destructive"
                        size="icon"
                        className="absolute -right-2 -top-2 h-6 w-6 rounded-full"
                        onClick={() => handleRemoveImage(map.id)}
                        disabled={isMapSaving}
                        aria-label={`Remover ${map.name}`}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  ) : (
                    <div className="flex h-32 w-32 items-center justify-center rounded-md border border-dashed">
                      <span className="text-center text-xs text-muted-foreground">
                        Sem mapa
                      </span>
                    </div>
                  )}
                  <div className="flex flex-col gap-2">
                    <Button
                      variant="outline"
                      type="button"
                      onClick={() =>
                        fileInputRefs[map.id as keyof typeof fileInputRefs].current?.click()
                      }
                      disabled={isMapSaving}
                    >
                      Carregar Imagem
                    </Button>
                    <p className="text-xs text-muted-foreground">
                      Recomendado: Imagem com boa resolução, máx 2MB.
                    </p>
                  </div>
                  <Input
                    type="file"
                    ref={fileInputRefs[map.id as keyof typeof fileInputRefs]}
                    className="hidden"
                    onChange={(e) => handleFileChange(e, map.id)}
                    accept="image/png, image/jpeg, image/gif, image/svg+xml"
                  />
                </div>
                 <div className="flex justify-end">
                    <Button onClick={() => handleSaveMap(map.id)} disabled={isMapSaving}>
                        {isMapSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                        {isMapSaving ? 'Salvando...' : 'Salvar Mapa'}
                    </Button>
                 </div>
              </div>
              {index < maps.length - 1 && <Separator className="mt-8" />}
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}
