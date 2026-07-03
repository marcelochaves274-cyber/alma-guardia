import type {Metadata} from 'next';
import './globals.css';
import { Toaster } from '@/components/ui/toaster';
import { Providers } from '@/components/providers';

const faviconUrl = "https://firebasestorage.googleapis.com/v0/b/studio-6033207211-536c4.firebasestorage.app/o/Logo-Final-ico.ico?alt=media&token=7b88f673-93d1-4e01-a1c7-bf0da7beaa86";
const pwaIconUrl = "https://firebasestorage.googleapis.com/v0/b/brave-drive-472322-m2.firebasestorage.app/o/Verde.png?alt=media&token=8e64aaf1-e539-4838-b252-da902a910c36";

export const metadata: Metadata = {
  title: 'ALMA',
  description: 'Seu Sistema de Gestão de Segurança inteligente.',
  manifest: '/manifest.json',
  icons: {
    icon: faviconUrl, // Ícone para a aba do navegador
    shortcut: pwaIconUrl, // Ícone para atalhos (Android)
    apple: pwaIconUrl, // Ícone para tela inicial (iOS/Apple)
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
<link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
<link href="https://fonts.googleapis.com/css2?family=Poppins:wght@400;500;600;700&display=swap" rel="stylesheet" />
      
      </head>
      <body className="font-body antialiased">
        <Providers>
          {children}
        </Providers>
        <Toaster />
      </body>
    </html>
  );
}
