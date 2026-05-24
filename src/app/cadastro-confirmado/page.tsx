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
  const [showConfirmPassword, setShowConfirmPassword] = useState(false); // ESTADO CORRIGIDO: Segundo olhinho
  const [isProcessing, setIsProcessing] = useState(false);
  const [isVerifying, setIsVerifying] = useState(true);

  // Função auxiliar para verificar se o parâmetro capturado é um e-mail válido
  const isValidEmail = (emailStr: string | null) => {
    if (!emailStr) return false;
    if (emailStr.includes('{') || emailStr.includes('cs_live')) return false; 
    return emailStr.includes('@');
  };

  useEffect(() => {
    const emailParam = searchParams.get('email');
    
    if (isValidEmail(emailParam)) {
      setEmail(emailParam || '');
    } else {
      setEmail('');
    }

    const verifyInitialAccess = async () => {
      if (!isValidEmail(emailParam)) {
        setIsVerifying(false);
        return;
      }

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

          if (userData.status !== 'aguardando_cadastro' && userData.status !== 'pago' && !isDev) {
            toast({
              variant: "destructive",
              title: "Acesso Negado",
              description: "Status de pedido inválido para realizar o cadastro.",
            });
            router.push('/login');
            return;
          }
        }
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

    if (password !== confirmPassword) {
      toast({
        variant: "destructive",
        title: "Senhas divergentes",
        description: "A senha e a confirmação de senha não são iguais.",
      });
      return;
    }

    setIsProcessing(true);
    const isDev = process.env.NODE_ENV === 'development';
    
    try {
      // Busca pelo e-mail para garantir que a compra existe no Firestore antes de criar a conta
      const q = query(
        collection(db, 'sgs_genius'),
        where('email', '==', email.trim().toLowerCase())
      );
      const querySnapshot = await getDocs(q);

      if (querySnapshot.empty && !isDev) {
        toast({
          variant: "destructive",
          title: "Acesso Negado",
          description: "Não foi possível validar seu pagamento para este e-mail.",
        });
        setIsProcessing(false);
        return;
      }

      if (!querySnapshot.empty) {
        const userData = querySnapshot.docs[0].data();
        if (userData.status !== 'aguardando_cadastro' && userData.status !== 'pago' && userData.status !== 'active' && !isDev) {
          toast({
            variant: "destructive",
            title: "Acesso Negado",
            description: "O pagamento deste e-mail não possui um status válido para cadastro.",
          });
          setIsProcessing(false);
          return;
        }
      }

      // 1. Criar o usuário no Firebase Authentication PRIMEIRO
      const userCredential = await createUserWithEmailAndPassword(auth, email.trim().toLowerCase(), password);
      const user = userCredential.user;

      // 2. CORREÇÃO DE OURO: Atualiza o documento cujo ID é o E-MAIL do cliente (criado pelo Stripe)
      // Gravamos o UID lá dentro e atualizamos o status para active.
      await setDoc(doc(db, 'sgs_genius', email.trim().toLowerCase()), {
        uid: user.uid,
        status: 'active',
        role: 'user',
        updatedAt: serverTimestamp(),
        setupCompleted: true
      }, { merge: true });

      toast({
        title: "Conta Ativada!",
        description: "Seja bem-vindo ao ALMA Guardia. Redirecionando...",
      });

      router.replace('/dashboard');
      
    } catch (error: any) {
      console.error("Erro ao finalizar cadastro:", error);
      if (error.code === 'auth/email-already-in-use') {
        toast({
          variant: "destructive",
          title: "E-mail já cadastrado",
          description: "Este e-mail já possui uma conta ativa. Tente fazer login.",
        });
        setIsProcessing(false);
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

  const shouldDisableEmailInput = isValidEmail(searchParams.get('email'));

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
                disabled={shouldDisableEmailInput}
                placeholder="Digite seu e-mail de compra"
                className={shouldDisableEmailInput ? "bg-muted/50 cursor-not-allowed" : ""}
              />
            </div>

            {/* Campo: Definir Senha */}
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
            
            {/* Campo: Confirmar Senha com Olhinho Adicionado e Corrigido */}
            <div className="space-y-2">
              <Label htmlFor="confirmPassword">Confirmar Senha</Label>
              <div className="relative">
                <Input 
                  id="confirmPassword" 
                  type={showConfirmPassword ? 'text' : 'password'} 
                  value={confirmPassword} 
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Repita a senha definida"
                />
                <Button 
                  type="button" 
                  variant="ghost" 
                  size="icon" 
                  className="absolute right-0 top-0 h-full px-3"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                >
                  {showConfirmPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                </Button>
              </div>
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