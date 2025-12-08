'use client';

import { HelpCircle } from 'lucide-react';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { useHelp } from '@/context/help-context';
import { Button } from './button';

interface HelpTooltipProps {
  content: React.ReactNode;
}

export function HelpTooltip({ content }: HelpTooltipProps) {
  const { helpEnabled } = useHelp();

  if (!helpEnabled) {
    return null;
  }

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" className="h-6 w-6 shrink-0 cursor-help text-destructive hover:bg-destructive/10">
          <HelpCircle className="h-4 w-4" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80">
        <p className="text-sm">{content}</p>
      </PopoverContent>
    </Popover>
  );
}
