
'use client';

import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
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
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogClose,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { useFirestore, useUser } from '@/firebase';
import { useProfile } from '@/context/profile-context';
import { collection, getDoc, doc, Timestamp, deleteDoc, onSnapshot, updateDoc } from 'firebase/firestore';
import { format, differenceInDays, startOfDay, isBefore } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Skeleton } from './ui/skeleton';
import { Badge } from './ui/badge';
import { Button } from './ui/button';
import { Calendar as CalendarIcon, Pencil, Trash2, Loader2, TriangleAlert, FileDown, Eye } from 'lucide-react';
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
import { ScrollArea } from './ui/scroll-area';
import { Calendar } from './ui/calendar';
import { Input } from './ui/input';
import { Checkbox } from './ui/checkbox';

interface Equipment {
  id: string;
  equipmentType: string;
  brand: string;
  model: string;
  lotCaUiaa: string;
  status: 'operacional' | 'em manutencao' | 'descartado';
  manufacturingDate?: Timestamp;
  storageLocation: string;
  storageDetails: string;
  lastInspectionDate?: Timestamp;
  nextInspectionDate?: Timestamp;
  discardReason?: string;
  observations?: string;
}

interface EquipmentReportProps {
  onEdit: (equipment: Equipment, scrollPosition: number) => void;
  preFilter?: {
    status: 'overdue';
  };
  // New prop to restore scroll position when returning from edit
  initialScrollPosition?: number;
}

const statusMapping: Record<string, { label: string, className: string }> = {
    operacional: { label: 'Operacional', className: 'bg-green-600 text-white' },
    'em manutencao': { label: 'Em Manutenção', className: 'bg-orange-500 text-white' },
    descartado: { label: 'Descartado', className: 'bg-muted text-muted-foreground' }
};

