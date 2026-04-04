# Consultas PRO — Pacote Técnico para Desenvolvimento

## 1. Resumo executivo

**Consultas PRO** é uma plataforma SaaS web responsiva para consulta modular de dívidas, restrições e dados de crédito, com experiência self-service. O usuário monta a própria consulta escolhendo blocos de informação, visualiza uma prévia em tempo real, consome saldo da carteira ao emitir e pode reutilizar layouts salvos em consultas futuras.

A plataforma deve suportar operação direta, operação com conta mestre e usuários subordinados com saldo compartilhado, além de expansão via white-label, embed e APIs.

---

## 2. Objetivo do produto

Transformar consultas de crédito em um produto configurável e escalável, permitindo que clientes e parceiros:

- escolham exatamente quais dados desejam consultar;
- saibam quanto vão pagar antes da emissão;
- salvem layouts reutilizáveis;
- gerenciem saldo e consumo;
- operem em equipes usando conta mestre com saldo compartilhado;
- integrem o produto em outras plataformas no futuro.

---

## 3. Visão de negócio

A plataforma monetiza por consumo de blocos de consulta.

Cada bloco possui um custo configurável por tabela de preço. O usuário pode pertencer a uma tabela específica, e a cobrança final da consulta depende da composição dos blocos escolhidos e da tabela vinculada à conta.

O produto também suporta modelo organizacional, em que uma **conta mestre** centraliza o saldo e permite que funcionários/subusuários emitam consultas usando a mesma carteira compartilhada, respeitando permissões.

---

## 4. Perfis de acesso

## 4.1 Visitante
Pessoa ainda não autenticada que pode:
- acessar login;
- recuperar acesso;
- realizar novo cadastro;
- eventualmente visualizar página institucional.

## 4.2 Usuário individual
Pessoa física ou jurídica com conta própria, que pode:
- manter saldo próprio;
- montar e emitir consultas;
- salvar layouts;
- acessar histórico;
- baixar PDFs;
- consultar extrato;
- realizar recargas.

## 4.3 Conta mestre
Conta principal de uma empresa ou operação, que pode:
- manter carteira principal de saldo;
- emitir consultas;
- cadastrar usuários subordinados;
- compartilhar saldo com equipe;
- controlar permissões dos subordinados;
- acompanhar histórico centralizado da conta e/ou da equipe;
- definir quem pode emitir consultas.

## 4.4 Usuário subordinado
Usuário vinculado à conta mestre, sem necessidade de saldo próprio, que pode:
- acessar a plataforma com seu próprio login;
- emitir consultas usando o saldo compartilhado da conta mestre;
- consultar histórico permitido pela política da conta;
- usar layouts disponíveis;
- respeitar permissões definidas pelo titular/master.

## 4.5 Administrador
Responsável pela operação global do sistema:
- cria e gerencia usuários;
- gerencia grupos e tabelas de preço;
- credita e debita saldo manualmente;
- emite consultas sem saldo;
- gerencia catálogo de blocos;
- gerencia tenants/white-labels;
- visualiza relatórios operacionais e financeiros.

## 4.6 Operador interno
Perfil opcional de suporte ou backoffice, com permissões limitadas definidas pelo admin.

---

## 5. Cadastro e autenticação

## 5.1 Campos obrigatórios de cadastro
No cadastro do usuário, devem existir os seguintes campos:

- **Nome completo** ou **Razão social**
- **Telefone do responsável**
- **E-mail**
- **Documento**: CPF ou CNPJ
- **Senha**

## 5.2 Regras de validação
- CPF e CNPJ devem ser validados em formato e dígito verificador.
- E-mail deve ter formato válido.
- Documento deve ser único.
- E-mail deve ser único.
- Senha deve obedecer política mínima de segurança.

## 5.3 Comportamento para duplicidade
Se o usuário tentar cadastrar:
- um **e-mail já existente**, o sistema deve informar que já existe uma conta com esse e-mail e oferecer **recuperar acesso**;
- um **CPF/CNPJ já existente**, o sistema deve informar que já existe uma conta vinculada a esse documento e oferecer **recuperar acesso**;
- ainda deve existir a possibilidade de o visitante voltar e realizar um **novo cadastro aberto** com outro e-mail/documento.

## 5.4 Login
O login deve aceitar:
- e-mail + senha

Opcional futuro:
- login por documento + senha
- magic link
- 2FA

