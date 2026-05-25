'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { signInWithEmailAndPassword, sendPasswordResetEmail } from 'firebase/auth';
import { useAuth } from '@/firebase';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { SgsAppLogo } from '@/components/icons';
import { Loader2, Eye, EyeOff, ArrowLeft, Mail } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import Link from 'next/link';
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
} from "@/components/ui/alert-dialog";

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isAuthInProgress, setIsAuthInProgress] = useState(false);
  const [showResetPasswordDialog, setShowResetPasswordDialog] = useState(false);
  const [resetEmail, setResetEmail] = useState('');
  const [isResettingPassword, setIsResettingPassword] = useState(false);
  const [showAuthErrorModal, setShowAuthErrorModal] = useState(false);
  const [authErrorMessage, setAuthErrorMessage] = useState('');
  const [authErrorTitle, setAuthErrorTitle] = useState('Erro de Autenticação');

  const auth = useAuth();
  const router = useRouter();
  const { toast } = useToast();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsAuthInProgress(true);
    try {
      await signInWithEmailAndPassword(auth, email, password);
      router.push('/dashboard');
    } catch (error: any) {
      console.error(error);
      
     if (error.code === 'auth/user-not-found' || error.code === 'auth/invalid-credential') {
      setAuthErrorTitle("Acesso Não Autorizado");
      setAuthErrorMessage("E-mail ou senha incorretos. Verifique seus dados ou crie uma conta caso seja seu primeiro acesso.");
      // Removemos o setShowAuthErrorModal(true) aqui se você quiser apenas um erro comum
      // Ou, se quiser manter o modal, mantenha a linha abaixo:
      setShowAuthErrorModal(true); 
      return;
    }

    if (error.code === 'auth/too-many-requests') {
      setAuthErrorTitle("Acesso Bloqueado");
      setAuthErrorMessage("O e-mail ou senha não estão corretos. Por favor, verifique ou crie uma conta.");
  
      setShowAuthErrorModal(true);
      return;
    }

    // Qualquer outro erro genérico desconhecido
    setAuthErrorTitle("Erro de Autenticação");
    setAuthErrorMessage("Ocorreu um erro ao tentar acessar o sistema. Verifique suas credenciais.");
    setShowAuthErrorModal(true);
      setIsAuthInProgress(false);
    }
  };

  const handlePasswordReset = async () => {
    if (!resetEmail) return;
    setIsResettingPassword(true);
    try {
      await sendPasswordResetEmail(auth, resetEmail);
      toast({
        title: "E-mail Enviado",
        description: `Um link para redefinição de senha foi enviado para ${resetEmail}.`,
      });
      setShowResetPasswordDialog(false);
      setResetEmail('');
    } catch (error: any) {
      console.error(error);
      toast({
        variant: "destructive",
        title: "Erro",
        description: "Não foi possível enviar o e-mail de recuperação. Verifique o endereço digitado.",
      });
    } finally {
      setIsResettingPassword(false);
    }
  };

  return (
    <div className="flex min-h-screen w-full flex-col bg-background lg:grid lg:grid-cols-2">
      <div className="hidden lg:flex flex-col items-center justify-center bg-background/80 p-12 text-center backdrop-blur-sm">
        <div className="max-w-md">
          <h2 className="text-3xl font-bold text-primary mb-4 text-left">ALMA Guardia: Excelência na Gestão de Segurança</h2>
          <p className="text-muted-foreground">
            O ALMA Guardia é a plataforma definitiva para digitalizar seus processos de segurança, garantir conformidade e tomar decisões baseadas em dados.
          </p>
          <Button asChild variant="outline" className="mt-8">
            <Link href="/"><ArrowLeft className="mr-2 h-4 w-4" /> Voltar ao Site</Link>
          </Button>
        </div>
      </div>
      <div className="flex items-center justify-center p-4">
        <Card className="w-full max-w-sm border-none bg-card/80 shadow-2xl backdrop-blur-sm">
          <CardHeader className="text-center">
            <div className="mb-4 flex justify-center">
              <SgsAppLogo className="h-12 w-12 text-primary" />
            </div>
            <CardTitle className="text-2xl">ALMA Guardia</CardTitle>
            <CardDescription>Entre com suas credenciais para continuar</CardDescription>
          </CardHeader>
          <form onSubmit={handleLogin}>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">E-mail</Label>
                <Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} disabled={isAuthInProgress} required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="password">Senha</Label>
                <div className="relative">
                  <Input id="password" type={showPassword ? 'text' : 'password'} value={password} onChange={(e) => setPassword(e.target.value)} disabled={isAuthInProgress} required />
                  <Button type="button" variant="ghost" size="icon" className="absolute inset-y-0 right-0 h-full px-3 text-muted-foreground hover:bg-transparent" onClick={() => setShowPassword((prev) => !prev)} disabled={isAuthInProgress} aria-label={showPassword ? 'Esconder senha' : 'Mostrar senha'}>
                    {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                  </Button>
                </div>
              </div>
            </CardContent>
            <CardFooter className="flex flex-col gap-4">
              <Button type="submit" className="w-full" disabled={isAuthInProgress || !email || !password}>
                {isAuthInProgress && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Entrar
              </Button>
              <div className="text-center w-full border-t pt-2 mt-1 border-border/40">
                <p className="text-xs text-muted-foreground mb-1">Novo por aqui?</p>
                <Link href="/cadastro" className="text-sm font-medium text-primary hover:underline">
                  Criar uma conta no ALMA Guardia
                </Link>
              </div>
              <AlertDialog open={showResetPasswordDialog} onOpenChange={setShowResetPasswordDialog}>
                <AlertDialogTrigger asChild>
                  <Button type="button" variant="link" className="p-0 h-auto text-sm text-muted-foreground">
                    Esqueceu sua senha?
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent className="w-full max-w-md">
                  <AlertDialogHeader>
                    <AlertDialogTitle>Redefinir Senha</AlertDialogTitle>
                    <AlertDialogDescription>
                      Digite seu e-mail abaixo para receber um link de redefinição de senha.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <div className="space-y-2 mt-4">
                    <Label htmlFor="reset-email">E-mail</Label>
                    <Input
                      id="reset-email"
                      type="email"
                      placeholder="seu@email.com"
                      value={resetEmail}
                      onChange={(e) => setResetEmail(e.target.value)}
                      disabled={isResettingPassword}
                      required
                    />
                  </div>
                  <AlertDialogFooter>
                    <AlertDialogCancel disabled={isResettingPassword}>Cancelar</AlertDialogCancel>
                    <Button onClick={handlePasswordReset} disabled={isResettingPassword || !resetEmail}>
                      {isResettingPassword && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                      <Mail className="mr-2 h-4 w-4" /> Enviar Link
                    </Button>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </CardFooter>
          </form>
        </Card>
      </div>
      <AlertDialog open={showAuthErrorModal} onOpenChange={setShowAuthErrorModal}>
        <AlertDialogContent className="max-w-md">
          <AlertDialogHeader className="text-center">
            <AlertDialogTitle className="text-2xl font-bold text-primary">{authErrorTitle}</AlertDialogTitle>
            <AlertDialogDescription className="text-base pt-2 text-foreground">
              {authErrorMessage}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="flex flex-col gap-2 sm:flex-col mt-4">
            <Button 
              className="w-full" 
              onClick={() => window.location.href = 'https://buy.stripe.com/7sY5Kdb2ldCL8Dt4I7aZi00'}
            >
              Ativar Minha Conta (Teste Grátis 30 Dias)
            </Button>
            <AlertDialogCancel className="w-full mt-0">Voltar para o login</AlertDialogCancel>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}