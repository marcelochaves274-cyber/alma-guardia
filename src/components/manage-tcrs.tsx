
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

export interface TcrDocument {
  name: string;
  tcrContent: string;
}

export function ManageTcrs() {
  const { toast } = useToast();
  const firestore = useFirestore();
  const { user, isUserLoading } = useUser();

  const [documents, setDocuments] = useState<TcrDocument[]>([]);
  const [newDocName, setNewDocName] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [editingDoc, setEditingDoc] = useState<TcrDocument | null>(null);
  const [editingValue, setEditingValue] = useState('');

  const getSettingsDocRef = useCallback(() => {
    if (!firestore || !user) return null;
    return doc(firestore, 'sgs_genius', user.uid, 'settings', 'tcrs');
  }, [firestore, user]);

  useEffect(() => {
    let isMounted = true;
    if (isUserLoading || !user || !firestore) {
      if(!isUserLoading) setIsLoading(false);
      return;
    }
    
    const fetchDocs = async () => {
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
            if (data && data.documents) {
              const fetchedDocs = (data.documents || []).map((item: any): TcrDocument => {
                  return {
                      name: item.name || '',
                      tcrContent: item.tcrContent || 'Seu texto aqui',
                  };
              });
              setDocuments(fetchedDocs);
            }
          } else {
            setDocuments([]);
          }
        }
      } catch (error: any) {
         if (isMounted && error.code !== 'permission-denied') {
            console.error("Error fetching TCR documents:", error);
            toast({
                variant: "destructive",
                title: "Erro ao carregar",
                description: "Não foi possível buscar os TCRs cadastrados."
            });
         }
      } finally {
        if (isMounted) {
            setIsLoading(false);
        }
      }
    };

    fetchDocs();
    
    return () => { isMounted = false; };
  }, [isUserLoading, user, firestore, getSettingsDocRef, toast]);
  
  const saveDocsToFirestore = async (updatedDocs: TcrDocument[]) => {
    const docRef = getSettingsDocRef();
    if (!docRef) {
      toast({ variant: 'destructive', title: 'Erro', description: 'Usuário não autenticado.'});
      return false;
    }
    
    setIsSaving(true);
    try {
        const docsToSave = updatedDocs.map(d => ({
            name: d.name,
            tcrContent: d.tcrContent || 'Seu texto aqui',
        }));
        await setDoc(docRef, { documents: docsToSave });
        return true;
    } catch (error) {
        console.error("Error saving TCR documents:", error);
        toast({ variant: 'destructive', title: 'Erro ao salvar', description: 'Não foi possível salvar os TCRs.'});
        return false;
    } finally {
        setIsSaving(false);
    }
  };

  const handleAddDoc = async (e: FormEvent) => {
    e.preventDefault();
    if (!newDocName.trim()) {
      toast({
        variant: 'destructive',
        title: 'Campo vazio',
        description: 'Por favor, digite o nome do TCR.',
      });
      return;
    }

    const finalDocName = `TCR ${newDocName.trim()}`;
    
    const newDoc: TcrDocument = {
        name: finalDocName,
        tcrContent: 'Seu texto aqui',
    }

    if (documents.some(p => p.name.toLowerCase() === newDoc.name.toLowerCase())) {
      toast({
        variant: 'destructive',
        title: 'TCR duplicado',
        description: 'Este TCR já existe.',
      });
      return;
    }

    const newDocs = [...documents, newDoc];
    const success = await saveDocsToFirestore(newDocs);
    if(success) {
        setDocuments(newDocs);
        setNewDocName('');
        toast({
            title: 'Sucesso!',
            description: `O TCR "${newDocName.trim()}" foi adicionado.`,
        });
    }
  };

  const handleRemoveDoc = async (docToRemove: TcrDocument) => {
    const newDocs = documents.filter((doc) => doc.name !== docToRemove.name);
    const success = await saveDocsToFirestore(newDocs);
    if(success) {
        setDocuments(newDocs);
        toast({
        title: 'Removido',
        description: `O TCR "${docToRemove.name}" foi removido.`,
        });
    }
  };

  const handleStartEditing = (doc: TcrDocument) => {
    setEditingDoc(doc);
    setEditingValue(doc.name.replace(/^TCR\s/, ''));
  };

  const handleCancelEditing = () => {
    setEditingDoc(null);
    setEditingValue('');
  };
  
  const handleSaveEdit = async () => {
    if (!editingDoc || !editingValue.trim()) {
      toast({
        variant: 'destructive',
        title: 'Campo vazio',
        description: 'O nome do TCR não pode ser vazio.',
      });
      return;
    }
    
    const newName = `TCR ${editingValue.trim()}`;
    if (documents.some(p => p.name.toLowerCase() === newName.toLowerCase() && p.name !== editingDoc.name)) {
        toast({
            variant: 'destructive',
            title: 'TCR duplicado',
            description: 'Este TCR já existe.',
        });
        return;
    }

    const newDocs = documents.map(p => (p.name === editingDoc.name ? { ...p, name: newName } : p));
    const success = await saveDocsToFirestore(newDocs);
    if(success) {
        setDocuments(newDocs);
        setEditingDoc(null);
        setEditingValue('');
        toast({
            title: 'Sucesso!',
            description: 'O TCR foi atualizado.',
        });
    }
  }
  
  if (isLoading) {
    return (
        <Card>
            <CardHeader>
                <CardTitle>Gerenciar Termos de Conhecimento de Risco (TCR)</CardTitle>
                <CardDescription>
                  Adicione, renomeie ou exclua os TCRs.
                </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
                <Skeleton className="h-24 w-full" />
                <Separator className="my-6" />
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
        <CardTitle>Gerenciar Termos de Conhecimento de Risco (TCR)</CardTitle>
        <CardDescription>
          Adicione, renomeie ou exclua os Termos de Conhecimento de Risco.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleAddDoc} className="flex flex-col sm:flex-row items-stretch sm:items-end gap-4">
            <div className="w-full space-y-2">
                <Label htmlFor="new-doc-name">
                Novo TCR
                </Label>
                <div className="flex items-center gap-2">
                    <span className="flex h-10 items-center justify-center rounded-md border border-input bg-background px-3 text-sm font-medium text-muted-foreground">
                        TCR
                    </span>
                    <Input
                        id="new-doc-name"
                        placeholder="Ex: TCR Geral"
                        value={newDocName}
                        onChange={(e) => setNewDocName(e.target.value)}
                        disabled={isSaving}
                        className="flex-1"
                    />
                </div>
            </div>
            <Button type="submit" disabled={isSaving || !newDocName.trim()} className="w-full sm:w-auto">
                {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Plus className="mr-2 h-4 w-4" />}
                {isSaving ? 'Adicionando...' : 'Adicionar'}
            </Button>
        </form>

        <Separator className="my-6" />

        <div>
          <h3 className="mb-4 text-lg font-medium">TCRs Existentes</h3>
          {documents.length > 0 ? (
            <ul className="space-y-3">
              {documents.map((doc) => (
                <li
                  key={doc.name}
                  className="flex flex-col sm:flex-row sm:items-center justify-between rounded-md border bg-card p-3 gap-3"
                >
                  {editingDoc?.name === doc.name ? (
                    <div className='flex-1 flex flex-col sm:flex-row items-stretch sm:items-center gap-2'>
                        <span className="flex h-8 items-center justify-center rounded-md border border-input bg-background px-3 text-sm font-medium text-muted-foreground">
                            TCR
                        </span>
                        <Input
                            value={editingValue}
                            onChange={(e) => setEditingValue(e.target.value)}
                            className="h-8 flex-1"
                            autoFocus
                            onKeyDown={(e) => e.key === 'Enter' && handleSaveEdit()}
                        />
                        <div className="flex items-center justify-end gap-2">
                          <Button variant="ghost" size="icon" onClick={handleSaveEdit} className='h-9 w-9 sm:h-8 sm:w-8 text-green-500 hover:text-green-600 border sm:border-0' aria-label="Salvar edição"><Check className="h-4 w-4" /></Button>
                          <Button variant="ghost" size="icon" onClick={handleCancelEditing} className='h-9 w-9 sm:h-8 sm:w-8 text-muted-foreground hover:text-destructive border sm:border-0' aria-label="Cancelar edição"><X className="h-4 w-4" /></Button>
                        </div>
                    </div>
                  ) : (
                    <>
                        <span className="text-sm font-medium break-all">{doc.name}</span>
                        <div className="flex items-center justify-end gap-1">
                            <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => handleStartEditing(doc)}
                                disabled={isSaving}
                                className="h-9 w-9 sm:h-8 sm:w-8 text-muted-foreground hover:text-primary border sm:border-0"
                                aria-label={`Editar ${doc.name}`}
                            >
                                <Pencil className="h-4 w-4" />
                            </Button>
                            
                            <AlertDialog>
                                <AlertDialogTrigger asChild>
                                    <Button
                                        variant="ghost"
                                        size="icon"
                                        disabled={isSaving}
                                        className="h-9 w-9 sm:h-8 sm:w-8 text-muted-foreground hover:text-destructive border sm:border-0"
                                        aria-label={`Remover ${doc.name}`}
                                    >
                                        <Trash2 className="h-4 w-4" />
                                    </Button>
                                </AlertDialogTrigger>
                                <AlertDialogContent>
                                    <AlertDialogHeader>
                                        <AlertDialogTitle>Você tem certeza?</AlertDialogTitle>
                                        <AlertDialogDescription>
                                        Esta ação não pode ser desfeita. Isso excluirá permanentemente o TCR "{doc.name}".
                                        </AlertDialogDescription>
                                    </AlertDialogHeader>
                                    <AlertDialogFooter>
                                        <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                        <AlertDialogAction 
                                            onClick={() => handleRemoveDoc(doc)} 
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
              Nenhum TCR cadastrado.
            </p>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
