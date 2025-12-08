
'use client';

import { useState, useRef, MouseEvent } from 'react';
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
import { Loader2, Shield, Users, Eye, EyeOff } from 'lucide-react';
import { useProfile } from '@/context/profile-context';
import { useToast } from '@/hooks/use-toast';

type SelectedProfile = 'admin' | 'observer' | null;

export function ProfileSelector() {
  const { setProfile, validatePass, isLoadingPasses } = useProfile();
  const { toast } = useToast();

  const [selectedProfile, setSelectedProfile] = useState<SelectedProfile>(null);
  const [pass, setPass] = useState('');
  const [showPass, setShowPass] = useState(false);
  const [isChecking, setIsChecking] = useState(false);

  // Secret admin login state
  const [clickCount, setClickCount] = useState(0);
  const clickTimeoutRef = useRef<NodeJS.Timeout | null>(null);

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

  const handleSecretClick = () => {
    if (clickTimeoutRef.current) {
      clearTimeout(clickTimeoutRef.current);
    }

    const newClickCount = clickCount + 1;
    setClickCount(newClickCount);

    if (newClickCount === 3) {
      toast({
        title: 'Acesso Secreto',
        description: 'Perfil de Administrador ativado.',
      });
      setProfile('admin');
      setClickCount(0);
    } else {
      clickTimeoutRef.current = setTimeout(() => {
        setClickCount(0);
      }, 1000); // Reset after 1 second
    }
  };


  return (
    <div className="flex h-screen w-full items-center justify-center bg-background text-foreground">
        <div className="w-full max-w-lg p-4">
            <div className="text-center mb-12">
                <h1 className="text-3xl font-bold">
                    Selecione seu Perfi
                    <span className="cursor-pointer" onClick={handleSecretClick}>l</span>
                </h1>
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
                    <div className="relative">
                        <Input
                            id="pass-input"
                            type={showPass ? 'text' : 'password'}
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
                            className="pr-10"
                        />
                        <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className="absolute inset-y-0 right-0 h-full px-3 text-muted-foreground hover:bg-transparent"
                            onClick={() => setShowPass((prev) => !prev)}
                        >
                            {showPass ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                        </Button>
                    </div>
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
