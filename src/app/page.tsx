'use client';

export const dynamic = 'force-dynamic';

import { Button } from '@/components/ui/button';
import { 
  ArrowRight, ListTodo, Siren, ShieldCheck, Megaphone, Sprout, HardHat, 
  ClipboardList, Route, BookText, FileText, HeartPulse, Files, Settings, 
  CheckCircle, Smartphone, BarChart3, TrendingUp, Map, Phone, Instagram 
} from 'lucide-react';
import Link from 'next/link';
import Image from 'next/image';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from "@/components/ui/carousel";
import { useToast } from '@/hooks/use-toast';

export default function HomePage() {
  const { toast } = useToast();
 const handleStartTrial = () => {
    window.location.href = 'https://buy.stripe.com/7sY5kDb2ldCL8Dt4I7aZi00';
  };
  const handleComingSoon = () => {
    toast({
      title: 'Aguarde',
      description: 'Esta funcionalidade estará disponível em breve.',
    });
  };

  const features = [
    {
      title: "Lembretes",
      description: "Painel central para visualizar pendências como tratamentos atrasados, vistorias de equipamentos e avisos de campo.",
      icon: <ListTodo className="h-10 w-10 text-primary" />,
      image: "https://i.ibb.co/skwdZN3/Lembretes.jpg",
      imageHint: "dashboard reminders"
    },
    {
      title: "Acidentes/Incidentes",
      description: "Registre, relate e visualize ocorrências em um mapa interativo para identificar áreas de risco e tomar ações preventivas.",
      icon: <Siren className="h-10 w-10 text-primary" />,
      image: "https://i.ibb.co/v43yJ246/Acidentes-incidentes.jpg",
      imageHint: "accident report"
    },
    {
      title: "Tratamento de Risco",
      description: "Documente riscos, defina tratamentos, monitore a situação (pendente, finalizado) e visualize os pontos em um mapa.",
      icon: <ShieldCheck className="h-10 w-10 text-primary" />,
      image: "https://i.ibb.co/fVqffWRh/Tratamento-de-Risco.jpg",
      imageHint: "risk management"
    },
    {
      title: "Central de Avisos",
      description: "Canal direto para a equipe de campo reportar observações, agilizando a comunicação e a resposta da gestão.",
      icon: <Megaphone className="h-10 w-10 text-primary" />,
      image: "https://i.ibb.co/vvkdhCNd/Central-de-Avisos.jpg",
      imageHint: "communication alert"
    },
    {
      title: "Fauna Flora Geo",
      description: "Registre e monitore avistamentos e características ambientais com localização no mapa, para gestão e estudos.",
      icon: <Sprout className="h-10 w-10 text-primary" />,
      image: "https://i.ibb.co/VcfCq6X0/Fauna-Flora-Geo.jpg",
      imageHint: "environmental monitoring"
    },
    {
      title: "Equipamentos",
      description: "Gerencie o inventário completo de equipamentos, controle vistorias, datas de validade e status de cada item.",
      icon: <HardHat className="h-10 w-10 text-primary" />,
      image: "https://i.ibb.co/84YJpLXN/Equipamentos.jpg",
      imageHint: "safety equipment"
    },
    {
      title: "Avaliação de Riscos",
      description: "Realize avaliações formais detalhando causa, perigo, dano e controles para cada etapa de uma atividade.",
      icon: <ClipboardList className="h-10 w-10 text-primary" />,
      image: "https://i.ibb.co/TDQ7ypvh/Avalia-o-de-risco.jpg",
      imageHint: "risk assessment"
    },
    {
      title: "Atividades",
      description: "Associe POPs, TCRs e Avaliações de Risco a cada atividade registrada, garantindo conformidade e controle.",
      icon: <Route className="h-10 w-10 text-primary" />,
      image: "https://i.ibb.co/xtBf2FzB/Atividades.jpg",
      imageHint: "activity planning"
    },
    {
      title: "POP",
      description: "Acesse e gerencie seus Procedimentos Operacionais Padrão de forma centralizada e digital.",
      icon: <BookText className="h-10 w-10 text-primary" />,
      image: "https://i.ibb.co/DS0B0ST/POP.jpg",
      imageHint: "standard procedures"
    },
    {
      title: "TCR",
      description: "Consulte e gerencie os Termos de Conhecimento de Risco para garantir que todos estejam cientes dos perigos.",
      icon: <FileText className="h-10 w-10 text-primary" />,
      image: "https://i.ibb.co/F4m0JNy0/TCR.jpg",
      imageHint: "risk agreement"
    },
    {
      title: "RAME",
      description: "Visualize o Recurso de Atendimento Médico de Emergência, com edição online para administradores.",
      icon: <HeartPulse className="h-10 w-10 text-primary" />,
      image: "https://i.ibb.co/bR2q7wXj/RAME.jpg",
      imageHint: "emergency plan"
    },
    {
      title: "Documentos SGS",
      description: "Centralize todos os documentos essenciais do seu Sistema de Gestão de Segurança em um único lugar.",
      icon: <Files className="h-10 w-10 text-primary" />,
      image: "https://i.ibb.co/QFTqC3CR/Doc-SGS.jpg",
      imageHint: "document management"
    },
    {
      title: "Mapa Interativo",
      description: "Visualize todos os seus registros em um mapa dinâmico. Aplique filtros por tipo, data, local e situação para analisar padrões e tomar decisões estratégicas.",
      icon: <Map className="h-10 w-10 text-primary" />,
      image: "https://i.ibb.co/zhdH2Jgb/Mapa.jpg",
      imageHint: "interactive map"
    },
    {
      title: "Configurações",
      description: "Personalize o sistema, gerencie perfis de acesso e configure as opções dos formulários para adaptar o app à sua realidade.",
      icon: <Settings className="h-10 w-10 text-primary" />,
      image: "https://i.ibb.co/5gRKH5nx/Configura-es.jpg",
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
      <header className="sticky top-0 z-50 px-4 lg:px-6 h-20 md:h-24 flex items-center justify-between border-b bg-card/95 backdrop-blur-sm">
        <div className="flex-1 flex justify-start">
          <Link className="flex items-center justify-center gap-2" href="/">
             <Image
              src="https://firebasestorage.googleapis.com/v0/b/studio-6033207211-536c4.firebasestorage.app/o/Logo%20Final.png?alt=media&token=0a7e892a-be30-4d41-818f-c224f142af68"
              alt="ALMA Guardia Logo"
              width={60}
              height={60}
              className="object-contain md:w-20 md:h-20"
            />
            <span className="font-bold text-lg md:text-xl text-primary">ALMA Guardia</span>
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
            <Link href="/login">Entrar</Link>
          </Button>
        </div>
      </header>

      <main className="flex-1">
        <section className="w-full py-20 md:py-28 lg:py-32">
          <div className="container grid items-stretch gap-6 px-4 md:px-6 lg:grid-cols-2 lg:gap-12">
            <div className="flex flex-col justify-center space-y-6 text-center items-center">
              <h1 className="text-3xl font-bold tracking-tighter sm:text-5xl md:text-6xl lg:text-7xl text-primary">
                Sistema de Gestão de Segurança Completa e Inteligente.
              </h1>
              <p className="max-w-[600px] text-muted-foreground md:text-xl text-center">
                O ALMA Guardia é a plataforma definitiva para digitalizar seus processos de segurança, garantir conformidade e tomar decisões baseadas em dados.
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
              <div className="inline-block rounded-lg bg-muted px-3 py-1 text-sm">Funcionalidades do ALMA Guardia</div>
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
              <CarouselPrevious className="hidden md:flex absolute -left-12 top-1/2 -translate-y-1/2" />
              <CarouselNext className="hidden md:flex absolute -right-12 top-1/2 -translate-y-1/2" />
            </Carousel>
          </div>
        </section>

        <section className="w-full py-20 md:py-24">
          <div className="container grid items-center gap-6 px-4 md:px-6 lg:grid-cols-2 lg:gap-12">
            <Image
              src="https://i.ibb.co/zTL6Rc4K/Valor-dos-Planos.png"
              alt="Conheça Nossos Planos"
              width={600}
              height={600}
              className="mx-auto h-auto w-full max-w-[600px] overflow-hidden rounded-xl object-contain shadow-md"
              data-ai-hint="plans pricing"
            />
            <div className="space-y-6">
              <h2 className="text-3xl font-bold tracking-tighter sm:text-5xl">Conheça Nossos Planos</h2>
              <p className="max-w-[600px] text-muted-foreground md:text-xl/relaxed lg:text-base/relaxed xl:text-xl/relaxed">
                Escolha o plano que melhor se adapta à sua operação e comece a transformar sua gestão de segurança hoje mesmo. Todos os planos incluem acesso a todas as funcionalidades e suporte dedicado.
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 pt-4">
                <Card className="flex flex-col items-center justify-center p-6 text-center bg-card/50">
                  <CardTitle className="text-2xl mb-2">Plano Mensal</CardTitle>
                  <CardDescription className="text-4xl font-bold text-primary">R$528,00</CardDescription>
                </Card>
                <Card className="flex flex-col items-center justify-center p-6 text-center bg-card/50">
                  <CardTitle className="text-2xl mb-2">Plano Anual</CardTitle>
                  <CardDescription className="text-4xl font-bold text-primary">R$5.280,00</CardDescription>
                </Card>
              </div>
            <Button size="lg" className="w-full sm:w-auto mt-4" asChild>
  <Link href="/cadastro">
    Crie uma conta e faça um mês de teste gratuito Agora
  </Link>
</Button>
            </div>
          </div>
        </section>

        <section id="beneficios" className="w-full py-20 md:py-24 bg-card/20">
          <div className="container px-4 md:px-6">
            <div className="flex flex-col items-center justify-center space-y-4 text-center mb-12">
               <div className="inline-block rounded-lg bg-muted px-3 py-1 text-sm">Nossos Benefícios</div>
              <h2 className="text-3xl font-bold tracking-tighter sm:text-5xl">Por que escolher o ALMA Guardia?</h2>
              <p className="max-w-[900px] text-muted-foreground md:text-xl/relaxed lg:text-base/relaxed xl:text-xl/relaxed">
                Mais do que um aplicativo, o ALMA Guardia é o seu parceiro estratégico para uma cultura de segurança robusta e eficiente. Centralize informações, digitalize processos e tome decisões baseadas em dados para elevar a segurança da sua operação a um novo patamar de excelência.
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

        <section className="w-full py-20 md:py-24">
          <div className="container px-4 md:px-6">
            <div className="flex flex-col items-center justify-center space-y-4 text-center mb-12">
              <h2 className="text-3xl font-bold tracking-tighter sm:text-5xl">Veja o que nossos clientes têm a dizer sobre o ALMA Guardia</h2>
            </div>
            <div className="mx-auto grid max-w-5xl items-center gap-8 sm:grid-cols-2">
              <Card className="overflow-hidden shadow-2xl border-primary/20">
                <CardContent className="p-0 aspect-video">
                    <iframe
                      className="w-full h-full"
                      src="https://www.youtube.com/embed/7xVsIRKq1dE?controls=1&rel=0&showinfo=0"
                      title="YouTube video player 1"
                      frameBorder="0"
                      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                      allowFullScreen>
                    </iframe>
                </CardContent>
              </Card>
              <Card className="overflow-hidden shadow-2xl border-primary/20">
                <CardContent className="p-0 aspect-video">
                    <iframe
                      className="w-full h-full"
                      src="https://www.youtube.com/embed/7xVsIRKq1dE?controls=1&rel=0&showinfo=0"
                      title="YouTube video player 2"
                      frameBorder="0"
                      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                      allowFullScreen>
                    </iframe>
                </CardContent>
              </Card>
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
    <Link href="/cadastro">
      Crie uma conta e faça um mês de teste gratuito
    </Link>
  </Button>
</div>
          </div>
        </section>
      </main>

      <footer className="bg-card/90 text-card-foreground border-t">
        <div className="container mx-auto py-12 px-4 md:px-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            
            <div className="lg:col-span-2 flex flex-col md:flex-row items-center md:items-start gap-8">
              <Link href="/" className="shrink-0">
                <Image
                  src="https://firebasestorage.googleapis.com/v0/b/studio-6033207211-536c4.firebasestorage.app/o/Logo%20Final.png?alt=media&token=0a7e892a-be30-4d41-818f-c224f142af68"
                  alt="ALMA Guardia Logo"
                  width={150}
                  height={150}
                  className="object-contain rounded-xl shadow-lg md:w-48 md:h-48"
                />
              </Link>
              <div className="space-y-2 text-center md:text-left">
                <h4 className="font-bold text-2xl text-primary mb-2">ALMA Guardia</h4>
                <p className="text-sm text-muted-foreground font-semibold">ALMA softwares e soluções Ltda</p>
                <p className="text-sm text-muted-foreground">CNPJ: 66.275.508/0001-00</p>
                <p className="text-sm text-muted-foreground">Ewaldo Macedo Kossatz Neto, 65 - Ponta Grossa - PR - 84071-606</p>
                <p className="text-base font-bold text-primary pt-2">www.almasoftwares.com</p>
                <div className="flex justify-center md:justify-start space-x-4 mt-4">
                  <Link href="/solicitar-informacoes" aria-label="WhatsApp">
                    <Phone className="h-6 w-6 text-muted-foreground hover:text-primary transition-colors" />
                  </Link>
                  <a href="https://www.instagram.com/?utm_source=pwa_homescreen&__pwa=1" target="_blank" rel="noopener noreferrer" aria-label="Instagram">
                    <Instagram className="h-6 w-6 text-muted-foreground hover:text-primary transition-colors" />
                  </a>
                </div>
              </div>
            </div>

            
            <div className="grid grid-cols-2 md:grid-cols-3 gap-8 lg:col-span-2">
              <div>
                <h4 className="font-semibold mb-3">
                    <Link href="#funcionalidades" className="hover:underline">Funcionalidades</Link>
                </h4>
                <p className="text-sm text-muted-foreground">Explore os módulos e recursos que o ALMA Guard.ia oferece para digitalizar sua gestão.</p>
              </div>
              <div>
                <h4 className="font-semibold mb-3">
                    <Link href="#beneficios" className="hover:underline">Benefícios</Link>
                </h4>
                <p className="text-sm text-muted-foreground">Veja como nossa plataforma pode aumentar a segurança e eficiência da sua operação.</p>
              </div>
              <div>
                <h4 className="font-semibold mb-3">
                    <Link href="/solicitar-informacoes" className="hover:underline">Contato</Link>
                </h4>
                <p className="text-sm text-muted-foreground">Tire dúvidas, agende uma demonstração ou comece seu teste gratuito.</p>
              </div>
            </div>
          </div>
          <div className="mt-12 border-t border-muted-foreground/20 pt-6 flex flex-col sm:flex-row items-center justify-between">
             <p className="text-xs text-muted-foreground">&copy; 2024 ALMA Guardia. Todos os direitos reservados.</p>
             <nav className="flex gap-4 sm:gap-6 mt-4 sm:mt-0">
                <button onClick={handleComingSoon} className="text-xs hover:underline underline-offset-4">
                    Termos de Serviço
                </button>
                <button onClick={handleComingSoon} className="text-xs hover:underline underline-offset-4">
                    Política de Privacidade
                </button>
             </nav>
          </div>
        </div>
      </footer>
    </div>
  );
}
    