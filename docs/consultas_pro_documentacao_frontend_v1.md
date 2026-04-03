Crie o front-end completo de uma aplicação web responsiva chamada **Consultas Pró**, com foco na **área do usuário cliente**. Não criar o painel administrativo neste momento. O objetivo é desenvolver uma experiência premium, moderna, clara e extremamente intuitiva para emissão de consultas de crédito e restrições em formato self-service.

## CONTEXTO DO PRODUTO
O Consultas Pró é uma plataforma onde o cliente pode:
- fazer login e acessar sua conta;
- recarregar saldo via PIX ou cartão;
- montar consultas personalizadas selecionando blocos de dados;
- visualizar uma prévia do relatório antes de emitir;
- salvar layouts/modelos de consulta para reutilização futura;
- emitir consultas usando saldo da carteira;
- acessar histórico de consultas;
- baixar PDFs de consultas já emitidas;
- acompanhar extrato financeiro da conta;
- gerenciar usuários subordinados, quando a conta for do tipo conta mestre.

A experiência deve parecer um produto SaaS real, pronto para operação comercial, com aparência confiável, moderna, financeira e tecnológica.

---

## OBJETIVO DESTE PROJETO
Criar a interface do usuário cliente com navegação completa, telas integradas visualmente, design system consistente e UX muito bem resolvida.

O sistema precisa passar estas sensações:
- confiança;
- clareza;
- controle;
- praticidade;
- transparência de custo e saldo.

A interface deve ser clean, moderna, profissional, elegante e altamente utilizável.

---

## DIREÇÃO VISUAL
Quero um visual:
- moderno;
- minimalista;
- tecnológico;
- com estética SaaS premium;
- inspirado em dashboards financeiros modernos;
- sem poluição visual;
- com ótimo uso de espaçamento, cards, bordas suaves, sombras leves e hierarquia visual forte.

Use:
- layout limpo;
- tipografia bem definida;
- cabeçalhos claros;
- sidebar elegante;
- cards com cantos arredondados;
- tabelas bem organizadas;
- boas microinterações;
- estados de hover, loading, vazio e erro;
- excelente responsividade.

A estética deve lembrar produtos como:
- Stripe Dashboard
- Notion + SaaS financeiro
- Linear
- dashboards premium modernos

Não quero visual genérico nem datado.

---

## CORES E IDENTIDADE
Criar identidade visual para a marca **Consultas Pró**.

Sugestão:
- base clara com aparência sofisticada;
- tons principais em azul escuro / azul profundo / grafite;
- cor de destaque para ações principais;
- verde para saldo/confirmado/sucesso;
- amarelo ou laranja suave para alerta;
- vermelho elegante para erro/débito;
- cinzas modernos para neutros.

Preciso que a interface transmita segurança e operação financeira profissional.

---

## ESTRUTURA GERAL DA ÁREA DO CLIENTE
Criar as seguintes telas/áreas:

1. Login
2. Cadastro
3. Recuperação de acesso
4. Dashboard inicial
5. Nova consulta (builder/configurador)
6. Prévia da consulta
7. Layouts salvos
8. Histórico de consultas
9. Visualização de consulta emitida
10. Extrato financeiro
11. Recarregar saldo
12. Gestão de usuários subordinados da conta mestre
13. Perfil / configurações da conta

Criar uma navegação coesa entre todas essas áreas.

---

## REGRAS IMPORTANTES DE NEGÓCIO PARA REFLETIR NA UI

### Cadastro
O cadastro deve permitir:
- nome completo OU razão social;
- telefone do responsável;
- e-mail;
- documento CPF ou CNPJ;
- senha.

Precisa existir campo com máscara e validação visual para CPF/CNPJ.
O sistema deve prever o seguinte comportamento na interface:
- se o e-mail já existir, informar que já existe cadastro;
- se o CPF/CNPJ já existir, informar que já existe cadastro;
- em caso de duplicidade, exibir opção clara de:
  - recuperar acesso
  - voltar ao login
- manter opção de novo cadastro aberto para quem ainda não possui conta.

