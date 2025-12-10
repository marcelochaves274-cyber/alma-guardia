'use client';

import { AppLayout } from '@/components/app-layout';
import { useUser } from '@/firebase';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { Loader2 } from 'lucide-react';

function Loader() {
  return (
    <div className="flex h-screen w-screen flex-col items-center justify-center gap-4 bg-background text-foreground">
      <Loader2 className="h-12 w-12 animate-spin text-primary" />
      <p className="text-muted-foreground">Aguarde, carregando...</p>
    </div>
  );
}

export default function Home() {
  const { user, isUserLoading } = useUser();
  const router = useRouter();

  useEffect(() => {
    // Apenas redirecione quando o carregamento do usuário terminar e não houver usuário.
    if (!isUserLoading && !user) {
      router.replace('/login');
    }
  }, [user, isUserLoading, router]);

  // Se o estado do usuário ainda está carregando, exiba um loader para evitar
  // que o AppLayout seja renderizado prematuramente.
  if (isUserLoading) {
    return <Loader />;
  }

  // Se não houver usuário, o redirecionamento foi acionado, então exiba um loader
  // para uma transição suave.
  if (!user) {
    return <Loader />;
  }
  
  // Se houver um usuário, renderize o layout principal do aplicativo.
  return <AppLayout />;
}
