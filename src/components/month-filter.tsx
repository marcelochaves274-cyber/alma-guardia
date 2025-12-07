'use client';

import { useState, useCallback } from 'react';
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";

interface MonthFilterProps {
  selectedMonths: string[];
  onChange: (selected: string[]) => void;
  disabled?: boolean;
}

const months = [
  { value: '0', label: 'Janeiro' },
  { value: '1', label: 'Fevereiro' },
  { value: '2', label: 'Março' },
  { value: '3', label: 'Abril' },
  { value: '4', label: 'Maio' },
  { value: '5', label: 'Junho' },
  { value: '6', label: 'Julho' },
  { value: '7', label: 'Agosto' },
  { value: '8', label: 'Setembro' },
  { value: '9', label: 'Outubro' },
  { value: '10', label: 'Novembro' },
  { value: '11', label: 'Dezembro' },
];

export function MonthFilter({ selectedMonths, onChange, disabled }: MonthFilterProps) {
  const [isOpen, setIsOpen] = useState(false);

  // CRITICAL: useCallback prevents re-creation of the function on every render,
  // which stops the infinite update loop that caused the "dual update" bug.
  const handleSelect = useCallback((monthValue: string) => {
    const newSelected = selectedMonths.includes(monthValue)
      ? selectedMonths.filter(item => item !== monthValue)
      : [...selectedMonths, monthValue];
    onChange(newSelected);
  }, [selectedMonths, onChange]);
  
  const getButtonText = () => {
    if (selectedMonths.length === 0) return "Filtrar por Mês";
    if (selectedMonths.length === 1) {
      const month = months.find(m => m.value === selectedMonths[0]);
      return month?.label || "1 selecionado";
    }
    if (selectedMonths.length === months.length) return "Todos os meses";
    return `${selectedMonths.length} meses selecionados`;
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
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[var(--radix-popover-trigger-width)] p-0">
        <ScrollArea className="max-h-60">
          <div className="p-1">
            {months.map((month) => (
              <div
                key={month.value}
                className="flex items-center space-x-2 p-2 hover:bg-accent rounded-md cursor-pointer"
                onClick={() => handleSelect(month.value)}
              >
                <Checkbox
                  id={`check-${month.value}`}
                  checked={selectedMonths.includes(month.value)}
                  onCheckedChange={() => handleSelect(month.value)}
                />
                <label
                  htmlFor={`check-${month.value}`}
                  className="w-full text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
                >
                  {month.label}
                </label>
              </div>
            ))}
          </div>
        </ScrollArea>
      </PopoverContent>
    </Popover>
  );
}
