'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useUser, useFirestore } from '@/firebase';
import { doc, getDoc } from 'firebase/firestore';
import { getFunctions, httpsCallable } from 'firebase/functions';
import { CreditCard, Calendar, CheckCircle2, Loader2, ExternalLink } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Skeleton } from './ui/skeleton';
import { useToast } from '@/hooks/use-toast';

export function MySubscriptionPage() {
  const { user } = useUser();
  const firestore = useFirestore();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(true);
  const [isRedirecting, setIsRedirecting] = useState(false);
  const [subscriptionData, setSubscriptionData] = useState<any>(null);

  useEffect(() => {
    async function fetchSubscription() {
      if (!user || !firestore) return;
      try {
        const docRef = doc(firestore, 'sgs_genius', user.uid);
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
          setSubscriptionData(docSnap.data());
        }
      } catch (error) {
        console.error("Erro ao buscar assinatura:", error);
      } finally {
        setIsLoading(false);
      }
    }
    fetchSubscription();
  }, [user, firestore]);

  const handleManageSubscription = async () => {
    setIsRedirecting(true);
    
    // Estratégia de Rollback: Mude para 'functions' se precisar reverter
    const MIGRATION_MODE: 'api' | 'functions' = 'api';

    try {
      let url = '';

      if (MIGRATION_MODE === 'api') {
     const emailParaEnviar = subscriptionData?.email || user?.email;
      
      const response = await fetch('/api/create-portal-session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: emailParaEnviar }),
      });

        if (!response.ok) throw new Error('Falha na resposta da API');
        const data = await response.json();
        url = data.url;
      } else {
        const functions = getFunctions(undefined, 'us-central1');
        const callPortal = httpsCallable(functions, 'createPortalSession');
        const result = await callPortal();
        const data = result.data as { url: string };
        url = data.url;
      }
      
      if (url) {
        window.location.href = url;
      } else {
        throw new Error('URL de redirecionamento não recebida.');
      }
    } catch (error) {
      console.error("Erro ao abrir portal do Stripe:", error);
      toast({
        variant: 'destructive',
        title: 'Erro no Portal',
        description: 'Não foi possível acessar o portal de faturamento agora.',
      });
    } finally {
      setIsRedirecting(false);
    }
  };

  if (isLoading) {
    return (
      <Card className="w-full max-w-2xl mx-auto">
        <CardHeader><Skeleton className="h-8 w-1/3" /><Skeleton className="h-4 w-1/2" /></CardHeader>
        <CardContent className="space-y-4"><Skeleton className="h-20 w-full" /><Skeleton className="h-20 w-full" /></CardContent>
      </Card>
    );
  }

  const isActive = subscriptionData?.status === 'active';
  const nextBillingDate = subscriptionData?.next_billing_date?.toDate();

  return (
    <div className="w-full max-w-2xl mx-auto space-y-6">
      <Card className="border-primary/20 shadow-lg">
        <CardHeader className="bg-primary/5">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-2xl">Minha Assinatura</CardTitle>
              <CardDescription>Gerencie seu plano e informações de faturamento.</CardDescription>
            </div>
            <CreditCard className="h-10 w-10 text-primary opacity-50" />
          </div>
        </CardHeader>
        <CardContent className="pt-6 space-y-6">
          <div className="flex items-center justify-between p-4 rounded-lg border bg-muted/30">
            <div className="space-y-1">
              <p className="text-sm font-medium text-muted-foreground">Status do Plano</p>
              <div className="flex items-center gap-2">
                <h3 className="text-lg font-bold">{subscriptionData?.plan_name || 'Plano ALMA Guardia'}</h3>
                <Badge variant={isActive ? "default" : "destructive"} className={isActive ? "bg-green-600" : ""}>
                  {isActive ? 'Ativa' : 'Inativa'}
                </Badge>
              </div>
              <p className="text-sm text-muted-foreground">{user?.email}</p>
            </div>
            {isActive && <CheckCircle2 className="h-8 w-8 text-green-600" />}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="p-4 rounded-lg border flex items-center gap-4">
              <Calendar className="h-5 w-5 text-primary" />
              <div>
                <p className="text-xs text-muted-foreground">Próxima Renovação</p>
                <p className="font-semibold">
                  {nextBillingDate ? format(nextBillingDate, "dd 'de' MMMM, yyyy", { locale: ptBR }) : '---'}
                </p>
              </div>
            </div>
          </div>
        </CardContent>
        <CardFooter className="bg-muted/10 border-t p-6">
          <Button 
            onClick={handleManageSubscription} 
            disabled={isRedirecting} 
            className="w-full sm:w-auto gap-2"
          >
            {isRedirecting ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Redirecionando...
              </>
            ) : (
              <>
                <ExternalLink className="h-4 w-4" />
                Gerenciar Assinatura e Pagamentos
              </>
            )}
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
}