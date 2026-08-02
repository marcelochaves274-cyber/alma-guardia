'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { onAuthStateChanged } from 'firebase/auth';
import { auth } from '@/firebase/config';
import { AppLayout } from '@/components/app-layout';
import { Loader2 } from 'lucide-react';

function Loader() {
  return (
    <div className="flex h-screen w-screen flex-col items-center justify-center gap-4 bg-background text-foreground">
      <Loader2 className="h-12 w-12 animate-spin text-primary" />
      <p className="text-muted-foreground">Verificando sessão...</p>
    </div>
  );
}

export default function DashboardPage() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(true);
  const [isLoggedIn, setIsLoggedIn] = useState(false);

  useEffect(() => {
    // onAuthStateChanged é o listener nativo do Firebase.
    // Ele verifica o cache do navegador e informa se há um usuário logado.
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (user) {
        // Usuário está logado, permite o acesso.
        setIsLoggedIn(true);
      } else {
        // Usuário não está logado, redireciona para a página de login.
        router.replace('/login');
      }
      setIsLoading(false);
    });

    // Limpa o listener ao desmontar o componente para evitar vazamentos de memória.
    return () => unsubscribe();
  }, [router]);

  // Exibe um loader enquanto o Firebase verifica o estado de autenticação.
  if (isLoading) {
    return <Loader />;
  }

  // Renderiza o layout principal apenas se o usuário estiver logado.
  // Caso contrário, o redirecionamento já foi iniciado.
  return isLoggedIn ? <AppLayout /> : <Loader />;
}
