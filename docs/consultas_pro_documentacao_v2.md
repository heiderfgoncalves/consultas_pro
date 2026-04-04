# Consultas PRO — Documentação Geral do Sistema

## Índice
1. [Visão geral](#1-visão-geral)
2. [Objetivos do sistema](#2-objetivos-do-sistema)
3. [Perfis de acesso](#3-perfis-de-acesso)
4. [Modelo de contas, empresas e vínculos](#4-modelo-de-contas-empresas-e-vínculos)
5. [Fluxos principais do negócio](#5-fluxos-principais-do-negócio)
6. [Arquitetura funcional da navegação](#6-arquitetura-funcional-da-navegação)
7. [Telas do sistema](#7-telas-do-sistema)
8. [Regras de negócio](#8-regras-de-negócio)
9. [Convites, cadastro e recuperação de acesso](#9-convites-cadastro-e-recuperação-de-acesso)
10. [Templates, layouts e consultas](#10-templates-layouts-e-consultas)
11. [Saldo, recargas e extrato](#11-saldo-recargas-e-extrato)
12. [Administração e operação da plataforma](#12-administração-e-operação-da-plataforma)
13. [White-label, tokens e embeds](#13-white-label-tokens-e-embeds)
14. [Dashboards e relatórios](#14-dashboards-e-relatórios)
15. [Premissas de segurança, auditoria e escalabilidade](#15-premissas-de-segurança-auditoria-e-escalabilidade)
16. [Roadmap sugerido](#16-roadmap-sugerido)

---

## 1. Visão geral

O **Consultas PRO** é uma plataforma SaaS web responsiva para emissão de consultas de crédito e restrições em formato **self-service**, permitindo que o cliente monte o relatório que deseja a partir de blocos modulares de dados, acompanhe custo em tempo real, utilize saldo pré-pago, salve templates e reutilize suas configurações em novas emissões.

O sistema foi pensado para operar em três níveis principais:

- **Admin da plataforma**: controla operação, usuários, parceiros, templates, tabelas, saldos, integrações, white-labels e gestão técnica.
- **Company / Parceiro**: representa uma empresa parceira ou cliente corporativo que gerencia sua própria conta, seus usuários vinculados, seus consumos e seu saldo compartilhado.
- **Usuário simples**: perfil operacional de menor privilégio, que acessa somente as funções autorizadas dentro da própria conta ou company.

Além da operação principal, a plataforma também nasce preparada para:

- white-label;
- embeds em outras plataformas;
- APIs e tokens para integração;
- operação multi-tenant;
- gestão centralizada por admin;
- crescimento como produto SaaS comercializável.

---

## 2. Objetivos do sistema

### 2.1 Objetivos de negócio
- transformar consultas de crédito em produto modular e configurável;
- permitir cobrança por bloco de informação;
- incentivar recorrência por meio de templates salvos;
- facilitar operação para parceiros e empresas;
- oferecer controle administrativo completo;
- permitir expansão via white-label e integração externa.

### 2.2 Objetivos de experiência
- reduzir atrito para emitir consultas;
- deixar o custo sempre visível;
- dar clareza sobre saldo, consumo e resultado;
- permitir gestão simples de equipe e acessos;
- concentrar a operação em poucos módulos intuitivos.

---

## 3. Perfis de acesso

## 3.1 Admin da plataforma
É o nível máximo de acesso.

Pode:
- visualizar todos os dados do sistema;
- criar, editar, bloquear e reativar usuários;
- criar, editar e bloquear companies/parceiros;
- vincular usuários a companies existentes;
- criar convites para empresas parceiras se cadastrarem;
- criar convites para usuários simples se cadastrarem vinculados a uma company;
- criar usuário comum diretamente;
- creditar e debitar saldo;
- emitir consultas administrativamente;
- gerenciar templates pré-configurados;
- gerenciar tabelas de preços;
- gerenciar integrações e fornecedores;
- gerenciar white-label, tokens e acessos técnicos;
- acessar dashboard operacional e financeiro da plataforma;
- acessar área de gestão técnica e auditoria.

## 3.2 Company / Parceiro
Representa uma conta empresarial, parceira ou cliente corporativo com capacidade de gerenciar sua própria estrutura interna.

Pode:
- visualizar seus próprios dados cadastrais;
- visualizar seu saldo e extrato;
- emitir consultas;
- salvar templates/layouts;
- ver histórico de consultas próprias e da equipe, conforme permissão;
- convidar usuários para se cadastrarem vinculados à sua company;
- gerir seus usuários subordinados;
- ativar/desativar acessos internos;
- definir permissões internas básicas;
- visualizar dashboard resumido de movimentação da própria company;
- acompanhar consumo por usuário;
- compartilhar saldo entre usuários da equipe.

## 3.3 Usuário simples
É o perfil operacional de menor acesso.

Pode:
- acessar a plataforma com sua conta vinculada;
- emitir consultas, se autorizado;
- utilizar templates disponíveis;
- ver seu próprio histórico, conforme permissão da company;
- visualizar suas configurações pessoais;
- consumir o saldo da company quando for usuário vinculado a uma conta empresarial.

Não pode:
- gerenciar white-label;
- criar companies;
- ver dados globais da plataforma;
- acessar gestão técnica;
- editar dados sensíveis de outros usuários sem permissão.

---

## 4. Modelo de contas, empresas e vínculos

A plataforma deve suportar dois modelos operacionais:

### 4.1 Conta individual
Usuário simples sem company vinculada.

Características:
- possui saldo próprio;
- emite consultas individualmente;
- vê apenas seus dados e seus consumos;
- não gerencia equipe.

### 4.2 Conta company / parceiro
Conta empresarial com estrutura compartilhada.

Características:
- possui saldo central da company;
- múltiplos usuários podem operar sob a mesma company;
- os usuários subordinados usam o saldo da company;
- a company acompanha consumo agregado e por usuário;
- a company pode convidar novos usuários;
- o admin pode vincular usuários existentes à company.

### 4.3 Estrutura conceitual
- **Tenant / Marca**: camada de white-label e isolamento visual/comercial.
- **Company**: organização empresarial vinculada a um tenant.
- **User**: pessoa com acesso ao sistema.
- **Membership**: vínculo entre user e company, com papel e permissões.

---

## 5. Fluxos principais do negócio

## 5.1 Cadastro individual
1. Usuário acessa cadastro aberto.
2. Informa nome/razão social, telefone, e-mail e CPF/CNPJ.
3. Sistema valida duplicidade.
4. Se não existir conta, permite concluir cadastro.
5. Se já existir e-mail ou documento, oferece recuperação de acesso.

## 5.2 Cadastro por convite de company
1. Company gera convite para novo usuário.
2. Sistema cria link/token de convite com prazo de validade.
3. Usuário convidado acessa link.
4. Preenche dados faltantes ou confirma dados pré-preenchidos.
5. Sistema cria conta e vínculo com a company.
6. Usuário passa a consumir o saldo compartilhado da company.

## 5.3 Convite de company criado pelo admin
1. Admin cria convite para nova empresa parceira.
2. Define tenant, tabela de preços, permissões iniciais e opcionalmente limites.
3. Empresa acessa o link de convite.
4. Completa cadastro e cria o primeiro usuário administrador da company.
5. Company passa a operar dentro da plataforma.

## 5.4 Emissão de consulta
1. Usuário acessa o módulo Consultas.
2. Seleciona template salvo, template pré-configurado ou monta uma nova consulta.
3. Adiciona blocos desejados.
4. Visualiza custo total em tempo real.
5. Informa CPF/CNPJ a consultar.
6. Sistema valida saldo e permissões.
7. Consulta é enviada ao motor de processamento.
8. Sistema consolida dados dos fornecedores.
9. Relatório fica disponível para visualização e PDF.
10. Débito é registrado no extrato.

## 5.5 Gestão administrativa
1. Admin acessa dashboard.
2. Visualiza movimentação de companies, usuários, consumo e saldo.
3. Cria ou edita empresa/usuário.
4. Credita ou debita saldo.
5. Ajusta template, tabela ou configuração técnica.
6. Audita ações e eventos críticos.

---

## 6. Arquitetura funcional da navegação

A barra principal do sistema deve ser enxuta e centrada em módulos.

## 6.1 Navegação do usuário/company
- **Início**
- **Consultas**
- **Financeiro**
- **Equipe** (somente para company com permissão)
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
- **Auditoria / Logs**
- **Configurações**

---

## 7. Telas do sistema

## 7.1 Telas públicas
### Login
- autenticação por e-mail e senha;
- acesso por convite, quando aplicável;
- link para recuperar acesso;
- indicação de conta já existente.

### Cadastro
- cadastro aberto para usuário simples ou company, conforme estratégia;
- validação de CPF/CNPJ;
- validação de duplicidade por e-mail/documento;
- possibilidade de entrada por convite.

### Recuperação de acesso
- recuperação por e-mail ou documento;
- redirecionamento para redefinição de senha;
- tratamento de conta já existente.

## 7.2 Telas do módulo Início
### Dashboard do usuário/company
- saldo atual;
- consultas recentes;
- movimentações recentes;
- templates favoritos;
- visão resumida de equipe, quando aplicável.

## 7.3 Telas do módulo Consultas
### Aba Nova Consulta
Concentra:
- catálogo de blocos;
- builder da consulta;
- prévia em tempo real;
- resumo de custos;
- emissão.

### Aba Layouts / Templates
- templates pré-configurados da plataforma;
- templates salvos do usuário/company;
- ações de editar, duplicar, excluir e usar.

### Aba Histórico
- lista/tabela de consultas emitidas;
- filtros;
- ações rápidas;
- abertura de visualização detalhada em modal ou drawer;
- download de PDF.

## 7.4 Telas do módulo Financeiro
### Saldo e Recarga
- saldo atual;
- recarga via PIX ou cartão;
- status de pagamento;
- histórico curto de recargas.

### Extrato
- entradas, saídas, estornos, bônus e ajustes;
- filtros por período;
- saldo anterior e posterior por movimentação.

## 7.5 Telas do módulo Equipe
### Gestão de usuários da company
- listagem de usuários vinculados;
- status de acesso;
- permissões;
- convites pendentes;
- adicionar usuário;
- reenviar convite;
- ativar/desativar;
- remover vínculo.

## 7.6 Telas do módulo Conta
### Perfil / Configurações
- dados cadastrais;
- telefone;
- e-mail;
- documento;
- alteração de senha;
- preferências;
- tipo de conta;
- vínculo com company, quando houver.

## 7.7 Telas do admin
### Dashboard administrativo
- resumo global de companies, usuários, consultas e volume financeiro;
- indicadores por período;
- alertas operacionais;
- atalhos de gestão.

### Gestão de companies
- criar e editar company;
- vincular tenant;
- definir tabela de preços;
- ajustar saldo;
- ver usuários vinculados;
- criar convites para company.

### Gestão de usuários
- criar usuário comum;
- editar dados;
- vincular a company existente;
- resetar acesso;
- bloquear/desbloquear;
- ver histórico resumido.

### Gestão de templates
- criar templates globais;
- ativar/desativar;
- agrupar por categoria;
- definir visibilidade por tenant/company.

### Gestão financeira
- saldo de companies e usuários individuais;
- créditos manuais;
- débitos manuais;
- extratos;
- conciliação de recargas.

### White-label / Tokens
- criar tenant;
- configurar logo, nome e cores;
- gerar tokens/API keys;
- gerenciar embed;
- revogar credenciais.

### Gestão técnica
- fornecedores de consulta;
- status das integrações;
- webhooks;
- chaves e segredos;
- filas e reprocessamentos;
- parâmetros operacionais.

### Auditoria / Logs
- trilha de ações;
- logs de autenticação;
- logs de saldo;
- logs de emissão;
- logs de mudanças técnicas.

---

## 8. Regras de negócio

## 8.1 Cadastro e identidade
- e-mail deve ser único globalmente;
- CPF/CNPJ deve ser único conforme regra de tipo de conta definida;
- ao detectar duplicidade, o sistema não deve criar nova conta; deve oferecer recuperação ou login;
- convites possuem validade e status.

## 8.2 Permissões
- usuário simples vê apenas o que lhe for permitido;
- company vê seus próprios dados e os de seus usuários vinculados;
- admin tem acesso global;
- permissões da company não devem ultrapassar o escopo do tenant.

## 8.3 Saldo
- contas individuais usam saldo próprio;
- usuários vinculados à company usam o saldo compartilhado da company;
- extrato deve registrar quem consumiu, quanto consumiu e em qual operação;
- admin pode realizar ajustes manuais com motivo obrigatório.

## 8.4 Consultas
- uma consulta só pode ser emitida se houver saldo suficiente, salvo exceções administrativas;
- custo da consulta é calculado pela soma dos blocos selecionados com base na tabela aplicável;
- templates não alteram o preço por si; apenas reúnem blocos pré-selecionados;
- PDF e resultado devem ficar acessíveis posteriormente, respeitando políticas internas de retenção.

## 8.5 Convites e vínculos
- convite para usuário pode ser gerado por company ou admin;
- convite para nova company é gerado pelo admin;
- admin pode vincular manualmente usuário existente a company existente;
- ao aceitar convite, o vínculo deve ser criado automaticamente com papel pré-definido.

## 8.6 White-label
- tenant define identidade visual, domínios, permissões e exposição de templates;
- tokens de integração devem ser revogáveis;
- o isolamento de dados entre tenants é obrigatório.

---

## 9. Convites, cadastro e recuperação de acesso

## 9.1 Tipos de convite
- convite para nova company/parceiro;
- convite para usuário da company;
- convite criado pelo admin para usuário simples já vinculado a uma company;
- convite técnico para integração/white-label, quando aplicável.

## 9.2 Estados do convite
- pendente;
- aceito;
- expirado;
- cancelado;
- reenviado.

## 9.3 Regras de recuperação
- se documento ou e-mail já existir, orientar para recuperar acesso;
- se convite expirar, permitir reemissão;
- se usuário já estiver vinculado a company, impedir duplicação do mesmo vínculo conforme política de negócio.

---

## 10. Templates, layouts e consultas

## 10.1 Templates pré-configurados
Criados pela plataforma/admin para padronizar consultas recorrentes.

Podem ser:
- globais;
- por tenant;
- por company;
- restritos por perfil.

## 10.2 Layouts salvos do usuário/company
Criados durante a operação.

Permitem:
- salvar seleção de blocos;
- reutilizar em futuras consultas;
- editar, duplicar e remover.

## 10.3 Blocos possíveis de consulta
Exemplos:
- SPC;
- Serasa;
- Boa Vista;
- Protestos;
- Score;
- Rating;
- renda presumida;
- capacidade de pagamento;
- risco de crédito;
- classificação por letras;
- Registrato Bacen;
- novos blocos futuros.

---

## 11. Saldo, recargas e extrato

## 11.1 Formas de recarga
- PIX;
- cartão de crédito.

## 11.2 Movimentações possíveis
- recarga;
- débito por consulta;
- estorno;
- bônus;
- ajuste manual administrativo;
- reserva temporária de saldo, se implementada.

## 11.3 Transparência financeira
Cada movimentação deve registrar:
- data/hora;
- tipo;
- descrição;
- origem;
- usuário responsável;
- valor;
- saldo anterior;
- saldo posterior.

---

## 12. Administração e operação da plataforma

O admin precisa operar o sistema de forma rápida e visual.

### O dashboard administrativo deve mostrar
- total de companies ativas;
- total de usuários ativos;
- volume de consultas por período;
- consumo financeiro por company;
- maiores emissores;
- recargas recentes;
- alertas de falha de integração;
- pendências técnicas;
- convites pendentes;
- desempenho por tenant/white-label.

### Operações administrativas essenciais
- criar company;
- criar usuário comum;
- vincular usuário a company;
- gerar convites;
- gerenciar saldo;
- editar dados cadastrais;
- gerenciar templates;
- gerenciar tokens;
- ver auditoria.

---

## 13. White-label, tokens e embeds

A plataforma deve suportar:
- múltiplos tenants;
- identidade visual por tenant;
- domínio/subdomínio dedicado;
- tokens para integração externa;
- embeds;
- APIs protegidas;
- revogação e rotação de credenciais.

## 13.1 Gestão pelo admin
O admin deve poder:
- criar tenant;
- definir branding;
- ativar/desativar módulos;
- gerar token;
- atribuir escopos ao token;
- revogar token;
- ver logs de uso do token;
- definir limites de integração.

## 13.2 Casos de uso
- parceiro usando o sistema com marca própria;
- portal externo consumindo a plataforma via token;
- iframe/embed autenticado;
- APIs de consulta, saldo, templates e histórico.

---

## 14. Dashboards e relatórios

## 14.1 Dashboard da company
- saldo atual;
- consumo por período;
- consultas emitidas;
- usuários ativos;
- convites pendentes;
- top usuários por consumo;
- recargas recentes.

## 14.2 Dashboard do admin
- visão consolidada da operação;
- ranking de companies;
- ranking de consumo;
- saldo total por faixa;
- situação de integrações;
- indicadores de falhas;
- indicadores de crescimento.

---

## 15. Premissas de segurança, auditoria e escalabilidade

- autenticação segura;
- controle de acesso por papel e escopo;
- logs de auditoria para ações críticas;
- trilha de mudanças em saldo, templates e integrações;
- isolamento entre tenants;
- mascaramento de documentos sensíveis onde necessário;
- reprocessamento controlado de consultas;
- escalabilidade para novas companies, novos módulos e novas integrações.

---

## 16. Roadmap sugerido

## Fase 1 — Base operacional
- autenticação;
- cadastro e recuperação;
- companies e vínculos;
- builder de consultas;
- templates;
- saldo e recarga;
- histórico e PDF;
- dashboard básico;
- painel admin essencial.

## Fase 2 — Operação ampliada
- gestão avançada de equipe;
- convites completos;
- templates por tenant/company;
- dashboards analíticos;
- melhorias de permissão.

## Fase 3 — White-label SaaS
- tenants completos;
- tokens/API;
- embed;
- gestão técnica avançada;
- observabilidade robusta;
- escalabilidade comercial.

