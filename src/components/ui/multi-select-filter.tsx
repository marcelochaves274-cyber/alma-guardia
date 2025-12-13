'use client';

import { useState, useEffect, useCallback } from 'react';
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { cn } from '@/lib/utils';
import { ChevronDown, Check } from 'lucide-react';

interface MultiSelectFilterProps {
  placeholder: string;
  options: { value: string; label: string }[];
  selected: string[];
  onChange: (selected: string[]) => void;
  disabled?: boolean;
}

export function MultiSelectFilter({ placeholder, options, selected, onChange, disabled }: MultiSelectFilterProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [tempSelected, setTempSelected] = useState<string[]>(selected);

  useEffect(() => {
    setTempSelected(selected);
  }, [selected, isOpen]); // Reset temp state when popover opens or external state changes

  const handleSelect = useCallback((value: string) => {
    setTempSelected(prev => 
      prev.includes(value)
        ? prev.filter(item => item !== value)
        : [...prev, value]
    );
  }, []);

  const handleClear = () => {
    setTempSelected([]);
  };

  const handleApply = () => {
    onChange(tempSelected);
    setIsOpen(false);
  };
  
  const getButtonText = () => {
    if (selected.length === 0) return placeholder;
    if (selected.length === 1) {
      const option = options.find(o => o.value === selected[0]);
      return option?.label || placeholder;
    }
    if (selected.length === options.length) return "Todos selecionados";
    return `${selected.length} selecionados`;
  };

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={isOpen}
          className="w-full justify-between"
          disabled={disabled}
        >
          <span className="truncate">{getButtonText()}</span>
          <ChevronDown className="h-4 w-4 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[var(--radix-popover-trigger-width)] p-0">
        <ScrollArea className="max-h-60">
          <div className="p-1">
            {options.map((option) => (
              <div
                key={option.value}
                className="flex items-center justify-between p-2 hover:bg-accent rounded-md cursor-pointer"
                onClick={() => handleSelect(option.value)}
              >
                <label
                  htmlFor={`check-${option.value}-${placeholder.replace(/\s/g, '')}`}
                  className="w-full text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
                >
                  {option.label}
                </label>
                <Check
                    className={cn(
                      "h-4 w-4",
                      tempSelected.includes(option.value) ? "opacity-100" : "opacity-0"
                    )}
                  />
              </div>
            ))}
          </div>
        </ScrollArea>
        <Separator />
        <div className="flex justify-end gap-2 p-2">
            <Button variant="ghost" size="sm" onClick={handleClear}>Limpar</Button>
            <Button size="sm" onClick={handleApply}>Aplicar Filtros</Button>
        </div>
      </PopoverContent>
    </Popover>
  );
}
