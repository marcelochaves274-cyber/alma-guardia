'use client';

import { useState, useEffect } from 'react';
import {
  getAuth,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  GoogleAuthProvider,
  signInWithPopup,
  signInWithRedirect,
  getRedirectResult,
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

function GoogleIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 48 48" {...props}>
      <path
        fill="#FFC107"
        d="M43.611,20.083H42V20H24v8h11.303c-1.649,4.657-6.08,8-11.303,8c-6.627,0-12-5.373-12-12s5.373-12,12-12c3.059,0,5.842,1.154,7.961,3.039l5.657-5.657C34.046,6.053,29.268,4,24,4C12.955,4,4,12.955,4,24s8.955,20,20,20s20-8.955,20-20C44,22.659,43.862,21.35,43.611,20.083z"
      />
      <path
        fill="#FF3D00"
        d="M6.306,14.691l6.571,4.819C14.655,15.108,18.961,12,24,12c3.059,0,5.842,1.154,7.961,3.039l5.657-5.657C34.046,6.053,29.268,4,24,4C16.318,4,9.656,8.337,6.306,14.691z"
      />
      <path
        fill="#4CAF50"
        d="M24,44c5.166,0,9.86-1.977,13.409-5.192l-6.19-5.238C29.211,35.091,26.715,36,24,36c-5.222,0-9.657-3.356-11.303-8H24v-8H11.303C11.642,32.323,17.222,36,24,36z"
      />
      <path
        fill="#1976D2"
        d="M43.611,20.083H42V20H24v8h11.303c-0.792,2.237-2.231,4.166-4.087,5.571l6.19,5.238C42.02,35.636,44,30.138,44,24C44,22.659,43.862,21.35,43.611,20.083z"
      />
    </svg>
  );
}

export default function LoginPage() {
  const firebaseApp = useFirebaseApp();
  const { user, isLoading: isUserLoading } = useUser();
  const router = useRouter();
  const { toast } = useToast();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  
  const [isEmailAuthLoading, setIsEmailAuthLoading] = useState(false);
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);
  const [isCheckingRedirect, setIsCheckingRedirect] = useState(true);

  useEffect(() => {
    if (!firebaseApp) {
      setIsCheckingRedirect(false);
      return;
    }
    const auth = getAuth(firebaseApp);
    getRedirectResult(auth)
      .then((result) => {
        if (result?.user) {
          router.push('/');
        }
      })
      .catch((error) => {
        // This can happen if the user closes the popup or redirects without signing in
        console.warn("Auth redirect error:", error.code);
      })
      .finally(() => {
        setIsCheckingRedirect(false);
      });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [firebaseApp, router]);


  useEffect(() => {
    if (!isUserLoading && user) {
      router.push('/');
    }
  }, [user, isUserLoading, router]);

  const handleEmailAuth = async (authAction: 'login' | 'register') => {
    if (!firebaseApp) return;
    setIsEmailAuthLoading(true);
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
        setIsEmailAuthLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    if (!firebaseApp) return;
    const auth = getAuth(firebaseApp);
    const provider = new GoogleAuthProvider();
    
    setIsGoogleLoading(true);
    try {
      await signInWithPopup(auth, provider);
      router.push('/');
    } catch (error: any) {
      // Handle known error codes gracefully
      if (error.code === 'auth/popup-closed-by-user') {
        toast({
          variant: 'default',
          title: 'Login cancelado',
          description: 'A janela de login do Google foi fechada.',
        });
      } else if (error.code === 'auth/popup-blocked') {
        toast({
          variant: 'destructive',
          title: 'Pop-up bloqueado',
          description: 'O seu navegador bloqueou o pop-up de login. Por favor, habilite os pop-ups para este site e tente novamente.',
        });
        // Fallback to redirect method if popup is blocked
        await signInWithRedirect(auth, provider);
      }
      else {
        toast({
          variant: 'destructive',
          title: 'Erro com Login do Google',
          description: error.message,
        });
      }
    } finally {
      setIsGoogleLoading(false);
    }
  };
  
  const isLoading = isUserLoading || isCheckingRedirect;

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

  const isAnyLoading = isEmailAuthLoading || isGoogleLoading;

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
              disabled={isAnyLoading}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="password">Senha</Label>
            <Input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              disabled={isAnyLoading}
            />
          </div>
        </CardContent>
        <CardFooter className="flex-col gap-4">
          <div className="flex w-full gap-2">
            <Button
              onClick={() => handleEmailAuth('login')}
              disabled={isAnyLoading || !email || !password}
              className="w-full"
            >
              {isEmailAuthLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Entrar
            </Button>
            <Button
              variant="secondary"
              onClick={() => handleEmailAuth('register')}
              disabled={isAnyLoading || !email || !password}
              className="w-full"
            >
              {isEmailAuthLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Criar Conta
            </Button>
          </div>
          <div className="relative w-full">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-background px-2 text-muted-foreground">
                Ou continue com
              </span>
            </div>
          </div>
          <Button
            variant="outline"
            className="w-full"
            onClick={handleGoogleSignIn}
            disabled={isAnyLoading}
          >
            {isGoogleLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <GoogleIcon className="mr-2 h-4 w-4" />}
            Google
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
}
