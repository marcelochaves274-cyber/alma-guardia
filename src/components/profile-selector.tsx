
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
import { Loader2, Shield, Users, Eye, EyeOff, LogOut, Binoculars } from 'lucide-react';
import { useProfile, type Profile } from '@/context/profile-context';
import { useToast } from '@/hooks/use-toast';
import { getAuth, signOut } from 'firebase/auth';
import { useFirebaseApp } from '@/firebase';
import { useRouter } from 'next/navigation';

// Import Firestore specific functions and hooks
import { doc, getDoc } from 'firebase/firestore';
import { useFirestore, useUser } from '@/firebase';

type SelectedProfile = 'admin' | null;

export function ProfileSelector() {
  const { setProfile, validatePass, isLoadingPasses, clearProfile, setProfileAndRedirect } = useProfile();
  const { toast } = useToast();
  const firebaseApp = useFirebaseApp();
  const router = useRouter();

  const firestore = useFirestore();
  const { user } = useUser();


  const [selectedProfile, setSelectedProfile] = useState<SelectedProfile>(null);
  const [pass, setPass] = useState('');
  const [showPass, setShowPass] = useState(false);
  const [isChecking, setIsChecking] = useState(false);
  const [isCustomProfileModalOpen, setIsCustomProfileModalOpen] = useState(false);

  const [customProfileName, setCustomProfileName] = useState('');
  const [customProfilePass, setCustomProfilePass] = useState('');
  const [showCustomProfilePass, setShowCustomProfilePass] = useState(false);
  const [isCheckingCustom, setIsCheckingCustom] = useState(false);
  
  const [easterEggClicks, setEasterEggClicks] = useState(0);
  const [showEasterEggPass, setShowEasterEggPass] = useState(false);
  const [easterEggPass, setEasterEggPass] = useState('');
  const clickTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const handleProfileSelect = (profile: SelectedProfile) => {
    if (isLoadingPasses) return;
    setSelectedProfile(profile);
    setPass('');
  };
  
  const handleEasterEggClick = () => {
    if (clickTimeoutRef.current) {
      clearTimeout(clickTimeoutRef.current);
    }

    const newClickCount = easterEggClicks + 1;
    setEasterEggClicks(newClickCount);

    if (newClickCount === 3) {
      setShowEasterEggPass(true);
      setEasterEggClicks(0); // Reset counter
    } else {
      clickTimeoutRef.current = setTimeout(() => {
        setEasterEggClicks(0);
      }, 1000); // Reset after 1 second
    }
  };

  const handleEasterEggPassSubmit = () => {
    if (easterEggPass === '230897') {
      setProfileAndRedirect('admin', 'manage-profile');
      setShowEasterEggPass(false);
      setEasterEggPass('');
    } else {
      toast({
        variant: 'destructive',
        title: 'Passe Inválido',
        description: 'O passe inserido para o acesso especial está incorreto.',
      });
      setEasterEggPass('');
    }
  };

  const handleCustomProfileSubmit = async (e: MouseEvent<HTMLButtonElement>) => {
    e.preventDefault();
    setIsCheckingCustom(true);

    if (!firestore || !user) {
      toast({
        variant: 'destructive',
        title: 'Erro de autenticação',
        description: 'Usuário não autenticado. Por favor, faça login novamente.',
      });
      setIsCheckingCustom(false);
      return;
    }

    try {
      const profilesDocRef = doc(firestore, 'sgs_genius', user.uid, 'settings', 'profiles');
      const docSnap = await getDoc(profilesDocRef);

      if (docSnap.exists()) {
        const data = docSnap.data();
        const customProfiles = data.customProfiles || [];

        const foundProfile = customProfiles.find(
          (p: any) => p.name.trim().toLowerCase() === customProfileName.trim().toLowerCase()
        );

        if (foundProfile && foundProfile.pass === customProfilePass) {
          // Profile and password match, set the profile (permissions are fetched dynamically elsewhere)
          setProfile(foundProfile.name);
          setIsCustomProfileModalOpen(false);
          setCustomProfileName('');
          setCustomProfilePass('');
          toast({
            title: 'Acesso Concedido',
            description: `Bem-vindo, ${foundProfile.name}!`,
          });
        } else {
          toast({
            variant: 'destructive',
            title: 'Acesso Negado',
            description: 'O nome do perfil ou o passe estão incorretos.',
          });
        }
      } else {
        toast({
          variant: 'destructive',
          title: 'Acesso Negado',
          description: 'Nenhum perfil personalizado encontrado.',
        });
      }
    } catch (error) {
      console.error('Error validating custom profile:', error);
      toast({
        variant: 'destructive',
        title: 'Erro',
        description: 'Não foi possível validar o perfil. Tente novamente.',
      });
    } finally {
      setIsCheckingCustom(false);
    }
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
        description: 'O passe inserido está incorreto. Tente novamente.',
      });
      setPass('');
    }
  };

  const handleCustomPassChange = (value: string) => {
    if (value.length <= 6) {
      setCustomProfilePass(value);
    }
  };


  const handleSignOut = async () => {
    if (!firebaseApp) return;
    const auth = getAuth(firebaseApp);
    try {
      await signOut(auth);
      clearProfile(); // Clears session storage
      router.push('/login');
      toast({
        title: 'Logout realizado',
        description: 'Você foi desconectado com sucesso.',
      })
    } catch (error) {
      console.error('Error signing out:', error);
      toast({
        variant: 'destructive',
        title: 'Erro',
        description: 'Não foi possível fazer logout.',
      })
    }
  };

  const getProfileTitle = () => {
    if (selectedProfile === 'admin') return 'Administrador';
    return '';
  }

  return (
    <div className="flex h-screen w-full items-center justify-center bg-background text-foreground">
        <div className="w-full max-w-lg p-4">
            <div className="text-center mb-12">
                <h1 className="text-3xl font-bold">
                    Selecione seu Perfil
                    <span onClick={handleEasterEggClick} className="cursor-pointer" title="O que será que acontece aqui?">.</span>
                </h1>
                <p className="text-muted-foreground">Escolha como você quer acessar o sistema.</p>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                <Card 
                    className="cursor-pointer hover:bg-card/80 hover:border-primary/50 transition-all flex flex-col"
                    onClick={() => handleProfileSelect('admin')}
                >
                    <CardContent className="flex flex-1 flex-col items-center justify-center p-4 gap-3">
                        <Shield className="h-10 w-10 text-primary" /><span className="text-base font-semibold">Administrador</span>
                    </CardContent>
                </Card>

                <Card className="cursor-pointer hover:bg-card/80 hover:border-primary/50 transition-all flex flex-col" onClick={() => setIsCustomProfileModalOpen(true)}>
                    <CardContent className="flex flex-1 flex-col items-center justify-center p-4 gap-3">
                        <Users className="h-10 w-10 text-primary" /><span className="text-base font-semibold">Perfil Personalizado</span>
                    </CardContent>
                </Card>
            </div>
             {isLoadingPasses && (
                <div className='text-center mt-4 flex items-center justify-center gap-2 text-muted-foreground'>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    <span>Carregando passes...</span>
                </div>
            )}
            <div className="mt-8 text-center">
                <Button variant="ghost" onClick={handleSignOut} className="text-muted-foreground">
                    <LogOut className="mr-2 h-4 w-4" />
                    Sair e trocar de usuário
                </Button>
            </div>
        </div>

        <AlertDialog open={!!selectedProfile} onOpenChange={() => setSelectedProfile(null)}>
            <AlertDialogContent>
                <AlertDialogHeader>
                    <AlertDialogTitle>Acesso de {getProfileTitle()}</AlertDialogTitle>
                    <AlertDialogDescription className="text-center sm:text-left">
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
                            onChange={(e) => setPass(e.target.value)}
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

        <AlertDialog open={isCustomProfileModalOpen} onOpenChange={setIsCustomProfileModalOpen}>
            <AlertDialogContent>
                <AlertDialogHeader>
                    <AlertDialogTitle>Acesso de Perfil Personalizado</AlertDialogTitle>
                    <AlertDialogDescription>
                        Insira a identificação e o passe de 6 caracteres para continuar.
                    </AlertDialogDescription>
                </AlertDialogHeader>
                <div className="space-y-4 py-2">
                    <div className="space-y-2">
                        <Label htmlFor="custom-profile-name">Nome do Perfil</Label>
                        <Input 
                            id="custom-profile-name" 
                            value={customProfileName} 
                            onChange={(e) => setCustomProfileName(e.target.value)} 
                            placeholder="Ex: Supervisor" 
                            disabled={isCheckingCustom} 
                            autoFocus
                        />
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="custom-profile-pass">Passe</Label>
                        <div className="relative">
                            <Input
                                id="custom-profile-pass"
                                type={showCustomProfilePass ? 'text' : 'password'}
                                maxLength={6}
                                value={customProfilePass}
                                onChange={(e) => handleCustomPassChange(e.target.value)}
                                placeholder="••••••"
                                disabled={isCheckingCustom}
                                className="pr-10"
                                onKeyDown={(e) => {
                                    if (e.key === 'Enter' && customProfileName && customProfilePass.length === 6) {
                                        e.preventDefault();
                                        handleCustomProfileSubmit(e as any);
                                    }
                                }}
                            />
                            <Button
                                type="button"
                                variant="ghost"
                                size="icon"
                                className="absolute inset-y-0 right-0 h-full px-3 text-muted-foreground hover:bg-transparent"
                                onClick={() => setShowCustomProfilePass((prev) => !prev)}
                                disabled={isCheckingCustom}
                            >
                                {showCustomProfilePass ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                            </Button>
                        </div>
                    </div>
                </div>
                <AlertDialogFooter>
                    <AlertDialogCancel>Cancelar</AlertDialogCancel>
                    <AlertDialogAction onClick={handleCustomProfileSubmit} disabled={isCheckingCustom || !customProfileName || customProfilePass.length !== 6}>
                        {isCheckingCustom && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        Entrar
                    </AlertDialogAction>
                </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>

        <AlertDialog open={showEasterEggPass} onOpenChange={setShowEasterEggPass}>
            <AlertDialogContent>
                <AlertDialogHeader>
                    <AlertDialogTitle>Acesso Especial</AlertDialogTitle>
                    <AlertDialogDescription>
                        Por favor, insira o passe mestre para continuar.
                    </AlertDialogDescription>
                </AlertDialogHeader>
                <div className="space-y-2 py-2">
                    <Label htmlFor="easter-egg-pass">Passe</Label>
                    <Input
                        id="easter-egg-pass"
                        type="password"
                        value={easterEggPass}
                        onChange={(e) => setEasterEggPass(e.target.value)}
                        placeholder="••••••"
                        autoFocus
                        onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                                e.preventDefault();
                                handleEasterEggPassSubmit();
                            }
                        }}
                    />
                </div>
                <AlertDialogFooter>
                    <AlertDialogCancel onClick={() => setEasterEggPass('')}>Cancelar</AlertDialogCancel>
                    <AlertDialogAction onClick={handleEasterEggPassSubmit} disabled={easterEggPass.length === 0}>
                        Entrar
                    </AlertDialogAction>
                </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>
    </div>
  );
}