### Conta mestre com usuários subordinados
O cliente pode ter uma conta principal e adicionar usuários subordinados.
Exemplo: uma empresa pode ter 3 funcionários autorizados a emitir consultas usando o saldo da conta mestre.
Esses usuários:
- não precisam ter saldo próprio;
- operam com o saldo compartilhado da conta principal;
- podem ter permissões específicas;
- devem aparecer em uma área de gestão de equipe.

A UI precisa deixar isso extremamente claro.

### Carteira / saldo
O usuário cliente deve visualizar:
- saldo atual;
- movimentações;
- consumo por consulta;
- recargas feitas;
- status de pagamentos.

### Builder da consulta
O usuário poderá selecionar blocos de consulta como:
- SPC
- Serasa
- Boa Vista
- Protestos
- Score
- Rating de crédito
- renda presumida
- capacidade de pagamento
- risco de crédito
- classificação de letras
- Registrato Bacen
- outros blocos

Cada bloco tem:
- nome;
- descrição curta;
- preço;
- status selecionado;
- categoria visual;
- feedback de seleção.

A UI deve mostrar total em tempo real.

### Layouts salvos
Usuário pode:
- salvar um layout com nome;
- editar;
- duplicar;
- excluir;
- marcar como favorito;
- usar novamente em nova consulta.

### Histórico
Cada consulta emitida precisa mostrar:
- data;
- documento consultado mascarado;
- layout utilizado;
- valor;
- status;
- ações: ver detalhes, baixar PDF, repetir consulta.

### Extrato
Mostrar:
- entradas;
- saídas;
- recargas;
- ajustes;
- saldo anterior e posterior;
- filtros por período.

---

## EXPERIÊNCIA DE NAVEGAÇÃO
Quero uma área logada com estrutura profissional:

### Desktop
- sidebar fixa à esquerda;
- header superior;
- conteúdo principal à direita;
- boa largura de leitura;
- cards com grid equilibrado;
- tabelas e painéis claros.

### Mobile
- menu adaptado;
- fluxo simplificado;
- prioridade para ações principais;
- builder de consulta em etapas;
- resumo sempre acessível;
- ótima usabilidade em telas pequenas.

---

## SIDEBAR DO USUÁRIO
Criar sidebar elegante com:
- Dashboard
- Nova consulta
- Layouts salvos
- Histórico
- Extrato
- Recarregar saldo
- Minha equipe (ou Usuários)
- Perfil

No topo da sidebar:
- logo Consultas Pró
- identificação da conta

No rodapé:
- configurações
- sair

---

## HEADER SUPERIOR
O header deve conter:
- campo de busca opcional;
- saldo atual destacado;
- botão de recarga;
- avatar do usuário;
- notificações;
- contexto da conta atual.

Se a conta for do tipo mestre:
- mostrar badge “Conta Mestre”
- mostrar quantidade de usuários subordinados ativos.

---

## TELA 1 — LOGIN
Criar uma tela de login premium, limpa e profissional.

Elementos:
- logo Consultas Pró;
- título forte;
- subtítulo explicando a proposta;
- campos de e-mail e senha;
- botão de entrar;
- link “esqueci minha senha”;
- link para criar conta;
- validações elegantes;
- opção de lembrar acesso.

A tela deve parecer confiável e sofisticada.

---

## TELA 2 — CADASTRO
Criar fluxo de cadastro com excelente UX.

Campos:
- tipo de cadastro: pessoa física ou pessoa jurídica;
- nome completo ou razão social;
- telefone do responsável;
- e-mail;
- CPF ou CNPJ;
- senha;
- confirmar senha.

Comportamentos:
- máscara dinâmica de CPF/CNPJ;
- validação visual em tempo real;
- mensagens amigáveis de erro;
- se e-mail/documento já existir, exibir card ou alerta elegante com:
  - “Já encontramos uma conta com esses dados”
  - botão recuperar acesso
  - botão ir para login

A tela deve passar clareza e reduzir abandono.

---

## TELA 3 — RECUPERAÇÃO DE ACESSO
Tela simples, bonita e objetiva:
- campo de e-mail ou documento;
- instrução clara;
- botão enviar;
- feedback de sucesso;
- link para login.

