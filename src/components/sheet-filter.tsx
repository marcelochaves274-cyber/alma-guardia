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

interface SheetFilterProps {
  title: string;
  options: { value: string; label: string }[];
  selected: string[];
  onChange: (selected: string[]) => void;
  buttonText?: string;
  disabled?: boolean;
}

export function SheetFilter({ title, options, selected, onChange, buttonText = "Filtro", disabled }: SheetFilterProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [tempSelected, setTempSelected] = useState<string[]>(selected);

  useEffect(() => {
    // Sync temporary state with external state when the sheet opens or external selection changes
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

  const handleApply = () => {
    onChange(tempSelected);
    setIsOpen(false);
  };

  const getButtonText = () => {
    if (selected.length === 0) return buttonText;
    if (selected.length === 1) return options.find(o => o.value === selected[0])?.label || `1 selecionado`;
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
            {options.map((option) => (
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
             {options.length === 0 && (
                <p className="text-sm text-muted-foreground text-center py-10">Nenhuma opção disponível.</p>
            )}
          </div>
        </ScrollArea>
        <SheetFooter className='pt-4 border-t'>
          <Button variant="ghost" onClick={handleClear}>Limpar</Button>
          <SheetClose asChild>
            <Button onClick={handleApply}>Aplicar</Button>
          </SheetClose>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
