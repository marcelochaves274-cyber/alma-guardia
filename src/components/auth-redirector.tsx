'use client';

import { useUser } from '@/firebase';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { Loader2 } from 'lucide-react';

function FullscreenLoader() {
  return (
    <div className="fixed inset-0 z-[9999] flex h-screen w-screen flex-col items-center justify-center gap-4 bg-background/80 text-foreground backdrop-blur-sm">
      <Loader2 className="h-12 w-12 animate-spin text-primary" />
    </div>
  );
}


export function AuthRedirector() {
  const { user, isUserLoading } = useUser();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    // If we have a user and we are on the homepage, redirect to the dashboard.
    if (!isUserLoading && user && pathname === '/') {
      router.replace('/dashboard');
    }
  }, [isUserLoading, user, pathname, router]);

  // While checking auth state on the root path, show a loader
  // to prevent the marketing page from flashing for logged-in users.
  if (isUserLoading && pathname === '/') {
      return <FullscreenLoader />;
  }

  // Render nothing otherwise, this component is only for redirection.
  return null;
}
