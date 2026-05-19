'use client';

import { useState, type FormEvent } from 'react';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Separator } from '@/components/ui/separator';
import { handleSuggestCapabilities } from '@/app/actions';
import { Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

const sgsStructure = {
  name: 'ALMA Guardia',
  modules: [
    'Dashboard de Lembretes e Pendências Críticas',
    'Registro e Relatório de Acidentes/Incidentes (Ocorrências)',
    'Tratamento de Riscos com cálculo de Probabilidade e Consequência',
    'Central de Avisos de Campo com evidência fotográfica',
    'Monitoramento Ambiental (Fauna, Flora e Geodiversidade)',
    'Gestão de Inventário e Vistorias de Equipamentos (Lote/CA/UIAA)',
    'Avaliações de Risco Operacional por Local',
    'Registro de Atividades Integrado a POPs e TCRs',
    'Visualização de Documentos SGS (Escopo, Liderança, Operação, RAME)',
    'Relatórios Geográficos (Mapas) e Gráficos de Desempenho',
    'Gerenciamento de Perfis de Acesso (Admin, Supervisor, Observador)',
    'Personalização de Identidade Visual e Temas'
  ],
};

export function SgsConfiguration() {
  const { toast } = useToast();
  const [understanding, setUnderstanding] = useState('');
  const [suggestion, setSuggestion] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSuggestion = async (e: FormEvent) => {
    e.preventDefault();
    if (!understanding.trim()) return;

    setIsLoading(true);
    setSuggestion('');

    try {
      const res = await handleSuggestCapabilities({
        currentSgsDescription: `Nome: ${
          sgsStructure.name
        }, Módulos: ${sgsStructure.modules.join(', ')}`,
        userEvolvingUnderstanding: understanding,
      });
      setSuggestion(res.suggestedCapabilities);
    } catch (error) {
      console.error('Error getting suggestions:', error);
      toast({
        variant: "destructive",
        title: "Erro ao obter sugestões",
        description: "Não foi possível gerar sugestões. Tente novamente.",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Estrutura SGS Atual</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm px-4 sm:px-6">
          <p>
            <strong>Nome:</strong> {sgsStructure.name}
          </p>
          <div>
            <strong>Módulos:</strong>
            <ul className="mt-1 list-disc pl-5">
              {sgsStructure.modules.map((mod) => (
                <li key={mod}>{mod}</li>
              ))}
            </ul>
          </div>
        </CardContent>
      </Card>

      <Separator />

      <Card>
        <CardHeader>
          <CardTitle>Ajuste de Requisitos</CardTitle>
          <CardDescription>
            Peça à IA para sugerir novas capacidades para o seu SGS.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSuggestion} className="space-y-4">
            <Textarea
              value={understanding}
              onChange={(e) => setUnderstanding(e.target.value)}
              placeholder="Descreva suas novas ideias ou necessidades..."
              className="min-h-[100px]"
              disabled={isLoading}
            />
            <Button type="submit" className="w-full" disabled={isLoading || !understanding.trim()}>
              {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {isLoading ? 'Gerando...' : 'Obter Sugestões'}
            </Button>
          </form>
        </CardContent>
        {suggestion && (
          <CardContent>
            <Separator className="my-4" />
            <h4 className="mb-2 font-semibold">Sugestões da IA:</h4>
            <div className="whitespace-pre-wrap rounded-md bg-muted p-3 text-sm">
              {suggestion}
            </div>
          </CardContent>
        )}
      </Card>
    </div>
  );
}
