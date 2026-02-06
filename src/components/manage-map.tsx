
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

  const [maps, setMaps] = useState<MapInfo[]>([
    { id: 'map1', name: 'Mapa 1', url: null },
    { id: 'map2', name: 'Mapa 2', url: null },
    { id: 'map3', name: 'Mapa 3', url: null },
  ]);
  const [originalMaps, setOriginalMaps] = useState<MapInfo[]>([]);
  const [savingState, setSavingState] = useState<Record<string, boolean>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [mapFiles, setMapFiles] = useState<Record<string, File | null>>({});

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

  // Fetches initial map configuration from Firestore
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
        const newMapsState: MapInfo[] = [
          { id: 'map1', name: 'Mapa 1', url: null },
          { id: 'map2', name: 'Mapa 2', url: null },
          { id: 'map3', name: 'Mapa 3', url: null },
        ];

        if (docSnap.exists()) {
          const data = docSnap.data();
          // New structure with 'maps' array
          if (data.maps && Array.isArray(data.maps)) {
            data.maps.forEach((fm: MapInfo) => {
              const index = newMapsState.findIndex((m) => m.id === fm.id);
              if (index !== -1) {
                newMapsState[index] = { ...newMapsState[index], name: fm.name || `Mapa ${index + 1}`, url: fm.url };
              }
            });
          } else if (data.mapUrl) {
            // Backwards compatibility for old structure
            newMapsState[0] = { id: 'map1', name: data.mapName || 'Mapa Principal', url: data.mapUrl };
          }
        }
        setMaps(newMapsState);
        setOriginalMaps(JSON.parse(JSON.stringify(newMapsState)));
      })
      .catch((error: any) => {
        if (error.code !== 'permission-denied') console.error('Error fetching maps:', error);
      })
      .finally(() => setIsLoading(false));
  }, [user, firestore, isUserLoading, getSettingsDocRef]);

  // Clean up object URLs to prevent memory leaks
  useEffect(() => {
    const objectUrls = maps.map(map => map.url).filter(url => url && url.startsWith('blob:'));
    return () => {
      objectUrls.forEach(url => url && URL.revokeObjectURL(url));
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
      
      setMapFiles(prev => ({ ...prev, [mapId]: file }));

      const objectUrl = URL.createObjectURL(file);
      setMaps((prevMaps) => {
          const oldUrl = prevMaps.find(m => m.id === mapId)?.url;
          if (oldUrl && oldUrl.startsWith('blob:')) {
              URL.revokeObjectURL(oldUrl);
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
    setMapFiles(prev => ({ ...prev, [mapId]: null }));
    setMaps((prevMaps) => {
        const oldUrl = prevMaps.find(m => m.id === mapId)?.url;
        if (oldUrl && oldUrl.startsWith('blob:')) {
            URL.revokeObjectURL(oldUrl);
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
    if (!settingsDocRef || !user) {
      toast({ variant: 'destructive', title: 'Erro', description: 'Usuário não autenticado.' });
      return;
    }

    setSavingState(s => ({ ...s, [mapId]: true }));
    
    const storage = getStorage(firebaseApp);
    const currentMap = maps.find(m => m.id === mapId);
    const originalMap = originalMaps.find(m => m.id === mapId);
    const fileToUpload = mapFiles[mapId];

    if (!currentMap) {
        setSavingState(s => ({ ...s, [mapId]: false }));
        return;
    }

    try {
        let finalUrl = currentMap.url;
        const originalUrl = originalMap?.url;
        
        // A new file was selected for upload
        if (fileToUpload) {
            if (originalUrl && !originalUrl.startsWith('blob:')) {
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
            const uploadResult = await uploadBytes(newImageRef, fileToUpload);
            finalUrl = await getDownloadURL(uploadResult.ref);
        } 
        // The image was removed
        else if (originalUrl && !currentMap.url) {
             if (!originalUrl.startsWith('blob:')) {
                try {
                    const oldRef = storageRef(storage, originalUrl);
                    await deleteObject(oldRef);
                } catch (error: any) {
                    if (error.code !== 'storage/object-not-found') {
                        console.warn(`Could not delete old map ${mapId}:`, error);
                    }
                }
             }
        }

        const updatedMapData = {
            id: currentMap.id,
            name: currentMap.name.trim() || `Mapa ${currentMap.id.replace('map', '')}`,
            url: finalUrl && !finalUrl.startsWith('blob:') ? finalUrl : null,
        };
        
        const docSnap = await getDoc(settingsDocRef);
        const firestoreMapsRaw = docSnap.exists() ? (docSnap.data().maps || []) : [];

        let newMapsForFirestore: MapInfo[] = [...firestoreMapsRaw];
        const existingMapIndex = newMapsForFirestore.findIndex(m => m.id === mapId);

        if (existingMapIndex > -1) {
            newMapsForFirestore[existingMapIndex] = updatedMapData;
        } else {
            newMapsForFirestore.push(updatedMapData);
        }

        const primaryMapUrl = newMapsForFirestore.find(m => m.id === 'map1')?.url || null;
        await setDoc(settingsDocRef, { maps: newMapsForFirestore, mapUrl: primaryMapUrl }, { merge: true });

        setMaps(prevMaps => prevMaps.map(m => m.id === mapId ? updatedMapData : m));
        setOriginalMaps(prev => prev.map(m => m.id === mapId ? updatedMapData : m));
        setMapFiles(prev => ({...prev, [mapId]: null}));

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
                    accept="image/png, image/jpeg, image/gif"
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
