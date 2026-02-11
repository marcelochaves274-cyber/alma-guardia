'use client';

import { usePathname } from 'next/navigation';
import { AppSettingsProvider } from '@/context/app-settings-context';
import { FirebaseClientProvider } from '@/firebase/client-provider';
import { HelpProvider } from '@/context/help-context';
import { ProfileProvider } from '@/context/profile-context';

export function Providers({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isAppPage = pathname !== '/';

  if (isAppPage) {
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

  return <>{children}</>;
}
