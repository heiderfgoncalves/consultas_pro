# Consultas Pró — Documentação Técnica de Front-end

## Índice
1. [Objetivo do front-end](#1-objetivo-do-front-end)
2. [Princípios de UX e UI](#2-princípios-de-ux-e-ui)
3. [Stack recomendada](#3-stack-recomendada)
4. [Arquitetura do front-end](#4-arquitetura-do-front-end)
5. [Design system](#5-design-system)
6. [Estrutura de navegação](#6-estrutura-de-navegação)
7. [Telas públicas](#7-telas-públicas)
8. [Módulo Início](#8-módulo-início)
9. [Módulo Consultas](#9-módulo-consultas)
10. [Módulo Financeiro](#10-módulo-financeiro)
11. [Módulo Equipe](#11-módulo-equipe)
12. [Módulo Conta](#12-módulo-conta)
13. [Painel administrativo](#13-painel-administrativo)
14. [Componentes globais](#14-componentes-globais)
15. [Estados, feedback e microinterações](#15-estados-feedback-e-microinterações)
16. [Modelagem de permissões na interface](#16-modelagem-de-permissões-na-interface)
17. [Integração com APIs](#17-integração-com-apis)
18. [Responsividade e acessibilidade](#18-responsividade-e-acessibilidade)
19. [Estrutura sugerida de pastas](#19-estrutura-sugerida-de-pastas)
20. [Boas práticas de implementação](#20-boas-práticas-de-implementação)

---

## 1. Objetivo do front-end

O front-end do **Consultas Pró** deve entregar uma experiência SaaS premium, moderna e intuitiva, com foco em:

- clareza do fluxo de emissão de consultas;
- transparência de saldo e custo;
- gestão simples de equipes e acessos;
- baixa carga cognitiva;
- rapidez operacional;
- visual profissional, confiável e comercialmente forte.

O sistema deve parecer produto pronto para venda, não painel administrativo improvisado.

---

## 2. Princípios de UX e UI

## 2.1 UX
- menu curto e objetivo;
- ações principais sempre visíveis;
- custo e saldo acessíveis em qualquer fluxo crítico;
- navegação por módulos, não por excesso de telas;
- evitar formulários extensos quando houver alternativa por etapas;
- priorizar reuso de templates;
- permitir decisões rápidas com bom contexto.

## 2.2 UI
- estética SaaS premium;
- cards e tabelas com forte hierarquia visual;
- tipografia limpa e espaçamento amplo;
- bordas arredondadas e sombras suaves;
- cores sem excesso, com foco em contraste e legibilidade;
- visual minimalista, moderno e confiável.

---

## 3. Stack recomendada

## 3.1 Base
- **Next.js 15+** com App Router
- **React 19+**
- **TypeScript**
- **Tailwind CSS v4**
- **shadcn/ui** como base de componentes

## 3.2 Formulários e validação
- **React Hook Form**
- **Zod**
- máscaras controladas para CPF/CNPJ, telefone e valores

## 3.3 Estado e dados
- **TanStack Query** para cache e sincronização de dados remotos
- **Zustand** para estado local de UI e fluxos compartilhados
- Context API apenas para temas e sessão, se necessário

## 3.4 Animações e visualização
- **Framer Motion** para microinterações leves
- **Lucide React** para ícones
- **Recharts** para dashboards

## 3.5 Tabelas e produtividade
- **TanStack Table** para grids avançados
- **date-fns** para formatação de datas
- **clsx/cva** para variações de componentes

---

## 4. Arquitetura do front-end

## 4.1 Modelo de aplicação
Aplicação SPA/SSR híbrida com:
- páginas públicas de autenticação;
- shell autenticado com sidebar + topbar;
- módulos internos segmentados por papel;
- guards de rota no cliente e no servidor.

## 4.2 Estratégia por domínio
Separar o front em domínios:
- auth
- dashboard
- consultas
- financeiro
- equipe
- conta
- admin
- white-label
- shared/ui

## 4.3 Premissas
- cada módulo possui sua própria camada de components, hooks e services;
- os schemas Zod devem refletir payloads reais da API;
- evitar lógica de negócio complexa dentro de componentes visuais;
- isolar composição de layout da lógica de dados.

---

## 5. Design system

## 5.1 Identidade visual
Sugestão de linguagem:
- base clara sofisticada;
- azul profundo ou grafite como cor principal;
- verde para sucesso/saldo;
- amarelo suave para alerta;
- vermelho elegante para erro/débito;
- neutros modernos para superfícies, bordas e textos.

## 5.2 Tipografia
- títulos fortes e curtos;
- subtítulos discretos;
- textos auxiliares claros;
- valores financeiros destacados com peso maior.

## 5.3 Tokens visuais
Definir tokens para:
- cores semânticas;
- espaços;
- radius;
- shadows;
- font sizes;
- breakpoints;
- estados interativos.

## 5.4 Componentes visuais-chave
- sidebar
- topbar
- stat cards
- cards de template
- cards de bloco de consulta
- tabelas
- drawers e modais
- badges de status
- alert banners
- toasts
- summaries sticky

---

## 6. Estrutura de navegação

## 6.1 Navegação principal do usuário/company
- **Início**
- **Consultas**
- **Financeiro**
- **Equipe** (somente quando aplicável)
- **Conta**

## 6.2 Navegação do admin
- **Dashboard**
- **Companies**
- **Usuários**
- **Consultas**
- **Financeiro**
- **Templates**
- **White-label / Tokens**
- **Gestão técnica**
- **Auditoria**
- **Configurações**

## 6.3 Regras de exibição
- itens do menu devem depender do papel do usuário e do contexto da conta;
- usuário simples não vê Equipe;
- company vê Equipe e visão expandida de dados;
- admin vê shell administrativo próprio.

---

## 7. Telas públicas

## 7.1 Login
Objetivos:
- transmitir confiança;
- permitir acesso direto;
- encaminhar para recuperação ou cadastro quando necessário.

Elementos:
- branding;
- formulário de e-mail e senha;
- CTA principal;
- link de recuperação;
- link para cadastro;
- tratamento elegante de credenciais inválidas.

## 7.2 Cadastro
Campos:
- tipo de cadastro;
- nome completo ou razão social;
- telefone do responsável;
- e-mail;
- CPF/CNPJ;
- senha;
- confirmar senha.

Comportamentos:
- validação em tempo real;
- máscara dinâmica CPF/CNPJ;
- mensagens de duplicidade por documento/e-mail;
- CTA alternativo para recuperar acesso.

## 7.3 Cadastro por convite
Diferenças:
- alguns dados podem vir pré-carregados;
- exibir company vinculada;
- exibir papel sugerido;
- destacar que o usuário será vinculado a uma empresa.

## 7.4 Recuperação de acesso
- campo único para e-mail ou documento;
- feedback claro de envio;
- orientação de próximo passo.

---

## 8. Módulo Início

## 8.1 Objetivo
Ser a visão geral operacional da conta.

## 8.2 Widgets sugeridos
- saldo atual;
- consultas emitidas no período;
- gasto no período;
- templates favoritos;
- últimos usuários ativos, para company;
- últimas movimentações;
- consultas recentes;
- alertas curtos.

## 8.3 UX
- card principal de saldo no topo;
- atalhos rápidos para nova consulta, recarga e histórico;
- evitar excesso de gráfico; priorizar leitura operacional.

---

## 9. Módulo Consultas

## 9.1 Estrutura interna
Abas internas:
- **Nova Consulta**
- **Templates**
- **Histórico**

## 9.2 Nova Consulta
Tela mais importante do produto.

### Layout desktop
Estrutura em 3 colunas:
- catálogo de blocos;
- builder/prévia;
- resumo financeiro sticky.

### Coluna 1 — catálogo
- busca;
- filtros por categoria;
- cards de blocos com nome, descrição, preço e ação.

### Coluna 2 — builder + prévia
- blocos selecionados em ordem;
- prévia visual do relatório;
- expansão de seções;
- remoção e reorganização.

### Coluna 3 — resumo
- nome do template/layout;
- quantidade de blocos;
- subtotal;
- total;
- saldo atual;
- aviso de saldo insuficiente;
- salvar template;
- emitir consulta.

### Mobile
Converter em etapas:
1. escolher blocos;
2. revisar estrutura;
3. ver total;
4. informar documento;
5. confirmar emissão.

## 9.3 Templates
Tipos:
- templates pré-configurados pela plataforma;
- templates do usuário;
- templates da company;
- templates herdados do tenant, se aplicável.

Componentes:
- cards com nome, blocos, valor estimado, origem e data;
- ações: usar, editar, duplicar, excluir.

## 9.4 Histórico
- tabela com filtros;
- drawer/modal com visualização da consulta emitida;
- botão baixar PDF;
- botão repetir consulta.

UX:
- visualização sem sair do contexto da listagem;
- filtros rápidos por status, data e documento.

---

## 10. Módulo Financeiro

## 10.1 Estrutura interna
Pode ser uma única tela com seções ou duas abas:
- **Saldo / Recarga**
- **Extrato**

## 10.2 Saldo / Recarga
Componentes:
- card de saldo atual;
- botões de valores rápidos;
- input de valor livre;
- seleção de método de pagamento;
- status de pagamento;
- recargas recentes.

## 10.3 Extrato
- tabela/linha do tempo financeira;
- destaque de entradas e saídas;
- filtros;
- informação de quem consumiu, no contexto de company;
- coluna de saldo após movimentação.

---

## 11. Módulo Equipe

Visível apenas para company com permissão.

## 11.1 Objetivo
Gerenciar usuários subordinados e convites.

## 11.2 Estrutura visual
- cards de resumo no topo;
- tabela de usuários;
- tabela ou lista de convites pendentes;
- drawer/modal de criação de convite;
- drawer/modal de edição de permissões.

## 11.3 Dados importantes
- nome;
- e-mail;
- telefone;
- status;
- papel;
- última atividade;
- consumo no período.

## 11.4 Ações
- convidar usuário;
- reenviar convite;
- ativar/desativar;
- remover vínculo;
- editar permissões.

---

## 12. Módulo Conta

## 12.1 Objetivo
Centralizar dados pessoais e configurações.

## 12.2 Seções sugeridas
- dados cadastrais;
- segurança;
- preferências;
- vínculo com company;
- dados da company, quando for dono/gestor.

## 12.3 UX
- separar edição sensível da visualização;
- exigir confirmação para troca de senha;
- destacar se o usuário usa saldo compartilhado.

---

## 13. Painel administrativo

## 13.1 Dashboard admin
Widgets sugeridos:
- total de companies;
- total de usuários ativos;
- consultas por dia/mês;
- top partners por volume;
- saldo agregado;
- falhas por fornecedor;
- convites pendentes;
- white-labels ativos;
- eventos técnicos recentes.

## 13.2 Companies
- listagem;
- filtros;
- visão detalhada;
- aba de usuários vinculados;
- aba de saldo e financeiro;
- aba de templates disponíveis;
- aba de configuração do tenant.

## 13.3 Usuários
- listagem global;
- criação manual;
- vínculo a company;
- redefinição de acesso;
- bloqueio;
- histórico resumido.

## 13.4 Templates
- templates globais;
- templates por tenant;
- templates por company;
- controle de ativação.

## 13.5 White-label / Tokens
- lista de tenants;
- branding;
- credenciais;
- tokens com escopos;
- rotação/revogação;
- logs de uso.

## 13.6 Gestão técnica
- status de integrações;
- filas;
- webhooks;
- reprocessamentos;
- chaves externas;
- controles operacionais avançados.

---

## 14. Componentes globais

- AppShell
- Sidebar
- Topbar
- Breadcrumb contextual
- Search/filtro global
- Card de estatística
- Card de saldo
- Card de bloco
- Card de template
- Tabela padronizada
- Drawer lateral
- Modal de confirmação
- Empty state
- Skeleton state
- Badge de status
- Toast system
- Summary sticky
- PermissionGate

---

## 15. Estados, feedback e microinterações

## 15.1 Estados obrigatórios
- loading inicial;
- carregamento parcial;
- vazio;
- erro;
- sem permissão;
- saldo insuficiente;
- sucesso.

## 15.2 Microinterações
- hover sutil em cards e linhas;
- feedback visual ao selecionar blocos;
- transições leves em drawers;
- animações curtas em toasts e mudanças de estado;
- skeleton refinado para builders e dashboards.

---

## 16. Modelagem de permissões na interface

A UI deve ser dirigida por permissões, não só por papéis fixos.

Exemplos de capacidades visuais:
- `canInviteUsers`
- `canManageCompany`
- `canViewCompanyFinance`
- `canEmitConsultas`
- `canManageTemplates`
- `canAccessTechArea`
- `canManageWhitelabel`

A renderização do menu, botões e ações deve depender dessas capacidades.

---

## 17. Integração com APIs

## 17.1 Padrão
- service layer por domínio;
- hooks com TanStack Query;
- mutations com tratamento de erro padronizado;
- tipagem gerada ou centralizada por contratos.

## 17.2 Fluxos críticos
- autenticação;
- cadastro/convite;
- consultas;
- templates;
- saldo e extrato;
- convites e memberships;
- administração;
- white-label.

## 17.3 Boas práticas
- otimistic update apenas quando seguro;
- invalidação pontual de cache;
- estado local separado de estado remoto;
- evitar duplicidade de fetch.

---

## 18. Responsividade e acessibilidade

## 18.1 Responsividade
- desktop como principal ambiente operacional;
- mobile totalmente funcional;
- builder adaptado em steps no mobile;
- tabelas com fallback para cards em telas pequenas;
- drawers no lugar de modais pesados em mobile.

## 18.2 Acessibilidade
- contraste adequado;
- foco visível;
- labels corretos;
- ordem de navegação consistente;
- feedback para erro de formulário;
- ícones sempre com contexto textual quando necessário.

---

## 19. Estrutura sugerida de pastas

```text
src/
  app/
    (public)/
      login/
      cadastro/
      recuperar-acesso/
    (user)/
      inicio/
      consultas/
      financeiro/
      equipe/
      conta/
    (admin)/
      dashboard/
      companies/
      usuarios/
      consultas/
      financeiro/
      templates/
      whitelabel/
      tecnico/
      auditoria/
  features/
    auth/
    dashboard/
    consultas/
    financeiro/
    equipe/
    conta/
    admin/
    whitelabel/
  components/
    ui/
    shared/
  hooks/
  lib/
  services/
  schemas/
  stores/
  styles/
```

---

## 20. Boas práticas de implementação

- criar primeiro o AppShell e os componentes-base;
- padronizar tabelas, cards, drawers e formulários desde o início;
- evitar páginas extremamente acopladas;
- construir layouts com composição, não duplicação;
- tratar UI de permissão desde o começo;
- usar dados mockados realistas para acelerar prototipação;
- validar os fluxos críticos antes do refinamento visual final;
- manter o sistema bonito, mas orientado à operação real.

