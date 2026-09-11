'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useEffect, useState } from 'react';
import { useProfile } from '@/context/profile-context';
import { useAppSettings } from '@/context/app-settings-context';
import Image from 'next/image';
import { ShieldCheck } from 'lucide-react';

const officialLogoUrl = 'https://firebasestorage.googleapis.com/v0/b/brave-drive-472322-m2.firebasestorage.app/o/ALMA%20-%20Simbolo_letreiro%20Branco%20%20-%20Grande.png?alt=media&token=674ce95f-b9e9-4212-8895-6753b1af996d';

export function WelcomeView() {
  const { profile } = useProfile();
  const { appName, logoUrl } = useAppSettings();
  const organizationName = appName || 'Parque de Natureza Buraco do Padre';
  const [customLogoLoaded, setCustomLogoLoaded] = useState(false);

  useEffect(() => {
    setCustomLogoLoaded(false);
  }, [logoUrl]);

  return (
    <div className="mx-auto max-w-4xl p-4">
      <Card className="overflow-hidden border-primary/25 bg-sidebar-secondary/30 shadow-lg">
        <CardHeader className="space-y-6 pb-6 text-center">
          <CardDescription className="text-sm font-semibold uppercase tracking-[0.18em] text-primary">
            Sistema de Gestão de Segurança
          </CardDescription>
          <div className="mx-auto flex min-h-40 w-full max-w-2xl items-center justify-center gap-6 overflow-hidden rounded-lg bg-black/10 p-4 sm:gap-12">
            <Image
              src={officialLogoUrl}
              alt="Logo padrão Alma Guardia"
              width={360}
              height={180}
              className={`max-h-32 w-[42%] object-contain opacity-100 transition-all duration-2000 ease-in-out sm:max-h-40 ${customLogoLoaded ? 'translate-x-0' : 'translate-x-6'}`}
              priority
            />
            {logoUrl && (
              <Image
                src={logoUrl}
                alt="Logo da organização"
                width={360}
                height={180}
                onLoad={() => setCustomLogoLoaded(true)}
                className={`max-h-32 w-[42%] object-contain transition-all duration-2000 ease-in-out sm:max-h-40 ${customLogoLoaded ? 'translate-x-0 opacity-100' : '-translate-x-6 opacity-0'}`}
                priority
              />
            )}
          </div>
          <div className="space-y-2">
            <CardTitle className="text-3xl font-bold tracking-tight sm:text-4xl">
              {organizationName}
            </CardTitle>
          </div>
        </CardHeader>
        <CardContent className="space-y-5 pb-8 text-center">
          <div className="mx-auto inline-flex items-center gap-3 rounded-full border border-primary/25 bg-primary/10 px-5 py-3 text-base font-bold text-primary shadow-sm">
            <ShieldCheck className="h-5 w-5" />
            <span>Perfil logado: {profile || 'Perfil Personalizado'}</span>
          </div>
          <p className="mx-auto max-w-xl text-muted-foreground">
            Acesso configurado para a operação de Parque de Natureza Buraco do Padre. Utilize a barra lateral para navegar pelos módulos liberados.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}