## 5.5 Recuperação de acesso
Fluxo:
1. usuário informa e-mail ou documento;
2. sistema localiza conta compatível;
3. envia fluxo de redefinição;
4. usuário redefine senha e volta ao login.

---

## 6. Problema principal que o produto resolve

Hoje, consultas de crédito costumam ser vendidas em formato engessado. O sistema resolve isso permitindo que o cliente monte um relatório sob medida, como um configurador visual, escolhendo apenas os blocos que deseja consumir.

Além disso, o sistema reduz fricção operacional ao permitir:
- reutilização de layouts;
- saldo pré-pago por carteira;
- emissão por equipes via conta mestre;
- histórico e PDF sempre disponíveis;
- governança de preços por tabela.

---

## 7. Escopo funcional completo

## 7.1 Autenticação e contas
- login
- logout
- recuperação de senha
- cadastro aberto
- validação de duplicidade por e-mail/documento
- perfis e permissões
- suporte a conta individual e conta mestre

## 7.2 Conta mestre e usuários subordinados
A conta mestre deve permitir:
- cadastrar múltiplos usuários subordinados;
- ativar/desativar subordinados;
- definir permissões básicas por subordinado;
- compartilhar o saldo da carteira principal;
- manter trilha de auditoria de quem emitiu cada consulta.

Permissões sugeridas para subordinados:
- emitir consulta
- visualizar histórico próprio
- visualizar histórico da equipe
- baixar PDF
- salvar layouts
- usar layouts compartilhados
- ver extrato da conta
- solicitar recarga
- gerenciar outros subordinados (normalmente não)

## 7.3 Carteira de saldo
- saldo atual visível
- recarga via PIX
- recarga via cartão de crédito
- crédito manual pelo admin
- débito manual pelo admin
- estorno
- bônus/promocional
- extrato detalhado com saldo anterior/posterior
- identificação da origem da movimentação

## 7.4 Catálogo de blocos de consulta
Blocos iniciais possíveis:
- SPC
- Serasa
- Boa Vista
- Protestos
- Score com pontuação
- Rating de crédito
- renda presumida
- capacidade de pagamento
- risco de crédito
- classificação de letras
- Registrato Bacen (vencidas / a vencer)

Cada bloco deve ter:
- id
- nome
- slug/código
- descrição curta
- descrição técnica opcional
- categoria
- ativo/inativo
- ordem padrão
- regras de dependência (opcional)
- preço por tabela
- fornecedor associado
- flags de exibição na prévia

## 7.5 Builder da consulta
Tela principal do produto.

O usuário poderá:
- selecionar blocos;
- remover blocos;
- reordenar blocos;
- visualizar preço de cada item;
- visualizar custo total em tempo real;
- ver prévia do relatório;
- salvar a composição como layout.

## 7.6 Prévia em tempo real
A prévia deve:
- refletir a estrutura final da consulta;
- exibir seções e cards do relatório;
- atualizar conforme seleção/desseleção;
- destacar resumo e blocos incluídos;
- tornar claro o que será entregue.

## 7.7 Layouts salvos
- salvar layout
- editar nome
- duplicar
- excluir
- marcar favorito
- compartilhar com equipe da conta mestre
- layout privado ou compartilhado
- reutilizar em nova consulta

## 7.8 Emissão de consulta
Fluxo:
1. usuário escolhe ou monta layout;
2. informa CPF/CNPJ alvo da consulta;
3. sistema valida campos;
4. calcula custo total;
5. valida saldo disponível da carteira correta;
6. confirma emissão;
7. consulta fornecedores;
8. consolida respostas;
9. gera visualização final;
10. gera PDF;
11. registra débito;
12. salva histórico.

## 7.9 Histórico de consultas
Cada registro deve conter:
- id da consulta
- data/hora
- emissor
- conta responsável
- documento consultado com máscara
- layout utilizado
- blocos incluídos
- preço total
- status
- pdf
- detalhes/erro
- tenant/ambiente
- origem da emissão (web, embed, api, admin)

## 7.10 Extrato
O extrato deve mostrar:
- recargas
- débitos por consulta
- estornos
- créditos administrativos
- bônus
- saldo anterior
- saldo posterior
- filtros por período
- filtros por tipo
- exportação futura

## 7.11 Administração de preços
- criar tabela
- editar preços por bloco
- ativar/inativar
- aplicar a usuários
- aplicar a grupos
- sobrescrever preço para usuário específico
- versionar mudanças, se possível

