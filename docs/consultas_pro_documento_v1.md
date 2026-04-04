# Consultas PRO
## Documento Revisado do Projeto
**Versão:** 2.0  
**Data:** 31/03/2026  
**Objetivo:** consolidar o escopo do produto, revisar a arquitetura de navegação e organizar o projeto para desenvolvimento no Cursor/Lovable.

---

## Índice

1. [Resumo executivo](#1-resumo-executivo)
2. [Conceito do produto](#2-conceito-do-produto)
3. [Objetivos de negócio](#3-objetivos-de-negócio)
4. [Perfis de usuário](#4-perfis-de-usuário)
5. [Escopo funcional consolidado](#5-escopo-funcional-consolidado)
6. [Arquitetura de navegação revisada](#6-arquitetura-de-navegação-revisada)
7. [Módulos e telas agrupadas](#7-módulos-e-telas-agrupadas)
8. [Principais fluxos do usuário](#8-principais-fluxos-do-usuário)
9. [Regras de negócio](#9-regras-de-negócio)
10. [Cadastro, login e recuperação de acesso](#10-cadastro-login-e-recuperação-de-acesso)
11. [Conta mestre e usuários subordinados](#11-conta-mestre-e-usuários-subordinados)
12. [Builder de consultas](#12-builder-de-consultas)
13. [Histórico, PDF e reutilização](#13-histórico-pdf-e-reutilização)
14. [Financeiro e carteira](#14-financeiro-e-carteira)
15. [Administração e operação](#15-administração-e-operação)
16. [White-label, embed e integrações](#16-white-label-embed-e-integrações)
17. [Diretrizes de UX/UI](#17-diretrizes-de-uxui)
18. [Estrutura sugerida de front-end](#18-estrutura-sugerida-de-front-end)
19. [Backlog de MVP e roadmap](#19-backlog-de-mvp-e-roadmap)
20. [Resumo para desenvolvimento](#20-resumo-para-desenvolvimento)

---

## 1. Resumo executivo

**Consultas PRO** é uma plataforma web responsiva para emissão de consultas de crédito e restrições em formato self-service.  
O diferencial do produto é permitir que o cliente monte sua própria consulta escolhendo blocos de informação, visualizando o custo em tempo real e vendo uma prévia do relatório antes da emissão.

O sistema também possui:
- login e cadastro;
- carteira de saldo com recarga via PIX e cartão;
- layouts salvos para reutilização;
- histórico de consultas com download em PDF;
- extrato financeiro;
- gestão de usuários subordinados em contas empresariais com saldo compartilhado;
- gestão administrativa de preços e créditos;
- preparação para white-label, embed e integrações externas.

A revisão desta versão atualiza especialmente a **arquitetura de navegação**, agrupando funções relacionadas para simplificar o uso e reduzir a complexidade da barra lateral.

---

## 2. Conceito do produto

O Consultas PRO funciona como um **configurador de consultas de crédito**.

Em vez de oferecer apenas relatórios fechados, a plataforma permite que o cliente selecione os módulos que quer incluir, por exemplo:
- SPC;
- Serasa;
- Boa Vista;
- Protestos;
- Score com pontuação;
- Rating de crédito;
- renda presumida;
- capacidade de pagamento;
- risco de crédito;
- classificação de letras;
- Registrato Bacen com dívidas vencidas e a vencer;
- demais blocos futuros.

Cada bloco possui custo próprio conforme a tabela de preços aplicada ao usuário.  
O cliente monta a consulta, vê o total, salva o layout se quiser e emite usando o saldo da conta.

---

## 3. Objetivos de negócio

O projeto busca atender cinco objetivos principais:

### 3.1 Vender consultas de forma modular
Transformar o serviço em um catálogo configurável, aumentando flexibilidade e percepção de valor.

### 3.2 Melhorar ticket médio
Permitir upsell natural por adição de blocos complementares.

### 3.3 Dar autonomia ao cliente
Reduzir dependência operacional de atendentes ou emissão manual.

### 3.4 Criar recorrência
Layouts salvos, histórico, saldo pré-pago e uso recorrente fortalecem retenção.

### 3.5 Escalar distribuição
Preparar o produto para white-label, embed ou integração em plataformas terceiras.

---

## 4. Perfis de usuário

### 4.1 Usuário cliente comum
Pessoa física ou jurídica que:
- recarrega saldo;
- monta consultas;
- emite relatórios;
- salva layouts;
- baixa PDFs;
- consulta histórico e extrato.

### 4.2 Conta mestre
Conta principal de empresa ou operação que pode:
- compartilhar saldo com usuários subordinados;
- controlar equipe autorizada a emitir consultas;
- acompanhar uso da equipe.

### 4.3 Usuário subordinado
Usuário vinculado à conta mestre que:
- acessa a plataforma com seu próprio login;
- emite consultas;
- utiliza o saldo compartilhado da conta principal;
- não precisa ter carteira própria.

### 4.4 Administrador
Responsável pela operação interna do sistema:
- gerencia usuários;
- gerencia tabelas de preço;
- credita ou debita saldo;
- emite consultas sem consumir saldo;
- acompanha dados financeiros e operacionais;
- gerencia white-labels e integrações.

---

## 5. Escopo funcional consolidado

O sistema deve contemplar os seguintes grupos de funcionalidades:

### 5.1 Acesso e identidade
- login;
- cadastro;
- recuperação de acesso;
- validação de e-mail;
- validação de CPF/CNPJ;
- bloqueio de duplicidade de cadastro.

### 5.2 Consulta self-service
- seleção de blocos;
- cálculo do custo em tempo real;
- prévia da consulta;
- emissão da consulta;
- salvamento de layouts.

### 5.3 Documentos e histórico
- armazenamento do histórico de consultas;
- visualização posterior;
- download do PDF;
- repetição de consulta.

### 5.4 Financeiro
- saldo atual;
- recarga via PIX;
- recarga via cartão;
- extrato de movimentações;
- débitos por consulta;
- ajustes administrativos.

### 5.5 Operação empresarial
- conta mestre;
- usuários subordinados;
- permissões de emissão;
- saldo compartilhado.

### 5.6 Administração
- gestão de usuários;
- gestão de créditos;
- gestão de tabelas de preço;
- emissão administrativa;
- auditoria.

### 5.7 Expansão
- white-label;
- embed;
- API;
- webhooks.

---

## 6. Arquitetura de navegação revisada

Para simplificar a experiência do cliente, a navegação principal deve ser enxuta.

### Barra lateral principal recomendada
- **Início**
- **Consultas**
- **Financeiro**
- **Equipe** *(somente para conta mestre ou perfil com permissão)*
- **Conta**

### Telas fora da navegação principal
Essas páginas existem, mas não ficam na sidebar da área logada:
- Login
- Cadastro
- Recuperação de acesso

Essa estrutura substitui o modelo anterior com muitas telas independentes e organiza o sistema por **módulos de uso**, não por funções isoladas.

---

## 7. Módulos e telas agrupadas

## 7.1 Início
Módulo de visão geral da conta.

### Reúne:
- dashboard;
- saldo atual;
- atalhos rápidos;
- últimas consultas;
- últimas movimentações;
- layouts favoritos;
- resumo da equipe, quando aplicável.

### Finalidade:
dar visão rápida da operação sem sobrecarregar o usuário.

---

## 7.2 Consultas
Módulo principal da operação do cliente.

### Estrutura interna sugerida
- **Aba Nova Consulta**
- **Aba Layouts**
- **Aba Histórico**

### O que foi agrupado aqui
- nova consulta;
- construtor;
- prévia;
- layouts salvos;
- layouts predefinidos;
- histórico de consultas;
- visualização de consulta emitida.

### Comportamento recomendado
- **Nova Consulta + Builder + Prévia** ficam na mesma experiência.
- **Histórico** abre a consulta emitida em **modal** ou **drawer**, sem criar uma página separada.
- **Layouts** servem para criar, editar, duplicar, favoritar e reutilizar modelos.

---

## 7.3 Financeiro
Módulo financeiro do cliente.

### Pode ser organizado em:
- **Saldo e Recarga**
- **Extrato**

### O que foi agrupado aqui
- recarregar saldo;
- histórico de recargas;
- extrato financeiro;
- saldo atual;
- débitos e créditos.

---

## 7.4 Equipe
Módulo de gestão de usuários subordinados.

### Disponível para:
- conta mestre;
- perfis autorizados.

### Reúne:
- lista de usuários subordinados;
- cadastro de usuário subordinado;
- permissões;
- ativação e desativação;
- redefinição de acesso;
- resumo de uso da equipe.

---

## 7.5 Conta
Módulo de dados cadastrais e segurança.

### Reúne:
- dados da conta;
- nome completo ou razão social;
- telefone do responsável;
- e-mail;
- documento;
- alteração de senha;
- tipo de conta;
- informações da conta mestre.

---

## 8. Principais fluxos do usuário

## 8.1 Primeiro acesso
1. usuário entra no login;
2. faz cadastro ou recupera acesso;
3. entra na área logada;
4. visualiza dashboard e saldo;
5. segue para Consultas ou Financeiro.

## 8.2 Recarga
1. usuário entra em Financeiro;
2. escolhe valor;
3. escolhe PIX ou cartão;
4. conclui pagamento;
5. saldo é atualizado;
6. movimentação aparece no extrato.

## 8.3 Montagem da consulta
1. usuário entra em Consultas;
2. seleciona blocos na aba Nova Consulta;
3. vê custo total em tempo real;
4. vê prévia na mesma tela;
5. pode salvar layout;
6. informa CPF ou CNPJ;
7. confirma emissão.

## 8.4 Reuso de layout
1. usuário entra em Consultas > Layouts;
2. escolhe um layout salvo;
3. abre o modelo no builder;
4. revisa;
5. emite nova consulta.

## 8.5 Consulta ao histórico
1. usuário entra em Consultas > Histórico;
2. filtra ou busca;
3. abre detalhes da consulta em modal/drawer;
4. baixa PDF ou repete a consulta.

## 8.6 Gestão da equipe
1. conta mestre entra em Equipe;
2. cadastra ou convida usuário subordinado;
3. define permissão;
4. usuário subordinado passa a operar com saldo compartilhado.

---

## 9. Regras de negócio

1. O valor de cada consulta depende da tabela vinculada ao usuário.
2. Cada bloco possui preço próprio.
3. O total deve ser recalculado em tempo real.
4. O usuário só pode emitir consulta com saldo suficiente, salvo exceções administrativas.
5. Toda emissão deve gerar histórico e PDF.
6. Layouts podem ser salvos e reutilizados.
7. Conta mestre pode compartilhar saldo com usuários subordinados.
8. Usuários subordinados não precisam ter saldo próprio.
9. O uso da equipe deve ficar rastreável no histórico e no extrato.
10. Admin pode creditar saldo, debitar saldo e emitir consulta sem consumo.
11. Cadastro não pode duplicar e-mail nem CPF/CNPJ.
12. Em caso de duplicidade, a interface deve oferecer recuperação de acesso.

---

## 10. Cadastro, login e recuperação de acesso

## 10.1 Campos obrigatórios de cadastro
- nome completo **ou** razão social;
- telefone do responsável;
- e-mail;
- CPF ou CNPJ;
- senha.

## 10.2 Validações
- máscara dinâmica para CPF/CNPJ;
- validação de formato;
- verificação de duplicidade por e-mail;
- verificação de duplicidade por documento.

## 10.3 Comportamento em duplicidade
Se já existir conta com o e-mail ou documento informado, o sistema deve:
- informar claramente que já existe cadastro;
- oferecer botão de **recuperar acesso**;
- oferecer botão de **ir para login**.

## 10.4 Novo cadastro aberto
O sistema mantém o cadastro aberto para novos usuários que não tenham conta prévia.

---

## 11. Conta mestre e usuários subordinados

Uma conta mestre representa uma empresa ou operação central.

### Deve ser possível:
- adicionar usuários subordinados;
- remover acesso;
- ativar ou desativar usuário;
- controlar permissões;
- compartilhar saldo da conta principal.

### Funcionamento
- o saldo fica concentrado na conta mestre;
- subordinados usam esse saldo para emitir consultas;
- todas as emissões precisam registrar quem executou;
- a conta principal mantém visibilidade do consumo da equipe.

### Benefícios
- operação centralizada;
- múltiplos funcionários usando a mesma conta;
- rastreabilidade operacional;
- controle financeiro unificado.

---

## 12. Builder de consultas

O builder é o núcleo do produto.

### Deve permitir:
- selecionar blocos de consulta;
- exibir preço por bloco;
- mostrar total atualizado;
- reorganizar blocos;
- remover blocos;
- nomear layout;
- salvar modelo;
- emitir consulta.

### Estrutura ideal da tela no desktop
**Coluna 1 - Catálogo de blocos**
- cards ou lista com nome, descrição e preço.

**Coluna 2 - Montagem / Prévia**
- blocos selecionados;
- ordem visual;
- estrutura da consulta;
- prévia do relatório.

**Coluna 3 - Resumo e ação**
- total;
- saldo atual;
- botão salvar layout;
- botão emitir;
- aviso de saldo insuficiente.

### No mobile
O mesmo fluxo vira um processo em etapas:
1. escolher blocos;
2. revisar estrutura;
3. ver total;
4. informar documento;
5. confirmar emissão.

---

## 13. Histórico, PDF e reutilização

Toda consulta emitida deve:
- registrar data e hora;
- registrar documento mascarado;
- registrar layout utilizado;
- registrar blocos incluídos;
- registrar valor cobrado;
- registrar usuário emissor;
- gerar PDF para download posterior.

### Histórico
O histórico precisa ter:
- filtros;
- busca;
- status;
- valor;
- repetição de consulta;
- abertura de detalhes em modal ou drawer.

### PDF
O PDF deve representar o relatório final emitido, com aparência profissional e pronta para arquivamento ou envio ao cliente final.

### Repetição
O usuário deve conseguir repetir uma consulta anterior como atalho operacional.

---

## 14. Financeiro e carteira

## 14.1 Carteira
- saldo visível;
- atualização após recarga;
- atualização após consumo;
- ajustes administrativos.

## 14.2 Recarga
Métodos previstos:
- PIX;
- cartão de crédito.

## 14.3 Extrato
Cada movimentação deve registrar:
- data e hora;
- tipo;
- descrição;
- valor;
- saldo anterior;
- saldo posterior.

## 14.4 Tipos de movimentação
- recarga;
- débito por consulta;
- crédito manual;
- débito manual;
- estorno;
- bônus.

---

## 15. Administração e operação

O painel administrativo não é o foco deste documento, mas o sistema precisa prever:

- criação e edição de usuários;
- definição de tabela de preços;
- criação de múltiplas tabelas;
- atribuição de tabela por usuário ou grupo;
- crédito e débito manual;
- emissão administrativa sem consumo de saldo;
- gestão de blocos de consulta;
- gestão de white-labels;
- trilha de auditoria.

### Exemplo de tabela de preços
**Tabela 1**
- SPC = R$ 2,00
- Serasa = R$ 3,00

**Tabela 2**
- SPC = R$ 3,00
- Serasa = R$ 5,00

---

## 16. White-label, embed e integrações

O produto deve nascer preparado para expansão.

### Cenários previstos
- uso em marca própria;
- white-label para parceiros;
- embed em outras plataformas;
- autenticação integrada;
- APIs para consulta, saldo, histórico e layouts;
- webhooks de eventos.

### Eventos possíveis
- consulta emitida;
- consulta concluída;
- recarga confirmada;
- saldo alterado;
- usuário subordinado criado.

---

## 17. Diretrizes de UX/UI

A experiência deve transmitir:
- confiança;
- clareza;
- transparência;
- controle;
- praticidade.

### Princípios de UX
- menu lateral enxuto;
- informações agrupadas por contexto;
- custo sempre visível;
- saldo sempre visível;
- feedback imediato;
- baixa carga cognitiva;
- boa responsividade;
- ações rápidas.

### Direção visual
- estética SaaS premium;
- visual moderno e limpo;
- dashboard financeiro profissional;
- uso de cards, grids, tabela bem organizada;
- sombras leves;
- bordas suaves;
- boa hierarquia de títulos;
- microinterações discretas.

### Ideia visual recomendada
- base clara;
- azul profundo/grafite como identidade principal;
- verde para sucesso;
- laranja suave para alerta;
- vermelho elegante para erro ou débito.

---

## 18. Estrutura sugerida de front-end

## 18.1 Sidebar
- Início
- Consultas
- Financeiro
- Equipe
- Conta

## 18.2 Header
- saldo atual;
- botão de recarga;
- avatar;
- notificações;
- badge de Conta Mestre, quando aplicável.

## 18.3 Consultas
### Aba Nova Consulta
- builder;
- prévia;
- emissão.

### Aba Layouts
- layouts salvos;
- favoritos;
- duplicar;
- excluir;
- usar agora.

### Aba Histórico
- tabela;
- filtros;
- abrir detalhe em modal/drawer;
- baixar PDF;
- repetir consulta.

## 18.4 Financeiro
- saldo atual;
- recarga;
- extrato.

## 18.5 Equipe
- listagem de subordinados;
- permissões;
- convite ou cadastro;
- status.

## 18.6 Conta
- dados cadastrais;
- documento;
- e-mail;
- telefone;
- senha;
- tipo de conta.

---

## 19. Backlog de MVP e roadmap

## 19.1 MVP
- login;
- cadastro;
- recuperação de acesso;
- validação de CPF/CNPJ;
- carteira de saldo;
- recarga via PIX;
- módulo Consultas com builder;
- cálculo em tempo real;
- layouts salvos;
- histórico;
- download de PDF;
- conta mestre com usuários subordinados;
- extrato básico;
- admin básico.

## 19.2 Fase 2
- recarga por cartão;
- filtros avançados;
- favoritos;
- analytics de consumo;
- permissões mais granulares;
- experiência mobile refinada.

## 19.3 Fase 3
- white-label;
- embed;
- API externa;
- webhooks;
- multitenancy robusto;
- relatórios operacionais avançados.

---

## 20. Resumo para desenvolvimento

**Consultas PRO** é um SaaS de consultas de crédito modular.  
O cliente monta a própria consulta, visualiza custo e prévia, emite usando saldo da carteira e mantém histórico com PDF.

### Estrutura final recomendada da navegação
- **Início**
- **Consultas**
- **Financeiro**
- **Equipe**
- **Conta**

### Agrupamentos-chave
- **Nova Consulta + Builder + Prévia** no mesmo módulo.
- **Layouts** dentro do módulo Consultas.
- **Histórico** dentro do módulo Consultas, com detalhe em modal/drawer.
- **Saldo + Recarga + Extrato** no módulo Financeiro.
- **Gestão de subordinados** em Equipe.
- **Perfil e segurança** em Conta.

### Visão final do produto
O sistema deve parecer:
- confiável;
- profissional;
- escalável;
- pronto para uso comercial;
- preparado para white-label e integração.

---