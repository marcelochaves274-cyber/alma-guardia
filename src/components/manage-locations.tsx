'use client';

import { useState, type FormEvent, useEffect, useCallback } from 'react';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { Plus, Trash2, Loader2, Pencil, Check, X } from 'lucide-react';
import { Separator } from './ui/separator';
import { useFirestore, useUser } from '@/firebase';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { Skeleton } from './ui/skeleton';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"

export function ManageLocations() {
  const { toast } = useToast();
  const firestore = useFirestore();
  const { user, isUserLoading } = useUser();

  const [locations, setLocations] = useState<string[]>([]);
  const [newLocation, setNewLocation] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [editingLocation, setEditingLocation] = useState<string | null>(null);
  const [editingValue, setEditingValue] = useState('');

  const getSettingsDocRef = useCallback(() => {
    if (!firestore || !user) return null;
    return doc(firestore, 'sgs_genius', user.uid, 'settings', 'locations');
  }, [firestore, user]);

  useEffect(() => {
    let isMounted = true;
    if (isUserLoading || !user || !firestore) {
      if(!isUserLoading) setIsLoading(false);
      return;
    }
    
    const fetchLocations = async () => {
      const docRef = getSettingsDocRef();
      if (!docRef) {
        setIsLoading(false);
        return;
      }

      try {
        const docSnap = await getDoc(docRef);
        if (isMounted) {
          if (docSnap.exists()) {
            const data = docSnap.data();
            setLocations(data.locations || []);
          } else {
            const defaultLocations = ['Escritório', 'Fábrica - Linha 1', 'Depósito'];
            setLocations(defaultLocations);
          }
        }
      } catch (error: any) {
        if (isMounted && error.code !== 'permission-denied') {
          console.error("Error fetching locations:", error);
          toast({
              variant: "destructive",
              title: "Erro ao carregar",
              description: "Não foi possível buscar os locais."
          });
        }
      } finally {
        if (isMounted) {
            setIsLoading(false);
        }
      }
    };

    fetchLocations();
    
    return () => { isMounted = false; };
  }, [isUserLoading, user, firestore, getSettingsDocRef, toast]);
  
  const saveLocationsToFirestore = async (updatedLocations: string[]) => {
    const docRef = getSettingsDocRef();
    if (!docRef) {
      toast({ variant: 'destructive', title: 'Erro', description: 'Usuário não autenticado.'});
      return false;
    }
    
    setIsSaving(true);
    try {
        await setDoc(docRef, { locations: updatedLocations });
        return true;
    } catch (error) {
        console.error("Error saving locations:", error);
        toast({ variant: 'destructive', title: 'Erro ao salvar', description: 'Não foi possível salvar os locais.'});
        return false;
    } finally {
        setIsSaving(false);
    }
  };


  const handleAddLocation = async (e: FormEvent) => {
    e.preventDefault();
    if (!newLocation.trim()) {
      toast({
        variant: 'destructive',
        title: 'Campo vazio',
        description: 'Por favor, digite um local.',
      });
      return;
    }
    const trimmedLocation = newLocation.trim();
    if (locations.map(t => t.toLowerCase()).includes(trimmedLocation.toLowerCase())) {
      toast({
        variant: 'destructive',
        title: 'Local duplicado',
        description: 'Este local já existe.',
      });
      return;
    }

    const newLocations = [...locations, trimmedLocation];
    const success = await saveLocationsToFirestore(newLocations);
    if(success) {
        setLocations(newLocations);
        setNewLocation('');
        toast({
            title: 'Sucesso!',
            description: `O local "${trimmedLocation}" foi adicionado.`,
        });
    }
  };

  const handleRemoveLocation = async (locationToRemove: string) => {
    const newLocations = locations.filter((loc) => loc !== locationToRemove);
    const success = await saveLocationsToFirestore(newLocations);
    if(success) {
        setLocations(newLocations);
        toast({
        title: 'Removido',
        description: `O local "${locationToRemove}" foi removido.`,
        });
    }
  };

  const handleStartEditing = (location: string) => {
    setEditingLocation(location);
    setEditingValue(location);
  };

  const handleCancelEditing = () => {
    setEditingLocation(null);
    setEditingValue('');
  };
  
  const handleSaveEdit = async () => {
    if (!editingLocation || !editingValue.trim()) {
      toast({
        variant: 'destructive',
        title: 'Campo vazio',
        description: 'O nome do local não pode ser vazio.',
      });
      return;
    }

    const trimmedValue = editingValue.trim();
    if (locations.map(t => t.toLowerCase()).includes(trimmedValue.toLowerCase()) && trimmedValue.toLowerCase() !== editingLocation.toLowerCase()) {
        toast({
            variant: 'destructive',
            title: 'Local duplicado',
            description: 'Este local já existe.',
        });
        return;
    }

    const newLocations = locations.map(t => (t === editingLocation ? trimmedValue : t));
    const success = await saveLocationsToFirestore(newLocations);
    if(success) {
        setLocations(newLocations);
        setEditingLocation(null);
        setEditingValue('');
        toast({
            title: 'Sucesso!',
            description: 'O local foi atualizado.',
        });
    }
  }
  
  if (isLoading) {
    return (
        <Card>
            <CardHeader>
                <CardTitle>Gerenciar Locais</CardTitle>
                <CardDescription>
                Adicione ou remova os locais (setores, áreas, etc.) que podem ser registrados no sistema.
                </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
                <div className="flex items-end gap-4">
                    <div className="w-full space-y-2">
                        <Skeleton className="h-4 w-1/3" />
                        <Skeleton className="h-10 w-full" />
                    </div>
                     <Skeleton className="h-10 w-32" />
                </div>
                <Separator />
                <div className="space-y-3">
                     <Skeleton className="h-5 w-1/4" />
                     <Skeleton className="h-12 w-full" />
                     <Skeleton className="h-12 w-full" />
                     <Skeleton className="h-12 w-full" />
                </div>
            </CardContent>
        </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Gerenciar Locais</CardTitle>
        <CardDescription>
          Adicione ou remova os locais (setores, áreas, etc.) que podem ser registrados no sistema.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleAddLocation} className="flex items-end gap-4">
          <div className="w-full space-y-2">
            <Label htmlFor="new-location">
              Novo Local
            </Label>
            <Input
              id="new-location"
              placeholder="Ex: Almoxarifado"
              value={newLocation}
              onChange={(e) => setNewLocation(e.target.value)}
              disabled={isSaving}
            />
          </div>
          <Button type="submit" disabled={isSaving || !newLocation.trim()}>
            {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Plus className="mr-2 h-4 w-4" />}
            {isSaving ? 'Adicionando...' : 'Adicionar'}
          </Button>
        </form>

        <Separator className="my-6" />

        <div>
          <h3 className="mb-4 text-lg font-medium">Locais Existentes</h3>
          {locations.length > 0 ? (
            <ul className="space-y-3">
              {locations.map((loc) => (
                <li
                  key={loc}
                  className="flex items-center justify-between rounded-md border bg-card p-3"
                >
                  {editingLocation === loc ? (
                    <div className='flex-1 flex items-center gap-2'>
                        <Input
                            value={editingValue}
                            onChange={(e) => setEditingValue(e.target.value)}
                            className="h-8"
                            autoFocus
                            onKeyDown={(e) => e.key === 'Enter' && handleSaveEdit()}
                        />
                         <Button variant="ghost" size="icon" onClick={handleSaveEdit} className='h-8 w-8 text-green-500 hover:text-green-600' aria-label="Salvar edição"><Check className="h-4 w-4" /></Button>
                         <Button variant="ghost" size="icon" onClick={handleCancelEditing} className='h-8 w-8 text-muted-foreground hover:text-destructive' aria-label="Cancelar edição"><X className="h-4 w-4" /></Button>
                    </div>
                  ) : (
                    <>
                        <span className="text-sm font-medium">{loc}</span>
                        <div className="flex items-center">
                            <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => handleStartEditing(loc)}
                                disabled={isSaving}
                                className="h-8 w-8 text-muted-foreground hover:text-primary"
                                aria-label={`Editar ${loc}`}
                            >
                                <Pencil className="h-4 w-4" />
                            </Button>
                            
                            <AlertDialog>
                                <AlertDialogTrigger asChild>
                                    <Button
                                        variant="ghost"
                                        size="icon"
                                        disabled={isSaving}
                                        className="h-8 w-8 text-muted-foreground hover:text-destructive"
                                        aria-label={`Remover ${loc}`}
                                    >
                                        <Trash2 className="h-4 w-4" />
                                    </Button>
                                </AlertDialogTrigger>
                                <AlertDialogContent>
                                    <AlertDialogHeader>
                                        <AlertDialogTitle>Você tem certeza?</AlertDialogTitle>
                                        <AlertDialogDescription>
                                        Esta ação não pode ser desfeita. Isso excluirá permanentemente o local "{loc}" e poderá afetar relatórios ou filtros existentes que o utilizam.
                                        </AlertDialogDescription>
                                    </AlertDialogHeader>
                                    <AlertDialogFooter>
                                        <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                        <AlertDialogAction 
                                            onClick={() => handleRemoveLocation(loc)} 
                                            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                        >
                                            Sim, excluir
                                        </AlertDialogAction>
                                    </AlertDialogFooter>
                                </AlertDialogContent>
                            </AlertDialog>
                        </div>
                    </>
                  )}
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-center text-sm text-muted-foreground">
              Nenhum local cadastrado.
            </p>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
