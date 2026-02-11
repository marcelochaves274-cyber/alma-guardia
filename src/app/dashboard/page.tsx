'use client';

import { AppLayout } from '@/components/app-layout';
import { useUser } from '@/firebase';
import { Loader2 } from 'lucide-react';
import { useProfile } from '@/context/profile-context';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

function Loader() {
  return (
    <div className="flex h-screen w-screen flex-col items-center justify-center gap-4 bg-background text-foreground">
      <Loader2 className="h-12 w-12 animate-spin text-primary" />
      <p className="text-muted-foreground">Aguarde, carregando...</p>
    </div>
  );
}

export default function DashboardPage() {
  const { user, isUserLoading } = useUser();
  const { isProfileLoading } = useProfile();
  const router = useRouter();

  useEffect(() => {
    // If loading is finished and there's no user or the user is anonymous, it's a protected route. Redirect to login.
    if (!isUserLoading && (!user || user.isAnonymous)) {
      router.replace('/login');
    }
  }, [isUserLoading, user, router]);

  // Show a loader while we check for user auth state and profile info.
  // Also show a loader if user is null or anonymous, as we're about to redirect.
  if (isUserLoading || isProfileLoading || !user || user.isAnonymous) {
    return <Loader />;
  }
  
  // If we have a user, show the main application layout.
  return <AppLayout />;
}
