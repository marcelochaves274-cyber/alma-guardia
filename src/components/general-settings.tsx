'use client';

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
import { useState, useEffect } from 'react';
import { useToast } from '@/hooks/use-toast';
import { Loader2 } from 'lucide-react';
import { useFirestore, useUser } from '@/firebase';
import { doc, getDoc, setDoc } from 'firebase/firestore';

export function GeneralSettings() {
  const { toast } = useToast();
  const firestore = useFirestore();
  const { user, isLoading: isUserLoading } = useUser();
  
  const [appName, setAppName] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    let isMounted = true;
    if (isUserLoading) {
      return; // Wait for user status to be resolved
    }
    if (!user || !firestore) {
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    const settingsDocRef = doc(firestore, 'users', user.uid, 'settings', 'appDetails');
    getDoc(settingsDocRef)
      .then((docSnap) => {
        if (isMounted && docSnap.exists()) {
          setAppName(docSnap.data().name || '');
        }
      })
      .catch((error) => {
        console.error('Error fetching app settings:', error);
        toast({
          variant: 'destructive',
          title: 'Erro ao carregar',
          description: 'Não foi possível buscar as configurações salvas.',
        });
      })
      .finally(() => {
        if (isMounted) {
          setIsLoading(false);
        }
      });
    
    return () => { isMounted = false };
  }, [user, isUserLoading, firestore, toast]);

  const handleSave = async () => {
    if (!firestore || !user) {
      toast({
        variant: 'destructive',
        title: 'Erro de Autenticação',
        description: 'Você precisa estar logado para salvar.',
      });
      return;
    }

    setIsSaving(true);
    try {
      const settingsDocRef = doc(firestore, 'users', user.uid, 'settings', 'appDetails');
      await setDoc(settingsDocRef, { name: appName }, { merge: true });
      toast({
        title: 'Sucesso!',
        description: 'O nome da empresa/usuário foi salvo.',
      });
    } catch (error) {
      console.error('Error saving app name:', error);
      toast({
        variant: 'destructive',
        title: 'Erro ao salvar',
        description: 'Não foi possível salvar o nome. Verifique as regras de segurança do Firestore.',
      });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Card className="w-full">
       <CardHeader>
          <CardTitle>Configurações Gerais</CardTitle>
          <CardDescription>
            Gerencie as configurações gerais do seu aplicativo.
          </CardDescription>
        </CardHeader>
      {isLoading ? (
        <CardContent>
          <div className="flex items-center space-x-4">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
            <p>Carregando configurações...</p>
          </div>
        </CardContent>
      ) : (
        <>
          <CardContent>
            <div className="space-y-2">
              <Label htmlFor="app-name">Nome da Empresa/Usuário</Label>
              <Input
                id="app-name"
                value={appName}
                onChange={(e) => setAppName(e.target.value)}
                placeholder="Digite o nome da sua empresa ou usuário"
                disabled={isSaving}
              />
            </div>
          </CardContent>
          <CardFooter className="border-t px-6 py-4">
            <Button onClick={handleSave} disabled={isSaving}>
              {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {isSaving ? 'Salvando...' : 'Salvar Nome'}
            </Button>
          </CardFooter>
        </>
      )}
    </Card>
  );
}
