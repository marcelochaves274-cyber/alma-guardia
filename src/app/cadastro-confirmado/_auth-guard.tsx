'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useUser, useFirestore } from '@/firebase';
import { doc, getDoc } from 'firebase/firestore';
import { Loader2 } from 'lucide-react';
import { SgsAppLogo } from '@/components/icons';

interface AuthGuardProps {
  children: React.ReactNode;
}

export function AuthGuard({ children }: AuthGuardProps) {
  const { user, isUserLoading } = useUser();
  const firestore = useFirestore();
  const router = useRouter();
  const [isAuthorized, setIsAuthorized] = useState(false);
  const [isValidatingStatus, setIsValidatingStatus] = useState(true);

  useEffect(() => {
    // 1. Aguarda o Firebase carregar o estado inicial da sessão
    if (isUserLoading) return;

    // 2. Se não houver usuário logado, redireciona para login
    if (!user) {
      router.push('/login');
      return;
    }

    const checkUserStatus = async () => {
      try {
        // 3. Verificação de Status Ativo no Firestore (Coleção sgs_genius)
        const userDocRef = doc(firestore, 'sgs_genius', user.uid);
        const userDocSnap = await getDoc(userDocRef);

        if (userDocSnap.exists() && userDocSnap.data().status === 'active') {
          setIsAuthorized(true);
        } else {
          // Caso o usuário exista mas o status não seja 'active' (ex: pagamento pendente)
          console.warn("Acesso negado: Usuário com status inativo.");
          router.push('/login'); 
        }
      } catch (error) {
        console.error("Erro ao validar status do usuário:", error);
        router.push('/login');
      } finally {
        setIsValidatingStatus(false);
      }
    };

    checkUserStatus();
  }, [user, isUserLoading, router, firestore]);

  // Estado de Carregamento Centralizado
  if (isUserLoading || (user && isValidatingStatus)) {
    return (
      <div className="flex h-screen w-screen flex-col items-center justify-center gap-4 bg-background">
        <div className="relative flex items-center justify-center">
          <SgsAppLogo className="h-16 w-16 text-primary animate-pulse" />
          <Loader2 className="absolute h-24 w-24 animate-spin text-primary/20" />
        </div>
        <p className="text-sm font-medium text-muted-foreground animate-pulse">
          Validando acesso ao ALMA Guardia...
        </p>
      </div>
    );
  }

  return isAuthorized ? <>{children}</> : null;
}