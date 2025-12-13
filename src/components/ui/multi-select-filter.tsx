
"use client";

import { useState, useCallback } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';
import { Check, ListFilter } from 'lucide-react';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Badge } from './badge';

interface MultiSelectFilterProps {
  placeholder: string;
  options: { value: string; label: string }[];
  selected: string[];
  onChange: (selected: string[]) => void;
  disabled?: boolean;
}

export function MultiSelectFilter({
  placeholder,
  options,
  selected,
  onChange,
  disabled,
}: MultiSelectFilterProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [tempSelected, setTempSelected] = useState(selected);

  const handleOpenChange = (open: boolean) => {
    if (open) {
      setTempSelected(selected);
    }
    setIsOpen(open);
  };

  const handleSelect = useCallback((value: string) => {
    setTempSelected((prev) =>
      prev.includes(value)
        ? prev.filter((item) => item !== value)
        : [...prev, value]
    );
  }, []);

  const applyFilter = () => {
    onChange(tempSelected);
    setIsOpen(false);
  };

  const getButtonText = () => {
    if (selected.length === 0) return placeholder;
    if (selected.length === options.length) return "Todos selecionados";
    if (selected.length === 1) {
      const option = options.find((o) => o.value === selected[0]);
      return option?.label || placeholder;
    }
    return `${selected.length} selecionados`;
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={isOpen}
          className="w-full justify-between"
          disabled={disabled}
        >
          <span className="truncate">{getButtonText()}</span>
          <div className='flex items-center'>
            {selected.length > 0 && <Badge variant="secondary" className='ml-2'>{selected.length}</Badge>}
            <ListFilter className="h-4 w-4 opacity-50 ml-2" />
          </div>
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md p-0">
        <DialogHeader className="p-4 pb-2">
          <DialogTitle>{placeholder}</DialogTitle>
        </DialogHeader>
        <Command>
          <div className="p-4 pt-0">
            <CommandInput placeholder="Buscar..." />
          </div>
          <CommandList>
            <ScrollArea className="h-64">
                <CommandEmpty>Nenhum resultado.</CommandEmpty>
                <CommandGroup>
                  {options.map((option) => (
                    <CommandItem
                      key={option.value}
                      onSelect={() => handleSelect(option.value)}
                      className="cursor-pointer mx-4"
                    >
                      <Check
                        className={cn(
                          "mr-2 h-4 w-4",
                          tempSelected.includes(option.value) ? "opacity-100" : "opacity-0"
                        )}
                      />
                      <span className="truncate flex-1">{option.label}</span>
                    </CommandItem>
                  ))}
                </CommandGroup>
            </ScrollArea>
          </CommandList>
          <DialogFooter className="p-4 border-t">
             <Button variant="ghost" onClick={() => setTempSelected([])}>Limpar</Button>
             <Button type="button" onClick={applyFilter}>Aplicar Filtro</Button>
          </DialogFooter>
        </Command>
      </DialogContent>
    </Dialog>
  );
}
