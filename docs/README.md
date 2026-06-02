# Central de Documentação Técnica — Consultas PRO

Bem-vindo à **Central de Documentação do Consultas PRO**. Este diretório foi reestruturado de forma canônica para atuar como a única fonte confiável de verdade (Single Source of Truth) do ecossistema técnico e de negócios da nossa plataforma SaaS de consultas cadastrais e de crédito.

---

## 🗺️ Mapa de Navegação das Documentações

As especificações do sistema estão organizadas logicamente por áreas de interesse nas seguintes subpastas:

### 1. 🏗️ Arquitetura e Negócios (`/docs/arquitetura/`)
* **[Visão Geral e Negócios](file:///consultas-pro-app/docs/arquitetura/visao_geral.md)**: Objetivos comerciais da plataforma, perfis de acesso detalhados (Admin, Master, Gestor, Operador, Usuário Individual) e os modelos operacionais de conta (Conta Individual vs Conta Company com carteiras compartilhadas e memberships).
* **[Arquitetura de Back-end](file:///consultas-pro-app/docs/arquitetura/backend.md)**: Detalhamento da stack do servidor (Node.js, Fastify 5, Prisma 6, Zod, BullMQ + Redis). Explicação do fluxo de vida 100% assíncrono das emissões de consultas (enfileiramento de jobs no BullMQ, estorno de falhas parciais) e a integridade financeira do ledger de transações por locking pessimista.
* **[Arquitetura de Front-end](file:///consultas-pro-app/docs/arquitetura/frontend.md)**: Detalhes do cliente React 18, estilização em Tailwind CSS, gerenciamento híbrido de estados (TanStack Query para dados assíncronos e Zustand para controle fino de interface), o gateway modular de capacidades (`PermissionGate`) e o design de responsividade adaptiva por etapas (wizard) para o Builder Mobile.

### 2. 🔌 Pipeline de Integrações e Dados (`/docs/integracoes/`)
* **[Pipeline de Dados em 5 Etapas](file:///consultas-pro-app/docs/integracoes/fluxo_de_dados.md)**: Conceituação física e lógica de como o sistema resolve a heterogeneidade das APIs de provedores externos por meio das 5 abas configuráveis de `/integracoes` (`provedores`, `consultas`, `tipos`, `templates` e `configuracoes`).
* **[Aba Tipos (A Inteligência De-Para)](file:///consultas-pro-app/docs/integracoes/mapeamento_tipos.md)**: Como funciona o motor de transformação que traduz as respostas dos provedores ("De") em variáveis planas unificadas ("Para"). Detalha regras de sanitização de booleanos, conversões de status, a regra de **Deduplicação de Registros (Deduplicate)** e o **Isolamento de Filtros por Consulta + Tipo** (salvos em `ProviderProduct.itemFiltersByCanonicalPath` para evitar contaminação cruzada global de tipos).
* **[Aba Templates (O Templates Drawer)](file:///consultas-pro-app/docs/integracoes/templates_drawer.md)**: Guia completo do editor visual por drag-and-drop. Explica o consumo estrito e plano de variáveis ativas "Para" (bloqueando chaves fantasmas como `.quantidade`), a sincronização modular unificada de sugestões (textbox, textarea, aba Dados e console), e o interpretador de fórmulas matemáticas `math()` dotado de **purificação dinâmica de moedas e tratamento avançado de percentuais** brasileiros.

### 3. 🛡️ Contratos de APIs (`/docs/api/`)
* **[Especificação OpenAPI](file:///consultas-pro-app/docs/api/openapi.md)**: Diretrizes e endpoints para a especificação Swagger/OpenAPI exposta de forma incremental e protegida para contas gestoras e administrativas.

### 4. 🗄️ Histórico e Arquivo de Legados (`/docs/old/`)
* Todos os rascunhos, planos antigos dispersos, pacotes técnicos iniciais e especificações obsoletas de fases passadas de desenvolvimento foram fisicamente isolados sob o diretório `/docs/old/`. Eles servem estritamente para consulta de histórico do projeto e não devem ser usados como referência de desenvolvimento atual.

---

## 💎 Consolidação de Regras Críticas (Aprendizados dos Chats)

Abaixo estão consolidadas as regras técnicas mais críticas que governam o comportamento integrado de ponta a ponta do sistema, as quais foram intensamente alinhadas e validadas:

### A Rule of Gold: Ognosticismo de Provedor via De-Para Plano
O **Templates Drawer** nunca consome nem reconhece chaves originais ou estruturas aninhadas do fornecedor de dados (`CREDCADASTRAL.PEND_FINANCEIRAS...`). Ele opera unicamente em uma **estrutura de dados achatada (flat) e normalizada** gerada na aba **Tipos**. 
Isso permite que um template de relatório seja totalmente independente de qual fornecedor de API entregou a consulta, desde que as chaves destino "Para" (ex: `valor`, `contrato`, `origem`) estejam mapeadas ativamente.

### Sincronismo Modular das Variáveis de Autocomplete
Para evitar qualquer inconsistência visual e operacional no editor de relatórios, o autocomplete em caixas de entrada (textbox), áreas de texto (textarea), na aba de visualização estrutural ("Dados") e no console interativo de depuração inferior é gerado a partir de uma **única fonte modular unificada baseada na store de variáveis mapeadas ativas**.
Se um campo não estiver mapeado no de-para ativo do produto correspondente, ele **não aparecerá** em nenhum lugar do editor, eliminando campos fantasmas obsoletos (como `.quantidade` ou `.total` injetados de forma dura).

### Purificação de Strings Monetárias e Percentuais no Motor `math()`
Como os payloads de provedores frequentemente retornam números formatados como textos brasileiros (ex: `"R$ 14.877,35"` ou `"10,00%"`), o motor de expressões matemáticas `math()` purifica os dados em tempo de execução:
1. Identifica caracteres especiais (`R$`, `%`, espaços) e formatos de pontuação (ponto para milhar, vírgula para decimal).
2. Limpa e converte a string em ponto flutuante real (`14877.35` ou `10.0`).
3. Realiza a operação matemática solicitada (somas, divisões, juros).
4. Formata e exibe o resultado final de volta para o padrão visual esperado.

---

## 🎯 Próximos Passos de Documentação
Para manter esta central de documentação sempre atualizada com as evoluções da plataforma, sugere-se estender nos próximos ciclos:
1. **Guias de Integração de Gateways de Pagamento**: Adicionar as especificações de Webhooks e rotas de conciliação de recargas de PIX e cartões (como Iugu ou Asaas).
2. **Políticas de Retenção de Dados**: Documentar as rotinas de limpeza em background para remoção de relatórios e PDFs antigos do histórico do banco, respeitando diretrizes da LGPD brasileira.
