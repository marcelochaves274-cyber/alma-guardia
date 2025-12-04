'use client';

import { useState, useEffect } from 'react';
import {
  getAuth,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
} from 'firebase/auth';
import { useRouter } from 'next/navigation';
import { useFirebaseApp, useUser } from '@/firebase';
import { Button } from '@/components/ui/button';
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
import { SgsGeniusLogo } from '@/components/icons';
import { useToast } from '@/hooks/use-toast';
import { Loader2 } from 'lucide-react';

export default function LoginPage() {
  const firebaseApp = useFirebaseApp();
  const { user, isLoading: isUserLoading } = useUser();
  const router = useRouter();
  const { toast } = useToast();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  
  const [isAuthLoading, setIsAuthLoading] = useState(false);

  useEffect(() => {
    if (!isUserLoading && user) {
      router.push('/');
    }
  }, [user, isUserLoading, router]);

  const handleEmailAuth = async (authAction: 'login' | 'register') => {
    if (!firebaseApp) return;
    setIsAuthLoading(true);
    const auth = getAuth(firebaseApp);
    try {
      if (authAction === 'login') {
        await signInWithEmailAndPassword(auth, email, password);
      } else {
        await createUserWithEmailAndPassword(auth, email, password);
      }
      router.push('/');
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: 'Erro de Autenticação',
        description: error.message,
      });
    } finally {
        setIsAuthLoading(false);
    }
  };
  
  const isLoading = isUserLoading;

  if (isLoading) {
    return (
      <div className="flex h-screen w-full items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  // If user is loaded and exists, we shouldn't show the login page
  if (user) {
    return null;
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4">
      <Card className="w-full max-w-sm">
        <CardHeader className="text-center">
          <div className="mb-4 flex justify-center">
            <SgsGeniusLogo className="h-12 w-12 text-primary" />
          </div>
          <CardTitle className="text-2xl">Bem-vindo ao SGS Genius</CardTitle>
          <CardDescription>
            Entre ou crie uma conta para continuar
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              placeholder="seu@email.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              disabled={isAuthLoading}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="password">Senha</Label>
            <Input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              disabled={isAuthLoading}
            />
          </div>
        </CardContent>
        <CardFooter className="flex-col gap-4">
          <div className="flex w-full gap-2">
            <Button
              onClick={() => handleEmailAuth('login')}
              disabled={isAuthLoading || !email || !password}
              className="w-full"
            >
              {isAuthLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Entrar
            </Button>
            <Button
              variant="secondary"
              onClick={() => handleEmailAuth('register')}
              disabled={isAuthLoading || !email || !password}
              className="w-full"
            >
              {isAuthLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Criar Conta
            </Button>
          </div>
        </CardFooter>
      </Card>
    </div>
  );
}
