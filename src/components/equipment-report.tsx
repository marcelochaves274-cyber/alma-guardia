'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { useFirestore, useUser } from '@/firebase';
import { collection, getDoc, doc, Timestamp, deleteDoc, onSnapshot } from 'firebase/firestore';
import { format, differenceInDays, startOfDay, isBefore } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Skeleton } from './ui/skeleton';
import { Badge } from './ui/badge';
import { Button } from './ui/button';
import { Pencil, Trash2, Loader2, TriangleAlert, FileDown } from 'lucide-react';
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
} from "@/components/ui/alert-dialog";
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import { Label } from './ui/label';
import { SheetFilter } from './sheet-filter';

interface Equipment {
  id: string;
  equipmentType: string;
  brand: string;
  model: string;
  status: 'operacional' | 'em manutencao' | 'descartado';
  manufacturingDate?: Timestamp;
  lastInspectionDate?: Timestamp;
  nextInspectionDate?: Timestamp;
}

interface EquipmentReportProps {
  onEdit: (equipment: Equipment) => void;
  preFilter?: {
    status: 'overdue';
  };
}

const statusMapping: Record<string, { label: string, className: string }> = {
    operacional: { label: 'Operacional', className: 'bg-green-600 text-white' },
    'em manutencao': { label: 'Em Manutenção', className: 'bg-orange-500 text-white' },
    descartado: { label: 'Descartado', className: 'bg-muted text-muted-foreground' }
};

const inspectionStatusOptions = [
    { value: 'overdue', label: 'Vistoria Atrasada' },
    { value: 'no_inspection', label: 'Sem Vistoria' },
];

const getInspectionStatus = (nextInspectionDate: Date | null | undefined, clientToday: Date) => {
    if (!nextInspectionDate) {
        return { label: 'Sem data', className: 'bg-gray-400 text-white', isOverdue: false };
    }
    const inspectionDay = startOfDay(nextInspectionDate);
    const daysUntil = differenceInDays(inspectionDay, clientToday);

    if (daysUntil < 0) {
        return { label: 'Vistoria Atrasada', className: 'bg-red-600 text-white', isOverdue: true };
    }
    if (daysUntil === 0) {
        return { label: 'Vistoriar Hoje', className: 'bg-yellow-500 text-black', isOverdue: false };
    }
    if (daysUntil <= 30) {
        return { label: `Vence em ${daysUntil} dia(s)`, className: 'bg-orange-500 text-white', isOverdue: false };
    }
    return { label: `Vence em ${daysUntil} dia(s)`, className: 'bg-green-600 text-white', isOverdue: false };
};


