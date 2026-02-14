'use client';

import { Button } from '@/components/ui/button';
import { ArrowRight, ListTodo, Siren, ShieldCheck, Megaphone, Sprout, HardHat, ClipboardList, Route, BookText, FileText, HeartPulse, Files, Settings, CheckCircle, Smartphone, BarChart3, TrendingUp, Map } from 'lucide-react';
import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from "@/components/ui/carousel"
import Image from 'next/image';

export default function HomePage() {
  const loginOrDashboardLink = '/login';

  const features = [
    {
      title: "Lembretes",
      description: "Painel central para visualizar pendências como tratamentos atrasados, vistorias de equipamentos e avisos de campo.",
      icon: <ListTodo className="h-10 w-10 text-primary" />,
      image: "https://picsum.photos/seed/lembretes/600/400",
      imageHint: "dashboard reminders"
    },
    {
      title: "Acidentes/Incidentes",
      description: "Registre, relate e visualize ocorrências em um mapa interativo para identificar áreas de risco e tomar ações preventivas.",
      icon: <Siren className="h-10 w-10 text-primary" />,
      image: "https://picsum.photos/seed/acidentes/600/400",
      imageHint: "accident report"
    },
    {
      title: "Tratamento de Risco",
      description: "Documente riscos, defina tratamentos, monitore a situação (pendente, finalizado) e visualize os pontos em um mapa.",
      icon: <ShieldCheck className="h-10 w-10 text-primary" />,
      image: "https://picsum.photos/seed/tratamento/600/400",
      imageHint: "risk management"
    },
    {
      title: "Central de Avisos",
      description: "Canal direto para a equipe de campo reportar observações, agilizando a comunicação e a resposta da gestão.",
      icon: <Megaphone className="h-10 w-10 text-primary" />,
      image: "https://picsum.photos/seed/avisos/600/400",
      imageHint: "communication alert"
    },
    {
      title: "Fauna Flora Geo",
      description: "Registre e monitore avistamentos e características ambientais com localização no mapa, para gestão e estudos.",
      icon: <Sprout className="h-10 w-10 text-primary" />,
      image: "https://picsum.photos/seed/fauna/600/400",
      imageHint: "environmental monitoring"
    },
    {
      title: "Equipamentos",
      description: "Gerencie o inventário completo de equipamentos, controle vistorias, datas de validade e status de cada item.",
      icon: <HardHat className="h-10 w-10 text-primary" />,
      image: "https://picsum.photos/seed/equipamentos/600/400",
      imageHint: "safety equipment"
    },
    {
      title: "Avaliação de Riscos",
      description: "Realize avaliações formais detalhando causa, perigo, dano e controles para cada etapa de uma atividade.",
      icon: <ClipboardList className="h-10 w-10 text-primary" />,
      image: "https://picsum.photos/seed/avaliacao/600/400",
      imageHint: "risk assessment"
    },
    {
      title: "Atividades",
      description: "Associe POPs, TCRs e Avaliações de Risco a cada atividade registrada, garantindo conformidade e controle.",
      icon: <Route className="h-10 w-10 text-primary" />,
      image: "https://picsum.photos/seed/atividades/600/400",
      imageHint: "activity planning"
    },
    {
      title: "POP",
      description: "Acesse e gerencie seus Procedimentos Operacionais Padrão de forma centralizada e digital.",
      icon: <BookText className="h-10 w-10 text-primary" />,
      image: "https://picsum.photos/seed/pop/600/400",
      imageHint: "standard procedures"
    },
    {
      title: "TCR",
      description: "Consulte e gerencie os Termos de Conhecimento de Risco para garantir que todos estejam cientes dos perigos.",
      icon: <FileText className="h-10 w-10 text-primary" />,
      image: "https://picsum.photos/seed/tcr/600/400",
      imageHint: "risk agreement"
    },
    {
      title: "RAME",
      description: "Visualize o Recurso de Atendimento Médico de Emergência, com edição online para administradores.",
      icon: <HeartPulse className="h-10 w-10 text-primary" />,
      image: "https://picsum.photos/seed/rame/600/400",
      imageHint: "emergency plan"
    },
    {
      title: "Documentos SGS",
      description: "Centralize todos os documentos essenciais do seu Sistema de Gestão de Segurança em um único lugar.",
      icon: <Files className="h-10 w-10 text-primary" />,
      image: "https://picsum.photos/seed/sgsdocs/600/400",
      imageHint: "document management"
    },
    {
      title: "Mapa Interativo",
      description: "Visualize todos os seus registros em um mapa dinâmico. Aplique filtros por tipo, data, local e situação para analisar padrões e tomar decisões estratégicas.",
      icon: <Map className="h-10 w-10 text-primary" />,
      image: "https://picsum.photos/seed/mapa/600/400",
      imageHint: "interactive map"
    },
    {
      title: "Configurações",
      description: "Personalize o sistema, gerencie perfis de acesso e configure as opções dos formulários para adaptar o app à sua realidade.",
      icon: <Settings className="h-10 w-10 text-primary" />,
      image: "https://picsum.photos/seed/configuracoes/600/400",
      imageHint: "system settings"
    }
  ];

  const benefits = [
    {
      title: "Segurança Reforçada",
      description: "Processos claros e monitoramento constante para um ambiente mais seguro.",
      icon: <CheckCircle className="w-8 h-8 text-primary" />
    },
    {
      title: "Conformidade Garantida",
      description: "Alinhado com as normas, como a NBR 21101, para evitar multas e problemas.",
      icon: <TrendingUp className="w-8 h-8 text-primary" />
    },
    {
      title: "Acesso Onde Estiver",
      description: "Gerencie sua operação de segurança pelo celular ou computador.",
      icon: <Smartphone className="w-8 h-8 text-primary" />
    },
    {
      title: "Decisões Inteligentes",
      description: "Utilize dados e relatórios para tomar decisões mais eficazes e proativas.",
      icon: <BarChart3 className="w-8 h-8 text-primary" />
    }
  ];

  return (
    <div className="flex flex-col min-h-screen bg-background text-foreground">
      <header className="sticky top-0 z-50 px-4 lg:px-6 h-24 flex items-center justify-between border-b bg-card/95 backdrop-blur-sm">
        <div className="flex-1 flex justify-start">
          <Link className="flex items-center justify-center gap-2" href="/">
             <Image
              src="https://firebasestorage.googleapis.com/v0/b/brave-drive-472322-m2.firebasestorage.app/o/Logo%20da%20SGS%20APP%20Arenito.jpg?alt=media&token=56ad9d35-b9ec-42cd-bc0f-d9ade32406db"
              alt="SGS APP Logo"
              width={56}
              height={56}
              className="object-contain"
            />
            <span className="font-bold text-xl text-primary">SGS APP</span>
          </Link>
        </div>
        
        <nav className="hidden md:flex items-center justify-center gap-6">
           <Button variant="link" asChild className="text-lg text-primary hover:underline">
            <Link href="#funcionalidades">Funcionalidades</Link>
          </Button>
           <Button variant="link" asChild className="text-lg text-primary hover:underline">
            <Link href="#beneficios">Benefícios</Link>
          </Button>
          <Button variant="link" asChild className="text-lg text-primary hover:underline">
            <Link href="/solicitar-informacoes">Solicite Informações</Link>
          </Button>
        </nav>

        <div className="flex-1 flex justify-end">
          <Button variant="link" asChild className="text-lg text-primary hover:no-underline">
            <Link href={loginOrDashboardLink}>Entrar</Link>
          </Button>
        </div>
      </header>

      <main className="flex-1">
        <section className="w-full py-20 md:py-28 lg:py-32">
          <div className="container grid items-stretch gap-6 px-4 md:px-6 lg:grid-cols-2 lg:gap-12">
            <div className="flex flex-col justify-center space-y-6 text-center items-center">
              <h1 className="text-4xl font-bold tracking-tighter sm:text-5xl md:text-6xl lg:text-7xl text-primary">
                Sistema de Gestão de Segurança Completa e Inteligente.
              </h1>
              <p className="max-w-[600px] text-muted-foreground md:text-xl text-center">
                O SGS APP é a plataforma definitiva para digitalizar seus processos de segurança, garantir conformidade e tomar decisões baseadas em dados.
              </p>
            </div>
            <div className="flex items-center justify-center">
              <Card className="overflow-hidden shadow-2xl border-primary/20 w-full h-full flex flex-col">
                <CardContent className="p-0 flex-1">
                  <div className="w-full h-full">
                    <iframe
                      className="w-full h-full"
                      src="https://www.youtube.com/embed/7xVsIRKq1dE?controls=1&rel=0&showinfo=0"
                      title="YouTube video player"
                      frameBorder="0"
                      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                      allowFullScreen>
                    </iframe>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </section>
        
        <section id="funcionalidades" className="w-full py-20 md:py-24 bg-card/20">
          <div className="container px-4 md:px-6">
            <div className="flex flex-col items-center justify-center space-y-4 text-center mb-12">
              <div className="inline-block rounded-lg bg-muted px-3 py-1 text-sm">Funcionalidades do SGS APP</div>
              <h2 className="text-3xl font-bold tracking-tighter sm:text-5xl">Uma Ferramenta para Cada Necessidade</h2>
              <p className="max-w-[900px] text-muted-foreground md:text-xl/relaxed lg:text-base/relaxed xl:text-xl/relaxed">
                Explore os módulos que transformam a gestão de segurança da sua operação, tornando-a mais digital, inteligente e em conformidade.
              </p>
            </div>
            <Carousel
              opts={{
                align: "start",
                loop: true,
              }}
              className="w-full max-w-6xl mx-auto"
            >
              <CarouselContent>
                {features.map((feature, index) => (
                  <CarouselItem key={index} className="md:basis-1/2 lg:basis-1/3">
                    <div className="p-1">
                      <Card className="h-full overflow-hidden transition-all hover:shadow-xl hover:-translate-y-1">
                        <CardContent className="p-0">
                          <Image
                            src={feature.image}
                            alt={feature.title}
                            width={600}
                            height={400}
                            className="w-full h-48 object-cover"
                            data-ai-hint={feature.imageHint}
                          />
                        </CardContent>
                        <CardHeader>
                          <CardTitle className="flex items-center gap-3">
                            {feature.icon}
                            <span>{feature.title}</span>
                          </CardTitle>
                          <CardDescription className="pt-2">{feature.description}</CardDescription>
                        </CardHeader>
                      </Card>
                    </div>
                  </CarouselItem>
                ))}
              </CarouselContent>
              <CarouselPrevious className="absolute left-0 top-1/2 -translate-y-1/2 -translate-x-4" />
              <CarouselNext className="absolute right-0 top-1/2 -translate-y-1/2 translate-x-4" />
            </Carousel>
          </div>
        </section>

        <section className="w-full py-20 md:py-24">
          <div className="container grid items-center gap-6 px-4 md:px-6 lg:grid-cols-2 lg:gap-12">
            <Image
              src="https://picsum.photos/seed/sgs-cta/600/600"
              alt="Digitalize sua Gestão"
              width={600}
              height={600}
              className="mx-auto aspect-square overflow-hidden rounded-xl object-cover sm:w-full"
              data-ai-hint="safety audit checklist"
            />
            <div className="space-y-4">
              <div className="inline-block rounded-lg bg-muted px-3 py-1 text-sm">TEXTO AQUI</div>
              <h2 className="text-3xl font-bold tracking-tighter sm:text-5xl">Digitalize, Otimize, Previna.</h2>
              <p className="max-w-[600px] text-muted-foreground md:text-xl/relaxed lg:text-base/relaxed xl:text-xl/relaxed">
                TEXTO AQUI
              </p>
              <Button size="lg" asChild>
                <Link href={loginOrDashboardLink}>
                  Crie sua Conta Agora
                  <ArrowRight className="ml-2 h-5 w-5" />
                </Link>
              </Button>
            </div>
          </div>
        </section>

        <section id="beneficios" className="w-full py-20 md:py-24 bg-card/20">
          <div className="container px-4 md:px-6">
            <div className="flex flex-col items-center justify-center space-y-4 text-center mb-12">
               <div className="inline-block rounded-lg bg-muted px-3 py-1 text-sm">Nossos Benefícios</div>
              <h2 className="text-3xl font-bold tracking-tighter sm:text-5xl">Por que escolher o SGS APP?</h2>
              <p className="max-w-[900px] text-muted-foreground md:text-xl/relaxed lg:text-base/relaxed xl:text-xl/relaxed">
                TEXTO AQUI
              </p>
            </div>
            <div className="mx-auto grid max-w-5xl gap-8 sm:grid-cols-2 lg:grid-cols-4">
              {benefits.map((benefit, index) => (
                 <div key={index} className="flex flex-col items-center text-center space-y-3">
                  <div className="p-4 rounded-full bg-primary/10 border-2 border-primary/20">
                    {benefit.icon}
                  </div>
                  <h3 className="text-xl font-bold">{benefit.title}</h3>
                  <p className="text-muted-foreground">{benefit.description}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="w-full py-20 md:py-24 bg-card/20 border-t">
          <div className="container grid items-center justify-center gap-4 px-4 text-center md:px-6">
            <div className="space-y-3">
              <h2 className="text-3xl font-bold tracking-tighter md:text-4xl/tight">
                Transforme sua Gestão de Segurança Hoje.
              </h2>
              <p className="mx-auto max-w-[600px] text-muted-foreground md:text-xl/relaxed lg:text-base/relaxed xl:text-xl/relaxed">
                Junte-se a nós e leve sua operação para o próximo nível de segurança e eficiência.
              </p>
            </div>
            <div className="mx-auto w-full max-w-sm space-y-2">
               <Button size="lg" className="w-full" asChild>
                <Link href={loginOrDashboardLink}>Começar Gratuitamente</Link>
              </Button>
            </div>
          </div>
        </section>
      </main>

      <footer className="flex flex-col gap-2 sm:flex-row py-6 w-full shrink-0 items-center px-4 md:px-6 border-t">
        <p className="text-xs text-muted-foreground">&copy; 2024 SGS APP. Todos os direitos reservados.</p>
        <nav className="sm:ml-auto flex gap-4 sm:gap-6">
          <Link className="text-xs hover:underline underline-offset-4" href="#">
            TEXTO AQUI
          </Link>
          <Link className="text-xs hover:underline underline-offset-4" href="#">
            TEXTO AQUI
          </Link>
        </nav>
      </footer>
    </div>
  );
}
