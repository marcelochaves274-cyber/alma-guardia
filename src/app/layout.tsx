import type {Metadata} from 'next';
import './globals.css';
import { Toaster } from '@/components/ui/toaster';
import { AppSettingsProvider } from '@/context/app-settings-context';
import { FirebaseClientProvider } from '@/firebase/client-provider';
import { HelpProvider } from '@/context/help-context';
import { ProfileProvider } from '@/context/profile-context';

export const metadata: Metadata = {
  title: 'SGS APP',
  description: 'Seu Sistema de Gestão de Segurança inteligente.',
  manifest: '/manifest.json',
  icons: {
    icon: '/icon.png',
    apple: '/apple-icon.png',
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pt-BR" suppressHydrationWarning>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        <link href="https://fonts.googleapis.com/css2?family=Inter&display=swap" rel="stylesheet" />
      </head>
      <body className="font-body antialiased">
        <FirebaseClientProvider>
          <ProfileProvider>
            <AppSettingsProvider>
              <HelpProvider>
                {children}
              </HelpProvider>
            </AppSettingsProvider>
          </ProfileProvider>
          <Toaster />
        </FirebaseClientProvider>
      </body>
    </html>
  );
}