## 7.12 Administração global
- gerir usuários
- gerir conta mestre e subordinados
- gerir blocos
- gerir fornecedores
- gerir tabelas
- emitir sem saldo
- acompanhar consultas
- acompanhar pagamentos
- visualizar dashboards

## 7.13 White-label / embed / API
O produto deve nascer preparado para:
- customização de marca por tenant;
- subdomínio/domínio próprio;
- tema de cores;
- logo;
- operação via iframe/embed;
- futura SDK ou componentes incorporáveis;
- APIs para saldo, emissão, histórico, layouts;
- webhooks de eventos.

---

## 8. Regras de negócio

1. Nenhuma consulta é emitida sem saldo suficiente, salvo perfis com permissão especial.
2. Usuários subordinados consomem o saldo da conta mestre.
3. O extrato deve registrar o emissor real, mesmo quando o saldo pertence à conta mestre.
4. Cada bloco possui preço por tabela.
5. O preço final da consulta é a soma dos blocos selecionados.
6. Layout salvo não congela preço; o valor deve ser recalculado conforme tabela vigente no momento da emissão.
7. O PDF deve permanecer disponível no histórico.
8. Em caso de erro parcial, deve existir política configurável de cobrança.
9. Duplicidade por documento/e-mail deve ser tratada antes da conclusão do cadastro.
10. Todo ajuste administrativo de saldo deve exigir motivo e auditoria.
11. Conta mestre pode limitar permissões de subordinados.
12. O sistema deve registrar origem da consulta: usuário individual, subordinado, admin, API, embed.

---

## 9. Casos de uso principais

## 9.1 Cadastro de novo usuário
Como visitante, quero criar uma conta informando nome/razão social, telefone, e-mail e CPF/CNPJ, para acessar a plataforma.

## 9.2 Tratamento de conta já existente
Como visitante, ao tentar cadastrar um documento ou e-mail já existente, quero ser orientado a recuperar o acesso.

## 9.3 Recarga de saldo
Como usuário, quero recarregar minha carteira via PIX ou cartão para poder emitir consultas.

## 9.4 Montagem de consulta
Como usuário, quero selecionar os blocos desejados e ver o valor total antes de emitir.

## 9.5 Salvar layout
Como usuário, quero salvar minha composição de consulta para reutilizar depois.

## 9.6 Conta mestre adicionando equipe
Como conta mestre, quero cadastrar funcionários para que emitam consultas usando meu saldo compartilhado.

## 9.7 Emissão por subordinado
Como subordinado, quero entrar com meu próprio login e emitir consultas com o saldo da conta mestre.

## 9.8 Gestão de preços
Como admin, quero definir preços por bloco em diferentes tabelas para monetizar por perfil de cliente.

## 9.9 Consulta de histórico
Como usuário, quero acessar relatórios já emitidos e baixar novamente o PDF.

## 9.10 Emissão administrativa
Como admin, quero emitir uma consulta sem consumir saldo para casos internos ou suporte.

---

## 10. UX/UI — diretrizes de design

## 10.1 Direção visual
O visual deve transmitir:
- confiança
- clareza
- controle
- modernidade
- ambiente financeiro/profissional

Evitar:
- aparência antiquada
- excesso de texto em telas operacionais
- formulários pesados
- visual poluído

## 10.2 Tom visual recomendado
- fundo claro ou neutro
- cards com boa hierarquia
- acento em azul escuro, verde ou grafite
- tipografia limpa
- forte uso de espaços em branco
- ícones simples e objetivos
- destaque constante para saldo e valor total

## 10.3 Comportamento visual do builder
No desktop:
- **coluna esquerda:** catálogo de blocos
- **coluna central:** prévia/montagem
- **coluna direita:** resumo financeiro e ações

No mobile:
- fluxo em etapas
- rodapé fixo com custo total
- CTA contínuo e visível

## 10.4 Tela de login/cadastro
Deve ser simples e direta, com:
- opção clara entre entrar e cadastrar
- mensagem amigável em duplicidade
- link de recuperar acesso
- validação em tempo real de CPF/CNPJ e e-mail

## 10.5 Dashboard do usuário
Cards principais:
- saldo disponível
- últimas consultas
- consumo do período
- atalhos para nova consulta e recarga
- layouts mais usados