const inspectionStatusOptions = [
    { value: 'overdue', label: 'Vistoria Atrasada' },
    { value: 'due_soon', label: 'À Vencer (próximos 30 dias)' },
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


export function EquipmentReport({ onEdit, preFilter, initialScrollPosition }: EquipmentReportProps) {
  const firestore = useFirestore();
  const { user } = useUser();
  const { toast } = useToast();
  const { profile } = useProfile();
  
  const [equipments, setEquipments] = useState<Equipment[]>([]);
  const [selectedEquipment, setSelectedEquipment] = useState<Equipment | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [bulkInspectionDate, setBulkInspectionDate] = useState<Date | undefined>(undefined);
  const [isUpdatingBulk, setIsUpdatingBulk] = useState(false);

  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const [isDeleting, setIsDeleting] = useState<string | null>(null);

  // Filter states
  const [filterType, setFilterType] = useState<string[]>([]);
  const [filterBrand, setFilterBrand] = useState<string[]>([]);
  const [filterStatus, setFilterStatus] = useState<string[]>([]);
  const [filterInspection, setFilterInspection] = useState<string[]>(preFilter?.status === 'overdue' ? ['overdue'] : []);
  const [filterStorageLocation, setFilterStorageLocation] = useState<string[]>([]);
  const [filterLotCaUiaa, setFilterLotCaUiaa] = useState<string>('');

  // Dynamic options for selects
  const [equipmentTypes, setEquipmentTypes] = useState<string[]>([]);
  const [brands, setBrands] = useState<string[]>([]);
  const [locations, setLocations] = useState<string[]>([]);
  const [clientToday, setClientToday] = useState<Date | null>(null);

  useEffect(() => {
    // This will only run on the client, after hydration
    setClientToday(startOfDay(new Date()));
  }, []);
  
  // Efeito para garantir que o scroll comece no topo (último lançamento) ao carregar
  useEffect(() => {
    if (!isLoading) {
      const timer = setTimeout(() => {
        if (scrollContainerRef.current) {
          scrollContainerRef.current.scrollTop = 0;
        }
        const element = document.getElementById('report-top');
        if (element) {
          element.scrollIntoView({ behavior: 'auto', block: 'start' });
        }
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [isLoading]);

  // Efeito para garantir que o scroll volte ao topo ao fechar o modal ou carregar os dados
  useEffect(() => {
    if (!selectedEquipment && !isLoading) {
      if (scrollContainerRef.current) {
        scrollContainerRef.current.scrollTop = 0;
      }
      const element = document.getElementById('report-top');
      if (element) {
        element.scrollIntoView({ behavior: 'auto', block: 'start' });
      }
    }
  }, [selectedEquipment, isLoading]);

  const getSettingsDocRef = useCallback((collectionName: string) => {
    if (!firestore || !user) return null;
    return doc(firestore, 'sgs_genius', user.uid, 'settings', collectionName);
  }, [firestore, user]);

  useEffect(() => {
    const fetchSelectOptions = async (docName: string, setData: (data: string[]) => void, field: 'types' | 'brands' | 'locations') => {
      const docRef = getSettingsDocRef(docName);
      if (!docRef) return;
      try {
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
          const data = docSnap.data();
          setData((data[field] || []).sort((a: string, b: string) => a.localeCompare(b)));
        }
      } catch (error) {
        console.error(`Error fetching ${docName}:`, error);
      }
    };
    fetchSelectOptions('equipmentTypes', setEquipmentTypes, 'types');
    fetchSelectOptions('equipmentBrands', setBrands, 'brands');
    fetchSelectOptions('locations', setLocations, 'locations');
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

  const handleUpdateInspectionDate = async (equipmentId: string, newDate: Date) => {
    if (!firestore || !user) return;
    
    try {
      const docRef = doc(firestore, 'sgs_genius', user.uid, 'equipments', equipmentId);
      await updateDoc(docRef, {
        nextInspectionDate: Timestamp.fromDate(newDate)
      });
      toast({
        title: 'Sucesso!',
        description: 'Nova data de vistoria programada.',
      });
    } catch (error) {
      console.error("Error updating date:", error);
      toast({
        variant: 'destructive',
        title: 'Erro ao atualizar',
        description: 'Não foi possível salvar a nova data.',
      });
    }
  };

  const toggleSelectAll = () => {
    if (selectedIds.size === filteredEquipments.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(filteredEquipments.map(eq => eq.id)));
    }
  };

  const toggleSelect = (id: string) => {
    const newSelected = new Set(selectedIds);
    if (newSelected.has(id)) {
      newSelected.delete(id);
    } else {
      newSelected.add(id);
    }
    setSelectedIds(newSelected);
  };

  const handleBulkUpdate = async () => {
    if (!firestore || !user || !bulkInspectionDate || selectedIds.size === 0) return;
    
    setIsUpdatingBulk(true);
    try {
      const updates = Array.from(selectedIds).map(id => {
        const docRef = doc(firestore, 'sgs_genius', user.uid, 'equipments', id);
        return updateDoc(docRef, {
          nextInspectionDate: Timestamp.fromDate(bulkInspectionDate)
        });
      });
      
      await Promise.all(updates);
      
      toast({
        title: 'Sucesso!',
        description: `${selectedIds.size} equipamentos atualizados.`,
      });
      setSelectedIds(new Set());
      setBulkInspectionDate(undefined);
    } catch (error) {
      console.error("Error bulk updating:", error);
      toast({ variant: 'destructive', title: 'Erro ao atualizar', description: 'Falha na atualização em massa.' });
    } finally {
      setIsUpdatingBulk(false);
    }
  };

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
        if (filter === 'due_soon') {
            if (eq.status === 'descartado' || !eq.nextInspectionDate) return false;
            const daysUntil = differenceInDays(startOfDay(eq.nextInspectionDate.toDate()), clientToday);
            return daysUntil >= 0 && daysUntil <= 30;
        }
        if (filter === 'no_inspection') {
          return eq.status === 'descartado';
        }
        return false;
      });
      const storageLocationMatch = filterStorageLocation.length === 0 || filterStorageLocation.includes(eq.storageLocation);
      const lotCaUiaaMatch = !filterLotCaUiaa || eq.lotCaUiaa?.toLowerCase().startsWith(filterLotCaUiaa.toLowerCase());

      return typeMatch && brandMatch && statusMatch && inspectionMatch && storageLocationMatch && lotCaUiaaMatch;
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
  }, [equipments, filterType, filterBrand, filterStatus, filterInspection, filterStorageLocation, clientToday, filterLotCaUiaa]);

  const clearFilters = () => {
    setFilterType([]);
    setFilterBrand([]);
    setFilterStatus([]);
    setFilterInspection([]);
    setFilterStorageLocation([]);
    setFilterLotCaUiaa('');
  }

  const handleExportToWord = () => {
    if (filteredEquipments.length === 0) {
      toast({
        variant: 'destructive',
        title: 'Nenhum dado para exportar',
        description: 'A lista filtrada está vazia.',
      });
      return;
    }

    // Group equipments by type
    const groupedByType = filteredEquipments.reduce((acc, eq) => {
      const type = eq.equipmentType || 'Sem Tipo';
      if (!acc[type]) {
        acc[type] = [];
      }
      acc[type].push(eq);
      return acc;
    }, {} as Record<string, Equipment[]>);


    const equipmentsHtml = Object.entries(groupedByType).map(([type, equipments]) => {
      const itemsHtml = equipments.map(eq => {
          return `
            <div style="border-bottom: 1px solid #eee; padding: 10px 0; margin-bottom: 10px; font-family: Arial, sans-serif; font-size: 14px; page-break-inside: avoid;">
                <table style="width: 100%; border-collapse: collapse;">
                    <tbody>
                        <tr>
                            <td style="padding: 4px; width: 25%;"><strong>Marca:</strong> ${eq.brand || 'N/A'}</td>
                            <td style="padding: 4px; width: 25%;"><strong>Modelo:</strong> ${eq.model || 'N/A'}</td>
                            <td style="padding: 4px; width: 25%;"><strong>Lote/CA:</strong> ${eq.lotCaUiaa || 'N/A'}</td>
                            <td style="padding: 4px; width: 25%;"><strong>Status:</strong> ${statusMapping[eq.status]?.label || 'N/A'}</td>
                        </tr>
                        <tr>
                            <td colspan="4" style="padding: 4px;"><strong>Detalhe Local:</strong> ${eq.storageDetails || 'N/A'}</td>
                        </tr>
                    </tbody>
                </table>
            </div>
          `;
      }).join('');

      return `
        <div style="margin-bottom: 25px; page-break-before: auto; page-break-inside: avoid;">
            <h2 style="font-size: 18px; border-bottom: 2px solid #ccc; padding-bottom: 5px; margin-bottom: 10px; color: #333;">
                ${type}
            </h2>
            ${itemsHtml}
        </div>
      `;
    }).join('');

    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <title>Relatório de Equipamentos</title>
        <style>
            body { font-family: Arial, sans-serif; }
            h1 { font-size: 24px; color: #333; }
            p { font-size: 12px; color: #666; }
        </style>
      </head>
      <body>
        <h1>Relatório de Equipamentos</h1>
        <p>Exportado em: ${new Date().toLocaleString('pt-BR')}</p>
        <p>Total de equipamentos na lista: ${filteredEquipments.length}</p>
        <br/>
        ${equipmentsHtml}
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

  // When opening view dialog, just set the selected equipment
  const handleOpenViewDialog = (equipment: Equipment) => {
    setSelectedEquipment(equipment);
  };

  const renderSkeletons = () => (
    Array.from({ length: 5 }).map((_, i) => (
      <TableRow key={i}>
        <TableCell><Skeleton className="h-5 w-24" /></TableCell>
        <TableCell><Skeleton className="h-5 w-24" /></TableCell>
        <TableCell><Skeleton className="h-5 w-24" /></TableCell>
        <TableCell><Skeleton className="h-5 w-20" /></TableCell>
        <TableCell><Skeleton className="h-5 w-24" /></TableCell>
        <TableCell className="text-right"><Skeleton className="h-8 w-8 ml-auto" /></TableCell>
      </TableRow>
    ))
  );

  return (
    <Dialog onOpenChange={(isOpen) => !isOpen && setSelectedEquipment(null)}>
      <div id="report-top" className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Relatório Equipamentos</CardTitle>
            <CardDescription>Filtre e visualize os equipamentos registrados no sistema.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 items-end">
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
              <div className="space-y-2">
                  <Label>Local de Armazenamento</Label>
                   <SheetFilter
                      title='Filtrar por Local'
                      options={locations.map(o => ({ value: o, label: o }))}
                      selected={filterStorageLocation}
                      onChange={setFilterStorageLocation}
                      disabled={locations.length === 0}
                      buttonText='Filtrar por Local'
                  />
              </div>
              <div className="space-y-2">
                <Label htmlFor="lot-filter">Lote/CA/UIAA</Label>
                <Input
                  id="lot-filter"
                  placeholder="Digite para filtrar..."
                  value={filterLotCaUiaa}
                  onChange={(e) => setFilterLotCaUiaa(e.target.value)}
                />
              </div>
              <Button onClick={clearFilters} variant="outline" className="w-full">Limpar Filtros</Button>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader>
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <CardTitle>Resultados</CardTitle>
                <CardDescription>
                  Foram encontrados {filteredEquipments.length} equipamentos.
                </CardDescription>
              </div>
              <div className="flex flex-wrap items-center justify-end gap-2">
                {profile === 'admin' && selectedIds.size > 0 && (
                    <div className="flex items-center gap-2 mr-4 bg-muted/50 p-1 rounded-md border border-primary/20 animate-in fade-in zoom-in-95">
                        <Popover>
                            <PopoverTrigger asChild>
                                <Button variant="outline" size="sm" className="h-8 gap-2 text-xs">
                                    <CalendarIcon className="h-3.5 w-3.5" />
                                    {bulkInspectionDate ? format(bulkInspectionDate, 'dd/MM/yy') : 'Nova data p/ todos'}
                                </Button>
                            </PopoverTrigger>
                            <PopoverContent className="w-auto p-0" align="end">
                                <Calendar
                                    mode="single"
                                    selected={bulkInspectionDate}
                                    onSelect={setBulkInspectionDate}
                                    initialFocus
                                />
                            </PopoverContent>
                        </Popover>
                        <Button size="sm" className="h-8 text-xs" disabled={!bulkInspectionDate || isUpdatingBulk} onClick={handleBulkUpdate}>
                            {isUpdatingBulk ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : 'Atualizar Selecionados'}
                        </Button>
                    </div>
                )}
                <Button onClick={handleExportToWord} disabled={filteredEquipments.length === 0}>
                    <FileDown className="mr-2 h-4 w-4" />
                    Exportar
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-0 md:p-6 md:pt-0">
            <div ref={scrollContainerRef} className="max-h-[65vh] overflow-y-auto md:max-h-none overflow-x-auto">
                <Table>
                <TableHeader className="sticky top-0 bg-card z-10 shadow-sm">
                    <TableRow>
                    <TableHead className="w-[40px]">
                        <Checkbox 
                            checked={filteredEquipments.length > 0 && selectedIds.size === filteredEquipments.length}
                            onCheckedChange={toggleSelectAll}
                        />
                    </TableHead>
                    <TableHead>Tipo</TableHead>
                    <TableHead>Marca</TableHead>
                    <TableHead>Local</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Inspeção</TableHead>
                    <TableHead className="text-right">Ações</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {isLoading || clientToday === null ? (
                    renderSkeletons()
                    ) : filteredEquipments.length > 0 ? (
                    filteredEquipments.map((eq) => {
                        const statusProps = statusMapping[eq.status] || { label: 'Desconhecido', className: 'bg-gray-400' };
                        const inspectionStatusProps = eq.status === 'descartado' 
                        ? { label: 'Sem vistoria', className: 'bg-muted text-muted-foreground' }
                        : getInspectionStatus(eq.nextInspectionDate?.toDate(), clientToday);
                        
                        return (
                        <TableRow 
                            key={eq.id}
                            className={cn(eq.status === 'descartado' && 'bg-destructive/10 hover:bg-destructive/20')}
                        >
                            <TableCell>
                                <Checkbox 
                                    checked={selectedIds.has(eq.id)}
                                    onCheckedChange={() => toggleSelect(eq.id)}
                                />
                            </TableCell>
                            <TableCell>{eq.equipmentType}</TableCell>
                            <TableCell>{eq.brand}</TableCell>
                            <TableCell>{eq.storageLocation}</TableCell>
                            <TableCell><Badge className={cn(statusProps.className)}>{statusProps.label}</Badge></TableCell>
                            <TableCell>
                            {profile === 'admin' ? (
                                <Popover>
                                    <PopoverTrigger asChild>
                                        <button className="focus:outline-none">
                                            <Badge className={cn('flex items-center gap-1.5 cursor-pointer hover:opacity-80 transition-opacity', inspectionStatusProps.className)}>
                                                {inspectionStatusProps.label === 'Vistoria Atrasada' && <TriangleAlert className="h-3.5 w-3.5" />}
                                                {inspectionStatusProps.label}
                                            </Badge>
                                        </button>
                                    </PopoverTrigger>
                                    <PopoverContent className="w-auto p-0" align="start">
                                        <Calendar
                                            mode="single"
                                            selected={eq.nextInspectionDate?.toDate()}
                                            onSelect={(date) => date && handleUpdateInspectionDate(eq.id, date)}
                                            initialFocus
                                        />
                                    </PopoverContent>
                                </Popover>
                            ) : (
                                <Badge className={cn('flex items-center gap-1.5', inspectionStatusProps.className)}>
                                    {inspectionStatusProps.label === 'Vistoria Atrasada' && <TriangleAlert className="h-3.5 w-3.5" />}
                                    {inspectionStatusProps.label}
                                </Badge>
                            )}
                            </TableCell>
                            <TableCell className="text-right">
                            <DialogTrigger asChild>
                               <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-primary" aria-label="Visualizar equipamento" onClick={() => handleOpenViewDialog(eq)}>
                               <Eye className="h-4 w-4" />
                              </Button>
                            </DialogTrigger>
                            {profile === 'admin' && (
                                <>
                                <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-primary" aria-label="Editar equipamento" onClick={() => onEdit(eq, scrollContainerRef.current?.scrollTop || 0)}>
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
                                            <AlertDialogDescription>
                                            Esta ação excluirá permanentemente o equipamento "{eq.equipmentType} - {eq.brand}".
                                            </AlertDialogDescription>
                                        </AlertDialogHeader>
                                        <AlertDialogFooter>
                                            <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                            <AlertDialogAction onClick={() => handleDelete(eq.id)} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                                                Sim, excluir
                                            </AlertDialogAction>
                                        </AlertDialogFooter>
                                    </AlertDialogContent>
                                </AlertDialog>
                                </>
                            )}
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
            </div>
          </CardContent>
        </Card>
      </div>
      <DialogContent className="max-w-2xl" onCloseAutoFocus={(e) => e.preventDefault()}>
          <DialogHeader>
            <DialogTitle>Detalhes do Equipamento</DialogTitle>
             <DialogDescription>
              Visualização detalhada do equipamento.
            </DialogDescription>
          </DialogHeader>
          {selectedEquipment && (
            <>
              <ScrollArea className="max-h-[70vh] pr-6">
                  <div className="space-y-4 py-4">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-4">
                          <div>
                              <Label className="font-semibold text-muted-foreground">Tipo</Label>
                              <p>{selectedEquipment.equipmentType}</p>
                          </div>
                          <div>
                              <Label className="font-semibold text-muted-foreground">Marca</Label>
                              <p>{selectedEquipment.brand}</p>
                          </div>
                          <div>
                              <Label className="font-semibold text-muted-foreground">Modelo</Label>
                              <p>{selectedEquipment.model || 'Não informado'}</p>
                          </div>
                          <div>
                              <Label className="font-semibold text-muted-foreground">Lote/CA/UIAA</Label>
                              <p>{selectedEquipment.lotCaUiaa || 'Não informado'}</p>
                          </div>
                          <div>
                              <Label className="font-semibold text-muted-foreground">Data de Fabricação</Label>
                              <p>{selectedEquipment.manufacturingDate ? format(selectedEquipment.manufacturingDate.toDate(), 'dd/MM/yyyy', { locale: ptBR }) : 'Não informado'}</p>
                          </div>
                           <div>
                              <Label className="font-semibold text-muted-foreground">Local Armazenado</Label>
                              <p>{selectedEquipment.storageLocation || 'Não informado'}</p>
                          </div>
                          <div>
                              <Label className="font-semibold text-muted-foreground">Detalhes do Local</Label>
                              <p>{selectedEquipment.storageDetails || 'Não informado'}</p>
                          </div>
                           <div>
                              <Label className="font-semibold text-muted-foreground">Status</Label>
                              <div>
                                  <Badge className={cn(statusMapping[selectedEquipment.status]?.className)}>
                                      {statusMapping[selectedEquipment.status]?.label || 'Desconhecido'}
                                  </Badge>
                              </div>
                          </div>
                          {selectedEquipment.status === 'descartado' && selectedEquipment.discardReason && (
                            <div className="md:col-span-2">
                                <Label className="font-semibold text-muted-foreground">Motivo do Descarte</Label>
                                <p>{selectedEquipment.discardReason}</p>
                            </div>
                          )}
                          {selectedEquipment.observations && (
                            <div className="md:col-span-2">
                                <Label className="font-semibold text-muted-foreground">Observações</Label>
                                <p className="whitespace-pre-wrap">{selectedEquipment.observations}</p>
                            </div>
                          )}
                          {selectedEquipment.observations && (
                            <div className="md:col-span-2">
                                <Label className="font-semibold text-muted-foreground">Observações</Label>
                                <p className="whitespace-pre-wrap">{selectedEquipment.observations}</p>
                            </div>
                          )}
                          {selectedEquipment.status !== 'descartado' && (
                            <>
                                <div>
                                    <Label className="font-semibold text-muted-foreground">Última Inspeção</Label>
                                    <p>{selectedEquipment.lastInspectionDate ? format(selectedEquipment.lastInspectionDate.toDate(), 'dd/MM/yyyy', { locale: ptBR }) : 'Não informado'}</p>
                                </div>
                                <div>
                                    <Label className="font-semibold text-muted-foreground">Próxima Inspeção</Label>
                                    <p>{selectedEquipment.nextInspectionDate ? format(selectedEquipment.nextInspectionDate.toDate(), 'dd/MM/yyyy', { locale: ptBR }) : 'Não informado'}</p>
                                </div>
                            </>
                          )}
                      </div>
                  </div>
              </ScrollArea>
              <div className="flex justify-end pt-2">
                  <DialogClose asChild>
                      <Button type="button" variant="secondary">
                          Fechar
                      </Button>
                  </DialogClose>
              </div>
            </>
          )}
      </DialogContent>
    </Dialog>
  );
}
