'use client';
import { useState, useEffect, Suspense } from 'react';
import { createUserWithEmailAndPassword } from "firebase/auth";
import { useSearchParams, useRouter } from 'next/navigation';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { SgsAppLogo } from '@/components/icons';
import { Eye, EyeOff, Loader2 } from 'lucide-react';
import { auth, db } from "@/firebase/config";
import { doc, setDoc, serverTimestamp, query, collection, where, getDocs } from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';

function CadastroConfirmadoConteudo() {
  const searchParams = useSearchParams();
  const router = useRouter();

  const { toast } = useToast();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isVerifying, setIsVerifying] = useState(true);

  useEffect(() => {
    const emailParam = searchParams.get('email');
    
    //if (!emailParam) {
    //  router.push('/login');
    //  return;
    //}

    if (emailParam === '{CHECKOUT_SESSION_CUSTOMER_EMAIL}') {
      setEmail('');
      setIsVerifying(false);
      return;
    }

    setEmail(emailParam || '');

    const verifyInitialAccess = async () => {
      const isDev = process.env.NODE_ENV === 'development';
      try {
        const q = query(
          collection(db, 'sgs_genius'),
          where('email', '==', emailParam)
        );
        const querySnapshot = await getDocs(q);

        if (querySnapshot.empty && !isDev) {
          toast({
            variant: "destructive",
            title: "Acesso Negado",
            description: "Pagamento não verificado para este e-mail.",
          });
          router.push('/login');
          return;
        }

        if (!querySnapshot.empty) {
          const userData = querySnapshot.docs[0].data();

          if (userData.status === 'active') {
            toast({
              title: "Conta já existe",
              description: "Este e-mail já possui uma conta ativa. Tente fazer login.",
            });
            router.push('/login');
            return;
          }

          if (userData.status !== 'aguardando_cadastro' && !isDev) {
            toast({
              variant: "destructive",
              title: "Acesso Negado",
              description: "Status de pedido inválido para realizar o cadastro.",
            });
            router.push('/login');
            return;
          }
        }

        // Acesso permitido
      } catch (error) {
        console.error("Erro na verificação inicial:", error);
        if (!isDev) router.push('/login');
      } finally {
        setIsVerifying(false);
      }
    };

    verifyInitialAccess();
  }, [searchParams, router]);

  const handleFinalizeRegistration = async () => {
    if (!auth || !db || !email) return;

    setIsProcessing(true);
    const isDev = process.env.NODE_ENV === 'development';
    try {
      // Auditoria de Segurança Final: Garantir que o e-mail está autorizado antes da criação
      const q = query(
        collection(db, 'sgs_genius'),
        where('email', '==', email),
        where('status', '==', 'aguardando_cadastro')
      );
      const querySnapshot = await getDocs(q);

      if (querySnapshot.empty && !isDev) {
        toast({
          variant: "destructive",
          title: "Acesso Negado",
          description: "Não foi possível validar seu pagamento para este e-mail. Verifique os dados ou entre em contato com o suporte.",
        });
        setIsProcessing(false);
        return;
      }

      // 1. Criar o usuário no Firebase Auth
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;

      // 2. Criar o documento do usuário no Firestore (Coleção sgs_genius)
      // Definimos o status como 'active' imediatamente após o sucesso do pagamento/senha
      await setDoc(doc(db, 'sgs_genius', user.uid), {
      uid: user.uid,
      email: email,
      status: 'active',
      role: 'user',
      createdAt: serverTimestamp(),
      setupCompleted: true
    }, { merge: true });

      toast({
        title: "Conta Ativada!",
        description: "Seja bem-vindo ao ALMA Guardia. Redirecionando...",
      });

      // 3. Direcionar para o Dashboard
      router.replace('/dashboard');
      
    } catch (error: any) {
      console.error("Erro ao finalizar cadastro:", error);
      if (error.code === 'auth/email-already-in-use') {
        toast({
          variant: "destructive",
          title: "E-mail já cadastrado",
          description: "Este e-mail já possui uma conta ativa. Tente fazer login.",
        });
        return;
      }
      toast({
        variant: "destructive",
        title: "Erro ao ativar conta",
        description: "Ocorreu um problema técnico. Se o erro persistir, entre em contato com o suporte.",
      });
    } finally {
      setIsProcessing(false);
    }
  };

  if (isVerifying) {
    return (
      <div className="flex h-screen w-screen flex-col items-center justify-center gap-4 bg-background">
        <SgsAppLogo className="h-16 w-16 text-primary animate-pulse mb-4" />
        <div className="flex items-center gap-2 text-muted-foreground font-medium">
          <Loader2 className="h-5 w-5 animate-spin" />
          <span>Validando seu acesso...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4">
      <div className="w-full max-w-md space-y-8">
        <div className="flex flex-col items-center text-center">
          <SgsAppLogo className="h-12 w-12 text-primary mb-2" />
          <h2 className="text-3xl font-bold tracking-tight text-primary">ALMA Guardia: Excelência na Gestão de Segurança</h2>
          <p className="text-muted-foreground mt-2">Pagamento confirmado! Defina sua senha para finalizar seu acesso.</p>
        </div>

        <Card className="border border-primary/10 bg-card/60 shadow-2xl backdrop-blur-md">
          <CardHeader>
            <CardTitle>Criar Senha</CardTitle>
            <CardDescription>Confirme seus dados e defina sua senha.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">E-mail de Cadastro</Label>
              <Input 
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={!!searchParams.get('email') && searchParams.get('email') !== '{CHECKOUT_SESSION_CUSTOMER_EMAIL}'}
                placeholder={(!email || email.includes('{')) ? 'Digite seu e-mail de compra' : ''}
                className={!!searchParams.get('email') && searchParams.get('email') !== '{CHECKOUT_SESSION_CUSTOMER_EMAIL}' ? "bg-muted/50 cursor-not-allowed" : ""}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">Definir Senha</Label>
              <div className="relative">
                <Input 
                  id="password" 
                  type={showPassword ? 'text' : 'password'} 
                  value={password} 
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Mínimo 6 caracteres"
                />
                <Button 
                  type="button" 
                  variant="ghost" 
                  size="icon" 
                  className="absolute right-0 top-0 h-full px-3"
                  onClick={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                </Button>
              </div>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="confirmPassword">Confirmar Senha</Label>
              <Input 
                id="confirmPassword" 
                type="password" 
                value={confirmPassword} 
                onChange={(e) => setConfirmPassword(e.target.value)}
              />
            </div>
          </CardContent>
          <CardFooter>
            <Button 
              className="w-full" 
              onClick={handleFinalizeRegistration}
              disabled={!email || !password || password !== confirmPassword || password.length < 6 || isProcessing}
            >
              {isProcessing && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Ativar Conta e Entrar
            </Button>
          </CardFooter>
        </Card>
      </div>
    </div>
  );
}
export default function CadastroConfirmadoPage() {
  return (
    <Suspense fallback={<div className="flex h-screen items-center justify-center">Carregando...</div>}>
      <CadastroConfirmadoConteudo />
    </Suspense>
  );
}