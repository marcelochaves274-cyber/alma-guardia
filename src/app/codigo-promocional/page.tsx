'use client';

import { useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { ArrowLeft, Loader2, ShieldCheck, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

const officialLogoUrl = 'https://firebasestorage.googleapis.com/v0/b/brave-drive-472322-m2.firebasestorage.app/o/ALMA%20-%20Simbolo_letreiro%20Branco%20%20-%20Grande.png?alt=media&token=674ce95f-b9e9-4212-8895-6753b1af996d';

function PromotionalCodeForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [code, setCode] = useState('');
  const [isContinuing, setIsContinuing] = useState(false);
  const trackingFailed = searchParams.get('clique') === 'nao-registrado';

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const normalizedCode = code.trim();
    if (!normalizedCode) return;

    setIsContinuing(true);
    router.push(`/cadastro?codigo=${encodeURIComponent(normalizedCode)}`);
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
              <Sparkles className="h-7 w-7" />
            </div>
            <div className="space-y-2">
              <p className="flex items-center justify-center gap-2 text-xs font-semibold uppercase tracking-[0.18em] text-primary">
                <ShieldCheck className="h-4 w-4" />
                Benefício exclusivo
              </p>
              <CardTitle className="text-2xl font-bold tracking-tight sm:text-3xl">
                Você tem um código promocional?
              </CardTitle>
              <CardDescription className="mx-auto max-w-sm text-base">
                Informe seu código e continue para criar sua conta no ALMA Guardia.
              </CardDescription>
            </div>
          </CardHeader>
          <form onSubmit={handleSubmit}>
            <CardContent className="space-y-5">
              <div className="space-y-2">
                <Label htmlFor="promotional-code">Seu código</Label>
                <Input
                  id="promotional-code"
                  autoComplete="off"
                  placeholder="Digite ou cole seu código"
                  value={code}
                  onChange={(event) => setCode(event.target.value)}
                  disabled={isContinuing}
                  required
                  className="h-12 text-base"
                />
              </div>
              <p className="text-center text-sm leading-relaxed text-muted-foreground">
                O desconto e as condições serão apresentados no checkout seguro do Stripe.
              </p>
            {trackingFailed && (
              <p role="status" className="rounded-md border border-primary/20 bg-primary/5 p-3 text-sm text-muted-foreground">
                Não conseguimos contabilizar este acesso, mas você pode continuar normalmente.
              </p>
            )}
              <Button type="submit" size="lg" className="w-full shadow-md shadow-primary/15" disabled={!code.trim() || isContinuing}>
                {isContinuing && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Continuar para criar conta
              </Button>
              <Button asChild variant="ghost" className="w-full">
                <Link href="/">
                  <ArrowLeft className="mr-2 h-4 w-4" />
                  Voltar ao site
                </Link>
              </Button>
            </CardContent>
          </form>
        </Card>
        <p className="text-center text-xs text-muted-foreground">
          Sistema de Gestão de Segurança · ALMA Guardia
        </p>
      </div>
    </main>
  );
}

export default function PromotionalCodePage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen w-full items-center justify-center bg-background">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      }
    >
      <PromotionalCodeForm />
    </Suspense>
  );
}
