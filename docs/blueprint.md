# **App Name**: ALMA Guardia

## Core Features:

- Chat SGS com IA: Permite que os usuários tenham conversas com o modelo Gemini AI para definir e construir seu aplicativo SGS, esclarecendo os requisitos, um por um.
- Interface de Aplicação Web: Fornece uma interface baseada na web construída com Next.js para interagir com a IA e visualizar a estrutura e os parâmetros do aplicativo SGS.
- Interface de Entrada de Parâmetros: Elementos da interface do usuário que permitem aos usuários modificar os parâmetros com base nas instruções da IA durante o processo de desenvolvimento.
- Ferramenta de Ajuste de Requisitos: Fornece uma interface onde os usuários podem pedir ao LLM para adicionar/remover capacidades específicas ao SGS com base em seu estado atual, ou sua compreensão evolutiva dele.

## Style Guidelines:

- Cor primária: Azul celeste suave (#87CEEB), representando comunicação aberta e clareza, uma base calmante para incentivar o diálogo contínuo com o aplicativo.
- Cor de fundo: Azul muito claro (#F0F8FF), mantendo uma estética leve que promove foco e facilidade de uso.
- Cor de destaque: Periwinkle claro (#CCCCFF) para destacar elementos interativos e fornecer uma sugestão visual suave, diferenciando-o dos outros elementos.
- Fonte do corpo e do título: 'Inter' sans-serif; limpa e moderna, escolhida para garantir legibilidade e fornecer uma aparência direta e imparcial para a discussão técnica
- Use ícones simples e claros para representar diferentes recursos e funcionalidades do SGS, garantindo navegação intuitiva e compreensão visual.
- Mantenha um layout limpo e estruturado com amplo espaço em branco, melhorando a legibilidade e reduzindo a desordem visual.
- Incorpore animações sutis, como telas de carregamento ou transições, para fornecer feedback ao usuário e aprimorar a experiência geral sem causar distração.

## Log de Progresso e Decisões:

### Sessão: [Data de Hoje]
- **Imagens:** Decidido migrar imagens do imgBB para o Firebase Storage para maior confiabilidade.
- **Configuração de Deploy:** Ajustado `next.config.mjs` com `unoptimized: true`, `trailingSlash: true` e `output: 'export'`.
- **Firebase Hosting:** Corrigido o `firebase.json` para apontar para a pasta `out`.
- **Identidade Visual:** Logotipo atualizado para usar URL definitiva com token do Firebase Storage no cabeçalho e rodapé.
- **Novos Ativos de Logo:** Recebidos novos links do Firebase Storage para a Logo Final.
  - **PNG (Uso em páginas):** `https://firebasestorage.googleapis.com/v0/b/studio-6033207211-536c4.firebasestorage.app/o/Logo%20Final.png?alt=media&token=0a7e892a-be30-4d41-818f-c224f142af68`
  - **ICO (Favicon/App Icon):** `https://firebasestorage.googleapis.com/v0/b/studio-6033207211-536c4.firebasestorage.app/o/Logo-Final-ico.ico?alt=media&token=7b88f673-93d1-4e01-a1c7-bf0da7beaa86`
- **Domínio:** Registrado e configurado o domínio `almasoftwares.com`. Firebase em processo de geração de certificado SSL.

**Próximos Passos:** Validar o acesso via novo domínio e migrar as demais imagens do carrossel para o Storage.