'use client'
import Image from 'next/image';
import { SidebarTrigger } from '@/components/ui/sidebar';
import { useAppSettings } from '@/context/app-settings-context';
import { Skeleton } from './ui/skeleton';
import { Button } from './ui/button';
import { getAuth, signOut } from 'firebase/auth';
import { useFirebaseApp } from '@/firebase';
import { useRouter } from 'next/navigation';
import { LogOut } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

export function Header() {
  const { appName, logoUrl, isLoading } = useAppSettings();
  const firebaseApp = useFirebaseApp();
  const router = useRouter();
  const { toast } = useToast();

  const handleSignOut = async () => {
    if (!firebaseApp) return;
    const auth = getAuth(firebaseApp);
    try {
      await signOut(auth);
      router.push('/login');
      toast({
        title: 'Logout realizado',
        description: 'Você foi desconectado com sucesso.',
      })
    } catch (error) {
      console.error('Error signing out:', error);
      toast({
        variant: 'destructive',
        title: 'Erro',
        description: 'Não foi possível fazer logout.',
      })
    }
  };

  return (
    <header className="flex h-16 shrink-0 items-center border-b bg-background px-4 md:px-6">
      <div className="flex items-center gap-2">
        <SidebarTrigger />
        {isLoading ? (
          <Skeleton className="h-8 w-8 rounded-sm" />
        ) : (
          logoUrl && (
            <Image 
              src={logoUrl} 
              alt="Logo da empresa"
              width={32}
              height={32}
              className="rounded-sm object-contain"
            />
          )
        )}
        <h1 className="font-headline text-lg font-semibold hidden sm:block">Sistema de Gestão de Segurança</h1>
      </div>
      <div className="flex flex-1 flex-col items-center justify-center text-center">
          {isLoading ? (
             <Skeleton className="h-4 w-32 mt-1" />
          ) : (
            <p className="text-sm text-muted-foreground">{appName}</p>
          )}
      </div>
      <div className="flex w-1/3 justify-end">
        <Button variant="ghost" size="icon" onClick={handleSignOut} aria-label="Fazer logout">
          <LogOut className="h-5 w-5" />
        </Button>
      </div>
    </header>
  );
}
