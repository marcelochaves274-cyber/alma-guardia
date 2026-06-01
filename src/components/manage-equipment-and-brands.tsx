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

type ManagedItem = {
  items: string[];
  newItem: string;
  editingItem: string | null;
  editingValue: string;
  isLoading: boolean;
  isSaving: boolean;
};

type ItemType = 'equipmentTypes' | 'equipmentBrands';

export function ManageEquipmentAndBrands() {
  const { toast } = useToast();
  const firestore = useFirestore();
  const { user, isUserLoading } = useUser();
  
  const [state, setState] = useState<{ [key in ItemType]: ManagedItem }>({
    equipmentTypes: { items: [], newItem: '', editingItem: null, editingValue: '', isLoading: true, isSaving: false },
    equipmentBrands: { items: [], newItem: '', editingItem: null, editingValue: '', isLoading: true, isSaving: false },
  });

  const getSettingsDocRef = useCallback((docName: ItemType) => {
    if (!firestore || !user) return null;
    return doc(firestore, 'sgs_genius', user.uid, 'settings', docName);
  }, [firestore, user]);

  const fieldMap: { [key in ItemType]: 'types' | 'brands' } = {
    equipmentTypes: 'types',
    equipmentBrands: 'brands',
  };

  useEffect(() => {
    if (isUserLoading || !user || !firestore) {
        Object.keys(state).forEach(key => {
            setState(s => ({ ...s, [key as ItemType]: { ...s[key as ItemType], isLoading: false } }));
        })
      return;
    }

    Object.keys(state).forEach(key => {
        const itemType = key as ItemType;
        const fetchItems = async () => {
          const docRef = getSettingsDocRef(itemType);
          if (!docRef) {
            setState(s => ({ ...s, [itemType]: { ...s[itemType], isLoading: false } }));
            return;
          }

          try {
            const docSnap = await getDoc(docRef);
            if (docSnap.exists()) {
              const data = docSnap.data();
              setState(s => ({ ...s, [itemType]: { ...s[itemType], items: (data[fieldMap[itemType]] || []).sort() } }));
            }
          } catch (error: unknown) {
            const err = error as { code?: string };
            if (err.code !== 'permission-denied') {
              toast({ variant: "destructive", title: "Erro ao carregar", description: `Não foi possível buscar ${itemType === 'equipmentTypes' ? 'tipos' : 'marcas'}.` });
            }
          } finally {
            setState(s => ({ ...s, [itemType]: { ...s[itemType], isLoading: false } }));
          }
        };

        fetchItems();
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isUserLoading, user, firestore, getSettingsDocRef, toast]);
  
  const saveItemsToFirestore = async (itemType: ItemType, items: string[]) => {
    const docRef = getSettingsDocRef(itemType);
    if (!docRef) {
      toast({ variant: 'destructive', title: 'Erro', description: 'Usuário não autenticado.' });
      return false;
    }
    
    setState(s => ({ ...s, [itemType]: { ...s[itemType], isSaving: true } }));
    try {
        await setDoc(docRef, { [fieldMap[itemType]]: items }, { merge: true });
        return true;
    } catch (error: unknown) {
        toast({ variant: 'destructive', title: 'Erro ao salvar', description: 'Não foi possível salvar os dados.' });
        return false;
    } finally {
        setState(s => ({ ...s, [itemType]: { ...s[itemType], isSaving: false } }));
    }
  };

  const handleAddItem = async (e: FormEvent, itemType: ItemType) => {
    e.preventDefault();
    const current = state[itemType];
    const trimmedItem = current.newItem.trim();
    if (!trimmedItem) {
      toast({ variant: 'destructive', title: 'Campo vazio', description: 'Por favor, digite um valor.' });
      return;
    }
    if (current.items.map(i => i.toLowerCase()).includes(trimmedItem.toLowerCase())) {
      toast({ variant: 'destructive', title: 'Item duplicado', description: 'Este item já existe.' });
      return;
    }

    const newItems = [...current.items, trimmedItem].sort();
    const success = await saveItemsToFirestore(itemType, newItems);
    if (success) {
      setState(s => ({ ...s, [itemType]: { ...s[itemType], items: newItems, newItem: '' } }));
      toast({ title: 'Sucesso!', description: `Item "${trimmedItem}" foi adicionado.` });
    }
  };

  const handleRemoveItem = async (itemType: ItemType, itemToRemove: string) => {
    const current = state[itemType];
    const newItems = current.items.filter((item) => item !== itemToRemove).sort();
    const success = await saveItemsToFirestore(itemType, newItems);
    if (success) {
      setState(s => ({ ...s, [itemType]: { ...s[itemType], items: newItems } }));
      toast({ title: 'Removido', description: `O item "${itemToRemove}" foi removido.` });
    }
  };

  const handleStartEditing = (itemType: ItemType, item: string) => {
    setState(s => ({ ...s, [itemType]: { ...s[itemType], editingItem: item, editingValue: item } }));
  };

  const handleCancelEditing = (itemType: ItemType) => {
    setState(s => ({ ...s, [itemType]: { ...s[itemType], editingItem: null, editingValue: '' } }));
  };

  const handleSaveEdit = async (itemType: ItemType) => {
    const current = state[itemType];
    if (!current.editingItem || !current.editingValue.trim()) {
      toast({ variant: 'destructive', title: 'Campo vazio', description: 'O item não pode ser vazio.' });
      return;
    }
    const trimmedValue = current.editingValue.trim();
    if (current.items.map(i => i.toLowerCase()).includes(trimmedValue.toLowerCase()) && trimmedValue.toLowerCase() !== current.editingItem.toLowerCase()) {
        toast({ variant: 'destructive', title: 'Item duplicado', description: 'Este item já existe.' });
        return;
    }

    const newItems = current.items.map(i => (i === current.editingItem ? trimmedValue : i)).sort();
    const success = await saveItemsToFirestore(itemType, newItems);
    if(success) {
        setState(s => ({ ...s, [itemType]: { ...s[itemType], items: newItems, editingItem: null, editingValue: '' } }));
        toast({ title: 'Sucesso!', description: 'O item foi atualizado.' });
    }
  }

  const renderSection = (itemType: ItemType, title: string, placeholder: string) => {
    const current = state[itemType];

    if (current.isLoading) {
      return (
        <div>
          <h3 className="text-xl font-semibold mb-4">{title}</h3>
          <Skeleton className="h-24 w-full" />
          <Separator className="my-6" />
          <div className="space-y-3">
            <Skeleton className="h-12 w-full" />
            <Skeleton className="h-12 w-full" />
          </div>
        </div>
      );
    }
    
    return (
      <div>
        <h3 className="text-xl font-semibold">{title}</h3>
        <form onSubmit={(e) => handleAddItem(e, itemType)} className="flex flex-col sm:flex-row items-stretch sm:items-end gap-4 mt-4">
          <div className="w-full space-y-2">
            <Label htmlFor={`new-${itemType}`}>Novo Item</Label>
            <Input
              id={`new-${itemType}`}
              placeholder={placeholder}
              value={current.newItem}
              onChange={(e) => setState(s => ({ ...s, [itemType]: { ...s[itemType], newItem: e.target.value } }))}
              disabled={current.isSaving}
            />
          </div>
          <Button type="submit" disabled={current.isSaving || !current.newItem.trim()} className="w-full sm:w-auto">
            {current.isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Plus className="mr-2 h-4 w-4" />}
            Adicionar
          </Button>
        </form>

        <Separator className="my-4 md:my-6" />
        
        <div>
          <h4 className="mb-4 text-lg font-medium">Itens Existentes</h4>
          {current.items.length > 0 ? (
            <ul className="space-y-3">
              {current.items.map((item) => (
                <li key={item} className="flex flex-col sm:flex-row sm:items-center justify-between rounded-md border bg-card p-3 gap-3">
                  {current.editingItem === item ? (
                    <div className='flex-1 flex flex-col sm:flex-row items-stretch sm:items-center gap-2'>
                        <Input value={current.editingValue} onChange={(e) => setState(s => ({ ...s, [itemType]: { ...s[itemType], editingValue: e.target.value } }))} className="h-9 sm:h-8 flex-1" autoFocus onKeyDown={(e) => e.key === 'Enter' && handleSaveEdit(itemType)} />
                        <div className="flex items-center justify-end gap-2">
                          <Button variant="ghost" size="icon" onClick={() => handleSaveEdit(itemType)} className='h-9 w-9 sm:h-8 sm:w-8 text-green-500 hover:text-green-600 border sm:border-0'><Check className="h-4 w-4" /></Button>
                          <Button variant="ghost" size="icon" onClick={() => handleCancelEditing(itemType)} className='h-9 w-9 sm:h-8 sm:w-8 text-muted-foreground hover:text-destructive border sm:border-0'><X className="h-4 w-4" /></Button>
                        </div>
                    </div>
                  ) : (
                    <>
                      <span className="text-sm font-medium break-all">{item}</span>
                      <div className="flex items-center justify-end gap-1">
                          <Button variant="ghost" size="icon" onClick={() => handleStartEditing(itemType, item)} disabled={current.isSaving} className="h-9 w-9 sm:h-8 sm:w-8 text-muted-foreground hover:text-primary border sm:border-0"><Pencil className="h-4 w-4" /></Button>
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button variant="ghost" size="icon" disabled={current.isSaving} className="h-9 w-9 sm:h-8 sm:w-8 text-muted-foreground hover:text-destructive border sm:border-0"><Trash2 className="h-4 w-4" /></Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>Você tem certeza?</AlertDialogTitle>
                                <AlertDialogDescription>Esta ação excluirá permanentemente o item "{item}".</AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                <AlertDialogAction onClick={() => handleRemoveItem(itemType, item)} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">Sim, excluir</AlertDialogAction>
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
            <p className="text-center text-sm text-muted-foreground">Nenhum item cadastrado.</p>
          )}
        </div>
      </div>
    );
  };
  

  return (
    <div className="space-y-8 md:space-y-12">
      <Card>
        <CardHeader>
          <CardTitle>Gerenciar Equipamentos e Marcas</CardTitle>
          <CardDescription>Adicione ou remova os tipos de equipamentos e as marcas que aparecerão no formulário de registro.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-8 md:space-y-12">
          {renderSection('equipmentTypes', 'Tipos de Equipamento', 'Ex: Mosquetão')}
          <Separator />
          {renderSection('equipmentBrands', 'Marcas de Equipamento', 'Ex: Petzl')}
        </CardContent>
      </Card>
    </div>
  );
}
