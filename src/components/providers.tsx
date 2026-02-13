'use client';

import { AppSettingsProvider } from '@/context/app-settings-context';
import { FirebaseClientProvider } from '@/firebase/client-provider';
import { HelpProvider } from '@/context/help-context';
import { ProfileProvider } from '@/context/profile-context';

export function Providers({ children }: { children: React.ReactNode }) {
  // A lógica condicional anterior baseada no 'pathname' estava causando
  // comportamento imprevisível e redirecionamentos incorretos.
  // Envolver todas as páginas nos provedores é uma abordagem mais robusta e padrão
  // que garante um gerenciamento de estado consistente em toda a aplicação.
  return (
    <FirebaseClientProvider>
      <ProfileProvider>
        <AppSettingsProvider>
          <HelpProvider>
            {children}
          </HelpProvider>
        </AppSettingsProvider>
      </ProfileProvider>
    </FirebaseClientProvider>
  );
}
