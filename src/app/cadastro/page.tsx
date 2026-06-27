'use client';

import { useState, useEffect, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { createUserWithEmailAndPassword } from 'firebase/auth';
import { doc, setDoc } from 'firebase/firestore';
import { useAuth, initializeFirebase } from '@/firebase';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Loader2, Eye, EyeOff, ArrowLeft } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import Link from 'next/link';
import Image from 'next/image';

// 1. COMPONENTE DO FORMULÁRIO (Quem usa o useSearchParams)
function CadastroForm() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const auth = useAuth();
  const { toast } = useToast();

  // Estados dos campos
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  // Estados dos "olhinhos" (mostrar/esconder senha)
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  
  const [isRegistering, setIsRegistering] = useState(false);

  // EFEITO: Lê o e-mail vindo da URL (se o usuário digitou no login)
  useEffect(() => {
    const emailParam = searchParams.get('email');
    if (emailParam) {
      setEmail(decodeURIComponent(emailParam));
    }
  }, [searchParams]);

  const handleCadastro = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validação de segurança: Senhas precisam ser iguais
    if (password !== confirmPassword) {
      toast({
        variant: "destructive",
        title: "Senhas não conferem",
        description: "A confirmação de senha precisa ser exatamente igual à senha escolhida.",
      });
      return;
    }

    setIsRegistering(true);

    try {
      // 1. Cria o usuário no Firebase Authentication
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;

      // 2. Inicializa os SDKs e cria o documento no Firestore usando o nome correto 'firestore'
      const { firestore } = initializeFirebase();
      await setDoc(doc(firestore, 'sgs_genius', user.uid), {
        email: user.email,
        statusPagamento: 'aguardando_pagamento',
        createdAt: new Date().toISOString(),
      });

      toast({
        title: "Conta criada com sucesso!",
        description: "Seu perfil foi gerado. Vamos prosseguir para a ativação do seu plano.",
      });

      // 3. Empurra o usuário para a próxima etapa (Dashboard)
      router.push('/dashboard');

    } catch (error: any) {
      console.error(error);
      let message = "Ocorreu um erro ao criar sua conta. Tente novamente.";
      if (error.code === 'auth/email-already-in-use') {
        message = "Este e-mail já está cadastrado no sistema. Tente fazer login.";
      } else if (error.code === 'auth/weak-password') {
        message = "A senha precisa ter pelo menos 6 caracteres.";
      }
      toast({
        variant: "destructive",
        title: "Erro no cadastro",
        description: message,
      });
    } finally {
      setIsRegistering(false);
    }
  };

  return (
    <div className="flex min-h-screen w-full flex-col bg-background lg:grid lg:grid-cols-2">
      {/* Lado Esquerdo - Banner Técnico */}
      <div className="hidden lg:flex flex-col items-center justify-center bg-background/80 p-12 text-center backdrop-blur-sm">
        <div className="max-w-md">
          <h2 className="text-3xl font-bold text-primary mb-4 text-left">ALMA Guardia: Segurança e Conformidade</h2>
          <p className="text-muted-foreground">
            Crie sua conta em poucos segundos para configurar suas credenciais de segurança e ativar seu ambiente de gestão técnica.
          </p>
          <Button asChild variant="outline" className="mt-8">
            <Link href="/login"><ArrowLeft className="mr-2 h-4 w-4" /> Voltar ao Login</Link>
          </Button>
        </div>
      </div>

      {/* Lado Direito - Formulário de Cadastro */}
      <div className="flex items-center justify-center p-4">
        <Card className="w-full max-w-sm border-none bg-card/80 shadow-2xl backdrop-blur-sm">
          <CardHeader className="text-center">
            <div className="mb-6 flex justify-center items-center">
              <Image
                src="https://firebasestorage.googleapis.com/v0/b/brave-drive-472322-m2.firebasestorage.app/o/ALMA%20-%20Simbolo_letreiro%20Branco%20%20-%20Grande.png?alt=media&token=674ce95f-b9e9-4212-8895-6753b1af996d"
                alt="ALMA Guardia Logo"
                width={150}
                height={150}
                className="object-contain"
              />
            </div>
            <CardTitle className="text-2xl">Criar Conta</CardTitle>
            <CardDescription>Defina seu acesso para ativar o sistema</CardDescription>
          </CardHeader>
          <form onSubmit={handleCadastro}>
            <CardContent className="space-y-4">
              {/* Campo E-mail */}
              <div className="space-y-2">
                <Label htmlFor="email">E-mail</Label>
                <Input 
                  id="email" 
                  type="email" 
                  value={email} 
                  onChange={(e) => setEmail(e.target.value)} 
                  disabled={isRegistering} 
                  required 
                />
              </div>

              {/* Campo Senha */}
              <div className="space-y-2">
                <Label htmlFor="password">Definir Senha</Label>
                <div className="relative">
                  <Input 
                    id="password" 
                    type={showPassword ? 'text' : 'password'} 
                    value={password} 
                    onChange={(e) => setPassword(e.target.value)} 
                    disabled={isRegistering} 
                    required 
                  />
                  <Button 
                    type="button" 
                    variant="ghost" 
                    size="icon" 
                    className="absolute inset-y-0 right-0 h-full px-3 text-muted-foreground hover:bg-transparent" 
                    onClick={() => setShowPassword((prev) => !prev)} 
                    disabled={isRegistering}
                  >
                    {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                  </Button>
                </div>
              </div>

              {/* Campo Confirmar Senha */}
              <div className="space-y-2">
                <Label htmlFor="confirmPassword">Confirmar Senha</Label>
                <div className="relative">
                  <Input 
                    id="confirmPassword" 
                    type={showConfirmPassword ? 'text' : 'password'} 
                    value={confirmPassword} 
                    onChange={(e) => setConfirmPassword(e.target.value)} 
                    disabled={isRegistering} 
                    required 
                  />
                  <Button 
                    type="button" 
                    variant="ghost" 
                    size="icon" 
                    className="absolute inset-y-0 right-0 h-full px-3 text-muted-foreground hover:bg-transparent" 
                    onClick={() => setShowConfirmPassword((prev) => !prev)} 
                    disabled={isRegistering}
                  >
                    {showConfirmPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                  </Button>
                </div>
              </div>
            </CardContent>

            <CardFooter className="flex flex-col gap-4">
              <Button type="submit" className="w-full" disabled={isRegistering || !email || !password || !confirmPassword}>
                {isRegistering && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Concluir Cadastro
              </Button>
              <div className="text-center w-full border-t pt-2 mt-1 border-border/40">
                <Link href="/login" className="text-sm font-medium text-muted-foreground hover:underline">
                  Já tem uma conta? Entrar
                </Link>
              </div>
            </CardFooter>
          </form>
        </Card>
      </div>
    </div>
  );
}

// 2. EXPORT DEFAULT PRINCIPAL (Quem aplica o embrulho do Suspense)
export default function CadastroPage() {
  return (
    <Suspense fallback={
      <div className="flex min-h-screen w-full items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    }>
      <CadastroForm />
    </Suspense>
  );
}