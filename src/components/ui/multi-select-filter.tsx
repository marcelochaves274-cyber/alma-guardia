"use client"

import * as React from "react"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { ScrollArea } from "@/components/ui/scroll-area"
import { cn } from "@/lib/utils"
import { ChevronDown } from "lucide-react"
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command"

interface MultiSelectFilterProps {
  placeholder: string
  options: { value: string; label: string }[]
  selected: string[]
  onChange: (selected: string[]) => void
  disabled?: boolean
}

export function MultiSelectFilter({
  placeholder,
  options,
  selected,
  onChange,
  disabled,
}: MultiSelectFilterProps) {
  const [isOpen, setIsOpen] = React.useState(false)

  const handleSelect = React.useCallback(
    (value: string) => {
      const newSelected = selected.includes(value)
        ? selected.filter((item) => item !== value)
        : [...selected, value]
      onChange(newSelected)
    },
    [selected, onChange]
  )

  const getButtonText = () => {
    if (selected.length === 0) return placeholder
    if (selected.length === options.length) return "Todos selecionados"
    if (selected.length === 1) {
      const option = options.find((o) => o.value === selected[0])
      return option?.label || placeholder
    }
    return `${selected.length} selecionados`
  }

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
        <Command>
            <CommandInput placeholder="Buscar..." />
            <CommandList>
                <ScrollArea className="max-h-60">
                    <CommandEmpty>Nenhum resultado.</CommandEmpty>
                    <CommandGroup>
                        {options.map((option) => (
                        <CommandItem
                            key={option.value}
                            onSelect={() => handleSelect(option.value)}
                            className="cursor-pointer"
                        >
                            <Checkbox
                            checked={selected.includes(option.value)}
                            className="mr-2 h-4 w-4"
                            />
                            <span className="truncate">{option.label}</span>
                        </CommandItem>
                        ))}
                    </CommandGroup>
                </ScrollArea>
            </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  )
}
