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

export function ManageFaunaFloraGeo() {
  const { toast } = useToast();
  const firestore = useFirestore();
  const { user, isUserLoading } = useUser();

  const [itemTypes, setItemTypes] = useState<string[]>([]);
  const [newType, setNewType] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [editingType, setEditingType] = useState<string | null>(null);
  const [editingValue, setEditingValue] = useState('');

  const getSettingsDocRef = useCallback(() => {
    if (!firestore || !user) return null;
    return doc(firestore, 'sgs_genius', user.uid, 'settings', 'faunaFloraGeoTypes');
  }, [firestore, user]);

  useEffect(() => {
    let isMounted = true;
    if (isUserLoading || !user || !firestore) {
      if(!isUserLoading) setIsLoading(false);
      return;
    }
    
    const fetchItemTypes = async () => {
      const docRef = getSettingsDocRef();
      if (!docRef) {
        if(isMounted) setIsLoading(false);
        return;
      }

      try {
        const docSnap = await getDoc(docRef);
        if (isMounted) {
          if (docSnap.exists()) {
            const data = docSnap.data();
            setItemTypes(data.types || []);
          } else {
            // Document doesn't exist, start with an empty array
            setItemTypes([]);
          }
        }
      } catch (error: any) {
         if (isMounted && error.code !== 'permission-denied') {
            console.error("Error fetching fauna/flora/geo types:", error);
            toast({
                variant: "destructive",
                title: "Erro ao carregar",
                description: "Não foi possível buscar os tipos cadastrados."
            });
         }
      } finally {
        if (isMounted) {
            setIsLoading(false);
        }
      }
    };

    fetchItemTypes();
    
    return () => { isMounted = false; };
  }, [isUserLoading, user, firestore, getSettingsDocRef, toast]);
  
  const saveTypesToFirestore = async (types: string[]) => {
    const docRef = getSettingsDocRef();
    if (!docRef) {
      toast({ variant: 'destructive', title: 'Erro', description: 'Usuário não autenticado.'});
      return false;
    }
    
    setIsSaving(true);
    try {
        await setDoc(docRef, { types });
        return true;
    } catch (error) {
        console.error("Error saving types:", error);
        toast({ variant: 'destructive', title: 'Erro ao salvar', description: 'Não foi possível salvar os tipos.'});
        return false;
    } finally {
        setIsSaving(false);
    }
  };


  const handleAddType = async (e: FormEvent) => {
    e.preventDefault();
    if (!newType.trim()) {
      toast({
        variant: 'destructive',
        title: 'Campo vazio',
        description: 'Por favor, digite um tipo.',
      });
      return;
    }
    const trimmedType = newType.trim();
    if (itemTypes.map(t => t.toLowerCase()).includes(trimmedType.toLowerCase())) {
      toast({
        variant: 'destructive',
        title: 'Tipo duplicado',
        description: 'Este tipo já existe.',
      });
      return;
    }

    const newTypes = [...itemTypes, trimmedType];
    const success = await saveTypesToFirestore(newTypes);
    if(success) {
        setItemTypes(newTypes);
        setNewType('');
        toast({
            title: 'Sucesso!',
            description: `O tipo "${trimmedType}" foi adicionado.`,
        });
    }
  };

  const handleRemoveType = async (typeToRemove: string) => {
    const newTypes = itemTypes.filter((type) => type !== typeToRemove);
    const success = await saveTypesToFirestore(newTypes);
    if(success) {
        setItemTypes(newTypes);
        toast({
        title: 'Removido',
        description: `O tipo "${typeToRemove}" foi removido.`,
        });
    }
  };

  const handleStartEditing = (type: string) => {
    setEditingType(type);
    setEditingValue(type);
  };

  const handleCancelEditing = () => {
    setEditingType(null);
    setEditingValue('');
  };
  
  const handleSaveEdit = async () => {
    if (!editingType || !editingValue.trim()) {
      toast({
        variant: 'destructive',
        title: 'Campo vazio',
        description: 'O tipo não pode ser vazio.',
      });
      return;
    }

    const trimmedValue = editingValue.trim();
    if (itemTypes.map(t => t.toLowerCase()).includes(trimmedValue.toLowerCase()) && trimmedValue.toLowerCase() !== editingType.toLowerCase()) {
        toast({
            variant: 'destructive',
            title: 'Tipo duplicado',
            description: 'Este tipo já existe.',
        });
        return;
    }

    const newTypes = itemTypes.map(t => (t === editingType ? trimmedValue : t));
    const success = await saveTypesToFirestore(newTypes);
    if(success) {
        setItemTypes(newTypes);
        setEditingType(null);
        setEditingValue('');
        toast({
            title: 'Sucesso!',
            description: 'O tipo foi atualizado.',
        });
    }
  }
  
  if (isLoading) {
    return (
        <Card>
            <CardHeader>
                <CardTitle>Gerenciar Fauna/Flora/Geo</CardTitle>
                <CardDescription>
                  Adicione ou remova os tipos de fauna, flora ou características geográficas a serem registrados.
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
        <CardTitle>Gerenciar Fauna/Flora/Geo</CardTitle>
        <CardDescription>
          Adicione ou remova os tipos de fauna, flora ou características geográficas a serem registrados.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleAddType} className="flex items-end gap-4">
          <div className="w-full space-y-2">
            <Label htmlFor="new-item-type">
              Novo Tipo
            </Label>
            <Input
              id="new-item-type"
              placeholder="Ex: Jequitibá Rosa"
              value={newType}
              onChange={(e) => setNewType(e.target.value)}
              disabled={isSaving}
            />
          </div>
          <Button type="submit" disabled={isSaving || !newType.trim()}>
            {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Plus className="mr-2 h-4 w-4" />}
            {isSaving ? 'Adicionando...' : 'Adicionar'}
          </Button>
        </form>

        <Separator className="my-6" />

        <div>
          <h3 className="mb-4 text-lg font-medium">Tipos Existentes</h3>
          {itemTypes.length > 0 ? (
            <ul className="space-y-3">
              {itemTypes.map((type) => (
                <li
                  key={type}
                  className="flex items-center justify-between rounded-md border bg-card p-3"
                >
                  {editingType === type ? (
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
                        <span className="text-sm font-medium">{type}</span>
                        <div className="flex items-center">
                            <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => handleStartEditing(type)}
                                disabled={isSaving}
                                className="h-8 w-8 text-muted-foreground hover:text-primary"
                                aria-label={`Editar ${type}`}
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
                                        aria-label={`Remover ${type}`}
                                    >
                                        <Trash2 className="h-4 w-4" />
                                    </Button>
                                </AlertDialogTrigger>
                                <AlertDialogContent>
                                    <AlertDialogHeader>
                                        <AlertDialogTitle>Você tem certeza?</AlertDialogTitle>
                                        <AlertDialogDescription>
                                        Esta ação não pode ser desfeita. Isso excluirá permanentemente o tipo "{type}" e poderá afetar relatórios ou filtros existentes que o utilizam.
                                        </AlertDialogDescription>
                                    </AlertDialogHeader>
                                    <AlertDialogFooter>
                                        <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                        <AlertDialogAction 
                                            onClick={() => handleRemoveType(type)} 
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
              Nenhum tipo cadastrado. Comece adicionando um acima.
            </p>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
