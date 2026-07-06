'use client';

import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { SgsAppLogo } from '@/components/icons';
import { AppSettingsProvider } from '@/context/app-settings-context';
import { ProfileProvider } from '@/context/profile-context';
import { HelpProvider } from '@/context/help-context';
import { Toaster } from '@/components/ui/toaster';
import { FirebaseClientProvider } from '@/firebase';

export default function NotFound() {
  return (
    <html>
      <body>
        <FirebaseClientProvider>
          <AppSettingsProvider>
            <ProfileProvider>
              <HelpProvider>
                <div className="flex min-h-screen flex-col items-center justify-center bg-background p-4 text-center">
                  <div className="max-w-md">
                    <SgsAppLogo className="mx-auto h-16 w-16 text-primary mb-6" />
                    <h1 className="text-4xl font-bold tracking-tight text-foreground sm:text-5xl">Página Não Encontrada</h1>
                    <p className="mt-4 text-muted-foreground">
                      Desculpe, não conseguimos encontrar a página que você está procurando.
                    </p>
                    <div className="mt-8 flex justify-center">
                      <Button asChild>
                        <Link href="/">Voltar para o Início</Link>
                      </Button>
                    </div>
                  </div>
                </div>
                <Toaster />
              </HelpProvider>
            </ProfileProvider>
          </AppSettingsProvider>
        </FirebaseClientProvider>
      </body>
    </html>
  );
}