export function EquipmentReport({ onEdit, preFilter }: EquipmentReportProps) {
  const firestore = useFirestore();
  const { user } = useUser();
  const { toast } = useToast();
  
  const [equipments, setEquipments] = useState<Equipment[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isDeleting, setIsDeleting] = useState<string | null>(null);

  // Filter states
  const [filterType, setFilterType] = useState<string[]>([]);
  const [filterBrand, setFilterBrand] = useState<string[]>([]);
  const [filterStatus, setFilterStatus] = useState<string[]>([]);
  const [filterInspection, setFilterInspection] = useState<string[]>(preFilter?.status === 'overdue' ? ['overdue'] : []);
  
  // Dynamic options for selects
  const [equipmentTypes, setEquipmentTypes] = useState<string[]>([]);
  const [brands, setBrands] = useState<string[]>([]);
  const [clientToday, setClientToday] = useState<Date | null>(null);

  useEffect(() => {
    // This will only run on the client, after hydration
    setClientToday(startOfDay(new Date()));
  }, []);
  
  useEffect(() => {
    setFilterInspection(preFilter?.status === 'overdue' ? ['overdue'] : []);
  }, [preFilter]);
  
  const getSettingsDocRef = useCallback((collectionName: string) => {
    if (!firestore || !user) return null;
    return doc(firestore, 'sgs_genius', user.uid, 'settings', collectionName);
  }, [firestore, user]);

  useEffect(() => {
    const fetchSelectOptions = async (docName: string, setData: (data: string[]) => void, field: 'types' | 'brands') => {
      const docRef = getSettingsDocRef(docName);
      if (!docRef) return;
      try {
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
          const data = docSnap.data();
          setData(data[field] || []);
        }
      } catch (error) {
        console.error(`Error fetching ${docName}:`, error);
      }
    };
    fetchSelectOptions('equipmentTypes', setEquipmentTypes, 'types');
    fetchSelectOptions('equipmentBrands', setBrands, 'brands');
  }, [getSettingsDocRef]);

  useEffect(() => {
    if (!user || !firestore) return;
    setIsLoading(true);
    const equipmentsCollectionRef = collection(firestore, 'sgs_genius', user.uid, 'equipments');
    
    const unsubscribe = onSnapshot(equipmentsCollectionRef, (querySnapshot) => {
      const equipmentsData = querySnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data(),
        }) as Equipment);
      
      setEquipments(equipmentsData);
      setIsLoading(false);
    }, (error) => {
        console.error("Error fetching real-time equipment:", error);
        toast({
            variant: "destructive",
            title: "Erro de conexão",
            description: "Não foi possível buscar os equipamentos em tempo real."
        });
        setIsLoading(false);
    });
    
    return () => unsubscribe();
  }, [user, firestore, toast]);
  
  const filteredEquipments = useMemo(() => {
    if (!clientToday) return [];
    return equipments.filter(eq => {
      const typeMatch = filterType.length === 0 || filterType.includes(eq.equipmentType);
      const brandMatch = filterBrand.length === 0 || filterBrand.includes(eq.brand);
      const statusMatch = filterStatus.length === 0 || filterStatus.includes(eq.status);
      const inspectionMatch = filterInspection.length === 0 || filterInspection.some(filter => {
        if (filter === 'overdue') {
          return eq.status !== 'descartado' && !!eq.nextInspectionDate && isBefore(eq.nextInspectionDate.toDate(), clientToday);
        }
        if (filter === 'no_inspection') {
          return eq.status === 'descartado';
        }
        return false;
      });

      return typeMatch && brandMatch && statusMatch && inspectionMatch;
    }).sort((a,b) => {
        if (a.status === 'descartado' && b.status !== 'descartado') {
          return 1;
        }
        if (a.status !== 'descartado' && b.status === 'descartado') {
          return -1;
        }
        const dateA = a.nextInspectionDate?.toDate()?.getTime() || Infinity;
        const dateB = b.nextInspectionDate?.toDate()?.getTime() || Infinity;
        return dateA - dateB;
    });
  }, [equipments, filterType, filterBrand, filterStatus, filterInspection, clientToday]);

  const clearFilters = () => {
    setFilterType([]);
    setFilterBrand([]);
    setFilterStatus([]);
    setFilterInspection([]);
  }

  const handleDelete = async (equipmentId: string) => {
    if (!firestore || !user) {
      toast({ variant: 'destructive', title: 'Erro', description: 'Usuário não autenticado.'});
      return;
    }
    setIsDeleting(equipmentId);
    try {
      const docRef = doc(firestore, 'sgs_genius', user.uid, 'equipments', equipmentId);
      await deleteDoc(docRef);
      
      toast({ title: 'Sucesso!', description: 'Equipamento excluído com sucesso.' });
    } catch (error) {
      console.error("Error deleting equipment:", error);
      toast({
        variant: 'destructive',
        title: 'Erro ao excluir',
        description: 'Não foi possível excluir o equipamento.',
      });
    } finally {
      setIsDeleting(null);
    }
  };

  const handleExportToWord = () => {
    if (filteredEquipments.length === 0) {
      toast({
        variant: 'destructive',
        title: 'Nenhum dado para exportar',
        description: 'A lista filtrada está vazia.',
      });
      return;
    }

    const getInspectionStatusLabel = (equipment: Equipment) => {
      if (equipment.status === 'descartado') {
        return 'Sem vistoria';
      }
      if (!clientToday) return 'Calculando...';
      const status = getInspectionStatus(equipment.nextInspectionDate?.toDate(), clientToday);
      return status.label;
    };

    const tableHtml = `
      <table border="1" style="border-collapse: collapse; width: 100%; font-family: Arial, sans-serif;">
        <thead>
          <tr style="background-color: #f2f2f2;">
            <th style="padding: 8px; text-align: left;">Tipo</th>
            <th style="padding: 8px; text-align: left;">Marca</th>
            <th style="padding: 8px; text-align: left;">Modelo</th>
            <th style="padding: 8px; text-align: left;">Status</th>
            <th style="padding: 8px; text-align: left;">Inspeção</th>
          </tr>
        </thead>
        <tbody>
          ${filteredEquipments.map(eq => `
            <tr>
              <td style="padding: 8px;">${eq.equipmentType || ''}</td>
              <td style="padding: 8px;">${eq.brand || ''}</td>
              <td style="padding: 8px;">${eq.model || ''}</td>
              <td style="padding: 8px;">${statusMapping[eq.status]?.label || 'Desconhecido'}</td>
              <td style="padding: 8px;">${getInspectionStatusLabel(eq)}</td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    `;

    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <title>Relatório de Equipamentos</title>
      </head>
      <body>
        <h1>Relatório de Equipamentos</h1>
        <p>Exportado em: ${new Date().toLocaleString('pt-BR')}</p>
        <p>Total de equipamentos na lista: ${filteredEquipments.length}</p>
        <br/>
        ${tableHtml}
      </body>
      </html>
    `;

    const blob = new Blob([html], { type: 'application/msword' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = 'relatorio_equipamentos.doc';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const renderSkeletons = () => (
    Array.from({ length: 5 }).map((_, i) => (
      <TableRow key={i}>
        <TableCell><Skeleton className="h-5 w-28" /></TableCell>
        <TableCell><Skeleton className="h-5 w-24" /></TableCell>
        <TableCell><Skeleton className="h-5 w-20" /></TableCell>
        <TableCell><Skeleton className="h-5 w-24" /></TableCell>
        <TableCell><Skeleton className="h-5 w-28" /></TableCell>
        <TableCell><Skeleton className="h-5 w-20" /></TableCell>
      </TableRow>
    ))
  );

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Relatório Equipamentos</CardTitle>
          <CardDescription>Filtre e visualize os equipamentos registrados no sistema.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 items-end">
             <div className="space-y-2">
                <Label>Filtrar por Tipo</Label>
                <SheetFilter
                    title='Filtrar Tipos'
                    options={equipmentTypes.map(o => ({ value: o, label: o }))}
                    selected={filterType}
                    onChange={setFilterType}
                    disabled={equipmentTypes.length === 0}
                    buttonText='Filtrar por Tipo'
                />
            </div>
             <div className="space-y-2">
                <Label>Filtrar por Marca</Label>
                <SheetFilter
                    title='Filtrar Marcas'
                    options={brands.map(o => ({ value: o, label: o }))}
                    selected={filterBrand}
                    onChange={setFilterBrand}
                    disabled={brands.length === 0}
                    buttonText='Filtrar por Marca'
                />
            </div>
            <div className="space-y-2">
                <Label>Filtrar por Status</Label>
                <SheetFilter
                    title='Filtrar Status'
                    options={Object.entries(statusMapping).map(([key, { label }]) => ({ value: key, label: label }))}
                    selected={filterStatus}
                    onChange={setFilterStatus}
                    buttonText='Filtrar por Status'
                />
            </div>
            <div className="space-y-2">
                <Label>Situação da Vistoria</Label>
                <SheetFilter
                    title='Filtrar Situação'
                    options={inspectionStatusOptions}
                    selected={filterInspection}
                    onChange={setFilterInspection}
                    buttonText='Filtrar por Situação'
                />
            </div>
            <Button onClick={clearFilters} variant="outline" className="w-full">Limpar Filtros</Button>
          </div>
        </CardContent>
      </Card>
      
      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
              <div>
                <CardTitle>Resultados</CardTitle>
                <CardDescription>Foram encontrados {filteredEquipments.length} equipamentos.</CardDescription>
              </div>
              <Button onClick={handleExportToWord} disabled={filteredEquipments.length === 0}>
                  <FileDown className="mr-2" />
                  Exportar
              </Button>
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Tipo</TableHead>
                <TableHead>Marca</TableHead>
                <TableHead>Modelo</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Inspeção</TableHead>
                <TableHead className="text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading || !clientToday ? (
                renderSkeletons()
              ) : filteredEquipments.length > 0 ? (
                filteredEquipments.map((eq) => {
                  const statusProps = statusMapping[eq.status] || { label: 'Desconhecido', className: 'bg-gray-400' };
                  const inspectionStatusProps = eq.status === 'descartado' 
                    ? { label: 'Sem vistoria', className: 'bg-muted text-muted-foreground' }
                    : getInspectionStatus(eq.nextInspectionDate?.toDate(), clientToday);
                  
                  return (
                    <TableRow key={eq.id} className={cn(eq.status === 'descartado' && 'bg-destructive/10 hover:bg-destructive/20')}>
                      <TableCell>{eq.equipmentType}</TableCell>
                      <TableCell>{eq.brand}</TableCell>
                      <TableCell>{eq.model}</TableCell>
                      <TableCell><Badge className={cn(statusProps.className)}>{statusProps.label}</Badge></TableCell>
                      <TableCell>
                        <Badge className={cn('flex items-center gap-1.5', inspectionStatusProps.className)}>
                          {inspectionStatusProps.label === 'Vistoria Atrasada' && <TriangleAlert className="h-3.5 w-3.5" />}
                          {inspectionStatusProps.label}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                         <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-primary" aria-label="Editar equipamento" onClick={() => onEdit(eq)}>
                            <Pencil className="h-4 w-4" />
                         </Button>
                         <AlertDialog>
                            <AlertDialogTrigger asChild>
                               <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-destructive" aria-label="Excluir equipamento" disabled={isDeleting === eq.id}>
                                  {isDeleting === eq.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
                               </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                                <AlertDialogHeader>
                                    <AlertDialogTitle>Você tem certeza?</AlertDialogTitle>
                                    <AlertDialogDescription>Esta ação excluirá permanentemente o equipamento {eq.brand} {eq.model}.</AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                    <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                    <AlertDialogAction onClick={() => handleDelete(eq.id)} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                                        Sim, excluir
                                    </AlertDialogAction>
                                </AlertDialogFooter>
                            </AlertDialogContent>
                         </AlertDialog>
                      </TableCell>
                    </TableRow>
                  );
                })
              ) : (
                <TableRow>
                  <TableCell colSpan={6} className="h-24 text-center">
                    {equipments.length === 0 ? "Nenhum equipamento registrado ainda." : "Nenhum equipamento encontrado com os filtros selecionados."}
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
