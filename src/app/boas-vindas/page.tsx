'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useRouter } from 'next/navigation';

export default function BoasVindasPage() {
  const router = useRouter();

  return (
    <div className="flex flex-col min-h-screen">
      {/* Barra superior (Header) igual aos Termos */}
      <header className="bg-primary text-primary-foreground py-4 flex justify-center items-center gap-3 shadow-md">
        <img 
          src="https://firebasestorage.googleapis.com/v0/b/brave-drive-472322-m2.firebasestorage.app/o/ALMA%20-%20Simbolo_letreiro%20Branco%20%20-%20Grande.png?alt=media&token=674ce95f-b9e9-4212-8895-6753b1af996d" 
          alt="ALMA Logo" 
          className="h-10 w-auto" 
        />
        <h1 className="font-bold text-2xl">ALMA Guardia</h1>
      </header>

      {/* Conteúdo principal com o mesmo fundo do site */}
      <main className="flex-grow bg-background p-4 md:p-8">
        <div className="container mx-auto max-w-4xl">
          
          <Card>
            <CardHeader>
              <CardTitle className="text-3xl font-bold">Bem-vindo ao ALMA Guardia!</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6 text-justify leading-relaxed">
              <p>Agradecemos pela sua confiança. Sua assinatura foi processada com sucesso. (Após o período de teste, o débito será identificado em seu extrato bancário como <strong>ALMA Softwares</strong>).</p>
              <p>Este guia foi desenhado para facilitar a configuração inicial do seu Sistema de Gestão de Segurança (SGS). Recomendamos que siga os passos abaixo para garantir que a ferramenta esteja perfeitamente ajustada às suas operações.</p>
              
              <h3 className="text-xl font-semibold">1. Primeiro Acesso e Segurança (Crítico)</h3>
              <ul className="list-disc pl-6 space-y-2">
                <li><strong>Login inicial:</strong> Utilize suas credenciais cadastradas, e-mail e senha.</li>
                <li><strong>Perfil de Administrador:</strong> O acesso padrão é 123456. Acesse <em>Configurações &gt; Gerenciar Perfis</em> imediatamente para alterar esta senha.</li>
                <li><strong>Gestão de Equipes:</strong> Configure os acessos para Supervisores e Observadores.</li>
                <li><strong>Importante:</strong> Armazene estas senhas (passes administrador) em local seguro. Por questões de segurança, não realizamos recuperação de senhas via e-mail; qualquer problema de acesso (no administrador) exigirá contato direto com nosso suporte.</li>
              </ul>
              
              <h3 className="text-xl font-semibold">2. Configurações Gerais da Empresa</h3>
              <p>Em <em>Configurações &gt; Configurações Gerais</em>, personalize seu ambiente:</p>
              <ul className="list-disc pl-6 space-y-2">
                <li>Cadastre o nome oficial da empresa e faça o upload da sua logomarca.</li>
                <li>Defina o tema de cores do seu sistema.</li>
                <li><strong>Dica:</strong> Clique em salvar após cada alteração realizada. (É possível alterar posteriormente, sempre salvando).</li>
              </ul>
              
              <h3 className="text-xl font-semibold">3. Estruturação do Sistema (Base de Dados)</h3>
              <p>Para que os registros funcionem corretamente, é necessário alimentar os submenus em Configurações. Cadastre os itens conforme sua realidade operacional:</p>
              <ul className="list-disc pl-6 space-y-2">
                <li><strong>Ocorrências:</strong> Ex: cefaleia, entorses, alergias, luxação, etc.</li>
                <li><strong>Locais:</strong> Ex: Trilha Beira Rio, Trilha das Araucárias.</li>
                <li><strong>Mapa:</strong> Faça o upload do mapa do seu parque (Resolução recomendada: 1920x1080px, formato 16:9, até 800KB).</li>
                <li><strong>POPs, TCRs e Equipamentos:</strong> Cadastre as nomenclaturas e marcas para padronizar seus futuros registros.</li>
                <li><strong>Fauna, Flora e Geo:</strong> Registre os elementos de interesse ambiental e geológico (Ex: queda de galhos, cascavel, queda de rochas, etc).</li>
              </ul>
              <p><em>Nota: Esta etapa é essencial, pois todas as informações cadastradas aqui alimentarão os campos de seleção nos registros do dia a dia.</em></p>

              <h3 className="text-xl font-semibold">4. Conhecendo o Sistema</h3>
              <ul className="list-disc pl-6 space-y-2">
                <li><strong>Dashboard e Lembretes:</strong> Sua tela inicial exibe pendências em tempo real (registros, tratamentos, vistorias e avisos).</li>
                <li><strong>Portal do Usuário:</strong> Gerencie seu plano, faturas e acesso ao suporte. No menu <strong>Ajuda</strong>, use o ícone (?) para instruções de preenchimento. No menu <strong>Tutorial</strong>, veja explicações de cada função.</li>
                <li><strong>Registros (Acidentes, Riscos, Fauna/Flora/Geo):</strong> Utilize os campos pré-configurados e selecione o ponto exato no mapa para ter a geolocalização das ocorrências.</li>
                <li><strong>Central de Avisos:</strong> Analise e valide os registros enviados por supervisores e observadores.</li>
                <li><strong>Avaliação de Risco e Atividades:</strong> Registre seus riscos e configure suas atividades acoplando POPs, TCRs e locais específicos.</li>
              </ul>

              <p className="font-bold mt-4">Seguir este passo a passo é fundamental para que seu SGS opere em pleno acordo com as normas. Bom trabalho! A equipe ALMA Softwares.</p>

              <Button onClick={() => router.push('/login')} className="w-full mt-8 py-6 text-lg">
                Continuar para o Login
              </Button>
            </CardContent>
          </Card> 
        </div>
      </main>
    </div>
  );
}