---

## TELA 4 — DASHBOARD
Criar um dashboard inicial muito bem resolvido.

Mostrar cards com:
- saldo atual;
- consultas realizadas no mês;
- gasto total no período;
- layouts salvos;
- usuários subordinados ativos (se conta mestre).

Criar também:
- bloco de ações rápidas:
  - nova consulta
  - recarregar saldo
  - ver histórico
  - gerenciar equipe
- tabela ou lista com últimas consultas emitidas;
- bloco com últimas movimentações financeiras;
- bloco com atalhos para layouts favoritos.

Precisa ser visualmente forte e muito útil.

---

## TELA 5 — NOVA CONSULTA / BUILDER
Essa é a principal tela do produto.
Ela deve ser o grande destaque do sistema.

Criar um configurador visual em 3 colunas no desktop:

### Coluna 1 — catálogo de blocos
Mostrar cards ou lista de módulos com:
- nome do bloco;
- descrição curta;
- preço;
- categoria;
- botão adicionar/remover;
- estado visual selecionado.

Incluir filtros por categoria e busca.

### Coluna 2 — montagem / estrutura da consulta
Mostrar os blocos selecionados na ordem em que ficarão no relatório.
Cada item pode ter:
- título;
- descrição;
- badge;
- opção de reorganizar;
- opção de remover;
- ícone;
- opção de expandir para entender melhor.

### Coluna 3 — resumo financeiro e ações
Mostrar:
- nome do layout;
- quantidade de blocos selecionados;
- subtotal por item;
- total final;
- saldo atual;
- aviso de saldo insuficiente;
- botão salvar layout;
- botão emitir consulta;
- botão limpar seleção.

Esse resumo precisa ficar fixo/sticky.

### Mobile
No mobile, transformar em fluxo de etapas:
1. escolher blocos
2. revisar seleção
3. ver total
4. informar documento
5. confirmar emissão

Quero excelente UX aqui.

---

## TELA 6 — PRÉVIA DA CONSULTA
A prévia deve parecer o relatório final.
Não deve ser apenas uma lista técnica.

Criar visual com:
- cabeçalho da consulta;
- identificação do documento consultado;
- cards ou seções por bloco;
- estrutura elegante, com aparência de relatório profissional;
- indicação visual do que será incluído;
- skeleton loading para estados de carregamento.

Quero que o usuário sinta que está comprando um relatório premium.

---

## TELA 7 — LAYOUTS SALVOS
Criar uma tela com:
- listagem de layouts salvos em cards;
- nome do layout;
- número de blocos;
- valor estimado;
- data de atualização;
- favorito ou não.

Ações por layout:
- usar agora
- editar
- duplicar
- excluir

Criar visual limpo e fácil de escanear.

---

## TELA 8 — HISTÓRICO DE CONSULTAS
Criar tela com tabela profissional e filtros.

Colunas sugeridas:
- data
- documento
- layout
- valor
- status
- ações

Filtros:
- período
- status
- documento
- layout

Ações:
- visualizar
- baixar PDF
- repetir consulta

Criar estados:
- vazio
- carregando
- erro
- sem resultados

---

## TELA 9 — VISUALIZAÇÃO DE CONSULTA EMITIDA
Criar página de detalhe da consulta com aparência de relatório final.

Elementos:
- cabeçalho com dados principais;
- status;
- valor cobrado;
- data/hora;
- documento mascarado;
- blocos retornados no relatório;
- botão baixar PDF;
- botão repetir consulta;
- botão voltar ao histórico.

A interface deve ser clara, escaneável e muito profissional.

---

## TELA 10 — EXTRATO FINANCEIRO
Criar uma tela com:
- saldo atual em destaque;
- resumo do período;
- filtros por data;
- lista cronológica de movimentações;
- entradas em estilo positivo;
- saídas em estilo negativo;
- recargas, débitos por consulta, ajustes, bônus.

Cada item deve mostrar:
- data/hora
- tipo
- descrição
- valor
- saldo após movimentação