## 10.6 Dashboard da conta mestre
Além dos elementos do usuário comum:
- equipe ativa
- consumo por subordinado
- saldo compartilhado
- últimas emissões da equipe
- gestão rápida de usuários internos

## 10.7 Histórico
Interface em tabela responsiva com:
- filtros por período
- busca por documento
- filtro por emissor
- filtro por status
- ações rápidas: ver, repetir, baixar PDF

## 10.8 Extrato
- timeline financeira ou tabela clara
- entradas e saídas diferenciadas
- filtros por tipo
- destaque de saldo final

---

## 11. Jornada do usuário detalhada

## 11.1 Jornada do visitante até o cadastro
1. Acessa a página inicial ou login.
2. Clica em “Criar conta”.
3. Preenche nome/razão social, telefone, e-mail, CPF/CNPJ e senha.
4. Sistema valida o documento e o e-mail.
5. Se houver duplicidade, exibe aviso e oferece recuperar acesso.
6. Se estiver tudo válido, conclui cadastro.
7. Usuário entra na plataforma.

## 11.2 Jornada de recuperação
1. Usuário clica em “Recuperar acesso”.
2. Informa e-mail ou documento.
3. Recebe instrução de redefinição.
4. Redefine senha.
5. Volta ao login.

## 11.3 Jornada de primeiro uso
1. Entra no dashboard.
2. Vê saldo atual.
3. Sistema orienta: recarregue ou monte consulta.
4. Se não houver saldo, destaque para recarga.
5. Se houver saldo, destaque para nova consulta.

## 11.4 Jornada de recarga
1. Clica em recarregar.
2. Escolhe valor.
3. Escolhe PIX ou cartão.
4. Finaliza pagamento.
5. Saldo é atualizado.
6. Operação entra no extrato.

## 11.5 Jornada de criação de consulta
1. Clica em “Nova consulta”.
2. Escolhe blocos no catálogo.
3. Vê custo total mudar em tempo real.
4. Analisa a prévia do relatório.
5. Pode salvar layout.
6. Avança.

## 11.6 Jornada de emissão
1. Informa documento alvo.
2. Confirma dados e valor.
3. Sistema verifica saldo.
4. Processa emissão.
5. Mostra sucesso/erro.
6. Gera histórico e PDF.
7. Débito registrado no extrato.

## 11.7 Jornada com layout salvo
1. Usuário abre “Layouts salvos”.
2. Seleciona um modelo.
3. Reutiliza a configuração.
4. Emite nova consulta com menos atrito.

## 11.8 Jornada da conta mestre
1. Titular entra.
2. Cria subordinados.
3. Define permissões.
4. Mantém saldo na carteira principal.
5. Funcionários entram com login próprio.
6. Emitem consultas usando o mesmo saldo.
7. Titular acompanha tudo no painel central.

## 11.9 Jornada do subordinado
1. Recebe convite ou cadastro criado pelo master.
2. Define ou recebe acesso.
3. Faz login individual.
4. Emite consulta.
5. O sistema desconta da conta mestre.
6. Histórico registra quem executou.

---

## 12. Jornada administrativa

## 12.1 Criar usuário
- cadastrar usuário comum ou conta mestre
- definir tabela
- definir status
- registrar observações

## 12.2 Ajustar saldo
- localizar conta
- creditar/debitar
- informar motivo
- salvar auditoria

## 12.3 Gerenciar equipe de conta mestre
- ver subordinados
- criar novo
- editar permissões
- bloquear/remover
- visualizar consumo por subordinado

## 12.4 Gerenciar tabela de preço
- criar tabela
- definir preço por bloco
- publicar/ativar
- aplicar a contas

## 12.5 Emissão sem saldo
- iniciar consulta
- escolher blocos
- emitir com privilégio especial
- registrar evento administrativo

## 12.6 White-label
- criar tenant
- definir branding
- associar domínio
- configurar tabelas e permissões

---

## 13. Estrutura sugerida de telas

## Público / autenticação
- Landing/login
- Cadastro
- Recuperação de acesso
- Redefinição de senha

## Usuário / conta mestre
- Dashboard
- Nova consulta / builder
- Prévia e emissão
- Layouts salvos
- Histórico
- Visualização da consulta
- Extrato
- Recarga
- Perfil
- Equipe / usuários subordinados (somente conta mestre)

