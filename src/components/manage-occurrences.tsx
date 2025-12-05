'use client';

import { useState, type FormEvent } from 'react';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { Plus, Trash2 } from 'lucide-react';
import { Separator } from './ui/separator';

export function ManageOccurrences() {
  const { toast } = useToast();
  const [occurrenceTypes, setOccurrenceTypes] = useState<string[]>([
    'Queda de mesmo nível',
    'Corte',
    'Contato com produto químico',
  ]);
  const [newType, setNewType] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleAddType = (e: FormEvent) => {
    e.preventDefault();
    if (!newType.trim()) {
      toast({
        variant: 'destructive',
        title: 'Campo vazio',
        description: 'Por favor, digite um tipo de ocorrência.',
      });
      return;
    }
    if (occurrenceTypes.includes(newType.trim())) {
      toast({
        variant: 'destructive',
        title: 'Tipo duplicado',
        description: 'Este tipo de ocorrência já existe.',
      });
      return;
    }

    setIsLoading(true);
    // Simulating an API call
    setTimeout(() => {
      setOccurrenceTypes((prev) => [...prev, newType.trim()]);
      setNewType('');
      toast({
        title: 'Sucesso!',
        description: `O tipo "${newType.trim()}" foi adicionado.`,
      });
      setIsLoading(false);
    }, 500);
  };

  const handleRemoveType = (typeToRemove: string) => {
    setOccurrenceTypes((prev) => prev.filter((type) => type !== typeToRemove));
    toast({
      title: 'Removido',
      description: `O tipo "${typeToRemove}" foi removido.`,
    });
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Tipos de Ocorrência</CardTitle>
        <CardDescription>
          Adicione ou remova os tipos de ocorrência que podem ser registrados
          no sistema.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleAddType} className="flex items-end gap-4">
          <div className="w-full space-y-2">
            <Label htmlFor="new-occurrence-type">
              Novo Tipo de Ocorrência
            </Label>
            <Input
              id="new-occurrence-type"
              placeholder="Ex: Incêndio"
              value={newType}
              onChange={(e) => setNewType(e.target.value)}
              disabled={isLoading}
            />
          </div>
          <Button type="submit" disabled={isLoading}>
            <Plus className="mr-2 h-4 w-4" />
            {isLoading ? 'Adicionando...' : 'Adicionar'}
          </Button>
        </form>

        <Separator className="my-6" />

        <div>
          <h3 className="mb-4 text-lg font-medium">Tipos Existentes</h3>
          {occurrenceTypes.length > 0 ? (
            <ul className="space-y-3">
              {occurrenceTypes.map((type) => (
                <li
                  key={type}
                  className="flex items-center justify-between rounded-md border bg-card p-3"
                >
                  <span className="text-sm font-medium">{type}</span>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => handleRemoveType(type)}
                    className="h-8 w-8 text-muted-foreground hover:text-destructive"
                    aria-label={`Remover ${type}`}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-center text-sm text-muted-foreground">
              Nenhum tipo de ocorrência cadastrado.
            </p>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
