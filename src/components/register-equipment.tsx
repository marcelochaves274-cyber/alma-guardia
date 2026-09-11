
'use client';

import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
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
import { cn, formatValidity } from '@/lib/utils';
import { Calendar as CalendarIcon, Loader2, AlertTriangle, Upload } from 'lucide-react';
import { format, addYears, addMonths } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { useFirestore, useUser } from '@/firebase';
import { doc, getDoc, addDoc, updateDoc, collection, serverTimestamp, Timestamp, writeBatch } from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';
import { HelpTooltip } from './ui/help-tooltip';
import { Textarea } from './ui/textarea';
import Papa from 'papaparse';

interface RegisterEquipmentProps {
  equipmentToEdit: any | null;
  setPage: (page: string) => void;
}

export function RegisterEquipment({ equipmentToEdit, setPage }: RegisterEquipmentProps) {
  const isEditing = !!equipmentToEdit;

  // Form states
  const [equipmentType, setEquipmentType] = useState(equipmentToEdit?.equipmentType || '');
  const [brand, setBrand] = useState(equipmentToEdit?.brand || '');
  const [model, setModel] = useState(equipmentToEdit?.model || '');
  const [lotCaUiaa, setLotCaUiaa] = useState(equipmentToEdit?.lotCaUiaa || '');
  const [manufacturingDate, setManufacturingDate] = useState<Date | undefined>(
    equipmentToEdit?.manufacturingDate instanceof Timestamp 
      ? equipmentToEdit.manufacturingDate.toDate() 
      : undefined
  );
  const [purchaseDate, setPurchaseDate] = useState<Date | undefined>(
    equipmentToEdit?.purchaseDate instanceof Timestamp 
      ? equipmentToEdit.purchaseDate.toDate() 
      : undefined
  );
  const [firstUseDate, setFirstUseDate] = useState<Date | undefined>(
    equipmentToEdit?.firstUseDate instanceof Timestamp ? equipmentToEdit.firstUseDate.toDate() : undefined
  );
  const [invoiceNumber, setInvoiceNumber] = useState(equipmentToEdit?.invoiceNumber || '');
  const [purchaseLocation, setPurchaseLocation] = useState(equipmentToEdit?.purchaseLocation || '');
  const [validityYears, setValidityYears] = useState(equipmentToEdit?.validityYears || '');
  const [validityMonths, setValidityMonths] = useState(equipmentToEdit?.validityMonths || '');
  const [storageLocation, setStorageLocation] = useState(equipmentToEdit?.storageLocation || '');
  const [storageDetails, setStorageDetails] = useState(equipmentToEdit?.storageDetails || '');
  const [status, setStatus] = useState(equipmentToEdit?.status || 'operacional');
  const [lastInspectionDate, setLastInspectionDate] = useState<Date | undefined>(
    equipmentToEdit?.lastInspectionDate instanceof Timestamp 
      ? equipmentToEdit.lastInspectionDate.toDate() 
      : undefined
  );
  const [nextInspectionDate, setNextInspectionDate] = useState<Date | undefined>(
    equipmentToEdit?.nextInspectionDate instanceof Timestamp 
      ? equipmentToEdit.nextInspectionDate.toDate() 
      : undefined
  );
  const [discardReason, setDiscardReason] = useState(equipmentToEdit?.discardReason || '');
  const [history, setHistory] = useState(equipmentToEdit?.history || equipmentToEdit?.observations || '');
  const [observations, setObservations] = useState(equipmentToEdit?.history ? equipmentToEdit?.observations || '' : '');

  // UI/Data loading states
  const [isLastInspCalendarOpen, setIsLastInspCalendarOpen] = useState(false);
  const [isNextInspCalendarOpen, setIsNextInspCalendarOpen] = useState(false);
  const [isValidityPopoverOpen, setIsValidityPopoverOpen] = useState(false);

  const [equipmentTypes, setEquipmentTypes] = useState<string[]>([]);
  const [brands, setBrands] = useState<string[]>([]);
  const [locations, setLocations] = useState<string[]>([]);
  
  const [isLoadingTypes, setIsLoadingTypes] = useState(true);
  const [isLoadingBrands, setIsLoadingBrands] = useState(true);
  const [isLoadingLocations, setIsLoadingLocations] = useState(true);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const importFileInputRef = useRef<HTMLInputElement>(null);
  
  const firestore = useFirestore();
  const { user } = useUser();
  const { toast } = useToast();

  const showSuccessToast = useCallback((description: string) => {
    const successToast = toast({
      title: 'Sucesso!',
      description,
      className: 'fixed left-1/2 top-1/2 z-[110] w-[calc(100vw-2rem)] max-w-md -translate-x-1/2 -translate-y-1/2 animate-in fade-in-0 duration-200 data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=closed]:duration-300',
    });
    window.setTimeout(successToast.dismiss, 1800);
  }, [toast]);

  const yearOptions = Array.from({ length: 31 }, (_, i) => ({
    value: String(i),
    label: i === 1 ? `${i} ano` : `${i} anos`,
  }));

  const monthOptions = Array.from({ length: 12 }, (_, i) => ({
    value: String(i),
    label: i === 1 ? `${i} mês` : `${i} meses`,
  }));

  const expiryDate = useMemo(() => {
    if (!manufacturingDate || (!validityYears && !validityMonths)) {
      return null;
    }
    try {
      let date = new Date(manufacturingDate);
      if (validityYears) date = addYears(date, Number(validityYears));
      if (validityMonths) date = addMonths(date, Number(validityMonths));
      return date;
    } catch (error) {
      return null;
    }
  }, [manufacturingDate, validityYears, validityMonths]);

  const parseImportDate = (value: string): Timestamp | null => {
    const text = value?.trim();
    if (!text) return null;
    const parts = text.split(/[\/-]/).map(Number);
    if (parts.length !== 3 || parts.some(Number.isNaN)) return null;
    const [first, second, third] = parts;
    const year = first > 31 ? first : third;
    const month = second;
    const day = first > 31 ? third : first;
    const date = new Date(year, month - 1, day);
    if (date.getFullYear() !== year || date.getMonth() !== month - 1 || date.getDate() !== day) return null;
    return Timestamp.fromDate(date);
  };

  const parseValidity = (value: string) => {
    const text = value?.trim().toLowerCase() || '';
    const years = text.match(/(\d+)\s*ano/);
    const months = text.match(/(\d+)\s*m(?:e|ê)s/);
    if (/^\d+$/.test(text)) return { years: text, months: '' };
    return { years: years?.[1] || '', months: months?.[1] || '' };
  };

  const normalizeStatus = (value: string) => {
    const text = value?.trim().toLowerCase() || '';
    if (text.includes('descart') || text.includes('condenad')) return 'descartado';
    if (text.includes('manut')) return 'em manutencao';
    return 'operacional';
  };

  const repairMojibake = (value: string) => {
    if (!/[ÃÂ]/.test(value)) return value;
    try {
      const bytes = Uint8Array.from(value, character => character.charCodeAt(0));
      return new TextDecoder('utf-8', { fatal: true }).decode(bytes);
    } catch {
      return value;
    }
  };

  const handleImport = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !firestore || !user) return;
    setIsImporting(true);

    let fileContents: string;
    try {
      const fileBuffer = await file.arrayBuffer();
      fileContents = new TextDecoder('utf-8').decode(fileBuffer).replace(/^\uFEFF/, '');
    } catch (error) {
      console.error('Error decoding equipment CSV:', error);
      setIsImporting(false);
      toast({ variant: 'destructive', title: 'Erro na leitura', description: 'Não foi possível interpretar a codificação do arquivo CSV.' });
      return;
    }

    Papa.parse<string[]>(fileContents, {
      header: false,
      skipEmptyLines: 'greedy',
      delimiter: '',
      quoteChar: '"',
      transform: (value) => repairMojibake(value.trim()),
      complete: async (results) => {
        try {
          let rows = (results.data as string[][]).filter(row => row.some(cell => cell.trim()));
          if (rows.length && rows[0][0]?.toLowerCase().includes('tipo de equipamento')) rows = rows.slice(1);
          if (!rows.length) throw new Error('empty');

          const collectionRef = collection(firestore, 'sgs_genius', user.uid, 'equipments');
          const validRows = rows.filter(row => row.length >= 16 && row[0] && row[1]);
          for (let index = 0; index < validRows.length; index += 500) {
            const batchRows = validRows.slice(index, index + 500);
            const batch = writeBatch(firestore);
            batchRows.forEach((row) => {
              const [type, importedBrand, importedModel, lot, manufacturing, purchase, firstUse, invoice, purchasePlace, validity, storage, details, importedStatus, lastInspection, nextInspection, importedHistory] = row;
              const parsedValidity = parseValidity(validity);
              const statusValue = normalizeStatus(importedStatus);
              const equipmentRef = doc(collectionRef);
              batch.set(equipmentRef, {
                userId: user.uid,
                equipmentType: type,
                brand: importedBrand,
                model: importedModel || '',
                lotCaUiaa: lot || '',
                manufacturingDate: parseImportDate(manufacturing),
                purchaseDate: parseImportDate(purchase),
                invoiceNumber: invoice || '',
                purchaseLocation: purchasePlace || '',
                validityYears: parsedValidity.years,
                validityMonths: parsedValidity.months,
                firstUseDate: parseImportDate(firstUse),
                storageLocation: storage || '',
                storageDetails: details || '',
                status: statusValue,
                lastInspectionDate: statusValue === 'descartado' ? null : parseImportDate(lastInspection),
                nextInspectionDate: statusValue === 'descartado' ? null : parseImportDate(nextInspection),
                discardReason: null,
                history: importedHistory || '',
                observations: '',
                createdAt: serverTimestamp(),
              });
            });
            await batch.commit();
          }

          const ignoredCount = rows.length - validRows.length;
          toast({
            title: 'Importação concluída!',
            description: `${validRows.length} equipamento(s) registrado(s).${ignoredCount ? ` ${ignoredCount} linha(s) ignorada(s) por falta de campos ou separação inválida.` : ''}`,
          });
        } catch (error) {
          console.error('Error importing equipment:', error);
          toast({ variant: 'destructive', title: 'Erro na importação', description: 'Confira se o arquivo CSV contém as 16 colunas na ordem informada.' });
        } finally {
          setIsImporting(false);
          if (importFileInputRef.current) importFileInputRef.current.value = '';
        }
      },
      error: () => {
        setIsImporting(false);
        toast({ variant: 'destructive', title: 'Erro na leitura', description: 'Não foi possível ler o arquivo CSV.' });
      },
    });
  };


  const resetForm = useCallback(() => {
    setEquipmentType('');
    setBrand('');
    setModel('');
    setLotCaUiaa('');
    setManufacturingDate(undefined);
    setPurchaseDate(undefined);
    setInvoiceNumber('');
    setPurchaseLocation('');
    setValidityYears('');
    setValidityMonths('');
    setFirstUseDate(undefined);
    setStorageLocation('');
    setStorageDetails('');
    setStatus('operacional');
    setLastInspectionDate(undefined);
    setNextInspectionDate(undefined);
    setDiscardReason('');
    setHistory('');
    setObservations('');
  }, []);

  useEffect(() => {
    // Mantemos o efeito para garantir a limpeza ou atualização caso o prop mude sem remontar
    if (isEditing && equipmentToEdit) {
      setEquipmentType(equipmentToEdit.equipmentType || '');
      setBrand(equipmentToEdit.brand || '');
      setModel(equipmentToEdit.model || '');
      setLotCaUiaa(equipmentToEdit.lotCaUiaa || '');
      setManufacturingDate(equipmentToEdit.manufacturingDate instanceof Timestamp ? equipmentToEdit.manufacturingDate.toDate() : undefined);
      setPurchaseDate(equipmentToEdit.purchaseDate instanceof Timestamp ? equipmentToEdit.purchaseDate.toDate() : undefined);
      setInvoiceNumber(equipmentToEdit.invoiceNumber || '');
      setPurchaseLocation(equipmentToEdit.purchaseLocation || '');
      setValidityYears(equipmentToEdit.validityYears || '');
      setValidityMonths(equipmentToEdit.validityMonths || '');
      setFirstUseDate(equipmentToEdit.firstUseDate instanceof Timestamp ? equipmentToEdit.firstUseDate.toDate() : undefined);
      setStorageLocation(equipmentToEdit.storageLocation || '');
      setStorageDetails(equipmentToEdit.storageDetails || '');
      setStatus(equipmentToEdit.status || 'operacional');
      setLastInspectionDate(equipmentToEdit.lastInspectionDate instanceof Timestamp ? equipmentToEdit.lastInspectionDate.toDate() : undefined);
      setNextInspectionDate(equipmentToEdit.nextInspectionDate instanceof Timestamp ? equipmentToEdit.nextInspectionDate.toDate() : undefined);
      setDiscardReason(equipmentToEdit.discardReason || '');
      setHistory(equipmentToEdit.history || equipmentToEdit.observations || '');
      setObservations(equipmentToEdit.history ? equipmentToEdit.observations || '' : '');
    } else {
      resetForm();
    }
  }, [isEditing, equipmentToEdit, resetForm]);

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
          setData((data[field] || []).sort((a: string, b: string) => a.localeCompare(b)));
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
      purchaseDate: purchaseDate ? Timestamp.fromDate(purchaseDate) : null,
      invoiceNumber,
      purchaseLocation,
      validityYears,
      validityMonths,
      firstUseDate: firstUseDate ? Timestamp.fromDate(firstUseDate) : null,
      storageLocation,
      storageDetails,
      status,
      lastInspectionDate: status === 'descartado' ? null : (lastInspectionDate ? Timestamp.fromDate(lastInspectionDate) : null),
      nextInspectionDate: status === 'descartado' ? null : (nextInspectionDate ? Timestamp.fromDate(nextInspectionDate) : null),
      discardReason: status === 'descartado' ? discardReason : null,
      history,
      observations,
    };

    try {
      if (isEditing && equipmentToEdit) {
        const docRef = doc(firestore, 'sgs_genius', user.uid, 'equipments', equipmentToEdit.id);
        await updateDoc(docRef, { ...equipmentData, updatedAt: serverTimestamp() });
        showSuccessToast('Equipamento atualizado com sucesso.');
        setPage('equipment-report');
      } else {
        const collectionRef = collection(firestore, 'sgs_genius', user.uid, 'equipments');
        await addDoc(collectionRef, { ...equipmentData, createdAt: serverTimestamp() });
        showSuccessToast('Equipamento registrado com sucesso.');
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
          <CardTitle>{isEditing ? 'Editar Equipamento' : 'Registrar Equipamento'}</CardTitle>
          <CardDescription>
            {isEditing ? 'Altere os dados do equipamento abaixo.' : 'Preencha o formulário abaixo para registrar um novo equipamento.'}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-8">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-end">
            <div className="space-y-2">
              <Label htmlFor="equipment-type">Tipo de Equipamento</Label>
              <Select key={`type-${equipmentToEdit?.id || 'new'}`} name="equipmentType" required onValueChange={setEquipmentType} value={equipmentType} disabled={isLoadingTypes}>
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
              <Select key={`brand-${equipmentToEdit?.id || 'new'}`} name="brand" required onValueChange={setBrand} value={brand} disabled={isLoadingBrands}>
                <SelectTrigger id="brand">
                  <SelectValue placeholder={isLoadingBrands ? "Carregando..." : "Selecione a marca"} />
                </SelectTrigger>
                <SelectContent>
                  {brands.map(b => <SelectItem key={b} value={b}>{b}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="model" className="flex items-center gap-2">Modelo <HelpTooltip content="Especifique o modelo exato do equipamento." /></Label>
              <Input id="model" value={model} onChange={(e) => setModel(e.target.value)} placeholder="Ex: Attache" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="lot-ca-uiaa" className="flex items-center gap-2">Nº de Série <HelpTooltip content="Número de série do equipamento, se aplicável." /></Label>
              <Input id="lot-ca-uiaa" value={lotCaUiaa} onChange={(e) => setLotCaUiaa(e.target.value)} placeholder="Ex: 123456" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="manufacturing-date">Data de Fabricação</Label>
              <Input
                id="manufacturing-date"
                type="date"
                value={manufacturingDate ? format(manufacturingDate, 'yyyy-MM-dd') : ''}
                onChange={(e) => setManufacturingDate(e.target.value ? new Date(`${e.target.value}T00:00:00`) : undefined)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="purchase-date">Data da Compra</Label>
              <Input
                id="purchase-date"
                type="date"
                value={purchaseDate ? format(purchaseDate, 'yyyy-MM-dd') : ''}
                onChange={(e) => setPurchaseDate(e.target.value ? new Date(`${e.target.value}T00:00:00`) : undefined)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="first-use-date">Data 1º Utilização</Label>
              <Input
                id="first-use-date"
                type="date"
                value={firstUseDate ? format(firstUseDate, 'yyyy-MM-dd') : ''}
                onChange={(e) => setFirstUseDate(e.target.value ? new Date(`${e.target.value}T00:00:00`) : undefined)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="invoice-number">Nota Fiscal</Label>
              <Input id="invoice-number" value={invoiceNumber} onChange={(e) => setInvoiceNumber(e.target.value)} placeholder="Número da NF-e" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="purchase-location">Local da Compra</Label>
              <Input id="purchase-location" value={purchaseLocation} onChange={(e) => setPurchaseLocation(e.target.value)} placeholder="Nome da loja ou fornecedor" />
            </div>
             <div className="space-y-2">
              <Label>Tempo de Validade</Label>
              <Popover open={isValidityPopoverOpen} onOpenChange={setIsValidityPopoverOpen}>
                <PopoverTrigger asChild>
                  <Button variant="outline" className={cn('w-full justify-start text-left font-normal', !validityYears && !validityMonths && 'text-muted-foreground')}>
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {formatValidity(validityYears, validityMonths) || 'Definir validade'}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-80 p-4 space-y-4">
                  <h4 className="font-medium leading-none">Selecione a Validade</h4>
                  <div className="flex gap-4">
                    <Select name="validityYears" onValueChange={(value) => { setValidityYears(value); setIsValidityPopoverOpen(false); }} value={validityYears}>
                      <SelectTrigger><SelectValue placeholder="Anos" /></SelectTrigger>
                      <SelectContent>
                        {yearOptions.map(option => <SelectItem key={`year-${option.value}`} value={option.value}>{option.label}</SelectItem>)}
                      </SelectContent>
                    </Select>
                    <Select name="validityMonths" onValueChange={(value) => { setValidityMonths(value); setIsValidityPopoverOpen(false); }} value={validityMonths}>
                      <SelectTrigger><SelectValue placeholder="Meses" /></SelectTrigger>
                      <SelectContent>
                        {monthOptions.map(option => <SelectItem key={`month-${option.value}`} value={option.value}>{option.label}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                </PopoverContent>
              </Popover>
            </div>
            <div className="space-y-2">
              <Label htmlFor="storage-location">Local Armazenado</Label>
              <Select key={`location-${equipmentToEdit?.id || 'new'}`} name="storageLocation" onValueChange={setStorageLocation} value={storageLocation} disabled={isLoadingLocations}>
                <SelectTrigger id="storage-location">
                  <SelectValue placeholder={isLoadingLocations ? "Carregando..." : "Selecione o local"} />
                </SelectTrigger>
                <SelectContent>
                  {locations.map(loc => <SelectItem key={loc} value={loc}>{loc}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="storage-details" className="flex items-center gap-2">Detalhar local <HelpTooltip content="Seja específico sobre onde o equipamento está guardado (ex: Prateleira 2, Caixa 5)." /></Label>
              <Input id="storage-details" value={storageDetails} onChange={(e) => setStorageDetails(e.target.value)} placeholder="Ex: Prateleira 2, Caixa 5" />
            </div>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-end">
              <div className="space-y-2">
                <Label htmlFor="status">Status do Equipamento</Label>
                <Select key={`status-${equipmentToEdit?.id || 'new'}`} name="status" required onValueChange={setStatus} value={status}>
                  <SelectTrigger id="status">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="operacional">Operacional</SelectItem>
                    <SelectItem value="em manutencao">Em manutenção</SelectItem>
                    <SelectItem value="descartado">Condenado</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {status !== 'descartado' ? (
                <>
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
                </>
              ) : null}
          </div>

          {status !== 'descartado' && (
            <div className="space-y-2 text-center">
              <Label htmlFor="expiry-date" className="block w-full text-center">Data de Validade do Equipamento</Label>
              <div id="expiry-date" className={cn('flex items-center justify-center w-full h-10 rounded-md border border-input bg-muted/50 px-3 py-2 text-sm font-semibold', !expiryDate && 'text-muted-foreground')}>
                {expiryDate ? format(expiryDate, 'dd/MM/yyyy') : <span className="flex items-center gap-2"><AlertTriangle className="h-4 w-4 text-amber-500" /> Preencha Fabricação e Validade</span>}
              </div>
            </div>
          )}

          {status === 'descartado' && (
            <div className="space-y-2">
                <Label htmlFor="discard-reason">Motivo da Condenação</Label>
                <Textarea
                    id="discard-reason"
                    value={discardReason}
                    onChange={(e) => setDiscardReason(e.target.value)}
                    placeholder="Explique por que o equipamento foi condenado (ex: danificado, fim da vida útil)."
                    required={status === 'descartado'}
                />
            </div>
          )}

          <div className="space-y-2">
              <Label htmlFor="history">Histórico do Equipamento</Label>
                <p className="text-sm text-muted-foreground">
                  Registre aqui todas as inspeções, manutenções e outras alterações relevantes, incluindo datas e considerações.
                </p>
                <Textarea
                id="history"
                value={history}
                onChange={(e) => setHistory(e.target.value)}
                    placeholder="Ex: 20/07/2024 - Inspeção realizada por [Nome], sem avarias."
                    className="min-h-[100px]"
                />
            </div>

            <div className="space-y-2">
              <Label htmlFor="observations">Observações</Label>
              <Textarea
                id="observations"
                value={observations}
                onChange={(e) => setObservations(e.target.value)}
                placeholder="Digite observações adicionais sobre o equipamento."
                className="min-h-[100px]"
              />
            </div>

          <div className="flex flex-wrap justify-end gap-4 pt-4">
            {isEditing && (
              <Button variant="outline" type="button" onClick={() => setPage('equipment-report')}>
                Cancelar
              </Button>
            )}
            {!isEditing && (
              <>
                <input ref={importFileInputRef} type="file" accept=".csv,text/csv" className="hidden" onChange={handleImport} />
                <Button type="button" variant="outline" disabled={isSubmitting || isImporting} onClick={() => importFileInputRef.current?.click()}>
                  {isImporting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Upload className="mr-2 h-4 w-4" />}
                  {isImporting ? 'Importando...' : 'Importar CSV'}
                </Button>
              </>
            )}
            <Button type="submit" disabled={isSubmitting || isImporting}>
              {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {isEditing ? 'Salvar Alterações' : 'Salvar Equipamento'}
            </Button>
          </div>
          {!isEditing && (
            <p className="text-left text-sm leading-relaxed text-muted-foreground">
              <strong className="text-foreground">No Excel, salve o arquivo como: CSV UTF-8 (Delimitado por vírgulas) (*.csv).</strong>{' '}
              O arquivo pode ser importado com ou sem cabeçalho. Use esta sequência de campos: Tipo de Equipamento, Marca, Modelo, Nº de Série, Data de Fabricação, Data da Compra, Data 1º Utilização, Nota Fiscal, Local da Compra, Tempo de Validade, Local Armazenamento, Detalhar Local, Status Equipamento, Data última inspeção, Data próxima inspeção e Histórico do Equipamento. Datas: DD/MM/AAAA ou AAAA-MM-DD. Campos com vírgula ou ponto e vírgula devem ficar entre aspas.
            </p>
          )}
        </CardContent>
      </form>
    </Card>
  );
}