## Admin
- Dashboard admin
- Usuários
- Detalhe do usuário
- Contas mestre
- Equipes subordinadas
- Saldos
- Tabelas de preço
- Blocos de consulta
- Consultas emitidas
- Relatórios financeiros
- White-labels
- Configurações

---

## 14. Componentes de interface

- card de bloco de consulta
- preview card
- painel lateral fixo de resumo
- badge de preço
- indicador de saldo
- modal salvar layout
- modal confirmação emissão
- tabela de histórico
- tabela de extrato
- drawer mobile
- formulário validado de cadastro
- gestão de equipe em lista/tabela
- toasts e alerts
- estados de loading/skeleton

---

## 15. Modelo de dados sugerido

## 15.1 Entidades principais

### User
- id
- tenant_id
- account_master_id nullable
- user_type (individual, master, subordinate, admin, operator)
- full_name_or_company_name
- responsible_phone
- email
- document_type (cpf/cnpj)
- document_number
- password_hash
- status
- created_at
- updated_at

### Wallet
- id
- owner_user_id ou owner_account_id
- currency
- balance
- status

### WalletTransaction
- id
- wallet_id
- transaction_type (credit, debit, refund, bonus, admin_adjustment, recharge)
- amount
- balance_before
- balance_after
- reference_type
- reference_id
- performed_by_user_id
- description
- created_at

### PriceTable
- id
- tenant_id
- name
- status
- created_at
- updated_at

### PriceTableItem
- id
- price_table_id
- block_id
- unit_price
- active

### QueryBlock
- id
- code
- name
- description
- category
- provider_code
- status
- sort_order

### SavedLayout
- id
- owner_user_id
- account_master_id nullable
- name
- is_favorite
- is_shared
- status
- created_at
- updated_at

### SavedLayoutItem
- id
- layout_id
- block_id
- sort_order
- settings_json

### QueryRequest
- id
- tenant_id
- account_master_id nullable
- requested_by_user_id
- target_document_type
- target_document_number
- layout_id nullable
- total_price
- price_table_id
- status
- source_channel
- pdf_file_url
- raw_result_json
- created_at
- updated_at

### QueryRequestItem
- id
- query_request_id
- block_id
- unit_price
- provider_status
- provider_payload_json
- display_order

### MasterSubUserPermission
- id
- master_user_id
- subordinate_user_id
- can_issue
- can_view_own_history
- can_view_team_history
- can_download_pdf
- can_save_layout
- can_use_shared_layout
- can_view_wallet
- can_manage_subusers

### Tenant
- id
- name
- brand_name
- slug
- logo_url
- primary_color
- domain
- status

### Payment
- id
- wallet_id
- method
- provider
- amount
- status
- external_reference
- paid_at

### AuditLog
- id
- tenant_id
- actor_user_id
- action
- entity_type
- entity_id
- metadata_json
- created_at

---

## 16. Estrutura de API sugerida

## 16.1 Auth
- `POST /auth/register`
- `POST /auth/login`
- `POST /auth/forgot-password`
- `POST /auth/reset-password`

## 16.2 Usuários
- `GET /users/me`
- `PATCH /users/me`
- `GET /users/:id`
- `POST /users`
- `PATCH /users/:id`
- `POST /masters/:id/subusers`
- `GET /masters/:id/subusers`
- `PATCH /masters/:id/subusers/:subUserId`
- `PATCH /masters/:id/subusers/:subUserId/permissions`

## 16.3 Carteira
- `GET /wallet`
- `GET /wallet/statement`
- `POST /wallet/recharge/pix`
- `POST /wallet/recharge/card`

## 16.4 Blocos
- `GET /query-blocks`
- `POST /query-blocks`
- `PATCH /query-blocks/:id`

## 16.5 Layouts
- `GET /saved-layouts`
- `POST /saved-layouts`
- `PATCH /saved-layouts/:id`
- `DELETE /saved-layouts/:id`

## 16.6 Consultas
- `POST /queries/quote`
- `POST /queries`
- `GET /queries`
- `GET /queries/:id`
- `GET /queries/:id/pdf`

## 16.7 Tabelas de preço
- `GET /price-tables`
- `POST /price-tables`
- `PATCH /price-tables/:id`
- `PATCH /users/:id/price-table`

## 16.8 Admin
- `POST /admin/wallets/:id/credit`
- `POST /admin/wallets/:id/debit`
- `POST /admin/queries`
- `GET /admin/reports/financial`
- `GET /admin/reports/usage`

