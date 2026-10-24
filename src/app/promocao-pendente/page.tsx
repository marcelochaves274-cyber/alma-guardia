'use client';

import { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { Loader2, ShieldCheck } from 'lucide-react';
import { auth } from '@/firebase/config';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

const officialLogoUrl = 'https://firebasestorage.googleapis.com/v0/b/brave-drive-472322-m2.firebasestorage.app/o/ALMA%20-%20Simbolo_letreiro%20Branco%20%20-%20Grande.png?alt=media&token=674ce95f-b9e9-4212-8895-6753b1af996d';

export default function PromotionalCheckoutPendingPage() {
  const [isOpeningCheckout, setIsOpeningCheckout] = useState(false);
  const [message, setMessage] = useState(
    'O checkout promocional ainda não foi configurado. Sua conta e seu código foram salvos; tente novamente mais tarde.'
  );

  const handleOpenCheckout = async () => {
    const user = auth.currentUser;
    if (!user) {
      setMessage('Entre na conta criada com o código promocional para continuar.');
      return;
    }

    setIsOpeningCheckout(true);
    setMessage('');

    try {
      const response = await fetch('/api/promo-checkout', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${await user.getIdToken()}`,
        },
      });
      const result = await response.json() as { url?: unknown; error?: unknown };

      if (!response.ok || typeof result.url !== 'string') {
        throw new Error(
          typeof result.error === 'string'
            ? result.error
            : 'Não foi possível abrir o checkout promocional.'
        );
      }

      window.location.assign(result.url);
    } catch (error) {
      console.error('Não foi possível abrir o checkout promocional:', error);
      setMessage(
        error instanceof Error
          ? error.message
          : 'Não foi possível abrir o checkout. Tente novamente.'
      );
    } finally {
      setIsOpeningCheckout(false);
    }
  };

  return (
    <main className="relative flex min-h-screen w-full flex-1 items-center justify-center overflow-hidden bg-background px-4 py-12">
      <div aria-hidden="true" className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute left-1/2 top-0 h-80 w-80 -translate-x-1/2 rounded-full bg-primary/10 blur-3xl" />
        <div className="absolute -bottom-40 -right-32 h-80 w-80 rounded-full bg-accent/10 blur-3xl" />
      </div>
      <div className="relative z-10 mx-auto flex w-full max-w-lg flex-col items-center gap-6">
        <Link href="/" aria-label="ALMA Guardia, voltar ao início" className="rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
          <Image
            src={officialLogoUrl}
            alt="ALMA Guardia"
            width={240}
            height={100}
            priority
            className="h-16 w-auto object-contain sm:h-20"
          />
        </Link>
        <Card className="w-full overflow-hidden border-primary/25 bg-card/90 shadow-2xl shadow-black/20 backdrop-blur-sm">
          <div className="h-1 w-full bg-gradient-to-r from-primary/40 via-primary to-primary/40" />
          <CardHeader className="space-y-4 text-center">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full border border-primary/25 bg-primary/10 text-primary">
              <ShieldCheck className="h-7 w-7" />
            </div>
            <div className="space-y-2">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-primary">
                Cadastro recebido
              </p>
              <CardTitle className="text-2xl font-bold tracking-tight sm:text-3xl">
                Seu benefício está reservado
              </CardTitle>
              <CardDescription className="mx-auto max-w-sm text-base">
                Sua conta e seu código foram salvos. O checkout promocional será
                liberado assim que o link seguro do Stripe estiver configurado.
              </CardDescription>
            </div>
          </CardHeader>
          <CardContent className="space-y-5">
            <p role="status" className="rounded-md border border-primary/20 bg-primary/5 p-3 text-center text-sm leading-relaxed text-muted-foreground">
              {message}
            </p>
            <Button
              type="button"
              size="lg"
              className="w-full shadow-md shadow-primary/15"
              onClick={handleOpenCheckout}
              disabled={isOpeningCheckout}
            >
              {isOpeningCheckout && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Tentar abrir o checkout
            </Button>
            <div className="flex flex-col gap-2 sm:flex-row">
              <Button asChild variant="outline" className="w-full">
                <Link href="/">Voltar ao site</Link>
              </Button>
              <Button asChild variant="ghost" className="w-full">
                <Link href="/login">Entrar na conta</Link>
              </Button>
            </div>
          </CardContent>
        </Card>
        <p className="text-center text-xs text-muted-foreground">
          Sistema de Gestão de Segurança · ALMA Guardia
        </p>
      </div>
    </main>
  );
}
