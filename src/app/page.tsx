import { Button } from '@/components/ui/button';
import { SgsAppLogo } from '@/components/icons';
import { ArrowRight, ShieldCheck, HardHat, FileText, BarChart, CheckCircle, Smartphone, BarChart3, TrendingUp } from 'lucide-react';
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
      title: "Gestão de Riscos e Ocorrências",
      description: "Registre, analise e trate riscos e incidentes de forma centralizada.",
      icon: <ShieldCheck className="h-10 w-10 text-primary" />,
      image: "https://picsum.photos/seed/sgs1/600/400",
      imageHint: "safety management"
    },
    {
      title: "Controle de Equipamentos",
      description: "Gerencie o inventário e as vistorias de todos os seus equipamentos de segurança.",
      icon: <HardHat className="h-10 w-10 text-primary" />,
      image: "https://picsum.photos/seed/sgs2/600/400",
      imageHint: "safety equipment"
    },
    {
      title: "Documentação Digital",
      description: "Acesse e gerencie POPs, TCRs e outros documentos importantes em um só lugar.",
      icon: <FileText className="h-10 w-10 text-primary" />,
      image: "https://picsum.photos/seed/sgs3/600/400",
      imageHint: "documents"
    },
    {
      title: "Relatórios e Mapas",
      description: "Visualize dados com relatórios detalhados e mapas interativos georreferenciados.",
      icon: <BarChart className="h-10 w-10 text-primary" />,
      image: "https://picsum.photos/seed/sgs4/600/400",
      imageHint: "charts map"
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
      <header className="sticky top-0 z-50 px-4 lg:px-6 h-16 flex items-center border-b bg-background/95 backdrop-blur-sm">
        <Link className="flex items-center justify-center gap-2" href="/">
          <SgsAppLogo className="h-6 w-6 text-primary" />
          <span className="font-bold text-lg">SGS APP</span>
        </Link>
        <nav className="ml-auto flex items-center gap-4 sm:gap-6">
           <Button variant="ghost" asChild>
            <Link href="#funcionalidades">Funcionalidades</Link>
          </Button>
           <Button variant="ghost" asChild>
            <Link href="#beneficios">Benefícios</Link>
          </Button>
          <Button variant="secondary" asChild>
            <Link href={loginOrDashboardLink}>Entrar</Link>
          </Button>
          <Button asChild>
            <Link href="/login">Criar Conta</Link>
          </Button>
        </nav>
      </header>

      <main className="flex-1">
        <section className="w-full py-20 md:py-28 lg:py-32">
          <div className="container grid items-center gap-6 px-4 md:px-6 lg:grid-cols-2 lg:gap-12">
            <div className="flex flex-col justify-center space-y-6">
              <h1 className="text-4xl font-bold tracking-tighter sm:text-5xl md:text-6xl text-primary">
                Gestão de Segurança Completa e Inteligente.
              </h1>
              <p className="max-w-[600px] text-muted-foreground md:text-xl">
                O SGS APP é a plataforma definitiva para digitalizar seus processos de segurança, garantir conformidade e tomar decisões baseadas em dados.
              </p>
              <Button size="lg" asChild className="w-fit">
                <Link href={loginOrDashboardLink}>
                  Comece Agora
                  <ArrowRight className="ml-2 h-5 w-5" />
                </Link>
              </Button>
            </div>
            <div className="flex items-center justify-center">
              <Card className="overflow-hidden shadow-2xl border-primary/20 w-full max-w-lg">
                <CardContent className="p-0">
                  <div className="aspect-video">
                    <iframe
                      className="w-full h-full"
                      src="https://www.youtube.com/embed/7xVsIRKq1dE?autoplay=1&mute=1&loop=1&playlist=7xVsIRKq1dE&controls=0&showinfo=0&rel=0"
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
              <div className="inline-block rounded-lg bg-muted px-3 py-1 text-sm">Funcionalidades em Destaque</div>
              <h2 className="text-3xl font-bold tracking-tighter sm:text-5xl">Uma Ferramenta para Cada Necessidade</h2>
              <p className="max-w-[900px] text-muted-foreground md:text-xl/relaxed lg:text-base/relaxed xl:text-xl/relaxed">
                Centralize toda a sua operação de segurança em uma plataforma poderosa e intuitiva.
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