## 16.9 White-label / tenant
- `GET /tenants`
- `POST /tenants`
- `PATCH /tenants/:id`

---

## 17. Regras de backend importantes

- saldo deve ser debitado com segurança transacional;
- emissão de consulta não pode gerar débito duplicado;
- toda emissão deve ser idempotente quando necessário;
- falhas de fornecedor devem ser rastreadas por bloco;
- pdf deve ser regenerável ou persistido;
- logs de auditoria devem existir para saldo, permissões e emissão;
- preço deve ser congelado no momento da emissão, registrando os unitários cobrados.

---

## 18. Arquitetura recomendada

## 18.1 Front-end
- Next.js
- TypeScript
- Tailwind
- shadcn/ui
- React Hook Form
- Zod
- TanStack Query

## 18.2 Back-end
- Node.js
- TypeScript
- arquitetura modular
- filas para processamento
- API REST
- webhooks e integrações futuras

## 18.3 Infra
- PostgreSQL
- Redis
- storage para PDF
- gateway PIX/cartão
- observabilidade
- fila/event bus

---

## 19. Roadmap sugerido

## Fase 1 — MVP operacional
- cadastro/login/recuperação
- validação de CPF/CNPJ/e-mail
- carteira de saldo
- recarga PIX
- builder com blocos
- cálculo de preço
- emissão
- histórico
- PDF
- admin básico
- tabela de preço básica

## Fase 2 — Operação em equipe
- conta mestre
- subordinados
- permissões
- saldo compartilhado
- layouts compartilhados
- extrato aprimorado
- cartão

## Fase 3 — Escala comercial
- white-label
- embed
- API externa
- multi-tenant robusto
- webhooks
- analytics e dashboards avançados

---

## 20. Checklist para Cursor / Lovable

### Produto
- [ ] plataforma web responsiva
- [ ] login/cadastro/recuperação
- [ ] cadastro com nome/razão social, telefone, e-mail, CPF/CNPJ
- [ ] validação de duplicidade por e-mail/documento
- [ ] opção de recuperar acesso
- [ ] conta mestre e subordinados
- [ ] saldo compartilhado
- [ ] builder de consulta
- [ ] prévia em tempo real
- [ ] layouts salvos
- [ ] histórico
- [ ] extrato
- [ ] recarga PIX/cartão
- [ ] admin de preços
- [ ] PDF

### UX
- [ ] builder em 3 colunas no desktop
- [ ] fluxo em etapas no mobile
- [ ] total sempre visível
- [ ] saldo sempre visível
- [ ] mensagens claras para duplicidade
- [ ] design moderno e limpo

### Backend
- [ ] entidades principais modeladas
- [ ] pricing por tabela
- [ ] débito transacional
- [ ] trilha de auditoria
- [ ] emissão administrativa
- [ ] histórico por emissor e conta

---

## 21. Prompt resumido para Cursor/Lovable

Desenvolver o produto **Consultas PRO**, uma plataforma SaaS web responsiva para consultas modulares de crédito e restrições. O sistema deve ter login, cadastro e recuperação de acesso. No cadastro, exigir nome completo ou razão social, telefone do responsável, e-mail e CPF/CNPJ com validação. Se e-mail ou documento já existirem, informar isso e oferecer recuperação de acesso.

A plataforma deve permitir dois modelos de uso: conta individual e conta mestre. A conta mestre deve poder criar usuários subordinados, que entram com login próprio e usam o saldo compartilhado da carteira principal para emitir consultas, respeitando permissões.

A funcionalidade principal é um builder visual em que o usuário seleciona blocos como SPC, Serasa, Boa Vista, Protestos, Score, Rating, renda presumida, capacidade de pagamento, risco de crédito, classificação de letras e Registrato Bacen. Cada bloco possui preço conforme tabela vinculada à conta. O sistema deve mostrar prévia em tempo real, custo total sempre visível, permitir salvar layouts e emitir consultas gerando histórico, extrato e PDF.

O sistema deve ter painel administrativo para gestão de usuários, saldo, tabelas de preço, blocos de consulta, emissão administrativa e visão operacional. A arquitetura precisa ser preparada para white-label, embed e API futura.

---

## 22. Resultado esperado

O Consultas PRO deve ser percebido como uma plataforma profissional, moderna e flexível, que não apenas emite consultas, mas oferece uma experiência comercializável de configuração, operação e distribuição de dados de crédito.