Visual inspirado em fintech.

---

## TELA 11 — RECARREGAR SALDO
Tela de recarga com UX muito simples.

Elementos:
- saldo atual;
- botões com valores rápidos;
- campo para valor personalizado;
- escolha do método:
  - PIX
  - cartão de crédito
- resumo da compra;
- botão continuar.

Criar também estados para:
- aguardando pagamento;
- pagamento confirmado;
- erro no pagamento.

Precisa ser extremamente claro e reduzir fricção.

---

## TELA 12 — GESTÃO DE USUÁRIOS SUBORDINADOS
Essa tela é muito importante para contas empresariais.

Objetivo:
permitir que a conta mestre gerencie usuários subordinados que utilizam o saldo compartilhado.

Criar uma área “Minha Equipe” com:
- lista dos usuários subordinados;
- nome;
- e-mail;
- telefone;
- status;
- permissões;
- data de criação;
- ações.

Ações:
- adicionar usuário;
- editar;
- ativar/desativar;
- remover acesso;
- redefinir acesso;
- ajustar permissões.

Criar modal ou drawer para adicionar novo usuário com:
- nome completo;
- e-mail;
- telefone;
- senha temporária ou convite;
- permissões.

Mostrar claramente que:
- os usuários subordinados usam o saldo da conta mestre;
- o consumo deles aparece no extrato/histórico;
- a conta principal mantém controle.

Adicionar cards no topo com:
- saldo compartilhado;
- total de usuários;
- usuários ativos;
- consultas emitidas pela equipe.

---

## TELA 13 — PERFIL / CONFIGURAÇÕES
Criar área de perfil com:
- dados da conta;
- nome ou razão social;
- telefone do responsável;
- e-mail;
- documento;
- alteração de senha;
- preferências;
- tipo de conta;
- tabela vinculada (apenas visual, se fizer sentido);
- informações da conta mestre, se houver.

Se for conta mestre, mostrar uma seção específica explicando:
- esta conta compartilha saldo com usuários subordinados.

---

## UX / UI DETALHADA
Quero que todo o projeto siga estas boas práticas:

### UX
- navegação intuitiva;
- CTA principal sempre claro;
- custo sempre visível;
- saldo sempre acessível;
- feedback imediato;
- mensagens amigáveis;
- baixa carga cognitiva;
- excelente responsividade;
- estados vazios úteis;
- textos claros e objetivos.

### UI
- espaçamento generoso;
- excelente hierarquia tipográfica;
- ícones elegantes;
- badges de status;
- componentes bem organizados;
- cards sofisticados;
- tabelas modernas;
- modais elegantes;
- sombras suaves;
- bordas modernas;
- bom contraste;
- consistência total entre páginas.

---

## COMPONENTES IMPORTANTES
Criar e reutilizar componentes como:
- sidebar
- topbar
- card de saldo
- card de estatística
- card de bloco de consulta
- resumo sticky de emissão
- tabela de histórico
- tabela de extrato
- cards de layouts salvos
- modais de confirmação
- formulário com validação
- empty state
- loading state
- alertas e toasts
- badges de status
- drawer mobile

---

## MICROINTERAÇÕES
Adicionar microinterações elegantes:
- hover sutil em cards;
- feedback de seleção nos blocos;
- loading refinado;
- skeletons;
- estados de sucesso;
- transições suaves;
- botões com resposta visual clara.

Sem exageros. Quero sofisticação.

---

## ACESSIBILIDADE E QUALIDADE
Garantir:
- contraste adequado;
- boa legibilidade;
- foco visível;
- labels corretos;
- boa navegação em formulários;
- responsividade real;
- consistência entre todas as páginas.

---

## SAÍDA ESPERADA
Quero que você entregue:
- o front-end completo da área do cliente;
- páginas conectadas entre si;
- design system coerente;
- componentes reutilizáveis;
- visual premium;
- fluxo crível de produto real;
- excelente versão desktop e mobile.

Priorize uma experiência que dê vontade de usar e transmita claramente valor comercial.

Crie tudo com aparência de produto pronto para venda.