
'use client';

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useState, useEffect, useRef, useCallback } from 'react';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Upload, X } from 'lucide-react';
import NextImage from 'next/image';
import { Skeleton } from './ui/skeleton';
import { useFirestore, useUser } from '@/firebase';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { APIProvider, Map, AdvancedMarker, Pin } from '@vis.gl/react-google-maps';
import { doc, getDoc, setDoc } from 'firebase/firestore';

export function ManageMap() {
  const { toast } = useToast();
  const firestore = useFirestore();
  const { user, isUserLoading } = useUser();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [mapUrl, setMapUrl] = useState<string | null>(null);
  const [latitude, setLatitude] = useState<string>('');
  const [longitude, setLongitude] = useState<string>('');
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isMapModalOpen, setIsMapModalOpen] = useState(false);
  const [tempMarker, setTempMarker] = useState<{ lat: number; lng: number } | null>(null);

  // A chave de API deve ser carregada de variáveis de ambiente e não exposta no lado do cliente.
  const GOOGLE_MAPS_API_KEY = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;

  const getSettingsDocRef = useCallback(() => {
    if (!firestore || !user) return null;
    return doc(firestore, 'sgs_genius', user.uid, 'settings', 'mapDetails');
  }, [firestore, user]);

  useEffect(() => {
    if (isUserLoading || !user) {
      if (!isUserLoading) setIsLoading(false);
      return;
    }

    const settingsDocRef = getSettingsDocRef();
    if (!settingsDocRef) return;

    setIsLoading(true);
    getDoc(settingsDocRef)
      .then((docSnap) => {
        if (docSnap.exists()) {
          const data = docSnap.data();
          setMapUrl(data.mapUrl || null);
          if (data.defaultCenter) {
            setLatitude(data.defaultCenter.lat.toString());
            setLongitude(data.defaultCenter.lng.toString());
            setTempMarker(data.defaultCenter);
          }
        }
      })
      .catch((error: any) => {
        if (error.code !== 'permission-denied') console.error('Error fetching map:', error);
      })
      .finally(() => setIsLoading(false));
  }, [user, isUserLoading, getSettingsDocRef]);

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      // Limite de 800KB para segurança, pois o Firestore aceita documentos de até 1MB
      if (file.size > 0.8 * 1024 * 1024) { 
        toast({
          variant: 'destructive',
          title: 'Imagem muito pesada',
          description: 'Para salvar no banco de dados, a imagem deve ter menos de 800KB.',
        });
        return;
      }
      const reader = new FileReader();
      reader.onloadend = () => {
        setMapUrl(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSaveMap = async () => {
    const settingsDocRef = getSettingsDocRef();
    if (!settingsDocRef) {
      toast({ variant: 'destructive', title: 'Erro', description: 'Usuário não autenticado.' });
      return;
    }

    setIsSaving(true);

    try {
      let defaultCenter = null;
      if (latitude && longitude) {
        const lat = parseFloat(latitude.replace(',', '.'));
        const lng = parseFloat(longitude.replace(',', '.'));
        if (!isNaN(lat) && !isNaN(lng)) {
          defaultCenter = { lat, lng };
        } else {
          toast({
            variant: 'destructive',
            title: 'Coordenadas Inválidas', description: 'Por favor, insira valores numéricos para latitude e longitude.',
          });
          setIsSaving(false);
          return;
        }
      }


      await setDoc(settingsDocRef, { mapUrl: mapUrl, defaultCenter: defaultCenter }, { merge: true });
      toast({ title: 'Sucesso!', description: 'O mapa foi salvo.' });
    } catch (error: any) {
      console.error('Error saving map:', error);
      // This is a more specific error message for the old method.
      if (error.code === 'invalid-argument') {
          toast({
            variant: 'destructive',
            title: 'Erro: Arquivo Muito Grande',
            description: 'O arquivo de imagem é muito grande para ser salvo diretamente. Tente uma imagem menor (abaixo de 1MB).',
          });
      } else {
         toast({
            variant: 'destructive',
            title: 'Erro ao Salvar Mapa',
            description: 'Não foi possível salvar o mapa. Verifique sua conexão e tente novamente.',
          });
      }
    } finally {
      setIsSaving(false);
    }
  };
  
  const handleRemoveImage = () => {
    setMapUrl(null);
    if(fileInputRef.current) {
        fileInputRef.current.value = "";
    }
  }

  const handleMapClickInModal = (e: any) => {
    if (e.detail.latLng) {
      setTempMarker({
        lat: e.detail.latLng.lat,
        lng: e.detail.latLng.lng,
      });
    }
  };

  const handleConfirmSelection = () => {
    if (tempMarker) {
      setLatitude(tempMarker.lat.toString());
      setLongitude(tempMarker.lng.toString());
    }
    setIsMapModalOpen(false);
  };

  if (isLoading) {
    return (
      <Card className="w-full">
        <CardHeader>
          <Skeleton className="h-6 w-1/2" />
          <Skeleton className="h-4 w-3/4" />
        </CardHeader>
        <CardContent>
          <Skeleton className="h-48 w-full" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle>Gerenciar Mapa</CardTitle>
        <CardDescription>
          Faça o upload da imagem que será usada como base para marcações de ocorrências e riscos.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-8">
        <div className="space-y-4 rounded-lg border p-4">
          <div className="flex flex-col items-start gap-4 sm:flex-row sm:items-center">
            {mapUrl ? (
              <div className="relative">
                <NextImage
                  src={mapUrl}
                  alt="Pré-visualização do Mapa"
                  width={128}
                  height={128}
                  className="rounded-md border object-contain"
                />
                <Button
                  variant="destructive"
                  size="icon"
                  className="absolute -right-2 -top-2 h-6 w-6 rounded-full"
                  onClick={handleRemoveImage}
                  disabled={isSaving}
                  aria-label="Remover Mapa"
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
                onClick={() => fileInputRef.current?.click()}
                disabled={isSaving}
              >
                 <Upload className="mr-2 h-4 w-4" />
                Carregar Imagem
              </Button>
              <input
                type="file"
                ref={fileInputRef}
                className="hidden"
                onChange={handleFileChange}
                accept="image/png, image/jpeg, image/gif, image/webp"
              />
              <p className="text-xs text-muted-foreground">
                Recomendado: Imagem com boa resolução, máx 800KB.
              </p>
            </div>
          </div>
        </div>

        <div className="space-y-4 rounded-lg border p-4">
            <div className="space-y-2">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                <h4 className="font-medium">Centro Padrão do Mapa Georreferenciado</h4>
                <Dialog open={isMapModalOpen} onOpenChange={setIsMapModalOpen}>
                  <DialogTrigger asChild>
                    <Button variant="outline" type="button">Selecionar no Mapa</Button>
                  </DialogTrigger>
                  <DialogContent className="max-w-4xl h-[80vh] flex flex-col p-0">
                    <DialogHeader className="p-6 pb-0">
                      <DialogTitle>Selecione o Ponto Central</DialogTitle>
                      <DialogDescription>
                        Clique no mapa para definir a localização inicial padrão do mapa georreferenciado.
                      </DialogDescription>
                    </DialogHeader>
                    <div className="flex-1 px-6 pb-6">
                      {GOOGLE_MAPS_API_KEY ? (
                        <APIProvider apiKey={GOOGLE_MAPS_API_KEY}>
                          <div className="w-full h-full rounded-md overflow-hidden border">
                            <Map
                              defaultCenter={tempMarker || { lat: -25.0945, lng: -50.1633 }}
                              defaultZoom={13}
                              gestureHandling={'greedy'}
                              disableDefaultUI={true}
                              mapId="b3b3c3e8f9b9a9e"
                              mapTypeId={'satellite'}
                              onClick={handleMapClickInModal}
                            >
                              {tempMarker && (
                                <AdvancedMarker position={tempMarker}>
                                  <Pin scale={0.8} />
                                </AdvancedMarker>
                              )}
                            </Map>
                          </div>
                        </APIProvider>
                      ) : (
                        <div className="flex items-center justify-center w-full h-full bg-muted border rounded-md">
                          <p className="text-center text-destructive">
                            A chave de API do Google Maps não foi configurada.
                          </p>
                        </div>
                      )}
                    </div>
                    <DialogFooter className="p-6 pt-0 border-t">
                      <Button variant="outline" onClick={() => setIsMapModalOpen(false)}>Cancelar</Button>
                      <Button onClick={handleConfirmSelection} disabled={!tempMarker}>Confirmar Seleção</Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-4">
                <div className="space-y-1">
                  <Label htmlFor="latitude-display">Latitude</Label>
                  <p id="latitude-display" className="text-sm font-mono p-2 border rounded-md bg-muted h-10 flex items-center">
                    {latitude || 'Não definida'}
                  </p>
                </div>
                <div className="space-y-1">
                  <Label htmlFor="longitude-display">Longitude</Label>
                  <p id="longitude-display" className="text-sm font-mono p-2 border rounded-md bg-muted h-10 flex items-center">
                    {longitude || 'Não definida'}
                  </p>
                </div>
              </div>
              <p className="text-xs text-muted-foreground">
                Insira as coordenadas para o centro inicial do mapa georreferenciado.
              </p>
            </div>
        </div>
        <div className="flex justify-end">
          <Button onClick={handleSaveMap} disabled={isSaving}>
              {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              {isSaving ? 'Salvando...' : 'Salvar Configurações'}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
