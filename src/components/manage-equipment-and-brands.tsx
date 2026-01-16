
'use client';

import { useState, type FormEvent, useEffect, useCallback, useRef } from 'react';
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
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { Plus, Trash2, Loader2, Pencil, Check, X, Upload, TriangleAlert } from 'lucide-react';
import { Separator } from './ui/separator';
import { useFirestore, useUser } from '@/firebase';
import { doc, getDoc, setDoc, writeBatch, collection, serverTimestamp, Timestamp, getDocs } from 'firebase/firestore';
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
import { useProfile } from '@/context/profile-context';
import Papa from 'papaparse';

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
  const { profile } = useProfile();
  const isAdmin = profile === 'admin';
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isImporting, setIsImporting] = useState(false);
  const [isDeletingAll, setIsDeletingAll] = useState(false);
  
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
              setState(s => ({ ...s, [itemType]: { ...s[itemType], items: data[fieldMap[itemType]] || [] } }));
            }
          } catch (error: any) {
            if (error.code !== 'permission-denied') {
              console.error(`Error fetching ${itemType}:`, error);
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
    } catch (error) {
        console.error(`Error saving ${itemType}:`, error);
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

    const newItems = [...current.items, trimmedItem];
    const success = await saveItemsToFirestore(itemType, newItems);
    if (success) {
      setState(s => ({ ...s, [itemType]: { ...s[itemType], items: newItems, newItem: '' } }));
      toast({ title: 'Sucesso!', description: `Item "${trimmedItem}" foi adicionado.` });
    }
  };

  const handleRemoveItem = async (itemType: ItemType, itemToRemove: string) => {
    const current = state[itemType];
    const newItems = current.items.filter((item) => item !== itemToRemove);
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

    const newItems = current.items.map(i => (i === current.editingItem ? trimmedValue : i));
    const success = await saveItemsToFirestore(itemType, newItems);
    if(success) {
        setState(s => ({ ...s, [itemType]: { ...s[itemType], items: newItems, editingItem: null, editingValue: '' } }));
        toast({ title: 'Sucesso!', description: 'O item foi atualizado.' });
    }
  }

  const parseDateString = (dateString: string): Date | null => {
    if (!dateString || typeof dateString !== 'string') return null;
  
    // Matches DD/MM/YYYY or YYYY-MM-DD
    const parts = dateString.match(/(\d+)/g);
    if (!parts || parts.length < 3) return null;
    
    let year, month, day;
  
    if (dateString.includes('/')) {
      [day, month, year] = parts.map(Number);
    } else if (dateString.includes('-')) {
      [year, month, day] = parts.map(Number);
    } else {
        return null;
    }
  
    if (year < 1000 || year > 3000 || month < 1 || month > 12 || day < 1 || day > 31) {
      return null;
    }

    return new Date(year, month - 1, day);
  };
  
  const handleFileImport = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !firestore || !user) {
      return;
    }

    setIsImporting(true);
    Papa.parse(file, {
      header: false,
      skipEmptyLines: true,
      encoding: "ISO-8859-1",
      complete: async (results) => {
        const data = results.data as string[][];
        if (data.length === 0) {
          toast({ variant: 'destructive', title: 'Arquivo vazio', description: 'O arquivo CSV não contém dados.' });
          setIsImporting(false);
          return;
        }

        try {
          const batch = writeBatch(firestore);
          const equipmentsCollectionRef = collection(firestore, 'sgs_genius', user.uid, 'equipments');

          data.forEach(row => {
            const newDocRef = doc(equipmentsCollectionRef);
            const [
              equipmentType, brand, model, lotCaUiaa, manufacturingDateStr,
              storageLocation, storageDetails, statusStr, lastInspectionDateStr, nextInspectionDateStr
            ] = row;
            
            const manufacturingDate = parseDateString(manufacturingDateStr);
            const lastInspectionDate = parseDateString(lastInspectionDateStr);
            const nextInspectionDate = parseDateString(nextInspectionDateStr);

            const getSanitizedStatus = (s: string) => {
              const lowerS = (s || '').toLowerCase().trim();
              if (lowerS.startsWith('operacion')) return 'operacional';
              if (['operacional', 'em manutencao', 'descartado'].includes(lowerS)) {
                return lowerS as 'operacional' | 'em manutencao' | 'descartado';
              }
              return 'operacional'; // Default
            };

            const equipmentData = {
              userId: user.uid,
              equipmentType: equipmentType || '',
              brand: brand || '',
              model: model || '',
              lotCaUiaa: lotCaUiaa || '',
              manufacturingDate: manufacturingDate ? Timestamp.fromDate(manufacturingDate) : null,
              storageLocation: storageLocation || '',
              storageDetails: storageDetails || '',
              status: getSanitizedStatus(statusStr),
              lastInspectionDate: lastInspectionDate ? Timestamp.fromDate(lastInspectionDate) : null,
              nextInspectionDate: nextInspectionDate ? Timestamp.fromDate(nextInspectionDate) : null,
              createdAt: serverTimestamp(),
            };
            batch.set(newDocRef, equipmentData);
          });
          
          await batch.commit();
          toast({ title: 'Importação Concluída!', description: `${data.length} equipamentos foram importados com sucesso.` });
        } catch (error) {
          console.error("Error importing data:", error);
          toast({ variant: 'destructive', title: 'Erro na Importação', description: 'Não foi possível importar os dados. Verifique o formato do arquivo e os dados.' });
        } finally {
          setIsImporting(false);
          if (fileInputRef.current) {
            fileInputRef.current.value = "";
          }
        }
      },
      error: (error) => {
        console.error("CSV parsing error:", error);
        toast({ variant: 'destructive', title: 'Erro de Leitura', description: 'Não foi possível ler o arquivo CSV.' });
        setIsImporting(false);
      }
    });
  };

  const handleDeleteAllEquipments = async () => {
    if (!firestore || !user) {
      toast({ variant: 'destructive', title: 'Erro', description: 'Usuário não autenticado.' });
      return;
    }

    setIsDeletingAll(true);
    try {
      const equipmentsCollectionRef = collection(firestore, 'sgs_genius', user.uid, 'equipments');
      const querySnapshot = await getDocs(equipmentsCollectionRef);
      
      if (querySnapshot.empty) {
        toast({ title: 'Nada a excluir', description: 'Não há equipamentos para excluir.' });
        setIsDeletingAll(false);
        return;
      }

      const batch = writeBatch(firestore);
      querySnapshot.forEach(doc => {
        batch.delete(doc.ref);
      });

      await batch.commit();
      toast({ title: 'Sucesso!', description: `Todos os ${querySnapshot.size} equipamentos foram excluídos.` });
    } catch (error) {
      console.error("Error deleting all equipments:", error);
      toast({ variant: 'destructive', title: 'Erro na Exclusão', description: 'Não foi possível excluir todos os equipamentos.' });
    } finally {
      setIsDeletingAll(false);
    }
  };

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
        <form onSubmit={(e) => handleAddItem(e, itemType)} className="flex items-end gap-4 mt-4">
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
          <Button type="submit" disabled={current.isSaving || !current.newItem.trim()}>
            {current.isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Plus className="mr-2 h-4 w-4" />}
            Adicionar
          </Button>
        </form>

        <Separator className="my-6" />
        
        <div>
          <h4 className="mb-4 text-lg font-medium">Itens Existentes</h4>
          {current.items.length > 0 ? (
            <ul className="space-y-3">
              {current.items.map((item) => (
                <li key={item} className="flex items-center justify-between rounded-md border bg-card p-3">
                  {current.editingItem === item ? (
                    <div className='flex-1 flex items-center gap-2'>
                        <Input value={current.editingValue} onChange={(e) => setState(s => ({ ...s, [itemType]: { ...s[itemType], editingValue: e.target.value } }))} className="h-8" autoFocus onKeyDown={(e) => e.key === 'Enter' && handleSaveEdit(itemType)} />
                        <Button variant="ghost" size="icon" onClick={() => handleSaveEdit(itemType)} className='h-8 w-8 text-green-500 hover:text-green-600'><Check className="h-4 w-4" /></Button>
                        <Button variant="ghost" size="icon" onClick={() => handleCancelEditing(itemType)} className='h-8 w-8 text-muted-foreground hover:text-destructive'><X className="h-4 w-4" /></Button>
                    </div>
                  ) : (
                    <>
                      <span className="text-sm font-medium">{item}</span>
                      <div className="flex items-center">
                          <Button variant="ghost" size="icon" onClick={() => handleStartEditing(itemType, item)} disabled={current.isSaving} className="h-8 w-8 text-muted-foreground hover:text-primary"><Pencil className="h-4 w-4" /></Button>
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button variant="ghost" size="icon" disabled={current.isSaving} className="h-8 w-8 text-muted-foreground hover:text-destructive"><Trash2 className="h-4 w-4" /></Button>
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
    <div className="space-y-12">
      <Card>
        <CardHeader>
          <CardTitle>Gerenciar Equipamentos e Marcas</CardTitle>
          <CardDescription>Adicione ou remova os tipos de equipamentos e as marcas que aparecerão no formulário de registro.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-12">
          {renderSection('equipmentTypes', 'Tipos de Equipamento', 'Ex: Mosquetão')}
          <Separator />
          {renderSection('equipmentBrands', 'Marcas de Equipamento', 'Ex: Petzl')}
        </CardContent>
      </Card>
      
      {isAdmin && (
        <Card>
          <CardHeader>
            <CardTitle>Importar / Excluir Equipamentos em Lote</CardTitle>
            <CardDescription>
              Faça o upload de um arquivo CSV para registrar múltiplos equipamentos ou exclua todos os registros existentes.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className='p-4 border-dashed border-2 border-muted-foreground/50 rounded-lg bg-muted/20 space-y-4'>
                <div>
                    <p className="text-sm font-semibold text-foreground mb-2">Instruções de Importação:</p>
                    <ul className="list-disc list-inside text-sm text-muted-foreground space-y-1">
                        <li>O arquivo deve estar no formato CSV (valores separados por vírgula).</li>
                        <li>Não inclua uma linha de cabeçalho no arquivo.</li>
                        <li>A ordem das colunas deve ser exatamente: <br /> <code className="text-xs bg-card p-1 rounded-sm">equipmentType, brand, model, lotCaUiaa, manufacturingDate, storageLocation, storageDetails, status, lastInspectionDate, nextInspectionDate</code></li>
                        <li>Datas devem estar no formato <code className='text-xs bg-card p-1 rounded-sm'>DD/MM/AAAA</code> ou <code className='text-xs bg-card p-1 rounded-sm'>AAAA-MM-DD</code>.</li>
                        <li>O status deve ser <code className='text-xs bg-card p-1 rounded-sm'>operacional</code>, <code className='text-xs bg-card p-1 rounded-sm'>em manutencao</code>, ou <code className='text-xs bg-card p-1 rounded-sm'>descartado</code>.</li>
                         <li>Para arquivos salvos no Excel, pode ser necessário usar a codificação <code className='text-xs bg-card p-1 rounded-sm'>ISO-8859-1</code> para caracteres especiais (ç, ã, etc.).</li>
                    </ul>
                </div>
                 <div className="!mt-6">
                    <p className="text-sm font-semibold text-foreground mb-2">Correção de Dados:</p>
                    <p className="text-sm text-muted-foreground">
                        Se a importação anterior resultou em dados com caracteres errados, primeiro limpe os dados antigos (manualmente, se necessário) antes de importar o arquivo CSV corrigido.
                    </p>
                </div>
            </div>
          </CardContent>
          <CardFooter className="flex flex-wrap gap-4">
            <Button onClick={() => fileInputRef.current?.click()} disabled={isImporting}>
              {isImporting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Upload className="mr-2 h-4 w-4" />}
              {isImporting ? 'Importando...' : 'Carregar Arquivo CSV'}
            </Button>
            <Input
              type="file"
              ref={fileInputRef}
              className="hidden"
              onChange={handleFileImport}
              accept=".csv"
            />
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="destructive" disabled={isDeletingAll}>
                  {isDeletingAll ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Trash2 className="mr-2 h-4 w-4" />}
                  Excluir Todos os Lançamentos
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Você tem certeza absoluta?</AlertDialogTitle>
                  <AlertDialogDescription>
                    Esta ação é irreversível e excluirá PERMANENTEMENTE todos os equipamentos registrados. Não será possível recuperar esses dados.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancelar</AlertDialogCancel>
                  <AlertDialogAction onClick={handleDeleteAllEquipments} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                    Sim, excluir tudo
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </CardFooter>
        </Card>
      )}
    </div>
  );
}
