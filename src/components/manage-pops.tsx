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

export function ManagePops() {
  const { toast } = useToast();
  const firestore = useFirestore();
  const { user, isUserLoading } = useUser();

  const [pops, setPops] = useState<string[]>([]);
  const [newPop, setNewPop] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [editingPop, setEditingPop] = useState<string | null>(null);
  const [editingValue, setEditingValue] = useState('');

  const getSettingsDocRef = useCallback(() => {
    if (!firestore || !user) return null;
    return doc(firestore, 'sgs_genius', user.uid, 'settings', 'pops');
  }, [firestore, user]);

  useEffect(() => {
    let isMounted = true;
    if (isUserLoading || !user || !firestore) {
      if(!isUserLoading) setIsLoading(false);
      return;
    }
    
    const fetchPops = async () => {
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
            setPops(data.documents || []);
          } else {
            setPops([]);
          }
        }
      } catch (error: any) {
         if (isMounted && error.code !== 'permission-denied') {
            console.error("Error fetching POPs:", error);
            toast({
                variant: "destructive",
                title: "Erro ao carregar",
                description: "Não foi possível buscar os POPs cadastrados."
            });
         }
      } finally {
        if (isMounted) {
            setIsLoading(false);
        }
      }
    };

    fetchPops();
    
    return () => { isMounted = false; };
  }, [isUserLoading, user, firestore, getSettingsDocRef, toast]);
  
  const savePopsToFirestore = async (updatedPops: string[]) => {
    const docRef = getSettingsDocRef();
    if (!docRef) {
      toast({ variant: 'destructive', title: 'Erro', description: 'Usuário não autenticado.'});
      return false;
    }
    
    setIsSaving(true);
    try {
        await setDoc(docRef, { documents: updatedPops });
        return true;
    } catch (error) {
        console.error("Error saving POPs:", error);
        toast({ variant: 'destructive', title: 'Erro ao salvar', description: 'Não foi possível salvar os POPs.'});
        return false;
    } finally {
        setIsSaving(false);
    }
  };

  const handleAddPop = async (e: FormEvent) => {
    e.preventDefault();
    if (!newPop.trim()) {
      toast({
        variant: 'destructive',
        title: 'Campo vazio',
        description: 'Por favor, digite o nome do documento.',
      });
      return;
    }
    const trimmedPop = `POP: ${newPop.trim()}`;
    if (pops.map(p => p.toLowerCase()).includes(trimmedPop.toLowerCase())) {
      toast({
        variant: 'destructive',
        title: 'Documento duplicado',
        description: 'Este POP já existe.',
      });
      return;
    }

    const newPops = [...pops, trimmedPop];
    const success = await savePopsToFirestore(newPops);
    if(success) {
        setPops(newPops);
        setNewPop('');
        toast({
            title: 'Sucesso!',
            description: `O documento "${trimmedPop}" foi adicionado.`,
        });
    }
  };

  const handleRemovePop = async (popToRemove: string) => {
    const newPops = pops.filter((pop) => pop !== popToRemove);
    const success = await savePopsToFirestore(newPops);
    if(success) {
        setPops(newPops);
        toast({
        title: 'Removido',
        description: `O POP "${popToRemove}" foi removido.`,
        });
    }
  };

  const handleStartEditing = (pop: string) => {
    setEditingPop(pop);
    // Remove "POP: " prefix for editing
    setEditingValue(pop.replace(/^POP: /, ''));
  };

  const handleCancelEditing = () => {
    setEditingPop(null);
    setEditingValue('');
  };
  
  const handleSaveEdit = async () => {
    if (!editingPop || !editingValue.trim()) {
      toast({
        variant: 'destructive',
        title: 'Campo vazio',
        description: 'O nome do documento não pode ser vazio.',
      });
      return;
    }

    const trimmedValue = `POP: ${editingValue.trim()}`;
    if (pops.map(p => p.toLowerCase()).includes(trimmedValue.toLowerCase()) && trimmedValue.toLowerCase() !== editingPop.toLowerCase()) {
        toast({
            variant: 'destructive',
            title: 'Documento duplicado',
            description: 'Este POP já existe.',
        });
        return;
    }

    const newPops = pops.map(p => (p === editingPop ? trimmedValue : p));
    const success = await savePopsToFirestore(newPops);
    if(success) {
        setPops(newPops);
        setEditingPop(null);
        setEditingValue('');
        toast({
            title: 'Sucesso!',
            description: 'O POP foi atualizado.',
        });
    }
  }
  
  if (isLoading) {
    return (
        <Card>
            <CardHeader>
                <CardTitle>Gerenciar Documentos POP</CardTitle>
                <CardDescription>
                  Adicione ou edite os Procedimentos Operacionais Padrão.
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
        <CardTitle>Gerenciar Documentos POP</CardTitle>
        <CardDescription>
          Adicione ou edite os Procedimentos Operacionais Padrão.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleAddPop} className="space-y-4">
          <div>
            <Label htmlFor="new-pop-document" className='text-base font-semibold'>
              Adicionar Novo POP
            </Label>
            <div className="mt-2 space-y-2">
                <Label htmlFor="new-pop-document">Nome do Documento</Label>
                 <div className="flex items-center gap-2">
                    <span className="flex h-10 items-center justify-center rounded-l-md border border-r-0 border-input bg-muted px-3 font-medium text-muted-foreground">
                        POP:
                    </span>
                    <Input
                        id="new-pop-document"
                        placeholder="Ex: Procedimento para Trabalho em Altura"
                        className="rounded-l-none"
                        value={newPop}
                        onChange={(e) => setNewPop(e.target.value)}
                        disabled={isSaving}
                    />
                </div>
            </div>
          </div>
          <Button type="submit" disabled={isSaving || !newPop.trim()} className='w-full sm:w-auto'>
            {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
            {isSaving ? 'Adicionando...' : 'Adicionar POP'}
          </Button>
        </form>

        <Separator className="my-6" />

        <div>
          <h3 className="mb-4 text-lg font-medium">POPs Existentes</h3>
          {pops.length > 0 ? (
            <ul className="space-y-3">
              {pops.map((pop) => (
                <li
                  key={pop}
                  className="flex items-center justify-between rounded-md border bg-card p-3"
                >
                  {editingPop === pop ? (
                    <div className='flex-1 flex items-center gap-2'>
                        <span className="flex h-8 items-center justify-center rounded-l-md border border-r-0 border-input bg-muted px-3 text-sm font-medium text-muted-foreground">
                            POP:
                        </span>
                        <Input
                            value={editingValue}
                            onChange={(e) => setEditingValue(e.target.value)}
                            className="h-8 rounded-l-none"
                            autoFocus
                            onKeyDown={(e) => e.key === 'Enter' && handleSaveEdit()}
                        />
                         <Button variant="ghost" size="icon" onClick={handleSaveEdit} className='h-8 w-8 text-green-500 hover:text-green-600' aria-label="Salvar edição"><Check className="h-4 w-4" /></Button>
                         <Button variant="ghost" size="icon" onClick={handleCancelEditing} className='h-8 w-8 text-muted-foreground hover:text-destructive' aria-label="Cancelar edição"><X className="h-4 w-4" /></Button>
                    </div>
                  ) : (
                    <>
                        <span className="text-sm font-medium">{pop}</span>
                        <div className="flex items-center">
                            <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => handleStartEditing(pop)}
                                disabled={isSaving}
                                className="h-8 w-8 text-muted-foreground hover:text-primary"
                                aria-label={`Editar ${pop}`}
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
                                        aria-label={`Remover ${pop}`}
                                    >
                                        <Trash2 className="h-4 w-4" />
                                    </Button>
                                </AlertDialogTrigger>
                                <AlertDialogContent>
                                    <AlertDialogHeader>
                                        <AlertDialogTitle>Você tem certeza?</AlertDialogTitle>
                                        <AlertDialogDescription>
                                        Esta ação não pode ser desfeita. Isso excluirá permanentemente o POP "{pop}".
                                        </AlertDialogDescription>
                                    </AlertDialogHeader>
                                    <AlertDialogFooter>
                                        <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                        <AlertDialogAction 
                                            onClick={() => handleRemovePop(pop)} 
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
              Nenhum POP cadastrado.
            </p>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
