'use client';

import { useUser } from '@/firebase';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

import { Button } from '@/components/ui/button';
import { SgsAppLogo } from '@/components/icons';
import { ArrowRight, ShieldCheck, LayoutList, BarChart, Loader2 } from 'lucide-react';

function Loader() {
  return (
    <div className="flex h-screen w-screen flex-col items-center justify-center gap-4 bg-background text-foreground">
      <Loader2 className="h-12 w-12 animate-spin text-primary" />
      <p className="text-muted-foreground">Aguarde, carregando...</p>
    </div>
  );
}

function MarketingPage() {
  const router = useRouter();
  const handleRedirect = () => router.push('/login');

  return (
    <div className="flex flex-col min-h-screen bg-background text-foreground">
      <header className="px-4 lg:px-6 h-16 flex items-center border-b">
        <a className="flex items-center justify-center" href="#">
          <SgsAppLogo className="h-6 w-6 text-primary" />
          <span className="sr-only">SGS APP</span>
        </a>
        <nav className="ml-auto flex gap-4 sm:gap-6">
          <Button variant="ghost" onClick={handleRedirect}>
            Entrar
          </Button>
          <Button onClick={handleRedirect}>
            Criar Conta
          </Button>
        </nav>
      </header>

      <main className="flex-1">
        <section className="w-full py-20 md:py-32 lg:py-40 bg-card/50">
          <div className="container px-4 md:px-6 text-center">
            <div className="max-w-3xl mx-auto space-y-4">
              <h1 className="text-4xl font-bold tracking-tighter sm:text-5xl md:text-6xl text-primary">
                Seu Sistema de Gestão de Segurança, Simplificado.
              </h1>
              <p className="text-lg text-muted-foreground md:text-xl">
                Digitalize seus processos, centralize informações e garanta a conformidade com a NBR 21101 de forma inteligente e eficiente.
              </p>
              <Button size="lg" onClick={handleRedirect}>
                Comece Agora
                <ArrowRight className="ml-2 h-5 w-5" />
              </Button>
            </div>
          </div>
        </section>

        <section className="w-full py-20 md:py-32">
          <div className="container px-4 md:px-6">
            <div className="flex flex-col items-center justify-center space-y-4 text-center">
              <div className="space-y-2">
                <div className="inline-block rounded-lg bg-muted px-3 py-1 text-sm">Funcionalidades Principais</div>
                <h2 className="text-3xl font-bold tracking-tighter sm:text-5xl">Tudo que você precisa para uma gestão de segurança eficaz</h2>
                <p className="max-w-[900px] text-muted-foreground md:text-xl/relaxed lg:text-base/relaxed xl:text-xl/relaxed">
                  Desde o registro de ocorrências até o controle de equipamentos e documentos, o SGS APP centraliza suas operações.
                </p>
              </div>
            </div>
            <div className="mx-auto grid max-w-5xl items-center gap-6 py-12 lg:grid-cols-3 lg:gap-12">
              <div className="flex flex-col items-center text-center space-y-3">
                <div className="p-3 rounded-full bg-primary/10 border-2 border-primary/20">
                  <ShieldCheck className="h-8 w-8 text-primary" />
                </div>
                <h3 className="text-xl font-bold">Gestão de Riscos e Ocorrências</h3>
                <p className="text-muted-foreground">Registre, analise e trate riscos e incidentes com fluxos de trabalho claros e marcação georreferenciada no mapa.</p>
              </div>
              <div className="flex flex-col items-center text-center space-y-3">
                <div className="p-3 rounded-full bg-primary/10 border-2 border-primary/20">
                  <LayoutList className="h-8 w-8 text-primary" />
                </div>
                <h3 className="text-xl font-bold">Documentação Centralizada</h3>
                <p className="text-muted-foreground">Gerencie POPs, TCRs, RAME e outros documentos do SGS em um único local, acessível a toda a equipe autorizada.</p>
              </div>
              <div className="flex flex-col items-center text-center space-y-3">
                 <div className="p-3 rounded-full bg-primary/10 border-2 border-primary/20">
                  <BarChart className="h-8 w-8 text-primary" />
                </div>
                <h3 className="text-xl font-bold">Relatórios e Lembretes</h3>
                <p className="text-muted-foreground">Obtenha relatórios detalhados e um painel de lembretes para nunca perder um prazo de vistoria ou tratamento de risco.</p>
              </div>
            </div>
          </div>
        </section>

        <section className="w-full py-20 md:py-32 bg-card/50">
          <div className="container grid items-center justify-center gap-4 px-4 text-center md:px-6">
            <div className="space-y-3">
              <h2 className="text-3xl font-bold tracking-tighter md:text-4xl/tight">
                Pronto para transformar sua gestão de segurança?
              </h2>
              <p className="mx-auto max-w-[600px] text-muted-foreground md:text-xl/relaxed lg:text-base/relaxed xl:text-xl/relaxed">
                Crie sua conta e comece a explorar todas as funcionalidades que o SGS APP pode oferecer para sua operação.
              </p>
            </div>
            <div className="mx-auto w-full max-w-sm space-y-2">
               <Button size="lg" className="w-full" onClick={handleRedirect}>
                Começar a Usar
              </Button>
            </div>
          </div>
        </section>
      </main>

      <footer className="flex flex-col gap-2 sm:flex-row py-6 w-full shrink-0 items-center px-4 md:px-6 border-t">
        <p className="text-xs text-muted-foreground">&copy; 2024 SGS APP. Todos os direitos reservados.</p>
      </footer>
    </div>
  );
}

export default function Home() {
  const { user, isUserLoading } = useUser();
  const router = useRouter();

  useEffect(() => {
    // This effect handles redirection based on auth state.
    // It runs whenever the loading status or user object changes.
    if (!isUserLoading && user) {
      // If loading is complete and a user exists, redirect to the dashboard.
      router.replace('/dashboard');
    }
  }, [isUserLoading, user, router]);

  // While checking auth state, or if a user exists (and we're about to redirect),
  // show a loader. This prevents the marketing page from flashing for logged-in users.
  if (isUserLoading || user) {
    return <Loader />;
  }

  // If loading is complete and there's no user, show the marketing page.
  return <MarketingPage />;
}
