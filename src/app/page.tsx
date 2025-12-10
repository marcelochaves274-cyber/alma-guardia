'use client';

import { AppLayout } from '@/components/app-layout';
import { useUser } from '@/firebase';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { Loader2 } from 'lucide-react';
import { useProfile } from '@/context/profile-context';

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
  const { isProfileLoading } = useProfile();
  const router = useRouter();

  useEffect(() => {
    // Apenas redirecione quando o carregamento do usuário terminar e não houver usuário.
    if (!isUserLoading && !user) {
      router.replace('/login');
    }
  }, [user, isUserLoading, router]);

  // Exibe o loader enquanto o usuário ou o perfil estiverem carregando.
  // Isso garante que temos todas as informações antes de tentar renderizar qualquer coisa.
  if (isUserLoading || isProfileLoading) {
    return <Loader />;
  }

  // Se, após o carregamento, não houver usuário, significa que o redirecionamento
  // para o login está em andamento. Mostramos o loader para uma transição suave.
  if (!user) {
    return <Loader />;
  }
  
  // Se houver um usuário, renderize o layout principal do aplicativo.
  return <AppLayout />;
}
