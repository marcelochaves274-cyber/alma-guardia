'use client';

import { useState, useEffect, useCallback, FormEvent, useMemo } from 'react';
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
import { Eye, EyeOff, Loader2, Plus, Trash2, Pencil, Check, X, Settings } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Separator } from './ui/separator';
import { useFirestore, useUser } from '@/firebase';
import { doc, getDoc, setDoc, collection, Timestamp, onSnapshot } from 'firebase/firestore';
import { Skeleton } from './ui/skeleton';
import { Checkbox } from './ui/checkbox';
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
import {
  Dialog,
  DialogContent, DialogClose,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { useProfile } from '@/context/profile-context';
import { SheetFilter } from './sheet-filter';

export type MenuPermission = {
  enabled: boolean;
  filters?: Record<string, string[]>;
  subMenus?: Record<string, MenuPermission>;
};

export interface CustomProfile {
  name: string;
  pass: string;
  permissions: Permissions; 
}

const reportTypeOptions = [
  { value: 'occurrences', label: 'Acidentes/Incidentes' },
  { value: 'treatments', label: 'Tratamentos de Risco' },
  { value: 'faunaFloraGeo', label: 'Fauna Flora Geo' },
];

const riskLevelOptions = [
    { value: 'alta', label: 'Alta' },
    { value: 'media', label: 'Média' },
    { value: 'baixa', label: 'Baixa' },
];

const situationOptions = [
    { value: 'pendente', label: 'Pendente' },
    { value: 'finalizado', label: 'Finalizado' },
    { value: 'atrasado', label: 'Atrasado' },
];

const inspectionStatusOptions = [
    { value: 'overdue', label: 'Vistoria Atrasada' },
    { value: 'due_soon', label: 'À Vencer (próximos 10 dias)' },
    { value: 'expired', label: 'Validade Expirada' },
    { value: 'descartado', label: 'Condenado' },
];

const analysisOptions = [
  { value: 'alta', label: 'Alta' },
  { value: 'media', label: 'Média' },
  { value: 'baixa', label: 'Baixa' },
];

const ageGroupOptions = [
  { value: 'crianca', label: 'Criança' },
  { value: 'adulto', label: 'Adulto' },
  { value: 'idoso', label: 'Idoso' },
];

const monthOptions = [
  { value: '1', label: 'Janeiro' },
  { value: '2', label: 'Fevereiro' },
  { value: '3', label: 'Março' },
  { value: '4', label: 'Abril' },
  { value: '5', label: 'Maio' },
  { value: '6', label: 'Junho' },
  { value: '7', label: 'Julho' },
  { value: '8', label: 'Agosto' },
  { value: '9', label: 'Setembro' },
  { value: '10', label: 'Outubro' },
  { value: '11', label: 'Novembro' },
  { value: '12', label: 'Dezembro' },
];

const sgsDocSections = [
    { key: 'escopo', label: 'Escopo' },
    { key: 'termos', label: 'Termos e Definições' },
    { key: 'contexto', label: 'Contexto da Organização' },
    { key: 'lideranca', label: 'Liderança e Politica' },
    { key: 'planejamento', label: 'Planejamento do SGS' },
    { key: 'apoio', label: 'Apoio e Recurso' },
    { key: 'operacao', label: 'Operação' },
    { key: 'avaliacao', label: 'Avaliação e Desempenho' },
    { key: 'melhoria', label: 'Melhorias Contínuas' },
];

interface PopDocument {
  name: string;
}

interface TcrDocument {
  name: string;
}

const availableMenus = [
    { 
      id: 'portalUsuario', 
      label: 'Portal do Usuário',
      subMenus: [
        { id: 'help', label: 'Ajuda' },
        { id: 'tutorial', label: 'Tutorial' },
        { id: 'my-subscription', label: 'Minha Assinatura' },
      ]
    },
    { id: 'reminders', label: 'Lembretes' },
    { id: 'graphics-report', label: 'Gráficos', hasFilters: true },
    { 
      id: 'avisos', 
      label: 'Central de Avisos',
      subMenus: [
        { id: 'register-notice', label: 'Registrar Aviso' },
        { id: 'pending-notices', label: 'Avisos Pendentes' },
      ]
    },
    { 
      id: 'acidentes', 
      label: 'Acidentes/Incidentes', 
      subMenus: [
        { id: 'register-occurrence', label: 'Registrar Ocorrência' },
        { id: 'occurrence-report', label: 'Relatório de Ocorrência', hasFilters: true },
        { id: 'map-report', label: 'Mapa de Ocorrências', hasFilters: true },
      ]
    },
    { 
      id: 'tratamento', 
      label: 'Tratamento de Risco',
      subMenus: [
        { id: 'register-treatment', label: 'Registrar Tratamento' },
        { id: 'treatment-report', label: 'Relatório de Tratamento', hasFilters: true },
        { id: 'treatment-map-report', label: 'Mapa de Tratamentos', hasFilters: true },
      ]
    },
    { 
      id: 'faunaFloraGeo', 
      label: 'Fauna Flora Geo',
      subMenus: [
        { id: 'register-fauna-flora-geo', label: 'Registrar F/F/G' },
        { id: 'fauna-flora-geo-report', label: 'Relatório F/F/G', hasFilters: true },
        { id: 'fauna-flora-geo-map-report', label: 'Mapa F/F/G', hasFilters: true },
      ]
    },
    { 
      id: 'equipamentos', 
      label: 'Equipamentos',
      subMenus: [
        { id: 'register-equipment', label: 'Registrar Equipamento' },
        { id: 'equipment-report', label: 'Relatório Equipamentos', hasFilters: true },
      ]
    },
    { 
      id: 'riskAssessment', 
      label: 'Avaliação de Riscos',
      subMenus: [
        { id: 'register-risk-assessment', label: 'Registrar Avaliação'},
        { id: 'risk-assessment-report', label: 'Relatório de Avaliação', hasFilters: true },
      ]
    },
    { 
      id: 'atividades', 
      label: 'Atividades',
      subMenus: [
        { id: 'register-activity', label: 'Registrar Atividade'},
        { id: 'activity-report', label: 'Relatório de Atividade', hasFilters: true },
      ]
    },
    { id: 'view-pops', label: 'POP', hasFilters: true },
    { id: 'view-tcrs', label: 'TCR', hasFilters: true },
    { id: 'rame', label: 'RAME', subMenus: [{ id: 'view-pe', label: 'PE' }, { id: 'view-pae', label: 'PAE' }, { id: 'view-rpo', label: 'RPA' }] },
    { id: 'view-sgs-docs', label: 'Documentos SGS', hasFilters: true },
    {
      id: 'settings',
      label: 'Configurações',
      subMenus: [
        { id: 'general-settings', label: 'Configurações Gerais' },
        { id: 'manage-profile', label: 'Gerenciar Perfis' },
        { id: 'manage-occurrences', label: 'Gerenciar Ocorrências' },
        { id: 'manage-locations', label: 'Gerenciar Locais' },
        { id: 'manage-map', label: 'Gerenciar Mapa' },
        { id: 'manage-pops', label: 'Gerenciar POPs' },
        { id: 'manage-tcrs', label: 'Gerenciar TCRs' },
        { id: 'manage-fauna-flora-geo', label: 'Gerenciar Fa/Fl/Ge' },
        { id: 'manage-equipment-and-brands', label: 'Gerenciar Equip./Marca' },
      ]
    }
];

export function ManageProfile() {
  const { toast } = useToast();
  const firestore = useFirestore();
  const { user, isUserLoading } = useUser();

  const [adminPass, setAdminPass] = useState('');
  const [showAdminPass, setShowAdminPass] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  const [newProfileName, setNewProfileName] = useState('');
  const [newProfilePass, setNewProfilePass] = useState('');
  const [showNewProfilePass, setShowNewProfilePass] = useState(false);
  const [newProfilePermissions, setNewProfilePermissions] = useState<Permissions>({}); 
  const [editingProfile, setEditingProfile] = useState<CustomProfile | null>(null);
  const [editingName, setEditingName] = useState('');
  const [editingPass, setEditingPass] = useState('');
  const [showEditingPass, setShowEditingPass] = useState(false);
  const [editingPermissions, setEditingPermissions] = useState<Permissions>({});

  const [customProfiles, setCustomProfiles] = useState<CustomProfile[]>([]);
  
  const [filterOptions, setFilterOptions] = useState({
    occurrenceTypes: [] as string[],
    faunaFloraGeoTypes: [] as string[],
    equipmentTypes: [] as string[],
    availableYears: [] as string[],
    pops: [] as string[],
    tcrs: [] as string[],
    equipmentBrands: [] as string[],
    activityNames: [] as string[],
    locations: [] as string[],
    sgsDocSections: [] as string[],
  });
  const [isLoadingFilters, setIsLoadingFilters] = useState(true);

  const [isFilterDialogOpen, setIsFilterDialogOpen] = useState(false);  
  const [currentEditingMenu, setCurrentEditingMenu] = useState<{ menuId: string; subMenuId: string | null; permissions: MenuPermission; isNew: boolean } | null>(null);
  const [tempFilters, setTempFilters] = useState<Record<string, string[]>>({});

  const getSettingsDocRef = useCallback(() => {
    if (!firestore || !user?.uid) return null;
    return doc(firestore, 'sgs_genius', user.uid, 'settings', 'profiles');
  }, [firestore, user]);
  
  useEffect(() => {    
    let isMounted = true;
    if (isUserLoading || !user || !firestore) {
      if (!isUserLoading) {
        setIsLoading(false);
        setIsLoadingFilters(false);
      }
      return;
    }

    const fetchPasses = async () => {
      const docRef = getSettingsDocRef();
      if (!docRef) {
        if (isMounted) setIsLoading(false);
        return;
      }

      try {
        const docSnap = await getDoc(docRef);
        if (isMounted && docSnap.exists()) {
            const data = docSnap.data();
            setAdminPass(data.adminPass || '');
            setCustomProfiles(data.customProfiles || []);
        }
      } catch (error: any) {
           if (isMounted && error.code !== 'permission-denied') {
                console.error("Error fetching passes:", error);
                toast({ variant: "destructive", title: "Erro ao carregar", description: "Não foi possível buscar os passes." });
           }
      } finally {
        if (isMounted) setIsLoading(false);
      }
    };
    
    fetchPasses();
    return () => { isMounted = false; };
  }, [isUserLoading, user, firestore, getSettingsDocRef, toast]);

  useEffect(() => {
    if (!user || !firestore) return;
    setIsLoadingFilters(true);
    const settingsNames = ['occurrenceTypes', 'locations', 'faunaFloraGeoTypes', 'equipmentTypes', 'equipmentBrands', 'pops', 'tcrs'];
    const settingsData: Record<string, any> = {};
    const yearsByCollection: Record<string, Set<string>> = {};
    const recordsByCollection: Record<string, { names: Set<string>; types: Set<string>; locations: Set<string>; brands: Set<string> }> = {};
    let loadedSettings = 0;
    let loadedCollections = 0;

    const updateOptions = () => {
      const allYears = new Set<string>();
      Object.values(yearsByCollection).forEach(years => years.forEach(year => allYears.add(year)));
      if (allYears.size === 0) {
        const currentYear = new Date().getFullYear();
        for (let year = currentYear; year >= 2023; year--) allYears.add(year.toString());
      }
      const registeredTypes = (name: string, fallback: string[]) => {
        const values = new Set(fallback);
        Object.values(recordsByCollection).forEach(record => record.types.forEach(value => {
          if (name === 'occurrenceTypes' && (record === recordsByCollection.chat_messages || record === recordsByCollection.risk_treatments)) values.add(value);
          if (name === 'faunaFloraGeoTypes' && record === recordsByCollection.fauna_flora_geo) values.add(value);
          if (name === 'equipmentTypes' && record === recordsByCollection.equipments) values.add(value);
        }));
        return Array.from(values).sort((a, b) => a.localeCompare(b));
      };
      const registeredLocations = new Set<string>(settingsData.locations?.locations || []);
      const registeredBrands = new Set<string>(settingsData.equipmentBrands?.brands || []);
      const registeredActivities = new Set<string>();
      Object.values(recordsByCollection).forEach(record => {
        record.names.forEach(value => registeredActivities.add(value));
        record.locations.forEach(value => registeredLocations.add(value));
        record.brands.forEach(value => registeredBrands.add(value));
      });
      setFilterOptions({
        occurrenceTypes: registeredTypes('occurrenceTypes', settingsData.occurrenceTypes?.types || []),
        locations: Array.from(registeredLocations).sort((a, b) => a.localeCompare(b)),
        availableYears: Array.from(allYears).sort((a, b) => Number(b) - Number(a)),
        faunaFloraGeoTypes: registeredTypes('faunaFloraGeoTypes', settingsData.faunaFloraGeoTypes?.types || []),
        equipmentTypes: registeredTypes('equipmentTypes', settingsData.equipmentTypes?.types || []),
        equipmentBrands: Array.from(registeredBrands).sort((a, b) => a.localeCompare(b)),
        activityNames: Array.from(registeredActivities).sort((a, b) => a.localeCompare(b)),
        pops: (settingsData.pops?.documents || []).map((p: PopDocument) => p.name),
        tcrs: (settingsData.tcrs?.documents || []).map((t: TcrDocument) => t.name),
        sgsDocSections: sgsDocSections.map(s => s.key),
      });
      if (loadedSettings >= settingsNames.length && loadedCollections >= 6) setIsLoadingFilters(false);
    };

    const unsubscribers = settingsNames.map(name => onSnapshot(
      doc(firestore, 'sgs_genius', user.uid, 'settings', name),
      snapshot => {
        settingsData[name] = snapshot.exists() ? snapshot.data() : {};
        loadedSettings += 1;
        updateOptions();
      },
      error => {
        console.warn(`Could not fetch options for ${name}:`, error);
        loadedSettings += 1;
        updateOptions();
      },
    ));

    const collectionSources = [
      { name: 'chat_messages', dateField: 'occurrenceDate', typeField: 'occurrenceType', locationField: 'occurrenceLocation', brandField: undefined },
      { name: 'risk_treatments', dateField: 'treatmentDate', typeField: 'treatmentType', locationField: 'treatmentLocation', brandField: undefined },
      { name: 'fauna_flora_geo', dateField: 'date', typeField: 'speciesType', locationField: 'locationName', brandField: undefined },
      { name: 'activities', dateField: 'createdAt', typeField: undefined, locationField: 'riskAssessmentLocation', brandField: undefined },
      { name: 'equipments', dateField: 'createdAt', typeField: 'equipmentType', locationField: 'storageLocation', brandField: 'brand' },
      { name: 'risk_assessments', dateField: 'assessmentDate', typeField: undefined, locationField: 'location', brandField: undefined },
    ];
    const collectionUnsubscribers = collectionSources.map(({ name, dateField, typeField, locationField, brandField }) => onSnapshot(
      collection(firestore, 'sgs_genius', user.uid, name),
      snapshot => {
        const years = new Set<string>();
        const names = new Set<string>();
        const types = new Set<string>();
        const locations = new Set<string>();
        const brands = new Set<string>();
        snapshot.forEach(docSnap => {
          const data = docSnap.data();
          if (name === 'activities') {
            const activityName = [data.activityName, data.name, data.title]
              .find((value: unknown): value is string => typeof value === 'string' && value.trim().length > 0);
            if (activityName) names.add(activityName.trim());
          }
          const date = data[dateField];
          if (date instanceof Timestamp) years.add(date.toDate().getFullYear().toString());
          if (typeField && typeof data[typeField] === 'string') types.add(data[typeField]);
          if (locationField) {
            const rawLocation = data[locationField] ?? (name === 'fauna_flora_geo' ? data.location : undefined);
            const values = Array.isArray(rawLocation) ? rawLocation : [rawLocation];
            values.filter((value: unknown): value is string => typeof value === 'string').forEach(value => locations.add(value));
          }
          if (brandField && typeof data[brandField] === 'string') brands.add(data[brandField]);
        });
        yearsByCollection[name] = years;
        recordsByCollection[name] = { names, types, locations, brands };
        loadedCollections += 1;
        updateOptions();
      },
      error => {
        console.warn(`Could not fetch years for ${name}:`, error);
        yearsByCollection[name] = new Set();
        recordsByCollection[name] = { names: new Set(), types: new Set(), locations: new Set(), brands: new Set() };
        loadedCollections += 1;
        updateOptions();
      },
    ));

    return () => [...unsubscribers, ...collectionUnsubscribers].forEach(unsubscribe => unsubscribe());
  }, [user, firestore, toast]);

  const handlePassChange = (value: string, setter: (val: string) => void) => {
    if (value.length <= 6) {
      setter(value);
    }
  };

  const handleSave = async (updatedProfiles: CustomProfile[]) => {
    const docRef = getSettingsDocRef();
    if (!docRef) {
      toast({ variant: 'destructive', title: 'Erro', description: 'Usuário não autenticado.' });
      return false;
    }

    setIsSaving(true);
    try {
      await setDoc(docRef, { adminPass, customProfiles: updatedProfiles }, { merge: true });
      return true;
    } catch (error) {
      console.error('Error saving profiles:', error);
      toast({ variant: 'destructive', title: 'Erro ao salvar', description: 'Não foi possível salvar os perfis.' });
      return false;
    } finally {
      setIsSaving(false);
    }
  };

  const handleAddProfile = async (e: FormEvent) => {
    e.preventDefault();
    if (!newProfileName.trim() || newProfilePass.length !== 6) {
      toast({
        variant: 'destructive',
        title: 'Dados inválidos',
        description: 'O nome do perfil não pode ser vazio e o passe deve ter 6 caracteres.',
      });
      return;
    }

    const newProfile: CustomProfile = {
      name: newProfileName.trim(),
      pass: newProfilePass,
      permissions: newProfilePermissions,
    };

    if (customProfiles.some(p => p.name.toLowerCase() === newProfile.name.toLowerCase())) {
      toast({
        variant: 'destructive',
        title: 'Perfil duplicado',
        description: 'Já existe um perfil com este nome.',
      });
      return;
    }

    const newProfiles = [...customProfiles, newProfile];
    const success = await handleSave(newProfiles);
    if (success) {
      setCustomProfiles(newProfiles);
      setNewProfileName('');
      setNewProfilePass('');
      setNewProfilePermissions({});
      toast({
        title: 'Sucesso!',
        description: `O perfil "${newProfile.name}" foi adicionado.`,
      });
    }
  };

  const handleRemoveProfile = async (profileToRemove: CustomProfile) => {
    const newProfiles = customProfiles.filter(p => p.name !== profileToRemove.name);
    const success = await handleSave(newProfiles);
    if (success) {
      setCustomProfiles(newProfiles);
      toast({
        title: 'Removido',
        description: `O perfil "${profileToRemove.name}" foi removido.`,
      });
    }
  };

  const handleStartEditing = (profile: CustomProfile) => {
    setEditingProfile(profile);
    setEditingName(profile.name);
    setEditingPass(profile.pass);
    setEditingPermissions(profile.permissions || {});
  };

  const handleCancelEditing = () => {
    setEditingProfile(null);
    setEditingName('');
    setEditingPass('');
    setEditingPermissions({});
  };

  const handleSaveEdit = async () => {
    if (!editingProfile || !editingName.trim() || editingPass.length !== 6) {
      toast({ variant: 'destructive', title: 'Dados inválidos', description: 'O nome não pode ser vazio e o passe deve ter 6 caracteres.' });
      return;
    }

    const newName = editingName.trim();
    if (customProfiles.some(p => p.name.toLowerCase() === newName.toLowerCase() && p.name !== editingProfile.name)) {
      toast({ variant: 'destructive', title: 'Perfil duplicado', description: 'Já existe um perfil com este nome.' });
      return;
    }

    const newProfiles = customProfiles.map(p => (p.name === editingProfile.name ? { name: newName, pass: editingPass, permissions: editingPermissions } : p));
    const success = await handleSave(newProfiles);
    if (success) {
      setCustomProfiles(newProfiles);
      handleCancelEditing();
      toast({ title: 'Sucesso!', description: 'O perfil foi atualizado.' });
    }
  };

  const handleSaveAdminPass = async () => {    
    const success = await handleSave(customProfiles);
    if (success) {
        toast({ title: 'Sucesso!', description: 'O passe do Administrador foi salvo.' });
    }
  }

  const handlePermissionChange = (menuId: string, subMenuId: string | null, isChecked: boolean, setter: React.Dispatch<React.SetStateAction<Permissions>>) => {    
    setter(prev => {
      const newPermissions = { ...prev };
      
      if (subMenuId) { 
        if (!newPermissions[menuId]) {
          newPermissions[menuId] = { enabled: true, subMenus: {} };
        }
        if (!newPermissions[menuId].subMenus) {
          newPermissions[menuId].subMenus = {};
        }
        if (isChecked) {
          // Preserva os filtros existentes se já houverem, senão inicia vazio
          const existingFilters = newPermissions[menuId].subMenus![subMenuId]?.filters || {};
          newPermissions[menuId].subMenus![subMenuId] = { enabled: true, filters: existingFilters };
        } else {
          delete newPermissions[menuId].subMenus![subMenuId];
        }
      } else { 
        if (isChecked) {
          const existingFilters = newPermissions[menuId]?.filters || {};
          newPermissions[menuId] = { enabled: true, filters: existingFilters };
        } else {
          delete newPermissions[menuId];
        }
      }
      return newPermissions;
    });
  };

  const openFilterDialog = (menuId: string, subMenuId: string | null, permissions: MenuPermission, isNew: boolean) => {
    setCurrentEditingMenu({ menuId, subMenuId, permissions, isNew });
    setTempFilters({ ...(permissions.filters || {}) });
    setIsFilterDialogOpen(true);
  };

  const handleSaveFilters = () => {
    if (!currentEditingMenu) return;

    const { menuId, subMenuId, isNew } = currentEditingMenu;
    const setter = isNew ? setNewProfilePermissions : setEditingPermissions;

    setter(prev => {
      const newPerms = { ...prev };
      if (subMenuId) {
        if (!newPerms[menuId]) {
          newPerms[menuId] = { enabled: true, subMenus: {} };
        }
        if (!newPerms[menuId].subMenus) {
          newPerms[menuId].subMenus = {};
        }
        // Isola estritamente os filtros dentro deste submenu específico
        newPerms[menuId].subMenus![subMenuId] = {
          ...newPerms[menuId].subMenus![subMenuId],
          enabled: true,
          filters: { ...tempFilters },
        };
      } else {
        newPerms[menuId] = {
          ...newPerms[menuId],
          enabled: true,
          filters: { ...tempFilters },
        };
      }
      return newPerms;
    });

    setIsFilterDialogOpen(false);
    setCurrentEditingMenu(null);
  };

  const handleTempFilterChange = (filterKey: string, selectedValues: string[]) => {
    setTempFilters(prev => ({
      ...prev,
      [filterKey]: selectedValues,
    }));
  };

  const getFilterOptionsForMenu = (menuId: string, subMenuId: string | null, allOptions: typeof filterOptions): Record<string, { label: string; options: { value: string; label: string; }[] }> => {
    const key = subMenuId || menuId;

    if (key === 'occurrence-report' || key === 'map-report') {
      return {
        types: { label: 'Tipos de Ocorrência', options: allOptions.occurrenceTypes.map(opt => ({ value: opt, label: opt })) },
        locations: { label: 'Locais', options: allOptions.locations.map(opt => ({ value: opt, label: opt })) },
        analysis: { label: 'Análise', options: analysisOptions },
        ageGroups: { label: 'Faixa Etária', options: ageGroupOptions },
        months: { label: 'Mês', options: monthOptions },
        years: { label: 'Anos', options: allOptions.availableYears.map(opt => ({ value: opt, label: opt })) },
      };
    }

    if (key === 'treatment-report' || key === 'treatment-map-report') {
      return {
        types: { label: 'Tipos de Risco', options: allOptions.occurrenceTypes.map(opt => ({ value: opt, label: opt })) },
        locations: { label: 'Locais', options: allOptions.locations.map(opt => ({ value: opt, label: opt })) },
        riskLevels: { label: 'Níveis de Risco', options: riskLevelOptions },
        situations: { label: 'Situação', options: situationOptions },
        months: { label: 'Mês', options: monthOptions },
        years: { label: 'Anos', options: allOptions.availableYears.map(opt => ({ value: opt, label: opt })) },
      };
    }

    if (key === 'fauna-flora-geo-report' || key === 'fauna-flora-geo-map-report') {
      return {
        types: { label: 'Espécies/Tipos', options: allOptions.faunaFloraGeoTypes.map(opt => ({ value: opt, label: opt })) },
        locations: { label: 'Locais', options: allOptions.locations.map(opt => ({ value: opt, label: opt })) },
        analysis: { label: 'Análise', options: analysisOptions },
        months: { label: 'Mês', options: monthOptions },
        years: { label: 'Anos', options: allOptions.availableYears.map(opt => ({ value: opt, label: opt })) },
      };
    }

    if (key === 'equipment-report') {
      return {
        types: { label: 'Tipos de Equipamento', options: allOptions.equipmentTypes.map(opt => ({ value: opt, label: opt })) },
        brands: { label: 'Marcas', options: allOptions.equipmentBrands.map(opt => ({ value: opt, label: opt })) },
        locations: { label: 'Locais de Armazenamento', options: allOptions.locations.map(opt => ({ value: opt, label: opt })) },
        status: { label: 'Status', options: [{value: 'operacional', label: 'Operacional'}, {value: 'em manutencao', label: 'Em Manutenção'}, {value: 'descartado', label: 'Condenado'}] },
        inspectionStatus: { label: 'Situação da Vistoria', options: inspectionStatusOptions },
      };
    }

    if (key === 'risk-assessment-report') {
      return {
        locations: { label: 'Locais', options: allOptions.locations.map(opt => ({ value: opt, label: opt })) },
        years: { label: 'Anos', options: allOptions.availableYears.map(opt => ({ value: opt, label: opt })) },
      };
    }

    if (key === 'activity-report') {
      return {
        activityNames: { label: 'Atividades', options: allOptions.activityNames.map(opt => ({ value: opt, label: opt })) },
        years: { label: 'Anos', options: allOptions.availableYears.map(opt => ({ value: opt, label: opt })) },
      };
    }

    if (key === 'graphics-report') {
      return {
        reportTypes: { label: 'Tipos de Relatório', options: reportTypeOptions },
        years: { label: 'Anos', options: allOptions.availableYears.map(opt => ({ value: opt, label: opt })) },
        locations: { label: 'Locais', options: allOptions.locations.map(opt => ({ value: opt, label: opt })) },
        occurrenceTypes: { label: 'Tipos de Ocorrência', options: allOptions.occurrenceTypes.map(opt => ({ value: opt, label: opt })) },
        treatmentTypes: { label: 'Tipos de Risco', options: allOptions.occurrenceTypes.map(opt => ({ value: opt, label: opt })) },
        faunaFloraGeoTypes: { label: 'Espécies/Tipos FFG', options: allOptions.faunaFloraGeoTypes.map(opt => ({ value: opt, label: opt })) },
      };
    }

    if (key === 'view-pops') {
      return { popNames: { label: 'Nomes dos POPs', options: allOptions.pops.map(opt => ({ value: opt, label: opt })) } };
    }
    if (key === 'view-tcrs') {
      return { tcrNames: { label: 'Nomes dos TCRs', options: allOptions.tcrs.map(opt => ({ value: opt, label: opt })) } };
    }
    if (key === 'view-sgs-docs') {
      return { sections: { label: 'Seções do Documento', options: sgsDocSections.map(s => ({ value: s.key, label: s.label })) } };
    }

    return {};
  };

  const currentMenuFilterOptions = useMemo(() => {
    if (!currentEditingMenu) return {};
    return getFilterOptionsForMenu(currentEditingMenu.menuId, currentEditingMenu.subMenuId, filterOptions);
  }, [currentEditingMenu, filterOptions]);

  return (
    <div>
      {isLoading ? (
        <Card>
          <CardHeader>
            <CardTitle>Gerenciar Perfis</CardTitle>
            <CardDescription>Defina os passes de 6 dígitos para os perfis.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-8">
            <Skeleton className="h-24 w-full" />
            <Separator />
            <Skeleton className="h-40 w-full" />
            <Separator />
            <Skeleton className="h-32 w-full" />
          </CardContent>
          <CardFooter className="flex justify-end">
            <Skeleton className="h-10 w-32" />
          </CardFooter>
        </Card>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle>Gerenciar Perfis</CardTitle>
            <CardDescription>Defina os passes de 6 dígitos para os perfis.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-8">
            <div className="space-y-4">
              <h3 className="font-semibold text-lg">Perfil Administrador</h3>
              <div className="space-y-2">
                <Label htmlFor="admin-pass">Passe</Label>
                <div className="relative">
                  <Input
                    id="admin-pass"
                    type={showAdminPass ? 'text' : 'password'}
                    value={adminPass}
                    onChange={(e) => handlePassChange(e.target.value, setAdminPass)}
                    maxLength={6}
                    autoComplete="new-password"
                    className="pr-10"
                    disabled={isSaving}
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="absolute inset-y-0 right-0 h-full px-3 text-muted-foreground hover:bg-transparent"
                    onClick={() => setShowAdminPass((prev) => !prev)}
                  >
                    {showAdminPass ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                  </Button>
                </div>
              </div>
              <Button onClick={handleSaveAdminPass} disabled={isSaving || adminPass.length !== 6}>
                {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Salvar Passe do Admin
              </Button>
            </div>

            <Separator />

            <div className="space-y-6">
              <h3 className="font-semibold text-lg">Perfis Personalizados</h3>
              <form onSubmit={handleAddProfile} className="p-4 border rounded-lg bg-muted/50 space-y-4">
                <h4 className="font-medium">Criar Novo Perfil</h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 items-start">
                  <div className="space-y-2">
                    <Label htmlFor="new-profile-name">Nome do Perfil</Label>
                    <Input id="new-profile-name" placeholder="Ex: Supervisor" value={newProfileName} onChange={(e) => setNewProfileName(e.target.value)} disabled={isSaving} />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="new-profile-pass">Passe (6 caracteres)</Label>
                    <div className="relative">
                      <Input id="new-profile-pass" type={showNewProfilePass ? 'text' : 'password'} value={newProfilePass} onChange={(e) => handlePassChange(e.target.value, setNewProfilePass)} maxLength={6} disabled={isSaving} className="pr-10" />
                      <Button type="button" variant="ghost" size="icon" className="absolute inset-y-0 right-0 h-full px-3" onClick={() => setShowNewProfilePass(p => !p)}><Eye className="h-5 w-5" /></Button>
                    </div>
                  </div>
                </div>
                <div>
                  <h5 className="font-medium mb-3">Permissões do Menu</h5>
                  <div className="space-y-6 p-4 border rounded-md bg-background/50">
                    {availableMenus.map(menu => (
                      <div key={menu.id}>
                        {menu.subMenus ? (
                          <div className="space-y-4">
                            <div className="flex items-center space-x-2">
                              <Checkbox id={`new-${menu.id}`} checked={!!newProfilePermissions[menu.id]?.enabled} onCheckedChange={(checked) => handlePermissionChange(menu.id, null, checked === true, setNewProfilePermissions)} />
                              <label htmlFor={`new-${menu.id}`} className="text-sm font-semibold">{menu.label}</label>
                            </div>
                            {newProfilePermissions[menu.id]?.enabled && (
                              <div className="pl-6 space-y-3 border-l-2 border-muted ml-2">
                                {menu.subMenus.map(subMenu => (
                                  <div key={subMenu.id} className="flex items-center space-x-2 relative">
                                    <Checkbox id={`new-${subMenu.id}`} checked={!!newProfilePermissions[menu.id]?.subMenus?.[subMenu.id]?.enabled} onCheckedChange={(checked) => handlePermissionChange(menu.id, subMenu.id, checked === true, setNewProfilePermissions)} />
                                    <label htmlFor={`new-${subMenu.id}`} className="text-sm font-medium">{subMenu.label}</label>
                                    {subMenu.hasFilters && newProfilePermissions[menu.id]?.subMenus?.[subMenu.id]?.enabled && (
                                      <Button type="button" variant="ghost" size="icon" className="h-6 w-6 ml-1" onClick={() => openFilterDialog(menu.id, subMenu.id, newProfilePermissions[menu.id]!.subMenus![subMenu.id], true)}>
                                        <Settings className="h-4 w-4 text-muted-foreground" />
                                      </Button>
                                    )}
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        ) : (
                          <div className="flex items-center space-x-2 relative">
                            <div className="flex items-center gap-2">
                              <Checkbox
                                id={`new-${menu.id}`}
                                checked={!!newProfilePermissions[menu.id]?.enabled}
                                onCheckedChange={(checked) => handlePermissionChange(menu.id, null, checked === true, setNewProfilePermissions)}
                              />
                              <label htmlFor={`new-${menu.id}`} className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">{menu.label}</label>
                            </div>
                            {menu.hasFilters && newProfilePermissions[menu.id]?.enabled && (
                              <Button
                                type="button"
                                variant="ghost"
                                size="icon"
                                className="h-6 w-6 ml-1"
                                onClick={() => openFilterDialog(menu.id, null, newProfilePermissions[menu.id], true)}
                              >
                                <Settings className="h-4 w-4 text-muted-foreground" />
                              </Button>
                            )}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
                <Button type="submit" disabled={isSaving || !newProfileName.trim() || newProfilePass.length !== 6}>
                  {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Plus className="mr-2 h-4 w-4" />}
                  Adicionar Perfil
                </Button>
              </form>

              <div>
                <h4 className="font-medium mb-4">Perfis Existentes</h4>
                {customProfiles.length > 0 ? (
                  <ul className="space-y-3">
                    {customProfiles.map((profile) => (
                      <li key={profile.name} className="flex flex-col sm:flex-row sm:items-center justify-between rounded-md border p-3 gap-3">
                        {editingProfile?.name === profile.name ? (
                          <div className="flex-1 space-y-4">
                            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
                              <Input value={editingName} onChange={(e) => setEditingName(e.target.value)} className="h-9 flex-1" autoFocus />
                              <div className="relative flex-1">
                                <Input value={editingPass} onChange={(e) => handlePassChange(e.target.value, setEditingPass)} maxLength={6} type={showEditingPass ? 'text' : 'password'} className="h-9 pr-10" />
                                <Button type="button" variant="ghost" size="icon" className="absolute inset-y-0 right-0 h-full px-3" onClick={() => setShowEditingPass(p => !p)}><Eye className="h-5 w-5" /></Button>
                              </div>
                            </div>
                            <div>
                              <h5 className="font-medium text-sm mb-2">Permissões</h5>
                              <div className="space-y-4 p-3 border rounded-md bg-background/50">
                                {availableMenus.map(menu => (
                                  <div key={`edit-${menu.id}`}>
                                    {menu.subMenus ? (
                                      <div className="space-y-3">
                                        <div className="flex items-center space-x-2">
                                          <Checkbox id={`edit-${menu.id}`} checked={!!editingPermissions[menu.id]?.enabled} onCheckedChange={(checked) => handlePermissionChange(menu.id, null, checked === true, setEditingPermissions)} />
                                          <label htmlFor={`edit-${menu.id}`} className="text-sm font-semibold">{menu.label}</label>
                                        </div>
                                        {editingPermissions[menu.id]?.enabled && (
                                          <div className="pl-6 space-y-2 border-l-2 border-muted ml-2">
                                            {menu.subMenus.map(subMenu => (
                                              <div key={subMenu.id} className="flex items-center space-x-1 relative">
                                                <Checkbox id={`edit-${subMenu.id}`} checked={!!editingPermissions[menu.id]?.subMenus?.[subMenu.id]?.enabled} onCheckedChange={(checked) => handlePermissionChange(menu.id, subMenu.id, checked === true, setEditingPermissions)} />
                                                <label htmlFor={`edit-${subMenu.id}`} className="text-xs font-medium">{subMenu.label}</label>
                                                {subMenu.hasFilters && editingPermissions[menu.id]?.subMenus?.[subMenu.id]?.enabled && (
                                                  <Button type="button" variant="ghost" size="icon" className="h-5 w-5" onClick={() => openFilterDialog(menu.id, subMenu.id, editingPermissions[menu.id]!.subMenus![subMenu.id], false)}>
                                                    <Settings className="h-3 w-3 text-muted-foreground" />
                                                  </Button>
                                                )}
                                              </div>
                                            ))}
                                          </div>
                                        )}
                                      </div>
                                    ) : (
                                      <div className="flex items-center space-x-1 h-full">
                                        <div className="flex items-center gap-2">
                                          <Checkbox id={`edit-${menu.id}`} checked={!!editingPermissions[menu.id]?.enabled} onCheckedChange={(checked) => handlePermissionChange(menu.id, null, checked === true, setEditingPermissions)} />
                                          <label htmlFor={`edit-${menu.id}`} className="text-xs font-medium">{menu.label}</label>
                                        </div>
                                        {menu.hasFilters && editingPermissions[menu.id]?.enabled && (
                                          <Button
                                            type="button"
                                            variant="ghost"
                                            size="icon"
                                            className="h-5 w-5"
                                            onClick={() => openFilterDialog(menu.id, null, editingPermissions[menu.id], false)}
                                          >
                                            <Settings className="h-3 w-3 text-muted-foreground" />
                                          </Button>
                                        )}
                                      </div>
                                    )}
                                  </div>
                                ))}
                              </div>
                            </div>
                            <div className="flex items-center justify-end gap-2 mt-2 sm:mt-0">
                              <Button variant="ghost" size="icon" onClick={handleSaveEdit} className="h-9 w-9 text-green-500 hover:text-green-600 border sm:border-0"><Check className="h-4 w-4" /></Button>
                              <Button variant="ghost" size="icon" onClick={handleCancelEditing} className="h-9 w-9 text-muted-foreground hover:text-destructive border sm:border-0"><X className="h-4 w-4" /></Button>
                            </div>
                          </div>
                        ) : (
                          <>
                            <span className="font-medium break-all">{profile.name}</span>
                            <div className="flex items-center justify-end gap-1">
                              <Button variant="ghost" size="icon" onClick={() => handleStartEditing(profile)} disabled={isSaving} className="h-9 w-9 text-muted-foreground hover:text-primary border sm:border-0"><Pencil className="h-4 w-4" /></Button>
                              <AlertDialog>
                                <AlertDialogTrigger asChild>
                                  <Button variant="ghost" size="icon" disabled={isSaving} className="h-9 w-9 text-muted-foreground hover:text-destructive border sm:border-0"><Trash2 className="h-4 w-4" /></Button>
                                </AlertDialogTrigger>
                                <AlertDialogContent>
                                  <AlertDialogHeader>
                                    <AlertDialogTitle>Você tem certeza?</AlertDialogTitle>
                                    <AlertDialogDescription>Esta ação excluirá permanentemente o perfil "{profile.name}".</AlertDialogDescription>
                                  </AlertDialogHeader>
                                  <AlertDialogFooter>
                                    <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                    <AlertDialogAction onClick={() => handleRemoveProfile(profile)} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">Sim, excluir</AlertDialogAction>
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
                  <p className="text-center text-sm text-muted-foreground py-4">Nenhum perfil personalizado cadastrado.</p>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      <Dialog open={isFilterDialogOpen} onOpenChange={setIsFilterDialogOpen}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>
              Configurar Filtros para "{
                currentEditingMenu?.subMenuId ? availableMenus.find(m => m.id === currentEditingMenu.menuId)?.subMenus?.find(sm => sm.id === currentEditingMenu.subMenuId)?.label : availableMenus.find(m => m.id === currentEditingMenu?.menuId)?.label
              }"
            </DialogTitle>
            <DialogDescription>
              Selecione quais tipos, anos e locais este perfil poderá visualizar nos relatórios deste menu. Deixar em branco significa "ver todos".
            </DialogDescription>
          </DialogHeader>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 py-4 max-h-[60vh] overflow-y-auto pr-2">
            {Object.entries(currentMenuFilterOptions).map(([key, filterConfig]) => (
              <div key={key} className="space-y-2">
                <Label>{filterConfig.label as string}</Label>
                <SheetFilter
                  title={`Selecionar ${filterConfig.label}`}
                  options={filterConfig.options as { value: string; label: string; }[]}
                  selected={tempFilters[key] || []}
                  onChange={(selected) => handleTempFilterChange(key, selected)}
                  buttonText={`Selecionar ${filterConfig.label}`}
                  disabled={isLoadingFilters}
                  filterKey={key}
                  menuId={currentEditingMenu?.menuId}
                  subMenuId={currentEditingMenu?.subMenuId || undefined}
                />
              </div>
            ))}
          </div>
          <DialogFooter>
            <DialogClose asChild>
              <Button onClick={handleSaveFilters}>Salvar Filtros</Button>
            </DialogClose>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}