'use client';

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface MonthSelectorProps {
  selectedMonths: string[];
  onMonthChange: (selected: string[]) => void;
}

const months = [
  { value: '0', label: 'Jan' },
  { value: '1', label: 'Fev' },
  { value: '2', label: 'Mar' },
  { value: '3', label: 'Abr' },
  { value: '4', label: 'Mai' },
  { value: '5', label: 'Jun' },
  { value: '6', label: 'Jul' },
  { value: '7', label: 'Ago' },
  { value: '8', label: 'Set' },
  { value: '9', label: 'Out' },
  { value: '10', label: 'Nov' },
  { value: '11', label: 'Dez' },
];

export function MonthSelector({ selectedMonths, onMonthChange }: MonthSelectorProps) {
  const handleMonthClick = (monthValue: string) => {
    const newSelected = selectedMonths.includes(monthValue)
      ? selectedMonths.filter(item => item !== monthValue)
      : [...selectedMonths, monthValue];
    onMonthChange(newSelected);
  };

  return (
    <div className="flex flex-wrap gap-2">
      {months.map(month => (
        <Button
          key={month.value}
          variant={selectedMonths.includes(month.value) ? 'default' : 'outline'}
          size="sm"
          onClick={() => handleMonthClick(month.value)}
          className="w-full sm:w-auto"
        >
          {month.label}
        </Button>
      ))}
    </div>
  );
}
