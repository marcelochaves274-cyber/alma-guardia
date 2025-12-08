
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
        <CardTitle>Tutorial do Sistema SGS Genius</CardTitle>
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
                A tela de Lembretes é seu painel principal. Ela exibe um resumo rápido de todas as pendências que exigem sua atenção, como tratamentos de risco em aberto e vistorias de equipamentos atrasadas. Clique nos botões "Ver" para ser direcionado ao relatório correspondente já filtrado.
              </AccordionContent>
            </AccordionItem>
          )}

          <AccordionItem value="item-2">
            <AccordionTrigger>Ajuda</AccordionTrigger>
            <AccordionContent>
              Nesta seção, você pode ativar ou desativar o "Modo Ajuda". Quando ativado, ícones de interrogação (?) aparecerão ao lado de diversos campos nos formulários. Clicar nesses ícones exibirá uma dica útil sobre como preencher aquele campo específico.
            </AccordionContent>
          </AccordionItem>
          
          <AccordionItem value="item-3">
            <AccordionTrigger>Acidentes/Incidentes</AccordionTrigger>
            <AccordionContent>
              <ul className="list-disc space-y-2 pl-5">
                {isAdmin && <li><strong>Registrar Ocorrência:</strong> Formulário detalhado para registrar um novo acidente ou incidente, incluindo informações da pessoa envolvida, descrição do evento, análise de gravidade e marcação no mapa.</li>}
                {isAdmin && <li><strong>Relatório de Ocorrência:</strong> Visualize, filtre e pesquise todos os acidentes e incidentes registrados. Você pode filtrar por data, tipo, local, nome e mais. A partir daqui, você pode editar ou excluir um registro.</li>}
                <li><strong>Relatório de Mapa:</strong> Visualize todas as ocorrências plotadas em um mapa interativo. Isso ajuda a identificar áreas com maior concentração de eventos. Você pode filtrar os pontos exibidos por data, tipo e local.</li>
              </ul>
            </AccordionContent>
          </AccordionItem>

          <AccordionItem value="item-4">
            <AccordionTrigger>Tratamento de Risco</AccordionTrigger>
            <AccordionContent>
               <ul className="list-disc space-y-2 pl-5">
                {isAdmin && <li><strong>Registrar Tratamento:</strong> Documente um risco identificado, sua probabilidade e consequência, o tratamento proposto e a ação realizada. A situação (pendente, finalizado) e o prazo para conclusão também são gerenciados aqui.</li>}
                {isAdmin && <li><strong>Relatório de Tratamento:</strong> Uma lista de todos os tratamentos de risco. Use os filtros para encontrar rapidamente o que precisa, especialmente os tratamentos pendentes ou reabertos.</li>}
                <li><strong>Relatório de Mapa:</strong> Similar ao mapa de acidentes, este mapa mostra onde os riscos foram identificados, ajudando na análise de áreas de maior perigo.</li>
              </ul>
            </AccordionContent>
          </AccordionItem>

           <AccordionItem value="item-5">
            <AccordionTrigger>Central de Avisos</AccordionTrigger>
            <AccordionContent>
               <ul className="list-disc space-y-2 pl-5">
                <li><strong>Registrar Aviso:</strong> Qualquer colaborador (mesmo o perfil Observador) pode usar esta tela para reportar uma observação, condição insegura ou sugestão de melhoria. É um canal de comunicação direto do campo para a gestão.</li>
                {isAdmin && <li><strong>Avisos Pendentes:</strong> Como administrador, esta é sua caixa de entrada para os avisos enviados. A partir daqui, você pode analisar cada aviso e decidir a melhor ação: marcar como resolvido, ou criar um registro formal (Ocorrência, Tratamento de Risco, etc.) já com os dados preenchidos.</li>}
              </ul>
            </AccordionContent>
          </AccordionItem>
          
          <AccordionItem value="item-6">
            <AccordionTrigger>Fauna Flora Geo</AccordionTrigger>
            <AccordionContent>
               <ul className="list-disc space-y-2 pl-5">
                {isAdmin && <li><strong>Registrar F/F/G:</strong> Crie registros de avistamentos de fauna, flora ou formações geográficas de interesse. Essencial para o monitoramento ambiental.</li>}
                {isAdmin && <li><strong>Relatório F/F/G:</strong> Liste e filtre todos os registros ambientais feitos.</li>}
                <li><strong>Relatório de Mapa:</strong> Visualize a distribuição geográfica dos seus registros ambientais, identificando corredores ecológicos ou pontos de interesse.</li>
              </ul>
            </AccordionContent>
          </AccordionItem>
          
           {isAdmin && (
            <>
              <AccordionItem value="item-7">
                <AccordionTrigger>Avaliação de Riscos</AccordionTrigger>
                <AccordionContent>
                  <ul className="list-disc space-y-2 pl-5">
                    <li><strong>Registrar Avaliação:</strong> Ferramenta para realizar avaliações de risco formais de uma atividade ou local, detalhando causa, perigo, dano, controles existentes e recomendados, e calculando o nível de risco.</li>
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
                <AccordionTrigger>POP / TCR / RAME / Documentos SGS</AccordionTrigger>
                <AccordionContent>
                    Essas seções permitem visualizar o conteúdo dos documentos essenciais do seu Sistema de Gestão de Segurança. Administradores podem editar o conteúdo diretamente nessas telas, garantindo que as informações estejam sempre atualizadas.
                </AccordionContent>
            </AccordionItem>

            {isAdmin && (
                <AccordionItem value="item-11">
                    <AccordionTrigger>Configurações</AccordionTrigger>
                    <AccordionContent>
                      <ul className="list-disc space-y-2 pl-5">
                        <li><strong>Configurações Gerais:</strong> Personalize a aparência do sistema, alterando o nome da empresa (exibido no cabeçalho), a logo e o tema de cores.</li>
                        <li><strong>Gerenciar Perfil:</strong> Defina os passes (senhas numéricas de 6 dígitos) para os perfis Administrador e Observador.</li>
                        <li><strong>Gerenciar Ocorrências / Locais / Fa/Fl/Ge / Equip./Marca / Atividade POP TCR:</strong> Nestas telas, você customiza as opções que aparecem nos menus de seleção dos formulários, tornando o sistema adaptado à sua realidade operacional.</li>
                        <li><strong>Gerenciar Mapa:</strong> Faça o upload da imagem de fundo (planta baixa, mapa da área) que será usada em todas as telas de relatório de mapa.</li>
                      </ul>
                    </AccordionContent>
                </AccordionItem>
            )}

        </Accordion>
      </CardContent>
    </Card>
  );
}
