'use client';

import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { useProfile } from "@/context/profile-context";

export function TutorialPage() {
  const { profile } = useProfile();
  const isAdmin = profile === 'admin';

  return (
    <Card>
      <CardHeader>
        <CardTitle>Tutorial do Sistema ALMA Guardia</CardTitle>
        <CardDescription>
          Um guia completo para utilizar todas as funcionalidades do sistema. Expanda as seções abaixo para aprender mais.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Accordion type="single" collapsible className="w-full">
          {isAdmin && (
             <AccordionItem value="item-1">
              <AccordionTrigger>Lembretes</AccordionTrigger>
              <AccordionContent>
                A tela de Lembretes é seu painel principal. Ela exibe um resumo rápido de todas as pendências que exigem sua atenção, como tratamentos de risco em aberto, vistorias de equipamentos atrasadas e avisos de campo pendentes. Clique nos botões "Ver" para ser direcionado à tela correspondente já filtrada.
              </AccordionContent>
            </AccordionItem>
          )}

          {isAdmin && (
             <AccordionItem value="item-graficos">
              <AccordionTrigger>Gráficos</AccordionTrigger>
              <AccordionContent>
                Esta tela permite visualizar dados de forma gráfica para uma análise mais rápida.
                <ul className="list-disc space-y-2 pl-5 mt-2">
                  <li><strong>Como Usar:</strong> Primeiro, selecione o "Tipo de Relatório" que deseja analisar (ex: Acidentes/Incidentes).</li>
                  <li><strong>Filtros Obrigatórios:</strong> Para que o gráfico seja exibido, é necessário aplicar ao menos uma seleção em cada um dos filtros: Ano, Tipo e Local.</li>
                  <li><strong>Visualização:</strong> O gráfico exibirá a contagem de registros por "Tipo" no eixo horizontal. Acima do gráfico, você verá o(s) ano(s) selecionado(s).</li>
                  <li><strong>Detalhes no Tooltip:</strong> Ao passar o mouse sobre uma barra, uma caixa de informações (tooltip) aparecerá, mostrando o detalhamento daquele tipo por mês e por local, além do total de registros.</li>
                </ul>
              </AccordionContent>
            </AccordionItem>
          )}

          <AccordionItem value="item-2">
            <AccordionTrigger>Ajuda</AccordionTrigger>
            <AccordionContent>
              Nesta seção, você pode ativar ou desativar o "Modo Ajuda". Quando ativado, ícones de interrogação (?) aparecerão ao lado de diversos campos nos formulários. Clicar nesses ícones exibirá uma dica útil sobre como preencher aquele campo específico. O Modo Ajuda pode ser desativado a qualquer momento para deixar os formulários mais limpos.
            </AccordionContent>
          </AccordionItem>

          <AccordionItem value="item-portal">
            <AccordionTrigger>Portal do Usuário</AccordionTrigger>
            <AccordionContent>
              <ul className="list-disc space-y-2 pl-5">
                <li><strong>Minha Assinatura:</strong> Consulte seu plano, informações de faturamento e acesse o portal de cobrança quando essa opção estiver disponível para sua conta.</li>
                <li><strong>Mudar Perfil:</strong> Use esta opção no rodapé do menu para sair do perfil atual e selecionar outro perfil autorizado. As permissões e os locais disponíveis acompanham o perfil selecionado.</li>
                <li><strong>Sair:</strong> Encerra a sessão da conta com segurança. Para voltar, faça login novamente e selecione um perfil.</li>
                <li><strong>Notificações:</strong> Quando o navegador oferecer a opção, permita as notificações e use o botão de ativação no sistema. Você poderá receber alertas sobre avisos, tratamentos atrasados e equipamentos com vistoria ou validade vencida, conforme as permissões e os locais do seu perfil.</li>
              </ul>
            </AccordionContent>
          </AccordionItem>
          
          <AccordionItem value="item-3">
            <AccordionTrigger>Acidentes/Incidentes</AccordionTrigger>
            <AccordionContent>
              <ul className="list-disc space-y-2 pl-5">
                {isAdmin && <li><strong>Registrar Ocorrência:</strong> Formulário detalhado para registrar um novo acidente ou incidente. Inclui informações da pessoa envolvida (com máscaras automáticas para CPF e Telefone), descrição do evento, análise de gravidade e marcação no mapa.</li>}
                {isAdmin && <li><strong>Relatório de Ocorrência:</strong> Visualize, filtre e pesquise todos os acidentes e incidentes registrados. Você pode filtrar por data, tipo, local, nome e mais. A partir daqui, você pode editar ou excluir um registro.</li>}
                <li><strong>Relatório de Mapa:</strong> Visualize todas as ocorrências plotadas em um mapa interativo. Alterne entre o Mapa Lúdico (imagem personalizada) e o Mapa Georreferenciado (Google Maps) para diferentes perspectivas. Isso ajuda a identificar áreas com maior concentração de eventos.</li>
              </ul>
            </AccordionContent>
          </AccordionItem>

          <AccordionItem value="item-4">
            <AccordionTrigger>Tratamento de Risco</AccordionTrigger>
            <AccordionContent>
               <ul className="list-disc space-y-2 pl-5">
                {isAdmin && <li><strong>Registrar Tratamento:</strong> Documente um risco identificado, sua probabilidade e consequência, o tratamento proposto e a ação realizada. A situação (pendente, finalizado) e o prazo para conclusão também são gerenciados aqui.</li>}
                {isAdmin && <li><strong>Relatório de Tratamento:</strong> Uma lista de todos os tratamentos de risco. Use os filtros para encontrar rapidamente o que precisa, especialmente os tratamentos pendentes ou reabertos.</li>}
                <li><strong>Relatório de Mapa:</strong> Similar ao mapa de acidentes, este mapa mostra onde os riscos foram identificados. Alterne entre as visualizações Lúdica e Georreferenciada para analisar áreas de maior perigo.</li>
                <li><strong>Mapa de Tratamentos:</strong> Consulte no mapa os tratamentos registrados e use a troca de visualização para analisar a distribuição dos riscos por área.</li>
              </ul>
            </AccordionContent>
          </AccordionItem>

           <AccordionItem value="item-5">
            <AccordionTrigger>Central de Avisos</AccordionTrigger>
            <AccordionContent>
               <ul className="list-disc space-y-2 pl-5">
                <li><strong>Registrar Aviso:</strong> Qualquer colaborador (mesmo o perfil Observador) pode usar esta tela para reportar uma observação, condição insegura ou sugestão de melhoria. É um canal de comunicação direto do campo para a gestão.</li>
                {isAdmin && <li><strong>Avisos Pendentes:</strong> Como administrador, esta é sua caixa de entrada para os avisos enviados.
                    <ul className="list-disc space-y-1 pl-5 mt-1">
                        <li><strong>Avisos Comuns:</strong> Analise cada aviso e decida a melhor ação: marcar como resolvido, ou criar um registro formal (Ocorrência, Tratamento de Risco, etc.) já com os dados preenchidos.</li>
                        <li><strong>Relatórios de Pronto Atendimento (RPO):</strong> RPOs pendentes aparecem aqui com a avaliação primária (XABCDE) e secundária (SAMPLE) completas, incluindo as descrições detalhadas de cada item, facilitando a análise antes de convertê-lo em uma ocorrência oficial.</li>
                    </ul>
                </li>}
              </ul>
            </AccordionContent>
          </AccordionItem>
          
          <AccordionItem value="item-6">
            <AccordionTrigger>Fauna Flora Geo</AccordionTrigger>
            <AccordionContent>
               <ul className="list-disc space-y-2 pl-5">
                {isAdmin && <li><strong>Registrar F/F/G:</strong> Crie registros de avistamentos de fauna, flora ou formações geográficas de interesse. Essencial para o monitoramento ambiental.</li>}
                {isAdmin && <li><strong>Relatório F/F/G:</strong> Liste e filtre todos os registros ambientais feitos.</li>}
                <li><strong>Relatório de Mapa:</strong> Visualize a distribuição geográfica dos seus registros ambientais. Alterne entre o Mapa Lúdico e o Georreferenciado para identificar corredores ecológicos ou pontos de interesse.</li>
              </ul>
            </AccordionContent>
          </AccordionItem>
          
           {isAdmin && (
            <>
              <AccordionItem value="item-7">
                <AccordionTrigger>Avaliação de Riscos</AccordionTrigger>
                <AccordionContent>
                  <ul className="list-disc space-y-2 pl-5">
                    <li><strong>Registrar Avaliação:</strong> Ferramenta para realizar avaliações de risco formais de uma atividade, detalhando a Causa (fonte do risco), o Perigo (o que pode acontecer), o Dano (a consequência) e o Controle Operacional (medidas para mitigar).</li>
                    <li><strong>Relatório de Avaliação:</strong> Consulte todas as avaliações de risco realizadas. Filtre por local para analisar os riscos de uma área específica.</li>
                  </ul>
                </AccordionContent>
              </AccordionItem>
              <AccordionItem value="item-8">
                <AccordionTrigger>Equipamentos</AccordionTrigger>
                <AccordionContent>
                  <ul className="list-disc space-y-2 pl-5">
                    <li><strong>Registrar Equipamento:</strong> Cadastre cada equipamento com informações vitais como tipo, marca, modelo, data de fabricação, e datas de inspeção.</li>
                    <li><strong>Relatório de Equipamentos:</strong> Gerencie seu inventário. Filtre por status ou vistorias atrasadas para manter tudo em conformidade.</li>
                  </ul>
                </AccordionContent>
              </AccordionItem>
              <AccordionItem value="item-9">
                <AccordionTrigger>Atividades</AccordionTrigger>
                <AccordionContent>
                  <ul className="list-disc space-y-2 pl-5">
                    <li><strong>Registrar Atividade:</strong> Registre o início de uma atividade, associando os documentos POP e TCR e a Avaliação de Risco correspondente.</li>
                    <li><strong>Relatório de Atividade:</strong> Visualize o histórico de todas as atividades registradas.</li>
                  </ul>
                </AccordionContent>
              </AccordionItem>
            </>
           )}

            <AccordionItem value="item-10">
                <AccordionTrigger>POP / TCR / Documentos SGS</AccordionTrigger>
                <AccordionContent>
                    <ul className="list-disc space-y-2 pl-5">
                      <li><strong>POP:</strong> Consulte os Procedimentos Operacionais Padrão usados nas atividades.</li>
                      <li><strong>TCR:</strong> Consulte os Termos de Conhecimento de Risco relacionados às operações.</li>
                      <li><strong>Documentos SGS:</strong> Consulte os documentos gerais do Sistema de Gestão de Segurança, como escopo, liderança e operação.</li>
                      <li><strong>Edição:</strong> Administradores podem atualizar o conteúdo nas telas de gerenciamento correspondentes. Usuários com acesso de consulta apenas visualizam os documentos.</li>
                    </ul>
                </AccordionContent>
            </AccordionItem>

            <AccordionItem value="item-rame">
                <AccordionTrigger>RAME (Recurso de Atendimento Médico de Emergência)</AccordionTrigger>
                <AccordionContent>
                  <ul className="list-disc space-y-2 pl-5">
                    <li><strong>PE e PAE:</strong> Visualize e edite o conteúdo do seu Plano de Emergência e Plano de Atendimento a Emergência.</li>
                    <li><strong>RPA - Relatório de Pronto Atendimento:</strong> Formulário para registrar atendimentos de primeiros socorros. Os campos de CPF e Telefone possuem formatação automática. O fluxo de envio exige que o socorrista primeiro clique em <strong>"Copiar Relatório"</strong> (o que gera um texto limpo e detalhado para a área de transferência, incluindo as descrições do XABCDE) para então liberar o botão <strong>"Enviar para Central de Avisos"</strong>.</li>
                  </ul>
                </AccordionContent>
            </AccordionItem>

            {isAdmin && (
                <AccordionItem value="item-11">
                    <AccordionTrigger>Configurações</AccordionTrigger>
                    <AccordionContent>
                      <ul className="list-disc space-y-2 pl-5">
                        <li><strong>Configurações Gerais:</strong> Personalize a aparência do sistema, alterando o nome da empresa (exibido no cabeçalho), a logo e o tema de cores.</li>
                        <li><strong>Gerenciar Perfis:</strong> Crie, edite e remova perfis personalizados, defina seus passes numéricos de 6 dígitos e escolha quais menus, submenus e locais cada perfil pode acessar. O perfil Administrador mantém o acesso completo.</li>
                        <li><strong>Gerenciar Ocorrências:</strong> Cadastre e organize os tipos de acidente ou incidente disponíveis nos formulários.</li>
                        <li><strong>Gerenciar Locais:</strong> Cadastre os locais usados nos registros, filtros e relatórios.</li>
                        <li><strong>Gerenciar Fa/Fl/Ge:</strong> Mantenha as opções de fauna, flora e geodiversidade usadas nos registros ambientais.</li>
                        <li><strong>Gerenciar Equip./Marca:</strong> Cadastre tipos de equipamento e marcas para padronizar o inventário.</li>
                        <li><strong>Gerenciar POPs e TCRs:</strong> Edite os documentos operacionais e termos de risco exibidos no sistema.</li>
                        <li><strong>Gerenciar Mapa:</strong> Faça o upload da imagem de fundo (planta baixa, mapa da área) que será usada em todas as telas de relatório de mapa.</li>
                      </ul>
                    </AccordionContent>
                </AccordionItem>
            )}

            <AccordionItem value="item-navigation">
              <AccordionTrigger>Como usar os registros e relatórios</AccordionTrigger>
              <AccordionContent>
                <ul className="list-disc space-y-2 pl-5">
                  <li><strong>Registros:</strong> Preencha os campos obrigatórios, revise as informações e salve. Campos com máscara, como CPF e telefone, são formatados automaticamente.</li>
                  <li><strong>Relatórios:</strong> Use os filtros disponíveis para localizar registros por período, tipo, local ou situação. Quando disponível, utilize as ações de editar e excluir com atenção.</li>
                  <li><strong>Mapas:</strong> Selecione a visualização adequada e confirme se o local ou as coordenadas foram preenchidos no registro. A visualização lúdica depende de uma imagem configurada em "Gerenciar Mapa"; a georreferenciada depende do serviço de mapas.</li>
                  <li><strong>Acesso por perfil:</strong> A ausência de um menu ou filtro pode ser uma restrição definida pelo administrador, e não um erro do sistema. Solicite a revisão das permissões quando necessário.</li>
                </ul>
              </AccordionContent>
            </AccordionItem>

        </Accordion>
      </CardContent>
    </Card>
  );
}
