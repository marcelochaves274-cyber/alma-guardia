'use client';

import { useState, useEffect } from 'react';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
  SheetClose
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Filter } from 'lucide-react';
import { Separator } from './ui/separator';
import { useProfile } from '@/context/profile-context';
import { doc, getDoc } from 'firebase/firestore';
import { useFirestore, useUser } from '@/firebase';

interface SheetFilterProps {
  title: string;
  options: { value: string; label: string }[];
  selected: string[];
  onChange: (selected: string[]) => void;
  buttonText?: string;
  disabled?: boolean;
  filterKey?: string; // Ex: 'locations', 'types', 'years', 'riskLevels', 'situations', etc.
  menuId?: string;
  subMenuId?: string;
}

export function SheetFilter({ title, options, selected, onChange, buttonText = "Filtro", disabled, filterKey = 'locations', menuId, subMenuId }: SheetFilterProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [tempSelected, setTempSelected] = useState<string[]>(selected);
  const { profile, permissions } = useProfile();
  const { user } = useUser();
  const firestore = useFirestore();
  const [livePermissions, setLivePermissions] = useState<any>(null);

  // Busca as permissões diretamente do Firestore do perfil atual em tempo real
  useEffect(() => {
    setLivePermissions(null);
    if (profile && profile !== 'admin' && user && firestore) {
      const docRef = doc(firestore, 'sgs_genius', user.uid, 'settings', 'profiles');
      getDoc(docRef).then(snap => {
        if (snap.exists()) {
          const data = snap.data();
          const customProfile = (data.customProfiles || []).find((p: any) => p.name === profile);
          if (customProfile && customProfile.permissions) {
            setLivePermissions(customProfile.permissions);
          }
        }
      }).catch(err => {
        console.error("Erro ao buscar permissões para o filtro:", err);
      });
    }
  }, [profile, user, firestore]);

  // Função central: O perfil só enxerga exatamente o que o Administrador selecionou nas caixinhas
  const getRestrictedOptions = () => {
    // 1. Administrador vê tudo sem restrição
    if (!profile || profile === 'admin') {
      return options;
    }

    const activePerms = livePermissions || permissions;
    if (!activePerms) return []; // Se não carregou permissões, por segurança não exibe nada

    // Cada gaveta aponta para um único menu/submenu. Nunca procurar a chave em outros menus.
    if (!menuId) return [];
    const menuPermissions = activePerms[menuId];
    if (!menuPermissions || typeof menuPermissions !== 'object') return [];

    const filterOwner = subMenuId
      ? menuPermissions.subMenus?.[subMenuId]
      : menuPermissions;
    const allowedValues = filterOwner?.filters?.[filterKey];

    // 3. REGRA DEFINITIVA:
    // - Se o admin configurou itens específicos para este filtro, exibe APENAS eles.
    // - Se o admin configurou a chave mas deixou a lista vazia (ou se não encontrou configuração para este filtro), 
    //   retorna vazio `[]` para que apareça "Nenhuma opção disponível", exigindo que o admin selecione o que deseja mostrar.
    if (allowedValues && Array.isArray(allowedValues) && allowedValues.length > 0) {
      return options.filter(opt => allowedValues!.includes(opt.value));
    }

    // Se nenhuma regra foi salva pelo admin para este filtro, retorna vazio para não vazar dados
    return [];
  };

  const restrictedOptions = getRestrictedOptions();

  useEffect(() => {
    setTempSelected(selected);
  }, [selected, isOpen]);

  const handleSelect = (value: string) => {
    setTempSelected(prev =>
      prev.includes(value)
        ? prev.filter(item => item !== value)
        : [...prev, value]
    );
  };

  const handleClear = () => {
    setTempSelected([]);
  };

  const handleSelectAll = () => {
    setTempSelected(restrictedOptions.map(o => o.value));
  };

  const handleApply = () => {
    onChange(tempSelected);
    setIsOpen(false);
  };

  const getButtonText = () => {
    if (selected.length === 0) return buttonText;
    if (selected.length === restrictedOptions.length) return "Todos selecionados";
    if (selected.length === 1) return restrictedOptions.find(o => o.value === selected[0])?.label || `1 selecionado`;
    return `${selected.length} selecionados`;
  }

  return (
    <Sheet open={isOpen} onOpenChange={setIsOpen}>
      <SheetTrigger asChild>
        <Button
          variant="outline"
          className="w-full justify-start text-left"
          disabled={disabled}
        >
           <Filter className="mr-2 h-4 w-4" />
           <span className='truncate'>{getButtonText()}</span>
        </Button>
      </SheetTrigger>
      <SheetContent className="flex flex-col h-full">
        <SheetHeader>
          <SheetTitle>{title}</SheetTitle>
          <SheetDescription>
            Selecione um ou mais itens para filtrar os resultados.
          </SheetDescription>
        </SheetHeader>
        <Separator className='my-4' />
        <ScrollArea className="flex-1 pr-4">
          <div className="flex flex-col gap-4 py-4">
            {restrictedOptions.map((option) => (
              <div key={option.value} className="flex items-center space-x-2">
                <Checkbox
                  id={`sheet-check-${option.value}`}
                  checked={tempSelected.includes(option.value)}
                  onCheckedChange={() => handleSelect(option.value)}
                />
                <Label
                  htmlFor={`sheet-check-${option.value}`}
                  className="w-full text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                >
                  {option.label}
                </Label>
              </div>
            ))}
             {restrictedOptions.length === 0 && (
                <p className="text-sm text-muted-foreground text-center py-10">Nenhuma opção disponível para este perfil.</p>
             )}
          </div>
        </ScrollArea>
        <SheetFooter className='pt-4 border-t flex-col sm:flex-row sm:justify-end sm:gap-2'>
          <Button variant="ghost" onClick={handleClear} className="w-full sm:w-auto sm:mr-auto">Limpar</Button>
          <Button variant="outline" onClick={handleSelectAll} className="w-full sm:w-auto">Selecionar Todos</Button>
          <SheetClose asChild>
            <Button onClick={handleApply} className="w-full sm:w-auto">Aplicar</Button>
          </SheetClose>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}