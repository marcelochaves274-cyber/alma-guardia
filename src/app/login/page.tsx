'use client';

import { useState, useEffect } from 'react';
import {
  getAuth,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  sendPasswordResetEmail,
  type Auth,
} from 'firebase/auth';
import { useRouter } from 'next/navigation';
import { useUser, initializeFirebase } from '@/firebase';
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
import { SgsAppLogo } from '@/components/icons';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Eye, EyeOff } from 'lucide-react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"

export default function LoginPage() {
  const { auth: initializedAuth } = initializeFirebase();
  const { user, isUserLoading } = useUser();
  const router = useRouter();
  const { toast } = useToast();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isAuthInProgress, setIsAuthInProgress] = useState(false);
  const [resetEmail, setResetEmail] = useState('');

  // Se o usuário está logado e tentou acessar /login, ele será redirecionado
  // pela página principal. Apenas mostramos um loader aqui para a transição.
  if (isUserLoading || user) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-background">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
      </div>
    );
  }

  const getFriendlyErrorMessage = (errorCode: string) => {
    switch (errorCode) {
      case 'auth/email-already-in-use':
        return 'Este e-mail já está em uso. Por favor, tente fazer login ou redefinir sua senha.';
      case 'auth/wrong-password':
      case 'auth/invalid-credential':
        return 'Credenciais inválidas. Verifique seu e-mail e senha.';
      case 'auth/user-not-found':
        return 'Nenhum usuário encontrado com este e-mail. Por favor, crie uma conta.';
      case 'auth/weak-password':
        return 'A senha é muito fraca. Ela deve ter pelo menos 6 caracteres.';
      case 'auth/invalid-api-key':
        return 'A chave de API do Firebase é inválida. A configuração do projeto pode não estar correta. Tente atualizar a página.';
      default:
        return 'Ocorreu um erro inesperado. Verifique sua conexão e tente novamente. Código: ' + errorCode;
    }
  };

  const handleEmailAuth = async (authAction: 'login' | 'register') => {
    if (!initializedAuth) {
       toast({
        variant: 'destructive',
        title: 'Erro de Configuração',
        description: 'A autenticação do Firebase não foi inicializada corretamente. Tente atualizar a página.',
      });
      return;
    }
    setIsAuthInProgress(true);
    try {
      if (authAction === 'login') {
        await signInWithEmailAndPassword(initializedAuth, email, password);
      } else {
        await createUserWithEmailAndPassword(initializedAuth, email, password);
      }
      // On success, the main page will handle the redirection.
      // We wait for the useUser hook to update.
      router.push('/');

    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: 'Erro de Autenticação',
        description: getFriendlyErrorMessage(error.code),
      });
      setIsAuthInProgress(false);
    }
  };
  
  const handlePasswordReset = async () => {
    if (!initializedAuth || !resetEmail) return;
    setIsAuthInProgress(true);
    try {
      await sendPasswordResetEmail(initializedAuth, resetEmail);
      toast({
        title: 'E-mail Enviado',
        description: `Um link para redefinição de senha foi enviado para ${resetEmail}.`,
      });
    } catch (error: any) {
       toast({
        variant: 'destructive',
        title: 'Erro',
        description: getFriendlyErrorMessage(error.code),
      });
    } finally {
      setIsAuthInProgress(false);
    }
  };

  return (
    <div className="flex min-h-screen w-full flex-col bg-background lg:grid lg:grid-cols-2">
      <div className="hidden lg:flex flex-col items-center justify-center bg-background/80 p-12 text-center backdrop-blur-sm">
        <div className='max-w-md'>
          <h2 className='text-3xl font-bold text-foreground mb-4'>Segurança e Eficiência Operacional</h2>
          <p className='text-foreground/80'>
            A implementação de um Sistema de Gestão de Segurança (SGS), conforme orienta a NBR 21101, é essencial para garantir um ambiente de trabalho seguro, reduzir riscos de acidentes, atender às exigências legais e melhorar a eficiência operacional, promovendo uma cultura de segurança que beneficia tanto os colaboradores quanto a sustentabilidade da empresa.
          </p>
        </div>
      </div>
      <div className="flex items-center justify-center p-4">
        <Card className="w-full max-w-sm border-none bg-card/80 shadow-2xl backdrop-blur-sm">
          <CardHeader className="text-center">
            <div className="mb-4 flex justify-center">
              <SgsAppLogo className="h-12 w-12 text-primary" />
            </div>
            <CardTitle className="text-2xl">Bem-vindo ao SGS APP</CardTitle>
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
                disabled={isAuthInProgress}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Senha</Label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  disabled={isAuthInProgress}
                  className="pr-10"
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="absolute inset-y-0 right-0 h-full px-3 text-muted-foreground hover:bg-transparent"
                  onClick={() => setShowPassword((prev) => !prev)}
                  disabled={isAuthInProgress}
                  aria-label={showPassword ? 'Esconder senha' : 'Mostrar senha'}
                >
                  {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                </Button>
              </div>
            </div>
          </CardContent>
          <CardFooter className="flex flex-col gap-4">
              <div className="flex w-full gap-2">
                  <Button
                  onClick={() => handleEmailAuth('login')}
                  disabled={isAuthInProgress || !email || !password}
                  className="w-full"
                  >
                  {isAuthInProgress && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Entrar
                  </Button>
                  <Button
                  variant="secondary"
                  onClick={() => handleEmailAuth('register')}
                  disabled={isAuthInProgress || !email || !password}
                  className="w-full"
                  >
                  {isAuthInProgress && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Criar Conta
                  </Button>
              </div>
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button variant="link" className="p-0 h-auto text-sm text-muted-foreground">Esqueceu sua senha?</Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Redefinir Senha</AlertDialogTitle>
                    <AlertDialogDescription>
                      Digite seu e-mail abaixo para receber um link de redefinição de senha.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <div className="space-y-2">
                      <Label htmlFor="reset-email">Email</Label>
                      <Input
                        id="reset-email"
                        type="email"
                        placeholder="seu@email.com"
                        value={resetEmail}
                        onChange={(e) => setResetEmail(e.target.value)}
                      />
                  </div>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancelar</AlertDialogCancel>
                    <AlertDialogAction onClick={handlePasswordReset} disabled={!resetEmail || isAuthInProgress}>
                      {isAuthInProgress ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                      Enviar Link
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
          </CardFooter>
        </Card>
      </div>
    </div>
  );
}
