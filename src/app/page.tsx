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
import WhatsAppButton from '@/components/WhatsAppButton';
import { ConsultancySection } from '@/components/ConsultancySection';

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
      image: "https://firebasestorage.googleapis.com/v0/b/brave-drive-472322-m2.firebasestorage.app/o/Lembretes.png?alt=media&token=a1c849f9-0e92-4346-aca9-6cb4800d5681",
      imageHint: "dashboard reminders"
    },
    {
      title: "Acidentes/Incidentes",
      description: "Registre, relate e visualize ocorrências em um mapa interativo para identificar áreas de risco e tomar ações preventivas.",
      icon: <Siren className="h-10 w-10 text-primary" />,
      image: "https://firebasestorage.googleapis.com/v0/b/brave-drive-472322-m2.firebasestorage.app/o/Acidentes%20e%20Incidentes.png?alt=media&token=d91bb443-91bb-473b-a128-71cfb60ba050",
      imageHint: "accident report"
    },
    {
      title: "Tratamento de Risco",
      description: "Documente riscos, defina tratamentos, monitore a situação (pendente, finalizado) e visualize os pontos em um mapa.",
      icon: <ShieldCheck className="h-10 w-10 text-primary" />,
      image: "https://firebasestorage.googleapis.com/v0/b/brave-drive-472322-m2.firebasestorage.app/o/Tratamento%20de%20risco.png?alt=media&token=2c57f678-4b84-4049-b562-cf33b32b162a",
      imageHint: "risk management"
    },
    {
      title: "Central de Avisos",
      description: "Canal direto para a equipe de campo reportar observações, agilizando a comunicação e a resposta da gestão.",
      icon: <Megaphone className="h-10 w-10 text-primary" />,
      image: "https://firebasestorage.googleapis.com/v0/b/brave-drive-472322-m2.firebasestorage.app/o/Central%20de%20avisos.png?alt=media&token=fb82d6a1-93c7-4e85-b32c-8a3c790381ea",
      imageHint: "communication alert"
    },
    {
      title: "Fauna Flora Geo",
      description: "Registre e monitore avistamentos e características ambientais com localização no mapa, para gestão e estudos.",
      icon: <Sprout className="h-10 w-10 text-primary" />,
      image: "https://firebasestorage.googleapis.com/v0/b/brave-drive-472322-m2.firebasestorage.app/o/Fauna%20Flora%20Geo.png?alt=media&token=4af4c6f6-a2a9-4a84-a066-bee3003f2c9e",
      imageHint: "environmental monitoring"
    },
    {
      title: "Equipamentos",
      description: "Gerencie o inventário completo de equipamentos, controle vistorias, datas de validade e status de cada item.",
      icon: <HardHat className="h-10 w-10 text-primary" />,
      image: "https://firebasestorage.googleapis.com/v0/b/brave-drive-472322-m2.firebasestorage.app/o/Equipamentos.png?alt=media&token=e5674158-3e42-4633-93b1-7f8b29c86e42",
      imageHint: "safety equipment"
    },
    {
      title: "Avaliação de Riscos",
      description: "Realize avaliações formais detalhando causa, perigo, dano e controles para cada etapa de uma atividade.",
      icon: <ClipboardList className="h-10 w-10 text-primary" />,
      image: "https://firebasestorage.googleapis.com/v0/b/brave-drive-472322-m2.firebasestorage.app/o/Avalia%C3%A7%C3%A3o%20de%20Risco.png?alt=media&token=cd185acd-8049-4eb1-8e1c-f8dc3b98ffed",
      imageHint: "risk assessment"
    },
    {
      title: "Atividades",
      description: "Associe POPs, TCRs e Avaliações de Risco a cada atividade registrada, garantindo conformidade e controle.",
      icon: <Route className="h-10 w-10 text-primary" />,
      image: "https://firebasestorage.googleapis.com/v0/b/brave-drive-472322-m2.firebasestorage.app/o/Atividades.jpeg?alt=media&token=9eebfad6-954e-4be1-8a8e-533a4c4c33fa",
      imageHint: "activity planning"
    },
    {
      title: "POP",
      description: "Acesse e gerencie seus Procedimentos Operacionais Padrão de forma centralizada e digital.",
      icon: <BookText className="h-10 w-10 text-primary" />,
      image: "https://firebasestorage.googleapis.com/v0/b/brave-drive-472322-m2.firebasestorage.app/o/POP.jpg?alt=media&token=6664a600-519d-4dc8-851d-84b8ad09df48",
      imageHint: "standard procedures"
    },
    {
      title: "TCR",
      description: "Consulte e gerencie os Termos de Conhecimento de Risco para garantir que todos estejam cientes dos perigos.",
      icon: <FileText className="h-10 w-10 text-primary" />,
      image: "https://firebasestorage.googleapis.com/v0/b/brave-drive-472322-m2.firebasestorage.app/o/TCR.jpg?alt=media&token=95399933-350a-44d7-9c6e-994aff49a8cc",
      imageHint: "risk agreement"
    },
    {
      title: "RAME",
      description: "Visualize o Recurso de Atendimento Médico de Emergência, com edição online para administradores.",
      icon: <HeartPulse className="h-10 w-10 text-primary" />,
      image: "https://firebasestorage.googleapis.com/v0/b/brave-drive-472322-m2.firebasestorage.app/o/RAME.png?alt=media&token=920be683-0bed-4e3b-926a-d5198fa9b0a4",
      imageHint: "emergency plan"
    },
    {
      title: "Documentos SGS",
      description: "Centralize todos os documentos essenciais do seu Sistema de Gestão de Segurança em um único lugar.",
      icon: <Files className="h-10 w-10 text-primary" />,
      image: "https://firebasestorage.googleapis.com/v0/b/brave-drive-472322-m2.firebasestorage.app/o/Documentos%20SGS.jpg?alt=media&token=3d035d9e-422c-420c-9c42-0cebfdd580a6",
      imageHint: "document management"
    },
    {
      title: "Mapa Interativo",
      description: "Visualize todos os seus registros em um mapa dinâmico. Aplique filtros por tipo, data, local e situação para analisar padrões e tomar decisões estratégicas.",
      icon: <Map className="h-10 w-10 text-primary" />,
      image: "https://firebasestorage.googleapis.com/v0/b/brave-drive-472322-m2.firebasestorage.app/o/Mapa.jpg?alt=media&token=d2971c2f-1aca-4e12-a0a8-b701728714e2",
      imageHint: "interactive map"
    },
    {
      title: "Configurações",
      description: "Personalize o sistema, gerencie perfis de acesso e configure as opções dos formulários para adaptar o app à sua realidade.",
      icon: <Settings className="h-10 w-10 text-primary" />,
      image: "https://firebasestorage.googleapis.com/v0/b/brave-drive-472322-m2.firebasestorage.app/o/Configura%C3%A7%C3%B5es.jpg?alt=media&token=d95f9a25-e74c-4028-9aa9-2ec0f1fca7de",
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
      <header className="sticky top-0 z-50 px-4 lg:px-6 h-20 flex items-center justify-between border-b bg-card/95 backdrop-blur-sm">
        <div className="flex justify-start">
          <Link className="flex items-center justify-center gap-2" href="/">
             <Image
              src="https://firebasestorage.googleapis.com/v0/b/brave-drive-472322-m2.firebasestorage.app/o/ALMA%20-%20Simbolo_letreiro%20Branco%20%20-%20Grande.png?alt=media&token=674ce95f-b9e9-4212-8895-6753b1af996d"
              alt="ALMA Guardia Logo"
              width={60}
              height={60}
              className="object-contain h-12 w-12 md:h-16 md:w-16"
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

        <div className="flex justify-end">
          <Button variant="link" asChild className="text-base md:text-lg text-primary hover:no-underline">
            <Link href="/login">Entrar</Link>
          </Button>
        </div>
      </header>

      <main className="flex-1 w-full overflow-hidden">
        <section className="w-full py-12 md:py-24 lg:py-32">
          <div className="container grid items-stretch gap-6 px-4 sm:px-6 lg:grid-cols-2 lg:gap-12">
            <div className="flex flex-col items-center justify-center w-full px-4 overflow-hidden lg:items-start">
              <h1 className="text-center text-2xl font-bold leading-tight break-words w-full lg:text-left lg:text-4xl">
                Sistema de Gestão de Segurança Completa e Inteligente.
              </h1>
              <p className="text-center text-sm mt-4 w-full break-words lg:text-left lg:text-lg">
                O ALMA Guardia é a plataforma definitiva para digitalizar seus processos de segurança, garantir conformidade e tomar decisões baseadas em dados.
              </p>
              <div className="pt-4">
                <Button size="lg" className="w-full sm:w-auto" asChild>
                  <Link href="/cadastro">Crie uma conta e faça um mês de teste gratuito</Link>
                </Button>
              </div>
            </div>
            <div className="flex items-center justify-center w-full">
              <div className="w-full aspect-video overflow-hidden rounded-xl shadow-2xl border border-primary/20">
                <iframe
                  className="w-full h-full"
                  src="https://www.youtube.com/embed/V_A06Yjio4g"
                  title="YouTube video player"
                  frameBorder="0"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                  allowFullScreen>
                </iframe>
              </div>
            </div>
          </div>
        </section>
        
        <section id="funcionalidades" className="w-full py-20 md:py-24 bg-card/20 px-4 sm:px-6">
          <div className="container">
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
                            className="w-full h-48 object-cover max-w-full"
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
              <CarouselPrevious className="hidden md:flex absolute -left-4 lg:-left-12 top-1/2 -translate-y-1/2" />
              <CarouselNext className="hidden md:flex absolute -right-4 lg:-right-12 top-1/2 -translate-y-1/2" />
            </Carousel>
          </div>
        </section>

        <section className="w-full py-20 md:py-24 px-4 sm:px-6">
          <div className="container flex flex-col items-center w-full gap-6 lg:gap-12">
            <div className="w-full px-6 flex justify-center overflow-hidden">
              <Image
                src="https://firebasestorage.googleapis.com/v0/b/brave-drive-472322-m2.firebasestorage.app/o/Planos.jpg?alt=media&token=4b84fd83-819c-40e0-94c8-762fe7e257af"
                alt="Conheça Nossos Planos"
                width={600}
                height={600}
                className="w-full max-w-[300px] h-auto object-contain mx-auto"
                data-ai-hint="plans pricing"
              />
            </div>
            <div className="space-y-6 text-center">
              <h2 className="text-3xl font-bold tracking-tighter sm:text-5xl">Conheça Nossos Planos</h2>
              <p className="text-center text-base md:text-xl font-bold px-8 mt-4 w-full break-words">
                Escolha o plano que melhor se adapta à sua operação e comece a transformar sua gestão de segurança hoje mesmo. Todos os planos incluem acesso a todas as funcionalidades e suporte dedicado.
              </p>
              <div className="flex flex-col md:grid md:grid-cols-2 gap-4 pt-4">
                <Card className="w-full flex flex-col items-center justify-center p-6 text-center bg-card/50">
                  <CardTitle className="text-2xl mb-2">Plano Mensal</CardTitle>
                  <CardDescription className="text-4xl font-bold text-primary">R$528,00</CardDescription>
                </Card>
                <Card className="w-full flex flex-col items-center justify-center p-6 text-center bg-card/50">
                  <CardTitle className="text-2xl mb-2">Plano Anual</CardTitle>
                  <CardDescription className="text-4xl font-bold text-primary">R$5.280,00</CardDescription>
                </Card>
              </div>
            <Button size="lg" className="w-full sm:w-auto mt-4" asChild>
  <Link href="/cadastro">
    Crie uma conta e faça um mês de teste gratuito
  </Link>
</Button>
            </div>
          </div>
        </section>

        <section id="beneficios" className="w-full py-20 md:py-24 bg-card/20 px-4 sm:px-6">
          <div className="container">
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

        <ConsultancySection />

        <section className="w-full py-20 md:py-24 px-4 sm:px-6">
          <div className="container">
            <div className="flex flex-col items-center justify-center space-y-4 text-center mb-12">
              <h2 className="text-3xl font-bold tracking-tighter sm:text-5xl">Veja o que nossos clientes têm a dizer sobre o ALMA Guardia</h2>
            </div>
            <div className="mx-auto grid max-w-5xl gap-8 sm:grid-cols-2">
              <Card className="shadow-lg border-primary/20">
                <CardHeader>
                  <CardTitle className="text-center text-xl font-bold text-primary">Parque de Natureza Buraco do Padre</CardTitle>
                </CardHeader>
                <CardContent className="p-6 pt-0 flex flex-col">
                  <blockquote className="flex-1 space-y-4">
                    <p className="text-muted-foreground italic">
                      "Olá! Sou Marcos Vinicius, gerente administrativo no Parque de Natureza Buraco do Padre, e gostaria de compartilhar minha experiência positiva com o ALMA Guardia. Antes, perdíamos muito tempo com papéis e processos descentralizados. Com o ALMA, centralizamos tudo: ocorrências, riscos e a gestão de ativos. Essa mudança trouxe uma clareza que não tínhamos anteriormente. Além disso, a funcionalidade de lembretes do app é um diferencial: ela garante que nenhum prazo ou tarefa importante de segurança passe despercebido, mantendo nossa rotina sempre em dia. Não se trata apenas de tecnologia, mas de garantir a continuidade da operação e a conformidade com as normas. Se você atua na área de segurança, sabe o desafio que é colocar a casa em ordem. O ALMA veio para somar com nossas operações e resolveu essa dor para nossa equipe."
                    </p>
                    <p className="text-muted-foreground italic font-semibold">
                      "Recomendo muito o uso da ferramenta!"
                    </p>
                  </blockquote>
                  <footer className="mt-4 text-sm font-semibold text-right text-foreground">Marcos Vinicius Oliveira – <span className="font-normal text-muted-foreground">Gerente Administrativo</span></footer>
                </CardContent>
              </Card>
              <Card className="shadow-lg border-primary/20">
                <CardHeader>
                  <CardTitle className="text-center text-xl font-bold text-primary">Parque Estadual Vila Velha</CardTitle>
                </CardHeader>
                <CardContent className="p-6 pt-0 flex flex-col">
                  <blockquote className="flex-1 space-y-4">
                  <p className="text-muted-foreground italic">
                    "Olá! Eu sou o Arandy Ferreira, sou coordenador no Parque Vila Velha. Com o aplicativo ALMA Guardia, consigo concentrar, em uma mesma plataforma, todas as informações relativas à segurança do meu empreendimento de forma inteligente e intuitiva. Os procedimentos operacionais e os termos de conhecimento de risco ficam disponíveis para todos os colaboradores que têm acesso ao sistema. Assim, a padronização da operação é facilitada. Todas as ocorrências, anomalias e atendimentos são registrados na plataforma e, de forma simples e dinâmica, é possível elaborar relatórios e o mapeamento dessas ocorrências. Com isso, torna-se mais simples e fácil tomar medidas mitigatórias. Além disso, o sistema também conta com uma área dedicada ao monitoramento de equipamentos e ao acompanhamento de atividades operacionais. Em suma, é um aplicativo que nos poupa tempo e nos auxilia muito na organização e na segurança."
                  </p>
                  </blockquote>
                  <footer className="mt-4 text-sm font-semibold text-right text-foreground">Arandy Ferreira da Costa Junior – <span className="font-normal text-muted-foreground">Coordenador de Operações</span></footer>
                </CardContent>
              </Card>
            </div>
          </div>
        </section>

        <section className="w-full py-20 md:py-24 bg-card/20 border-t px-4 sm:px-6">
          <div className="container grid items-center justify-center gap-4 text-center">
            <div className="space-y-3">
              <h2 className="text-2xl font-bold tracking-tighter md:text-3xl/tight">
                Transforme sua Gestão de Segurança Hoje.
              </h2>
              <p className="mx-auto max-w-[600px] text-muted-foreground md:text-xl/relaxed lg:text-base/relaxed xl:text-xl/relaxed">
                Junte-se a nós e leve sua operação para o próximo nível de segurança e eficiência.
              </p>
            </div>
            <div className="mx-auto w-full max-w-sm space-y-2">
  <Button size="lg" className="w-full sm:w-auto" asChild>
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
            <div className="lg:col-span-2 flex flex-col items-center text-center md:flex-row md:items-start md:text-left gap-8">
              <Link href="/" className="shrink-0">
                <Image
                  src="https://firebasestorage.googleapis.com/v0/b/brave-drive-472322-m2.firebasestorage.app/o/ALMA%20-%20Simbolo_letreiro%20Branco%20%20-%20Grande.png?alt=media&token=674ce95f-b9e9-4212-8895-6753b1af996d"
                  alt="ALMA Guardia Logo"
                  width={150}
                  height={150}
                  className="object-contain rounded-xl shadow-lg md:w-48 md:h-48"
                />
              </Link>
              <div className="space-y-2">
                <h4 className="font-bold text-2xl text-primary mb-2">ALMA Guardia</h4>
                <p className="text-sm text-muted-foreground font-semibold">ALMA softwares e soluções Ltda</p>
                <p className="text-sm text-muted-foreground">CNPJ: 66.275.508/0001-00</p>
                <p className="text-sm text-muted-foreground">Ewaldo Macedo Kossatz Neto, 65 - Ponta Grossa - PR - 84071-606</p>
                <p className="text-base font-bold text-primary pt-2">www.almasoftwares.com</p>
                <div className="flex justify-center md:justify-start space-x-4 pt-2">
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
                <Link href="/termo-servico" className="text-xs hover:underline underline-offset-4">
  Termos de Serviço
</Link>
                <Link href="/politica-privacidade" className="text-xs hover:underline underline-offset-4">
  Política de Privacidade
</Link>
             </nav>
          </div>
        </div>
      </footer>

  <WhatsAppButton />

    </div>
  );
}
    