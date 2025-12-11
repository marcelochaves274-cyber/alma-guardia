'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
  DialogClose,
} from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { ListFilter } from 'lucide-react';

interface LocationFilterDialogProps {
  options: { value: string; label: string }[];
  selected: string[];
  onChange: (selected: string[]) => void;
  disabled?: boolean;
}

export function LocationFilterDialog({
  options,
  selected,
  onChange,
  disabled,
}: LocationFilterDialogProps) {
  const [tempSelected, setTempSelected] = useState(selected);

  const handleCheckboxChange = (value: string) => {
    setTempSelected((prev) =>
      prev.includes(value)
        ? prev.filter((item) => item !== value)
        : [...prev, value]
    );
  };

  const applyFilter = () => {
    onChange(tempSelected);
  };
  
  // When the dialog opens, sync temp state with external state
  const handleOpenChange = (isOpen: boolean) => {
    if (isOpen) {
      setTempSelected(selected);
    }
  }

  return (
    <Dialog onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button variant="outline" disabled={disabled}>
          <ListFilter className="mr-2 h-4 w-4" />
          Filtrar Locais (Novo)
          {selected.length > 0 && <Badge variant="secondary" className='ml-2'>{selected.length}</Badge>}
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Filtrar por Local</DialogTitle>
        </DialogHeader>
        <ScrollArea className="h-72 w-full rounded-md border">
          <div className="p-4">
            {options.map((option) => (
              <div key={option.value} className="flex items-center space-x-2 mb-2 p-2 rounded-md hover:bg-accent">
                <Checkbox
                  id={`loc-check-${option.value}`}
                  checked={tempSelected.includes(option.value)}
                  onCheckedChange={() => handleCheckboxChange(option.value)}
                />
                <Label htmlFor={`loc-check-${option.value}`} className="w-full cursor-pointer">
                  {option.label}
                </Label>
              </div>
            ))}
          </div>
        </ScrollArea>
        <DialogFooter>
          <DialogClose asChild>
            <Button type="button" variant="secondary">
              Cancelar
            </Button>
          </DialogClose>
          <DialogClose asChild>
             <Button type="button" onClick={applyFilter}>Aplicar Filtro</Button>
          </DialogClose>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
