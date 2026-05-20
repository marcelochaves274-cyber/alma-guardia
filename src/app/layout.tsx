import type {Metadata} from 'next';
import './globals.css';
import { Toaster } from '@/components/ui/toaster';
import { Providers } from '@/components/providers';

const iconUrl = "https://firebasestorage.googleapis.com/v0/b/studio-6033207211-536c4.firebasestorage.app/o/Logo-solo-192x192-ico.ico?alt=media&token=8d56a40a-cd7d-4d85-87b2-46d6f322be45";

export const metadata: Metadata = {
  title: 'ALMA',
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
