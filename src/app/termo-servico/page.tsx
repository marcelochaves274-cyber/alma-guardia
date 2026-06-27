import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';

export default function TermosUsoPage() {
  return (
    <div className="flex flex-col min-h-screen">
      {/* Barra superior (Header) */}
      <header className="bg-primary text-primary-foreground py-4 flex justify-center items-center gap-3 shadow-md">
        <img 
          src="https://firebasestorage.googleapis.com/v0/b/brave-drive-472322-m2.firebasestorage.app/o/ALMA%20-%20Simbolo_letreiro%20Branco%20%20-%20Grande.png?alt=media&token=674ce95f-b9e9-4212-8895-6753b1af996d" 
          alt="ALMA Logo" 
          className="h-10 w-auto" 
        />
        <h1 className="font-bold text-2xl">ALMA Guardia</h1>
      </header>

      {/* Conteúdo principal */}
      <main className="flex-grow bg-background p-4 md:p-8">
        <div className="container mx-auto max-w-4xl">
          {/* BOTÃO CORRIGIDO: Envolvido em um span para não quebrar o asChild */}
          <Button variant="ghost" asChild className="mb-6">
            <Link href="/">
              <span className="flex items-center">
                <ArrowLeft className="mr-2 h-4 w-4" /> Voltar ao site
              </span>
            </Link>
          </Button>

          <Card>
            <CardHeader>
              <CardTitle className="text-3xl font-bold">Termos de Uso e Serviços - ALMA Guardia</CardTitle>
              <p className="text-muted-foreground mt-2">Última atualização: 08 de junho de 2026</p>
            </CardHeader>
            <CardContent className="space-y-6 text-justify leading-relaxed">
              <p>Bem-vindo ao ALMA Guardia. Ao utilizar nossa plataforma, você declara ter lido, compreendido e aceitado os presentes Termos. Estes termos regem a relação entre o usuário (doravante denominado "Usuário" ou "Cliente") e a ALMA softwares e soluções Ltda.</p>
              
              <h3 className="text-xl font-semibold">1. Definições e Escopo</h3>
              <p>O ALMA Guardia é uma ferramenta SaaS (Software as a Service) voltada para a gestão de segurança, coleta de dados em campo e inteligência operacional. O acesso ao serviço é condicionado à criação de uma conta pessoal e ao pagamento da assinatura correspondente.</p>
              
              <h3 className="text-xl font-semibold">2. Contas de Usuário e Segurança</h3>
              <ul className="list-disc pl-6 space-y-2">
                <li><strong>Credenciais:</strong> O Usuário é o único responsável pela segurança de seu login e senha. Recomendamos o uso de autenticação forte.</li>
                <li><strong>Autenticação:</strong> Utilizamos o Firebase Authentication para garantir que apenas usuários autorizados acessem os dados. A ALMA Guardia não se responsabiliza por acessos não autorizados decorrentes de negligência do Usuário.</li>
              </ul>

              <h3 className="text-xl font-semibold">3. Utilização da Plataforma</h3>
              <p>O Usuário compromete-se a:</p>
              <ul className="list-disc pl-6 space-y-2">
                <li>Não utilizar o sistema para atividades ilegais ou prejudiciais.</li>
                <li>Não tentar realizar engenharia reversa ou copiar o código-fonte da aplicação.</li>
                <li>Não submeter dados que violem direitos de terceiros ou legislações vigentes (como a LGPD).</li>
              </ul>

              <h3 className="text-xl font-semibold">4. Pagamentos e Assinaturas</h3>
              <ul className="list-disc pl-6 space-y-2">
                <li><strong>Processamento:</strong> Todos os pagamentos são processados via Stripe. Ao assinar um plano, você autoriza o débito recorrente no método de pagamento cadastrado.</li>
                <li><strong>Suspensão:</strong> A falta de pagamento resultará na suspensão automática do acesso ao painel. A ALMA Guardia não se responsabiliza por eventuais perdas operacionais decorrentes da interrupção por falta de pagamento.</li>
              </ul>

              <h3 className="text-xl font-semibold">5. Infraestrutura e Disponibilidade</h3>
              <p>O ALMA Guardia é estruturado sobre provedores de tecnologia de ponta (Google Cloud/Firebase e servidores Hostgator).</p>
              <ul className="list-disc pl-6 space-y-2">
                <li><strong>Nível de Serviço:</strong> Buscamos manter o serviço disponível 24/7. Contudo, falhas sistêmicas nos provedores de nuvem (terceiros) estão fora de nosso controle direto.</li>
                <li><strong>Manutenção:</strong> Reservamo-nos o direito de realizar manutenções programadas, notificando os usuários sempre que possível.</li>
              </ul>

              <h3 className="text-xl font-semibold">6. Propriedade Intelectual e Dados</h3>
              <p><strong>Plataforma:</strong> Todo o software, design e marca ALMA Guardia são protegidos por direitos autorais.</p>
              <p><strong>Dados do Cliente:</strong> Os dados inseridos pelo Usuário na plataforma pertencem ao Usuário. A ALMA Guardia atua apenas como processadora destes dados.</p>

              <h3 className="text-xl font-semibold">7. Limitação de Responsabilidade</h3>
              <p>A ALMA Guardia fornece a plataforma "no estado em que se encontra". Não garantimos que a ferramenta atenderá a necessidades específicas de resultados operacionais que dependam de ações externas do usuário. Em nenhuma circunstância a empresa será responsável por danos indiretos, lucros cessantes ou perda de dados causados pelo mau uso da ferramenta.</p>

              <h3 className="text-xl font-semibold">8. Encerramento de Conta</h3>
              <p>O Usuário pode cancelar a sua conta a qualquer momento através das configurações do perfil. A ALMA Guardia reserva-se o direito de rescindir o acesso de qualquer usuário que descumpra estes termos.</p>

              <h3 className="text-xl font-semibold">9. Foro</h3>
              <p>Fica eleito o foro da comarca de sede da ALMA softwares e soluções Ltda para dirimir quaisquer conflitos decorrentes deste contrato.</p>
              
              <div className="bg-muted p-4 rounded-lg mt-8 text-sm italic">
                Consultoria e Aceite: Esta página serve como referência aos nossos termos. O aceite definitivo e a formalização do contrato de prestação de serviços ocorrerão mediante a conclusão do processo de assinatura via Stripe.
              </div>
            </CardContent>
          </Card> 
        </div>
      </main>
    </div>
  );
}