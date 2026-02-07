
'use client';

import { useState, useEffect, useCallback } from 'react';
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
import { Button } from '@/components/ui/button';
import { Eye, EyeOff, Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Separator } from './ui/separator';
import { useFirestore, useUser } from '@/firebase';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { Skeleton } from './ui/skeleton';

export function ManageProfile() {
  const { toast } = useToast();
  const firestore = useFirestore();
  const { user, isUserLoading } = useUser();

  const [adminPass, setAdminPass] = useState('');
  const [supervisorPass, setSupervisorPass] = useState('');
  const [showAdminPass, setShowAdminPass] = useState(false);
  const [showSupervisorPass, setShowSupervisorPass] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  const getSettingsDocRef = useCallback(() => {
    if (!firestore || !user) return null;
    return doc(firestore, 'sgs_genius', user.uid, 'settings', 'profiles');
  }, [firestore, user]);
  
  useEffect(() => {
    let isMounted = true;
    if (isUserLoading || !user || !firestore) {
      if(!isUserLoading) setIsLoading(false);
      return;
    }

    const fetchPasses = async () => {
        const docRef = getSettingsDocRef();
        if (!docRef) {
            if(isMounted) setIsLoading(false);
            return;
        }

        try {
            const docSnap = await getDoc(docRef);
            if (isMounted && docSnap.exists()) {
                const data = docSnap.data();
                setAdminPass(data.adminPass || '');
                setSupervisorPass(data.supervisorPass || '');
            }
        } catch (error: any) {
             if (isMounted && error.code !== 'permission-denied') {
                console.error("Error fetching passes:", error);
                toast({ variant: "destructive", title: "Erro ao carregar", description: "Não foi possível buscar os passes." });
             }
        } finally {
            if (isMounted) setIsLoading(false);
        }
    };
    
    fetchPasses();
    return () => { isMounted = false; }
  }, [isUserLoading, user, firestore, getSettingsDocRef, toast]);


  const handlePassChange = (value: string, setter: (val: string) => void) => {
    const numericValue = value.replace(/\D/g, '');
    if (numericValue.length <= 6) {
      setter(numericValue);
    }
  };

  const handleSave = async () => {
    const docRef = getSettingsDocRef();
    if (!docRef) {
      toast({ variant: 'destructive', title: 'Erro', description: 'Usuário não autenticado.' });
      return;
    }

    setIsSaving(true);
    try {
        await setDoc(docRef, { adminPass, supervisorPass }, { merge: true });
        toast({ title: 'Sucesso!', description: 'Os passes foram salvos.' });
    } catch (error) {
        console.error('Error saving passes:', error);
        toast({ variant: 'destructive', title: 'Erro ao salvar', description: 'Não foi possível salvar os passes.' });
    } finally {
        setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
        <Card>
            <CardHeader>
                <CardTitle>Gerenciar Perfis</CardTitle>
                <CardDescription>Defina os passes de 6 dígitos para os perfis de Administrador e Supervisor.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-8">
                <Skeleton className="h-24 w-full" />
                <Separator />
                <Skeleton className="h-24 w-full" />
            </CardContent>
            <CardFooter className="flex justify-end">
                <Skeleton className="h-10 w-32" />
            </CardFooter>
        </Card>
    );
  }


  return (
    <Card>
      <CardHeader>
        <CardTitle>Gerenciar Perfis</CardTitle>
        <CardDescription>
          Defina os passes de 6 dígitos para os perfis de Administrador e Supervisor.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-8">
        <div className="space-y-4">
            <h3 className="font-semibold text-lg">Perfil Administrador</h3>
            <div className="space-y-2">
              <Label htmlFor="admin-pass">Passe</Label>
               <div className="relative">
                <Input
                  id="admin-pass"
                  type={showAdminPass ? 'text' : 'password'}
                  value={adminPass}
                  onChange={(e) => handlePassChange(e.target.value, setAdminPass)}
                  maxLength={6}
                  autoComplete="new-password"
                  className="pr-10"
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="absolute inset-y-0 right-0 h-full px-3 text-muted-foreground hover:bg-transparent"
                  onClick={() => setShowAdminPass((prev) => !prev)}
                >
                  {showAdminPass ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                </Button>
              </div>
            </div>
        </div>

        <Separator />

         <div className="space-y-4">
            <h3 className="font-semibold text-lg">Perfil Supervisor</h3>
            <div className="space-y-2">
              <Label htmlFor="supervisor-pass">Passe</Label>
              <div className="relative">
                <Input
                  id="supervisor-pass"
                  type={showSupervisorPass ? 'text' : 'password'}
                  value={supervisorPass}
                  onChange={(e) => handlePassChange(e.target.value, setSupervisorPass)}
                  maxLength={6}
                  autoComplete="new-password"
                  className="pr-10"
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="absolute inset-y-0 right-0 h-full px-3 text-muted-foreground hover:bg-transparent"
                  onClick={() => setShowSupervisorPass((prev) => !prev)}
                >
                  {showSupervisorPass ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                </Button>
              </div>
            </div>
        </div>
      </CardContent>
      <CardFooter className='flex-col items-end gap-4'>
        <p className="text-sm text-muted-foreground">Após salvar os passes, atualize sua pagina.</p>
        <Button onClick={handleSave} disabled={isSaving || adminPass.length !== 6 || supervisorPass.length !== 6}>
           {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
           Salvar Passes
        </Button>
      </CardFooter>
    </Card>
  );
}

    