'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
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
import { Calendar as CalendarIcon, Loader2 } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { useFirestore, useUser } from '@/firebase';
import { doc, getDoc, addDoc, updateDoc, collection, serverTimestamp, Timestamp } from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';
import { HelpTooltip } from './ui/help-tooltip';

interface RegisterEquipmentProps {
  equipmentToEdit: any | null;
  setPage: (page: string) => void;
}

export function RegisterEquipment({ equipmentToEdit, setPage }: RegisterEquipmentProps) {
  const isEditing = !!equipmentToEdit;

  // Form states
  const [equipmentType, setEquipmentType] = useState('');
  const [brand, setBrand] = useState('');
  const [model, setModel] = useState('');
  const [lotCaUiaa, setLotCaUiaa] = useState('');
  const [manufacturingDate, setManufacturingDate] = useState<Date | undefined>();
  const [storageLocation, setStorageLocation] = useState('');
  const [storageDetails, setStorageDetails] = useState('');
  const [status, setStatus] = useState('operacional');
  const [lastInspectionDate, setLastInspectionDate] = useState<Date | undefined>();
  const [nextInspectionDate, setNextInspectionDate] = useState<Date | undefined>();

  // UI/Data loading states
  const [isMfgCalendarOpen, setIsMfgCalendarOpen] = useState(false);
  const [isLastInspCalendarOpen, setIsLastInspCalendarOpen] = useState(false);
  const [isNextInspCalendarOpen, setIsNextInspCalendarOpen] = useState(false);

  const [equipmentTypes, setEquipmentTypes] = useState<string[]>([]);
  const [brands, setBrands] = useState<string[]>([]);
  const [locations, setLocations] = useState<string[]>([]);
  
  const [isLoadingTypes, setIsLoadingTypes] = useState(true);
  const [isLoadingBrands, setIsLoadingBrands] = useState(true);
  const [isLoadingLocations, setIsLoadingLocations] = useState(true);

  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const firestore = useFirestore();
  const { user } = useUser();
  const { toast } = useToast();

  useEffect(() => {
    if (isEditing && equipmentToEdit) {
      setEquipmentType(equipmentToEdit.equipmentType || '');
      setBrand(equipmentToEdit.brand || '');
      setModel(equipmentToEdit.model || '');
      setLotCaUiaa(equipmentToEdit.lotCaUiaa || '');
      setManufacturingDate(equipmentToEdit.manufacturingDate instanceof Timestamp ? equipmentToEdit.manufacturingDate.toDate() : undefined);
      setStorageLocation(equipmentToEdit.storageLocation || '');
      setStorageDetails(equipmentToEdit.storageDetails || '');
      setStatus(equipmentToEdit.status || 'operacional');
      setLastInspectionDate(equipmentToEdit.lastInspectionDate instanceof Timestamp ? equipmentToEdit.lastInspectionDate.toDate() : undefined);
      setNextInspectionDate(equipmentToEdit.nextInspectionDate instanceof Timestamp ? equipmentToEdit.nextInspectionDate.toDate() : undefined);
    }
  }, [isEditing, equipmentToEdit]);

  const getSettingsDocRef = useCallback((collectionName: string) => {
    if (!firestore || !user) return null;
    return doc(firestore, 'sgs_genius', user.uid, 'settings', collectionName);
  }, [firestore, user]);

  useEffect(() => {
    const fetchSelectOptions = async (docName: string, setData: (data: string[]) => void, setLoading: (loading: boolean) => void, field: string) => {
      const docRef = getSettingsDocRef(docName);
      if (!docRef) {
        setLoading(false);
        return;
      }
      try {
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
          const data = docSnap.data();
          setData(data[field] || []);
        }
      } catch (error) {
        console.error(`Error fetching ${field}:`, error);
      } finally {
        setLoading(false);
      }
    };
    fetchSelectOptions('equipmentTypes', setEquipmentTypes, setIsLoadingTypes, 'types');
    fetchSelectOptions('equipmentBrands', setBrands, setIsLoadingBrands, 'brands');
    fetchSelectOptions('locations', setLocations, setIsLoadingLocations, 'locations');
  }, [getSettingsDocRef]);

  const resetForm = () => {
    setEquipmentType('');
    setBrand('');
    setModel('');
    setLotCaUiaa('');
    setManufacturingDate(undefined);
    setStorageLocation('');
    setStorageDetails('');
    setStatus('operacional');
    setLastInspectionDate(undefined);
    setNextInspectionDate(undefined);
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!firestore || !user) {
        toast({ variant: 'destructive', title: 'Erro', description: 'Você não está autenticado.' });
        return;
    }

    setIsSubmitting(true);
    
    const equipmentData = {
      userId: user.uid,
      equipmentType,
      brand,
      model,
      lotCaUiaa,
      manufacturingDate: manufacturingDate ? Timestamp.fromDate(manufacturingDate) : null,
      storageLocation,
      storageDetails,
      status,
      lastInspectionDate: lastInspectionDate ? Timestamp.fromDate(lastInspectionDate) : null,
      nextInspectionDate: nextInspectionDate ? Timestamp.fromDate(nextInspectionDate) : null,
    };

    try {
      if (isEditing && equipmentToEdit) {
        const docRef = doc(firestore, 'sgs_genius', user.uid, 'equipments', equipmentToEdit.id);
        await updateDoc(docRef, { ...equipmentData, updatedAt: serverTimestamp() });
        toast({ title: 'Sucesso!', description: 'Equipamento atualizado com sucesso.' });
        setPage('equipment-report');
      } else {
        const collectionRef = collection(firestore, 'sgs_genius', user.uid, 'equipments');
        await addDoc(collectionRef, { ...equipmentData, createdAt: serverTimestamp() });
        toast({ title: 'Sucesso!', description: 'Equipamento registrado com sucesso.' });
        resetForm();
      }
    } catch (error) {
        console.error("Error saving equipment:", error);
        toast({ variant: 'destructive', title: 'Erro ao salvar', description: 'Não foi possível salvar o equipamento.'});
    } finally {
        setIsSubmitting(false);
    }
  };

  return (
    <Card className="w-full">
      <form onSubmit={handleSubmit}>
        <CardHeader>
          <CardTitle>{isEditing ? 'Editar Equipamento' : 'Novo Equipamento'}</CardTitle>
          <CardDescription>
            {isEditing ? 'Altere os dados do equipamento abaixo.' : 'Preencha o formulário abaixo para registrar um novo equipamento.'}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <Label htmlFor="equipment-type">Tipo de Equipamento</Label>
              <Select name="equipmentType" required onValueChange={setEquipmentType} value={equipmentType} disabled={isLoadingTypes}>
                <SelectTrigger id="equipment-type">
                  <SelectValue placeholder={isLoadingTypes ? "Carregando..." : "Selecione o tipo"} />
                </SelectTrigger>
                <SelectContent>
                  {equipmentTypes.map(type => <SelectItem key={type} value={type}>{type}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="brand">Marca</Label>
              <Select name="brand" required onValueChange={setBrand} value={brand} disabled={isLoadingBrands}>
                <SelectTrigger id="brand">
                  <SelectValue placeholder={isLoadingBrands ? "Carregando..." : "Selecione a marca"} />
                </SelectTrigger>
                <SelectContent>
                  {brands.map(b => <SelectItem key={b} value={b}>{b}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Label htmlFor="model">Modelo</Label>
                <HelpTooltip content="Especifique o modelo exato do equipamento." />
              </div>
              <Input id="model" value={model} onChange={(e) => setModel(e.target.value)} placeholder="Ex: Attache" />
            </div>
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Label htmlFor="lot-ca-uiaa">Lote/CA/UIAA</Label>
                <HelpTooltip content="Número de lote de fabricação, Certificado de Aprovação (CA) ou selo UIAA, se aplicável." />
              </div>
              <Input id="lot-ca-uiaa" value={lotCaUiaa} onChange={(e) => setLotCaUiaa(e.target.value)} placeholder="Ex: 123456" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="manufacturing-date">Data de Fabricação</Label>
              <Popover open={isMfgCalendarOpen} onOpenChange={setIsMfgCalendarOpen}>
                <PopoverTrigger asChild>
                  <Button variant="outline" className={cn('w-full justify-start text-left font-normal', !manufacturingDate && 'text-muted-foreground')}>
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {manufacturingDate ? format(manufacturingDate, 'dd/MM/yyyy') : <span>Selecione a data</span>}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0">
                  <Calendar mode="single" selected={manufacturingDate} onSelect={(d) => { setManufacturingDate(d); setIsMfgCalendarOpen(false); }} locale={ptBR} initialFocus />
                </PopoverContent>
              </Popover>
            </div>
            <div className="space-y-2">
              <Label htmlFor="storage-location">Local Armazenado</Label>
              <Select name="storageLocation" onValueChange={setStorageLocation} value={storageLocation} disabled={isLoadingLocations}>
                <SelectTrigger id="storage-location">
                  <SelectValue placeholder={isLoadingLocations ? "Carregando..." : "Selecione o local"} />
                </SelectTrigger>
                <SelectContent>
                  {locations.map(loc => <SelectItem key={loc} value={loc}>{loc}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
               <div className="flex items-center gap-2">
                <Label htmlFor="storage-details">Detalhar local</Label>
                <HelpTooltip content="Seja específico sobre onde o equipamento está guardado (ex: Prateleira 2, Caixa 5)." />
              </div>
              <Input id="storage-details" value={storageDetails} onChange={(e) => setStorageDetails(e.target.value)} placeholder="Ex: Prateleira 2, Caixa 5" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="status">Status do Equipamento</Label>
              <Select name="status" required onValueChange={setStatus} value={status}>
                <SelectTrigger id="status">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="operacional">Operacional</SelectItem>
                  <SelectItem value="em manutencao">Em manutenção</SelectItem>
                  <SelectItem value="descartado">Descartado</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="last-inspection-date">Data última inspeção</Label>
              <Popover open={isLastInspCalendarOpen} onOpenChange={setIsLastInspCalendarOpen}>
                <PopoverTrigger asChild>
                  <Button variant="outline" className={cn('w-full justify-start text-left font-normal', !lastInspectionDate && 'text-muted-foreground')}>
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {lastInspectionDate ? format(lastInspectionDate, 'dd/MM/yyyy') : <span>Selecione a data</span>}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0">
                  <Calendar mode="single" selected={lastInspectionDate} onSelect={(d) => { setLastInspectionDate(d); setIsLastInspCalendarOpen(false); }} locale={ptBR} initialFocus />
                </PopoverContent>
              </Popover>
            </div>
            <div className="space-y-2">
              <Label htmlFor="next-inspection-date">Data próxima inspeção</Label>
              <Popover open={isNextInspCalendarOpen} onOpenChange={setIsNextInspCalendarOpen}>
                <PopoverTrigger asChild>
                  <Button variant="outline" className={cn('w-full justify-start text-left font-normal', !nextInspectionDate && 'text-muted-foreground')}>
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {nextInspectionDate ? format(nextInspectionDate, 'dd/MM/yyyy') : <span>Selecione a data</span>}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0">
                  <Calendar mode="single" selected={nextInspectionDate} onSelect={(d) => { setNextInspectionDate(d); setIsNextInspCalendarOpen(false); }} locale={ptBR} initialFocus />
                </PopoverContent>
              </Popover>
            </div>
          </div>
          <div className="flex justify-end gap-4 pt-4">
            {isEditing && (
              <Button variant="outline" type="button" onClick={() => setPage('equipment-report')}>
                Cancelar
              </Button>
            )}
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {isEditing ? 'Salvar Alterações' : 'Salvar Equipamento'}
            </Button>
          </div>
        </CardContent>
      </form>
    </Card>
  );
}
