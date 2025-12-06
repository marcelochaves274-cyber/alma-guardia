'use client';

import { useState } from 'react';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  CardFooter
} from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { cn } from '@/lib/utils';
import { Calendar as CalendarIcon } from 'lucide-react';
import { format } from 'date-fns';

export function RegisterOccurrence() {
  const [occurrenceDate, setOccurrenceDate] = useState<Date>();
  const [birthDate, setBirthDate] = useState<Date>();

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle>Registro de Ocorrência</CardTitle>
        <CardDescription>
          Preencha os campos abaixo para registrar um novo acidente ou incidente.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-8">
        <div className="flex flex-wrap gap-6">
          <div className="flex-1 min-w-64 space-y-2">
            <Label htmlFor="occurrence-date">Data da Ocorrência</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant={'outline'}
                  className={cn(
                    'w-full justify-start text-left font-normal',
                    !occurrenceDate && 'text-muted-foreground'
                  )}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {occurrenceDate ? (
                    format(occurrenceDate, 'PPP')
                  ) : (
                    <span>Escolha uma data</span>
                  )}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0">
                <Calendar
                  mode="single"
                  selected={occurrenceDate}
                  onSelect={setOccurrenceDate}
                  initialFocus
                />
              </PopoverContent>
            </Popover>
          </div>
          <div className="flex-1 min-w-64 space-y-2">
            <Label htmlFor="occurrence-type">Tipo de Ocorrência</Label>
            <Input
              id="occurrence-type"
              placeholder="Ex: Queda, Corte, Incêndio"
            />
          </div>
        </div>
        <div className="space-y-2">
          <Label htmlFor="description">Descrição da Ocorrência</Label>
          <Textarea
            id="description"
            placeholder="Descreva detalhadamente o que aconteceu."
            className="min-h-[100px]"
          />
        </div>

        <div className="text-center">
            <h3 className="text-lg font-semibold text-foreground">Informação da Pessoa Envolvida</h3>
        </div>

        <div className="flex flex-wrap gap-6">
            <div className="flex-1 min-w-64 space-y-2">
                <Label htmlFor="full-name">Nome Completo</Label>
                <Input id="full-name" placeholder="Nome completo do envolvido" />
            </div>
             <div className="flex-1 min-w-64 space-y-2">
                <Label htmlFor="birth-date">Data de Nascimento</Label>
                <Popover>
                <PopoverTrigger asChild>
                    <Button
                    variant={'outline'}
                    className={cn(
                        'w-full justify-start text-left font-normal',
                        !birthDate && 'text-muted-foreground'
                    )}
                    >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {birthDate ? (
                        format(birthDate, 'PPP')
                    ) : (
                        <span>Escolha uma data</span>
                    )}
                    </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0">
                    <Calendar
                    mode="single"
                    selected={birthDate}
                    onSelect={setBirthDate}
                    captionLayout="dropdown-buttons"
                    fromYear={1930}
                    toYear={new Date().getFullYear()}
                    initialFocus
                    />
                </PopoverContent>
                </Popover>
            </div>
             <div className="flex-1 min-w-64 space-y-2">
                <Label htmlFor="cpf">CPF</Label>
                <Input id="cpf" placeholder="000.000.000-00" />
            </div>
             <div className="flex-1 min-w-64 space-y-2">
                <Label htmlFor="city">Cidade</Label>
                <Input id="city" placeholder="Cidade de residência" />
            </div>
            <div className="flex-1 min-w-64 space-y-2">
                <Label htmlFor="state">Estado</Label>
                <Input id="state" placeholder="UF" />
            </div>
            <div className="flex-1 min-w-64 space-y-2">
                <Label htmlFor="phone">Fone</Label>
                <Input id="phone" placeholder="(00) 00000-0000" />
            </div>
        </div>
        <div className="space-y-2">
            <Label htmlFor="occurrence-location">Local da Ocorrência</Label>
            <Input id="occurrence-location" placeholder="Setor, máquina, área, etc." />
        </div>
        <div className="flex flex-wrap gap-6">
             <div className="flex-1 min-w-64 space-y-3">
                <Label>Faixa Etária</Label>
                <Select>
                    <SelectTrigger>
                        <SelectValue placeholder="Selecione a faixa etária" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="crianca">Criança (0-12 anos)</SelectItem>
                        <SelectItem value="adolescente">Adolescente (13-17 anos)</SelectItem>
                        <SelectItem value="adulto1">Adulto (18-39 anos)</SelectItem>
                        <SelectItem value="adulto2">Adulto (40-59 anos)</SelectItem>
                        <SelectItem value="idoso">Idoso (60+ anos)</SelectItem>
                    </SelectContent>
                </Select>
            </div>
            <div className="flex-1 min-w-64 space-y-3">
                <Label>Análise da Ocorrência</Label>
                <RadioGroup className="flex items-center space-x-4 pt-2">
                    <div className="flex items-center space-x-2">
                        <RadioGroupItem value="alta" id="alta" className="border-red-500 text-red-500 focus:ring-red-500" />
                        <Label htmlFor="alta" className="font-bold text-red-500">Alta</Label>
                    </div>
                    <div className="flex items-center space-x-2">
                        <RadioGroupItem value="media" id="media" className="border-orange-500 text-orange-500 focus:ring-orange-500" />
                        <Label htmlFor="media" className="font-bold text-orange-500">Média</Label>
                    </div>
                    <div className="flex items-center space-x-2">
                        <RadioGroupItem value="baixa" id="baixa" className="border-yellow-500 text-yellow-500 focus:ring-yellow-500" />
                        <Label htmlFor="baixa" className="font-bold text-yellow-500">Baixa</Label>
                    </div>
                </RadioGroup>
            </div>
        </div>
      </CardContent>
      <CardFooter>
        <Button className="w-full">Salvar Ocorrência</Button>
      </CardFooter>
    </Card>
  );
}
