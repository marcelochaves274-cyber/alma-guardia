'use client';

import { useState } from 'react';
import { useFirestore, useUser } from '@/firebase';
import { collection, getDocs, writeBatch } from 'firebase/firestore';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { Loader2 } from 'lucide-react';

export function DataMigrationScript() {
  const firestore = useFirestore();
  const { user } = useUser();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [updatedCount, setUpdatedCount] = useState<number | null>(null);

  const runMigration = async () => {
    if (!firestore || !user) {
      toast({
        variant: 'destructive',
        title: 'Erro de Autenticação',
        description: 'Usuário não autenticado. Faça login e tente novamente.',
      });
      return;
    }

    setIsLoading(true);
    setUpdatedCount(null);

    try {
      const collectionRef = collection(firestore, 'sgs_genius', user.uid, 'fauna_flora_geo');
      const querySnapshot = await getDocs(collectionRef);
      
      const batch = writeBatch(firestore);
      let documentsToUpdateCount = 0;

      querySnapshot.forEach((doc) => {
        const data = doc.data();

        // A condição principal: o documento tem 'mapMarker' mas NÃO tem 'location'.
        if (data.mapMarker && !data.location) {
          const newLocation = {
            mapType: 'ludico',
            ludico: data.mapMarker,
          };

          // Adiciona a operação de atualização ao lote
          batch.update(doc.ref, { location: newLocation });
          documentsToUpdateCount++;
        }
      });

      if (documentsToUpdateCount > 0) {
        await batch.commit();
        console.log(`Migração concluída! ${documentsToUpdateCount} documentos foram atualizados.`);
        toast({
          title: 'Migração Concluída!',
          description: `${documentsToUpdateCount} registros foram atualizados com sucesso.`,
        });
        setUpdatedCount(documentsToUpdateCount);
      } else {
        console.log('Nenhum documento precisou de atualização.');
        toast({
          title: 'Nenhuma Ação Necessária',
          description: 'Todos os seus registros já estão no formato mais recente.',
        });
        setUpdatedCount(0);
      }

    } catch (error) {
      console.error("Erro durante a migração de dados:", error);
      toast({
        variant: 'destructive',
        title: 'Erro na Migração',
        description: 'Ocorreu um erro ao atualizar os documentos. Verifique o console para mais detalhes.',
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Card className="w-full max-w-lg mx-auto border-amber-500 bg-amber-50/30">
      <CardHeader>
        <CardTitle>Script de Migração de Dados</CardTitle>
        <CardDescription>
          Este script atualizará os registros antigos de 'Fauna, Flora & Geo' para o novo formato de localização. Execute apenas uma vez.
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col items-center gap-4">
        <Button onClick={runMigration} disabled={isLoading} className="w-full">
          {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
          {isLoading ? 'Executando...' : 'Iniciar Migração'}
        </Button>
        {updatedCount !== null && (
          <p className="text-sm font-medium text-green-700">
            {updatedCount} documentos foram verificados e atualizados.
          </p>
        )}
      </CardContent>
    </Card>
  );
}