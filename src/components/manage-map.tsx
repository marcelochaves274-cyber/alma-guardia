
'use client';

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
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
  uploadBytes,
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

  const [maps, setMaps] = useState<MapInfo[]>([]);
  const [originalMaps, setOriginalMaps] = useState<MapInfo[]>([]);
  const [stagedFiles, setStagedFiles] = useState<Record<string, File | null>>({});
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

  // Fetch initial map data
  useEffect(() => {
    if (isUserLoading || !user || !firestore) {
      if (!isUserLoading) setIsLoading(false);
      return;
    }

    const settingsDocRef = getSettingsDocRef();
    if (!settingsDocRef) return;

    setIsLoading(true);
    getDoc(settingsDocRef)
      .then((docSnap) => {
        const defaultMaps: MapInfo[] = [
          { id: 'map1', name: 'Mapa 1', url: null },
          { id: 'map2', name: 'Mapa 2', url: null },
          { id: 'map3', name: 'Mapa 3', url: null },
        ];

        if (docSnap.exists()) {
          const data = docSnap.data();
          if (data.maps && Array.isArray(data.maps)) {
            data.maps.forEach((fm: MapInfo) => {
              const index = defaultMaps.findIndex((m) => m.id === fm.id);
              if (index !== -1) {
                defaultMaps[index] = { ...defaultMaps[index], name: fm.name || `Mapa ${index + 1}`, url: fm.url };
              }
            });
          }
        }
        setMaps(defaultMaps);
        setOriginalMaps(JSON.parse(JSON.stringify(defaultMaps)));
      })
      .catch((error: any) => {
        if (error.code !== 'permission-denied') console.error('Error fetching maps:', error);
      })
      .finally(() => setIsLoading(false));
  }, [user, firestore, isUserLoading, getSettingsDocRef]);

  // Cleanup blob URLs on unmount
  useEffect(() => {
    return () => {
      maps.forEach(map => {
        if (map.url && map.url.startsWith('blob:')) {
          URL.revokeObjectURL(map.url);
        }
      });
    };
  }, [maps]);


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
      
      setStagedFiles(prev => ({ ...prev, [mapId]: file }));
      
      const objectUrl = URL.createObjectURL(file);
      setMaps((prevMaps) => {
        // Clean up old blob URL if it exists
        const oldMap = prevMaps.find(m => m.id === mapId);
        if (oldMap?.url && oldMap.url.startsWith('blob:')) {
            URL.revokeObjectURL(oldMap.url);
        }
        return prevMaps.map((m) =>
          m.id === mapId ? { ...m, url: objectUrl } : m
        );
      });
    }
  };

  const handleNameChange = (newName: string, mapId: string) => {
    setMaps((prevMaps) =>
      prevMaps.map((m) => (m.id === mapId ? { ...m, name: newName } : m))
    );
  };

  const handleRemoveImage = (mapId: string) => {
    setStagedFiles(prev => ({ ...prev, [mapId]: null }));
    setMaps((prevMaps) => {
        const mapToRemove = prevMaps.find(m => m.id === mapId);
        if (mapToRemove?.url && mapToRemove.url.startsWith('blob:')) {
            URL.revokeObjectURL(mapToRemove.url);
        }
        return prevMaps.map((m) => (m.id === mapId ? { ...m, url: null } : m))
    });
    const ref = fileInputRefs[mapId as keyof typeof fileInputRefs];
    if (ref.current) {
      ref.current.value = '';
    }
  };

  const handleSaveMap = async (mapId: string) => {
    const settingsDocRef = getSettingsDocRef();
    if (!user || !firestore || !firebaseApp || !settingsDocRef) {
      toast({ variant: 'destructive', title: 'Erro', description: 'Aplicação não inicializada corretamente.' });
      return;
    }
    
    setSavingState(s => ({ ...s, [mapId]: true }));
    
    const fileToUpload = stagedFiles[mapId];
    const currentMapState = maps.find(m => m.id === mapId);
    const originalMapState = originalMaps.find(m => m.id === mapId);

    if (!currentMapState) {
        setSavingState(s => ({ ...s, [mapId]: false }));
        return;
    }

    let finalUrl = currentMapState.url;

    try {
        const storage = getStorage(firebaseApp);
        
        // Scenario 1: A new file is staged for upload.
        if (fileToUpload) {
            // Delete old file from storage if it exists
            if (originalMapState?.url) {
                try {
                    await deleteObject(storageRef(storage, originalMapState.url));
                } catch (delError: any) {
                    if (delError.code !== 'storage/object-not-found') {
                        console.warn("Could not delete old file from storage:", delError);
                    }
                }
            }
            
            const newImageRef = storageRef(storage, `maps/${user.uid}/${mapId}-${Date.now()}`);
            const uploadResult = await uploadBytes(newImageRef, fileToUpload);
            finalUrl = await getDownloadURL(uploadResult.ref);
        }
        // Scenario 2: An existing image was removed (but no new one was staged).
        else if (!currentMapState.url && originalMapState?.url) {
            finalUrl = null;
            try {
                await deleteObject(storageRef(storage, originalMapState.url));
            } catch (delError: any) {
                if (delError.code !== 'storage/object-not-found') {
                     console.warn("Could not delete old file from storage:", delError);
                }
            }
        }
        
        const updatedMapData: MapInfo = {
            id: currentMapState.id,
            name: currentMapState.name.trim() || `Mapa ${currentMapState.id.replace('map', '')}`,
            url: finalUrl,
        };

        const docSnap = await getDoc(settingsDocRef);
        const allMapsData = docSnap.exists() ? (docSnap.data().maps || []) : [];
        const mapIndex = allMapsData.findIndex((m: MapInfo) => m.id === mapId);
        
        if (mapIndex > -1) {
            allMapsData[mapIndex] = updatedMapData;
        } else {
            allMapsData.push(updatedMapData);
        }
        
        await setDoc(settingsDocRef, { maps: allMapsData }, { merge: true });

        // Update local state to reflect successful save
        const newMapsArray = maps.map(m => m.id === mapId ? updatedMapData : m);
        setMaps(newMapsArray);
        setOriginalMaps(JSON.parse(JSON.stringify(newMapsArray)));
        setStagedFiles(prev => ({...prev, [mapId]: null})); // Clear staged file

        toast({ title: 'Sucesso!', description: `O mapa "${updatedMapData.name}" foi salvo.` });

    } catch (error: any) {
      console.error(`Error saving map ${mapId}:`, error);
      toast({ variant: 'destructive', title: 'Erro ao salvar', description: error.message || 'Não foi possível salvar o mapa. Verifique as permissões e tente novamente.' });
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
                       <Upload className="mr-2 h-4 w-4" />
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
                    accept="image/png, image/jpeg, image/gif, image/webp"
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
