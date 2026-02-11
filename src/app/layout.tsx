import type {Metadata} from 'next';
import './globals.css';
import { Toaster } from '@/components/ui/toaster';
import { AppSettingsProvider } from '@/context/app-settings-context';
import { FirebaseClientProvider } from '@/firebase/client-provider';
import { HelpProvider } from '@/context/help-context';
import { ProfileProvider } from '@/context/profile-context';

const iconUrl = "https://firebasestorage.googleapis.com/v0/b/brave-drive-472322-m2.firebasestorage.app/o/Logo%20da%20SGS%20APP%20Arenito.jpg?alt=media&token=56ad9d35-b9ec-42cd-bc0f-d9ade32406db";

export const metadata: Metadata = {
  title: 'SGS APP',
  description: 'Seu Sistema de Gestão de Segurança inteligente.',
  manifest: '/manifest.json',
  icons: {
    icon: iconUrl,
    shortcut: iconUrl,
    apple: iconUrl,
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
        <meta name="viewport" content="width=device-width, initial-scale=1" />
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
