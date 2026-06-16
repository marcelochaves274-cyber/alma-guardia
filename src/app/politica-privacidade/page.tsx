import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';

export default function PoliticaPrivacidadePage() {
  return (
    <div className="flex flex-col min-h-screen">
      {/* Barra superior (Header) */}
      <header className="bg-primary text-primary-foreground py-4 flex justify-center items-center gap-3 shadow-md">
        <img 
          src="https://firebasestorage.googleapis.com/v0/b/studio-6033207211-536c4.firebasestorage.app/o/Logo%20Final.png?alt=media&token=0a7e892a-be30-4d41-818f-c224f142af68" 
          alt="ALMA Logo" 
          className="h-10 w-auto" 
        />
        <h1 className="font-bold text-2xl">ALMA Guardia</h1>
      </header>

      {/* Conteúdo principal */}
      <main className="flex-grow bg-background p-4 md:p-8">
        <div className="container mx-auto max-w-4xl">
          <Button variant="ghost" asChild className="mb-6">
            <Link href="/">
              <span className="flex items-center">
                <ArrowLeft className="mr-2 h-4 w-4" /> Voltar ao site
              </span>
            </Link>
          </Button>

          <Card>
            <CardHeader>
              <CardTitle className="text-3xl font-bold">Política de Privacidade - ALMA Guardia</CardTitle>
              <p className="text-muted-foreground mt-2">Última atualização: 08 de junho de 2026</p>
            </CardHeader>
            <CardContent className="space-y-6 text-justify leading-relaxed">
              <p>A ALMA softwares e soluções Ltda valoriza a privacidade e a segurança dos dados de seus usuários. Esta Política de Privacidade descreve como coletamos, usamos e protegemos as informações fornecidas através da plataforma ALMA Guardia.</p>
              
              <h3 className="text-xl font-semibold">1. Coleta de Dados</h3>
              <p>Coletamos informações necessárias para o funcionamento eficiente da nossa plataforma:</p>
              <ul className="list-disc pl-6 space-y-2">
                <li><strong>Dados de Cadastro:</strong> Nome, e-mail e outras informações fornecidas no momento do registro.</li>
                <li><strong>Dados Operacionais:</strong> Relatórios, registros de ocorrências, fotos de campo e dados geolocalizados inseridos pelo usuário.</li>
                <li><strong>Dados Técnicos:</strong> Coletamos informações de forma automatizada (IP, tipo de navegador, tempo de acesso) para garantir a segurança e melhorar a performance da aplicação através de serviços de monitoramento.</li>
              </ul>

              <h3 className="text-xl font-semibold">2. Armazenamento e Segurança (Firebase & Cloud)</h3>
              <ul className="list-disc pl-6 space-y-2">
                <li><strong>Segurança:</strong> Utilizamos o Google Firebase, que oferece padrões de segurança de classe mundial, incluindo criptografia em repouso e em trânsito.</li>
                <li><strong>Acesso:</strong> Apenas funcionários autorizados e o próprio Usuário têm acesso aos dados, respeitando protocolos rigorosos de controle de acesso.</li>
              </ul>

              <h3 className="text-xl font-semibold">3. Uso dos Dados</h3>
              <p>Os dados coletados são utilizados exclusivamente para:</p>
              <ul className="list-disc pl-6 space-y-2">
                <li>Disponibilizar as funcionalidades de gestão de segurança do ALMA Guardia.</li>
                <li>Processar pagamentos via Stripe (o ALMA Guardia não armazena dados de cartão de crédito; esta operação é delegada ao provedor certificado Stripe).</li>
                <li>Melhorar a experiência do usuário e otimizar as ferramentas do sistema.</li>
                <li>Enviar comunicados importantes sobre a plataforma.</li>
              </ul>

              <h3 className="text-xl font-semibold">4. Compartilhamento de Dados</h3>
              <ul className="list-disc pl-6 space-y-2">
                <li><strong>Política de Não-Compartilhamento:</strong> A ALMA softwares e soluções Ltda não vende, aluga ou compartilha seus dados pessoais ou operacionais com terceiros para fins de marketing.</li>
                <li><strong>Exceções:</strong> Dados poderão ser compartilhados apenas se exigido por lei ou ordem judicial, ou para garantir a segurança da própria plataforma contra ataques cibernéticos.</li>
              </ul>

              <h3 className="text-xl font-semibold">5. Seus Direitos</h3>
              <p>De acordo com a Lei Geral de Proteção de Dados (LGPD), você tem o direito de:</p>
              <ul className="list-disc pl-6 space-y-2">
                <li>Acessar, corrigir ou solicitar a exclusão de seus dados armazenados em nossos servidores.</li>
                <li>Revogar o consentimento para o uso de dados, ressalvadas as obrigações legais de retenção.</li>
              </ul>

              <h3 className="text-xl font-semibold">6. Cookies e Tecnologias de Terceiros</h3>
              <p>A plataforma pode utilizar cookies para melhorar a usabilidade. Serviços de terceiros (como bibliotecas do Firebase ou Stripe) podem coletar dados técnicos básicos conforme suas próprias políticas de privacidade.</p>

              <h3 className="text-xl font-semibold">7. Alterações na Política</h3>
              <p>Reservamo-nos o direito de alterar esta política. Alterações significativas serão notificadas através da plataforma. A continuidade do uso do app após a atualização implica no aceite das novas condições.</p>

              <h3 className="text-xl font-semibold">8. Contato</h3>
              <p>Para dúvidas sobre como tratamos seus dados, entre em contato conosco através dos canais oficiais listados em nosso site (www.almasoftwares.com).</p>
              
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