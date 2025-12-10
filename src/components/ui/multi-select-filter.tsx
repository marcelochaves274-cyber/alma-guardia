"use client"

import * as React from "react"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { ScrollArea } from "@/components/ui/scroll-area"
import { cn } from "@/lib/utils"
import { ChevronDown } from "lucide-react"

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
        <ScrollArea className="max-h-60">
          <div className="p-1">
            {options.map((option) => (
              <div
                key={option.value}
                className="flex items-center space-x-2 p-2 hover:bg-accent rounded-md cursor-pointer"
                onClick={() => handleSelect(option.value)}
              >
                <Checkbox
                  id={`check-${option.value}-${placeholder.replace(/\s/g, "")}`}
                  checked={selected.includes(option.value)}
                  onCheckedChange={() => handleSelect(option.value)}
                  className="h-4 w-4"
                />
                <label
                  htmlFor={`check-${option.value}-${placeholder.replace(
                    /\s/g,
                    ""
                  )}`}
                  className="w-full text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
                >
                  {option.label}
                </label>
              </div>
            ))}
          </div>
        </ScrollArea>
      </PopoverContent>
    </Popover>
  )
}
