import type { Metadata, Viewport } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import { AppSettingsProvider } from '@/context/app-settings-context';
import { ProfileProvider } from '@/context/profile-context';
import { HelpProvider } from '@/context/help-context';
import { Toaster } from '@/components/ui/toaster';
import { FirebaseClientProvider } from '@/firebase';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'ALMA Guardia',
  description: 'Sistema de Gestão de Segurança Completa e Inteligente.',
  manifest: '/manifest.json',
  icons: { // Aponta para o ícone principal no Firebase Storage
    icon: 'https://firebasestorage.googleapis.com/v0/b/studio-6033207211-536c4.firebasestorage.app/o/Logo-Final-ico.ico?alt=media&token=7b88f673-93d1-4e01-a1c7-bf0da7beaa86',
    shortcut: 'https://firebasestorage.googleapis.com/v0/b/studio-6033207211-536c4.firebasestorage.app/o/Logo-Final-ico.ico?alt=media&token=7b88f673-93d1-4e01-a1c7-bf0da7beaa86',
    apple: 'https://firebasestorage.googleapis.com/v0/b/studio-6033207211-536c4.firebasestorage.app/o/Logo-Final-ico.ico?alt=media&token=7b88f673-93d1-4e01-a1c7-bf0da7beaa86',
    other: [{ rel: 'icon', url: 'https://firebasestorage.googleapis.com/v0/b/studio-6033207211-536c4.firebasestorage.app/o/Logo-Final-ico.ico?alt=media&token=7b88f673-93d1-4e01-a1c7-bf0da7beaa86' }]
  },
};

export const viewport: Viewport = {
  themeColor: '#18181b', // Cor da barra de status em dispositivos móveis
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {  
  return (
    <html lang="pt-BR" suppressHydrationWarning>
      <body className={inter.className}>
        <FirebaseClientProvider>
          <ProfileProvider>
            <AppSettingsProvider>
              <HelpProvider>
                <div className="flex flex-col lg:flex-row w-full min-h-screen">
                  {children}
                </div>
                <Toaster />
              </HelpProvider>
            </AppSettingsProvider>
          </ProfileProvider>
        </FirebaseClientProvider>
      </body>
    </html>
  );
}