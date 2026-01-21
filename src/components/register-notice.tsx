
'use client';

import { useState, useEffect, useCallback, useRef, type MouseEvent, ChangeEvent } from 'react';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  CardFooter
} from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { cn } from '@/lib/utils';
import { Calendar as CalendarIcon, Loader2, MapPin, X, Upload } from 'lucide-react';
import { format, setHours, setMinutes } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { useFirestore, useUser } from '@/firebase';
import { doc, getDoc, addDoc, updateDoc, collection, serverTimestamp, Timestamp } from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';
import Image from 'next/image';
import { Separator } from './ui/separator';
import { HelpTooltip } from './ui/help-tooltip';

type Marker = { x: number; y: number } | null;

interface RegisterNoticeProps {
  noticeToEdit: any | null;
  setPage: (page: string) => void;
}

const resizeImage = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (event) => {
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
        // Use JPEG with quality 0.8 for smaller size, which is great for photos.
        const dataUrl = canvas.toDataURL('image/jpeg', 0.8);
        resolve(dataUrl);
      };
      img.onerror = reject;
      img.src = event.target?.result as string;
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
};


export function RegisterNotice({ noticeToEdit, setPage }: RegisterNoticeProps) {
  const isEditing = !!noticeToEdit;

  // Form states
  const [collaboratorName, setCollaboratorName] = useState('');
  const [noticeDate, setNoticeDate] = useState<Date | undefined>();
  const [noticeTime, setNoticeTime] = useState('12:00');
  const [weather, setWeather] = useState('');
  const [description, setDescription] = useState('');
  const [location, setLocation] = useState('');
  const [marker, setMarker] = useState<Marker>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);


  // UI/Data loading states
  const [isCalendarOpen, setIsCalendarOpen] = useState(false);
  const [locations, setLocations] = useState<string[]>([]);
  const [isLoadingLocations, setIsLoadingLocations] = useState(true);
  const [mapUrl, setMapUrl] = useState<string | null>(null);
  const [isLoadingMap, setIsLoadingMap] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const mapContainerRef = useRef<HTMLDivElement>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);
  
  const firestore = useFirestore();
  const { user } = useUser();
  const { toast } = useToast();

  useEffect(() => {
    if (isEditing && noticeToEdit) {
      const date = noticeToEdit.noticeDate;
      const loadedDate = date instanceof Timestamp ? date.toDate() : date;
      setNoticeDate(loadedDate);
      if(loadedDate){
        setNoticeTime(format(loadedDate, 'HH:mm'));
      }
      setCollaboratorName(noticeToEdit.collaboratorName || '');
      setWeather(noticeToEdit.weather || '');
      setDescription(noticeToEdit.description || '');
      setLocation(noticeToEdit.location || '');
      setMarker(noticeToEdit.mapMarker || null);
      setImagePreview(noticeToEdit.imageUrl || null);
    }
  }, [isEditing, noticeToEdit]);

  const getSettingsDocRef = useCallback((collectionName: string) => {
    if (!firestore || !user) return null;
    return doc(firestore, 'sgs_genius', user.uid, 'settings', collectionName);
  }, [firestore, user]);

  useEffect(() => {
    const fetchLocations = async () => {
      const docRef = getSettingsDocRef('locations');
      if (!docRef) {
        setIsLoadingLocations(false);
        return;
      }
      try {
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
          const data = docSnap.data();
          setLocations((data.locations || []).sort((a: string, b: string) => a.localeCompare(b)));
        }
      } catch (error) {
        console.error(`Error fetching locations:`, error);
        toast({
          variant: "destructive",
          title: "Erro ao carregar dados",
          description: `Não foi possível buscar os locais.`
        });
      } finally {
        setIsLoadingLocations(false);
      }
    };
    fetchLocations();
  }, [getSettingsDocRef, toast]);
  
  useEffect(() => {
    const fetchMap = async () => {
      const docRef = getSettingsDocRef('mapDetails');
      if (!docRef) {
        setIsLoadingMap(false);
        return;
      }
      try {
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
          setMapUrl(docSnap.data().mapUrl || null);
        }
      } catch (error) {
        console.error("Error fetching map:", error);
      } finally {
        setIsLoadingMap(false);
      }
    };
    fetchMap();
  }, [getSettingsDocRef]);

  const handleMapClick = (e: MouseEvent<HTMLDivElement>) => {
    if (!mapContainerRef.current) return;
    const rect = mapContainerRef.current.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 100;
    const y = ((e.clientY - rect.top) / rect.height) * 100;
    setMarker({ x, y });
  };

  const handleImageChange = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) {
      setImagePreview(null);
      return;
    }
    // Check initial size just in case, 10MB is a safe upper limit for most browsers to handle.
    if (file.size > 10 * 1024 * 1024) { 
      toast({
        variant: 'destructive',
        title: 'Arquivo muito grande',
        description: 'Por favor, escolha uma imagem menor que 10MB.',
      });
      return;
    }

    try {
      const resizedDataUrl = await resizeImage(file);
      setImagePreview(resizedDataUrl);
    } catch (error) {
      console.error("Image resize error:", error);
      toast({
        variant: 'destructive',
        title: 'Erro ao processar imagem',
        description: 'Não foi possível redimensionar a imagem. Tente um arquivo diferente.'
      });
    }
  };
  
  const resetForm = () => {
    setCollaboratorName('');
    setNoticeDate(undefined);
    setNoticeTime('12:00');
    setWeather('');
    setDescription('');
    setLocation('');
    setMarker(null);
    setImagePreview(null);
    if(imageInputRef.current) imageInputRef.current.value = "";
  }

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!firestore || !user) {
        toast({ variant: 'destructive', title: 'Erro', description: 'Você não está autenticado.' });
        return;
    }
    if (!noticeDate) {
        toast({ variant: 'destructive', title: 'Campo obrigatório', description: 'Por favor, selecione a data do aviso.' });
        return;
    }

    setIsSubmitting(true);
    
    try {
      const [hours, minutes] = noticeTime.split(':').map(Number);
      const combinedDate = setMinutes(setHours(noticeDate, hours), minutes);
      
      const noticeData = {
          userId: user.uid,
          collaboratorName,
          noticeDate: Timestamp.fromDate(combinedDate),
          weather,
          description,
          location,
          mapMarker: marker,
          imageUrl: imagePreview, // Save the resized Base64 data URL
      };

      if (isEditing && noticeToEdit) {
        const docRef = doc(firestore, 'sgs_genius', user.uid, 'notices', noticeToEdit.id);
        await updateDoc(docRef, { ...noticeData, status: noticeToEdit.status, updatedAt: serverTimestamp() });
        toast({ title: 'Sucesso!', description: 'Aviso atualizado com sucesso.' });
        setPage('pending-notices');
      } else {
        const noticesCollectionRef = collection(firestore, 'sgs_genius', user.uid, 'notices');
        await addDoc(noticesCollectionRef, { ...noticeData, status: 'pendente', createdAt: serverTimestamp() });
        toast({ title: 'Sucesso!', description: 'Aviso registrado com sucesso.' });
        resetForm();
      }
    } catch (error: any) {
        console.error("Error saving notice:", error);
        toast({ variant: 'destructive', title: 'Erro ao salvar', description: 'Não foi possível salvar o aviso. Verifique os dados e sua conexão.' });
    } finally {
        setIsSubmitting(false);
    }
  };


  return (
    <Card className="w-full">
      <form onSubmit={handleSubmit}>
        <CardHeader>
          <CardTitle>{isEditing ? 'Editar Aviso' : 'Registrar Aviso'}</CardTitle>
          <CardDescription>
            Reporte algo que você observou em campo. O administrador será notificado.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-8">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Label htmlFor="collaborator-name">Nome do Colaborador</Label>
                <HelpTooltip content="Seu nome completo para identificação." />
              </div>
              <Input id="collaborator-name" value={collaboratorName} onChange={(e) => setCollaboratorName(e.target.value)} placeholder="Seu nome completo" required />
            </div>
            <div className="space-y-2">
                <Label htmlFor="weather">Clima</Label>
                <Select name="weather" onValueChange={setWeather} value={weather}>
                    <SelectTrigger id="weather">
                    <SelectValue placeholder="Selecione o clima" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="ensolarado">Ensolarado</SelectItem>
                        <SelectItem value="nublado">Nublado</SelectItem>
                        <SelectItem value="chuvoso">Chuvoso</SelectItem>
                    </SelectContent>
                </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="notice-date">Data</Label>
              <Popover open={isCalendarOpen} onOpenChange={setIsCalendarOpen}>
                <PopoverTrigger asChild>
                  <Button
                    variant={'outline'}
                    className={cn( 'w-full justify-start text-left font-normal', !noticeDate && 'text-muted-foreground' )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {noticeDate ? format(noticeDate, 'dd/MM/yyyy') : <span>Escolha uma data</span>}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0">
                  <Calendar mode="single" selected={noticeDate} onSelect={(d) => { if(d) setNoticeDate(d); setIsCalendarOpen(false); }} locale={ptBR} initialFocus />
                </PopoverContent>
              </Popover>
            </div>
            <div className="space-y-2">
                <Label htmlFor="notice-time">Hora</Label>
                <Input id="notice-time" type="time" value={noticeTime} onChange={(e) => setNoticeTime(e.target.value)} required />
            </div>
          </div>
          
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Label htmlFor="description">Descrição do que foi observado</Label>
              <HelpTooltip content="Descreva em detalhes o que você viu, ouviu ou sentiu. Seja o mais específico possível." />
            </div>
            <Textarea id="description" placeholder="Seja o mais descritivo possível..." className="min-h-[100px]" required value={description} onChange={(e) => setDescription(e.target.value)} />
          </div>

          <div className="space-y-2">
              <Label htmlFor="location">Local</Label>
              <Select name="location" required disabled={isLoadingLocations || locations.length === 0} onValueChange={setLocation} value={location}>
                <SelectTrigger id="location">
                  <SelectValue placeholder={ isLoadingLocations ? "Carregando..." : locations.length === 0 ? "Nenhum local cadastrado" : "Selecione o local" } />
                </SelectTrigger>
                <SelectContent>
                  {isLoadingLocations ? (
                    <div className="flex items-center justify-center p-2"> <Loader2 className="h-4 w-4 animate-spin" /> </div>
                  ) : (
                    locations.map((loc) => ( <SelectItem key={loc} value={loc}> {loc} </SelectItem> ))
                  )}
                </SelectContent>
              </Select>
            </div>

          <Separator />
          
          <div className="space-y-4">
              <div className="flex items-center gap-2">
                <Label>Anexar Imagem (Opcional)</Label>
                <HelpTooltip content="Uma imagem vale mais que mil palavras. Anexe uma foto para ilustrar o que você observou." />
              </div>
              <div className="flex items-center gap-4">
                <Button type="button" variant="outline" onClick={() => imageInputRef.current?.click()}>
                    <Upload className="mr-2 h-4 w-4" />
                    Carregar Imagem
                </Button>
                 <Input
                    ref={imageInputRef}
                    type="file"
                    className="hidden"
                    accept="image/*"
                    onChange={handleImageChange}
                />
              </div>
               {imagePreview && (
                    <div className="relative w-48 h-48 border rounded-md overflow-hidden">
                        <Image src={imagePreview} alt="Pré-visualização" layout="fill" objectFit="cover" />
                         <Button
                            type="button"
                            variant="destructive"
                            size="icon"
                            className="absolute top-1 right-1 h-7 w-7"
                            onClick={() => {
                                setImagePreview(null);
                                if(imageInputRef.current) imageInputRef.current.value = "";
                            }}
                        >
                            <X className="h-4 w-4" />
                        </Button>
                    </div>
                )}
          </div>

          <Separator />

           <div className="space-y-4">
              <div className="flex justify-between items-start">
                  <div>
                      <h3 className="text-lg font-semibold text-foreground">Localização no Mapa</h3>
                      <p className="text-sm text-muted-foreground">
                          Clique no mapa para marcar o ponto exato do aviso.
                      </p>
                  </div>
                  {marker && (
                    <Button variant="ghost" size="sm" onClick={() => setMarker(null)}>
                        <X className="mr-2 h-4 w-4" />
                        Limpar Marcação
                    </Button>
                  )}
              </div>
              <div
                ref={mapContainerRef}
                onClick={handleMapClick}
                className="relative w-full aspect-video border-2 border-dashed rounded-md cursor-pointer bg-muted/20 flex items-center justify-center overflow-hidden"
              >
                {isLoadingMap ? ( <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                ) : mapUrl ? (
                  <>
                    <Image src={mapUrl} alt="Mapa de avisos" fill className="object-cover" />
                    {marker && (
                      <div className="absolute pointer-events-none" style={{ left: `${marker.x}%`, top: `${marker.y}%`, transform: 'translate(-50%, -100%)' }} aria-label="Marcador de aviso" >
                         <MapPin className="h-5 w-5 fill-blue-500 stroke-white stroke-2 drop-shadow-lg" />
                      </div>
                    )}
                  </>
                ) : (
                  <p className="text-muted-foreground text-center p-4"> Nenhum mapa foi carregado. <br />Vá para "Configurações" > "Gerenciar Mapa" para fazer o upload. </p>
                )}
              </div>
           </div>
        </CardContent>
        <CardFooter className="flex justify-end gap-2">
            {isEditing && ( <Button variant="outline" type="button" onClick={() => setPage('pending-notices')}> Cancelar </Button> )}
            <Button type="submit" disabled={isSubmitting}>
                {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {isEditing ? 'Salvar Alterações' : 'Registrar Aviso'}
            </Button>
        </CardFooter>
      </form>
    </Card>
  );
}
