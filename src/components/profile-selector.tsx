
'use client';

import { useState } from 'react';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from './ui/button';
import { Loader2, Shield, Users } from 'lucide-react';
import { useProfile } from '@/context/profile-context';
import { useToast } from '@/hooks/use-toast';

type SelectedProfile = 'admin' | 'observer' | null;

export function ProfileSelector() {
  const { validatePass, isLoadingPasses } = useProfile();
  const { toast } = useToast();

  const [selectedProfile, setSelectedProfile] = useState<SelectedProfile>(null);
  const [pass, setPass] = useState('');
  const [isChecking, setIsChecking] = useState(false);

  const handleProfileSelect = (profile: SelectedProfile) => {
    if (isLoadingPasses) return;
    setSelectedProfile(profile);
    setPass('');
  };
  
  const handlePassSubmit = async () => {
    if (!selectedProfile) return;
    
    setIsChecking(true);
    const isValid = await validatePass(selectedProfile, pass);
    setIsChecking(false);

    if (isValid) {
        setSelectedProfile(null);
    } else {
        toast({
            variant: 'destructive',
            title: 'Passe Inválido',
            description: 'O passe inserido está incorreto. Tente novamente.'
        });
        setPass('');
    }
  };

  const handlePassChange = (value: string) => {
    const numericValue = value.replace(/\D/g, '');
    if (numericValue.length <= 6) {
      setPass(numericValue);
    }
  };


  return (
    <div className="flex h-screen w-full items-center justify-center bg-background text-foreground">
        <div className="w-full max-w-lg p-4">
            <div className="text-center mb-8">
                <h1 className="text-3xl font-bold">Selecione seu Perfil</h1>
                <p className="text-muted-foreground">Escolha como você quer acessar o sistema.</p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <Card 
                    className="cursor-pointer hover:bg-card/80 hover:border-primary/50 transition-all"
                    onClick={() => handleProfileSelect('admin')}
                >
                    <CardContent className="flex flex-col items-center justify-center p-6 gap-4">
                        <Shield className="h-12 w-12 text-primary" />
                        <span className="text-lg font-semibold">Administrador</span>
                    </CardContent>
                </Card>
                 <Card 
                    className="cursor-pointer hover:bg-card/80 hover:border-primary/50 transition-all"
                    onClick={() => handleProfileSelect('observer')}
                >
                    <CardContent className="flex flex-col items-center justify-center p-6 gap-4">
                        <Users className="h-12 w-12 text-primary" />
                        <span className="text-lg font-semibold">Observador</span>
                    </CardContent>
                </Card>
            </div>
             {isLoadingPasses && (
                <div className='text-center mt-4 flex items-center justify-center gap-2 text-muted-foreground'>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    <span>Carregando passes...</span>
                </div>
            )}
        </div>

        <AlertDialog open={!!selectedProfile} onOpenChange={() => setSelectedProfile(null)}>
            <AlertDialogContent>
                <AlertDialogHeader>
                    <AlertDialogTitle>Acesso de {selectedProfile === 'admin' ? 'Administrador' : 'Observador'}</AlertDialogTitle>
                    <AlertDialogDescription>
                        Por favor, insira o passe de 6 dígitos para continuar.
                    </AlertDialogDescription>
                </AlertDialogHeader>
                <div className="space-y-2 py-2">
                    <Label htmlFor="pass-input">Passe</Label>
                    <Input
                        id="pass-input"
                        type="password"
                        maxLength={6}
                        value={pass}
                        onChange={(e) => handlePassChange(e.target.value)}
                        placeholder="••••••"
                        autoFocus
                        onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                                e.preventDefault();
                                handlePassSubmit();
                            }
                        }}
                    />
                </div>
                <AlertDialogFooter>
                    <AlertDialogCancel>Cancelar</AlertDialogCancel>
                    <AlertDialogAction onClick={handlePassSubmit} disabled={isChecking || pass.length !== 6}>
                         {isChecking && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        Entrar
                    </AlertDialogAction>
                </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>
    </div>
  );
}
