# Consultas Pró — Documentação Técnica de Back-end

## Índice
1. [Objetivo do back-end](#1-objetivo-do-back-end)
2. [Diretrizes arquiteturais](#2-diretrizes-arquiteturais)
3. [Stack recomendada](#3-stack-recomendada)
4. [Arquitetura base](#4-arquitetura-base)
5. [Domínios do sistema](#5-domínios-do-sistema)
6. [Modelo de autenticação e autorização](#6-modelo-de-autenticação-e-autorização)
7. [Modelo de dados conceitual](#7-modelo-de-dados-conceitual)
8. [Fluxos críticos de negócio](#8-fluxos-críticos-de-negócio)
9. [Consultas e mensageria](#9-consultas-e-mensageria)
10. [Saldo, financeiro e conciliação](#10-saldo-financeiro-e-conciliação)
11. [Convites, memberships e companies](#11-convites-memberships-e-companies)
12. [Templates e blocos de consulta](#12-templates-e-blocos-de-consulta)
13. [White-label, tokens e integrações](#13-white-label-tokens-e-integrações)
14. [APIs e contratos](#14-apis-e-contratos)
15. [Observabilidade, auditoria e segurança](#15-observabilidade-auditoria-e-segurança)
16. [Estrutura sugerida de módulos](#16-estrutura-sugerida-de-módulos)
17. [Infraestrutura e ambientes](#17-infraestrutura-e-ambientes)
18. [Roadmap técnico](#18-roadmap-técnico)

---

## 1. Objetivo do back-end

O back-end do **Consultas Pró** deve sustentar uma plataforma SaaS multi-tenant preparada para:

- consultas modulares de crédito;
- gestão de saldo e cobrança;
- companies com múltiplos usuários;
- convites e vínculos;
- templates e precificação;
- painel administrativo completo;
- white-label e integrações externas;
- escalabilidade segura e auditável.

A prioridade é uma base sólida, extensível e orientada a domínio, evitando acoplamento excessivo.

---

## 2. Diretrizes arquiteturais

## 2.1 Estilo recomendado
- **monólito modular** orientado a domínio;
- fronteiras claras entre módulos;
- mensageria assíncrona para fluxos pesados;
- API principal síncrona para operações de usuário;
- separação entre regras de negócio e infraestrutura.

## 2.2 Justificativa
Esse modelo entrega:
- menor complexidade operacional inicial que microserviços;
- melhor velocidade de desenvolvimento;
- boa organização para evolução futura;
- base estável para white-label SaaS;
- facilidade de escalar por módulos internos.

---

## 3. Stack recomendada

## 3.1 Back-end
- **Node.js 22 LTS**
- **TypeScript**
- **Fastify** ou **NestJS**

### Recomendação prática
Usar **Fastify + arquitetura própria modular** se quiser máxima performance e controle.
Usar **NestJS** se preferir convenções enterprise e DI nativa.

Para o Consultas Pró, a melhor combinação é:
- **Node.js + TypeScript + Fastify + Zod + Prisma/Drizzle**
- arquitetura de módulos e casos de uso explícitos.

## 3.2 Banco e cache
- **PostgreSQL**
- **Redis**

## 3.3 Mensageria e filas
- **BullMQ** sobre Redis para jobs e processamento assíncrono
- opcionalmente **RabbitMQ** no futuro, se houver grande volume de integrações

## 3.4 Storage
- S3 compatível para PDFs, anexos e artefatos

## 3.5 Pagamentos
- gateway PIX
- gateway cartão
- webhooks idempotentes

## 3.6 Observabilidade
- OpenTelemetry
- logs estruturados (Pino)
- Sentry para erros
- métricas Prometheus/Grafana, se necessário

---

## 4. Arquitetura base

## 4.1 Camadas
- **Presentation**: controllers, DTOs, guards, middlewares
- **Application**: casos de uso, orquestração, services de domínio
- **Domain**: entidades, value objects, regras de negócio
- **Infrastructure**: banco, filas, gateways, storage, integrações, cache

## 4.2 Princípios
- casos de uso explícitos;
- entidades ricas nas regras essenciais;
- integrações externas encapsuladas em adapters;
- eventos de domínio quando útil;
- nada de regra crítica espalhada em controller.

---

## 5. Domínios do sistema

Módulos sugeridos:
- auth
- users
- companies
- memberships
- invites
- wallets
- transactions
- pricing
- consulta-blocks
- templates
- consultas
- reports
- payments
- tenants
- api-tokens
- integrations
- admin
- technical-ops
- audit
- notifications

---

## 6. Modelo de autenticação e autorização

## 6.1 Autenticação
- login por e-mail e senha;
- password hashing com Argon2;
- refresh token rotativo;
- sessões revogáveis;
- recuperação de senha com token temporário;
- opcional de MFA em fase futura.

## 6.2 Autorização
Adotar **RBAC + permissions/capabilities**.

### Papéis base
- platform_admin
- company_owner
- company_manager
- company_operator
- individual_user

### Capacidades derivadas
- manage_users
- manage_company
- invite_users
- emit_consultas
- view_company_finance
- manage_templates
- manage_whitelabel
- access_technical_ops
- manage_tokens
- issue_admin_consultas

A autorização deve considerar:
- papel;
- company atual;
- tenant atual;
- escopos específicos do recurso.

---

## 7. Modelo de dados conceitual

## 7.1 Entidades principais

### Tenant
Representa o white-label/marca.
Campos sugeridos:
- id
- name
- slug
- branding_config
- domain_config
- status
- created_at

### Company
Organização vinculada a um tenant.
Campos:
- id
- tenant_id
- legal_name
- trade_name
- document
- responsible_phone
- responsible_email
- status
- wallet_id
- pricing_table_id
- created_at

### User
Pessoa com acesso ao sistema.
Campos:
- id
- full_name
- email
- document
- phone
- password_hash
- status
- created_at

### Membership
Vínculo entre user e company.
Campos:
- id
- user_id
- company_id
- role
- permissions_json
- status
- invited_by
- created_at

### Invite
Convites de onboarding.
Campos:
- id
- type (company|user)
- tenant_id
- company_id nullable
- email nullable
- document nullable
- role_suggested
- token_hash
- expires_at
- status
- created_by_user_id

### Wallet
Carteira financeira.
Campos:
- id
- owner_type (company|user)
- owner_id
- balance
- status

### WalletTransaction
Movimentações financeiras.
Campos:
- id
- wallet_id
- type
- amount
- balance_before
- balance_after
- reference_type
- reference_id
- actor_user_id
- metadata
- created_at

### PricingTable
Tabela de preços.
Campos:
- id
- tenant_id
- name
- status

### ConsultaBlock
Bloco disponível para consulta.
Campos:
- id
- code
- name
- category
- description
- status

### PricingTableItem
Preço por bloco.
Campos:
- id
- pricing_table_id
- consulta_block_id
- price

### Template
Template pré-configurado ou salvo.
Campos:
- id
- scope_type (global|tenant|company|user)
- scope_id
- name
- description
- is_favorite
- is_system
- status

### TemplateBlock
Relacionamento bloco/template.
Campos:
- id
- template_id
- consulta_block_id
- sort_order

### ConsultaOrder
Ordem de emissão de consulta.
Campos:
- id
- tenant_id
- company_id nullable
- user_id
- target_document
- target_type
- template_id nullable
- total_price
- status
- created_at

### ConsultaOrderItem
Itens cobrados/emitidos.
Campos:
- id
- consulta_order_id
- consulta_block_id
- unit_price
- provider_status
- payload_summary

### ConsultaResult
Resultado consolidado.
Campos:
- id
- consulta_order_id
- raw_payload_ref
- normalized_payload
- pdf_file_key
- generated_at

### Payment
Recarga financeira.
Campos:
- id
- wallet_id
- method
- amount
- status
- gateway_reference
- created_at

### ApiToken
Token de integração/white-label.
Campos:
- id
- tenant_id
- name
- hashed_secret
- scopes
- status
- last_used_at
- expires_at

### AuditLog
Trilha de auditoria.
Campos:
- id
- actor_user_id
- actor_type
- action
- resource_type
- resource_id
- diff_json
- metadata
- created_at

---

## 8. Fluxos críticos de negócio

## 8.1 Cadastro aberto
- validar duplicidade por e-mail/documento;
- criar usuário individual ou company owner conforme fluxo;
- disparar evento de onboarding;
- gerar logs de auditoria.

## 8.2 Convite de company
- criar invite com role sugerido;
- enviar notificação;
- ao aceitar, criar user ou vincular existente;
- gerar membership.

## 8.3 Convite de nova company pelo admin
- criar invite do tipo company;
- associar tenant e pricing table;
- ao aceitar, criar company + primeiro membership owner.

## 8.4 Vinculação manual de usuário pelo admin
- criar ou selecionar user;
- criar membership em company existente;
- opcionalmente disparar redefinição de acesso;
- auditar a operação.

## 8.5 Emissão de consulta
- validar permissão;
- determinar wallet correta (company ou user);
- calcular custo por pricing table;
- reservar ou debitar saldo;
- criar order;
- enfileirar jobs por fornecedor;
- consolidar resultados;
- gerar PDF;
- registrar transação e auditoria.

---

## 9. Consultas e mensageria

## 9.1 Fluxo assíncrono recomendado
1. API recebe pedido de consulta.
2. Cria `ConsultaOrder` em status `queued` ou `processing`.
3. Enfileira jobs por bloco/fornecedor.
4. Workers consultam fornecedores externos.
5. Normalizam payloads.
6. Agregador consolida o resultado.
7. Serviço de relatório gera PDF.
8. API atualiza status final.
9. Notifica front via polling, SSE ou websocket leve.

## 9.2 Tipos de job
- consulta de fornecedor por bloco;
- consolidação de resultado;
- geração de PDF;
- reprocessamento de falhas;
- envio de notificações;
- conciliação de pagamento;
- limpeza/retention jobs.

## 9.3 Estratégias importantes
- idempotência por request;
- retry com backoff;
- dead letter handling;
- status claros por item e por ordem;
- timeout por fornecedor;
- fallback parcial quando um bloco falhar.

---

## 10. Saldo, financeiro e conciliação

## 10.1 Regra da carteira
- conta individual usa wallet própria;
- company usa wallet central compartilhada;
- membership determina se o usuário consome a wallet da company.

## 10.2 Transações
Toda alteração de saldo deve ser lançada em ledger.

Tipos:
- recharge
- consulta_debit
- admin_credit
- admin_debit
- refund
- bonus
- reserve
- release

## 10.3 Boas práticas
- nunca atualizar saldo sem registrar transação;
- usar transação de banco com locking adequado;
- conciliação de pagamentos por webhook + job verificador;
- motivo obrigatório em ajuste manual.

---

## 11. Convites, memberships e companies

## 11.1 Regras de convite
- token armazenado apenas como hash;
- validade curta e renovável;
- reenvio não deve exigir novo cadastro se já aceito;
- cancelamento deve invalidar o token.

## 11.2 Membership
- usuário pode ter múltiplos vínculos futuros, se a estratégia permitir;
- papel e permissões devem ser versionáveis/ajustáveis;
- histórico de alteração de permissão deve ser auditado.

## 11.3 Company
- company herda tenant;
- company recebe pricing table;
- company pode ter templates próprios;
- company possui wallet e dashboard próprios.

---

## 12. Templates e blocos de consulta

## 12.1 Blocos
Devem ser modelados como catálogo vivo.

Campos adicionais úteis:
- provider_key
- requires_dependency
- output_schema_version
- display_config
- technical_status

## 12.2 Templates
Permitir escopos:
- global
- tenant
- company
- user

## 12.3 Regras
- template pode ser somente leitura quando for do sistema;
- admin controla templates pré-configurados;
- company pode ter biblioteca própria;
- user pode salvar templates pessoais, se permitido.

---

## 13. White-label, tokens e integrações

## 13.1 Tenanting
Estratégia preferencial:
- single database com `tenant_id` em entidades relevantes;
- filtros obrigatórios por tenant;
- validações de isolamento em service layer;
- possibilidade futura de schema-per-tenant em escala maior.

## 13.2 Tokens
Tokens devem suportar:
- nome amigável;
- escopos;
- expiração;
- revogação;
- rotação;
- IP allowlist opcional;
- rate limit por token.

## 13.3 Casos de uso
- parceiro consumindo API;
- portal embedado;
- sincronização com outros sistemas;
- emissão programática de consulta.

## 13.4 Gestão técnica
Módulo para admin controlar:
- fornecedores e credenciais;
- disponibilidade;
- limites;
- mapeamentos;
- filas e reprocessos;
- logs de integração.

---

## 14. APIs e contratos

## 14.1 Recursos principais
- `/auth`
- `/users`
- `/companies`
- `/memberships`
- `/invites`
- `/wallets`
- `/transactions`
- `/payments`
- `/consulta-blocks`
- `/templates`
- `/consultas`
- `/reports`
- `/tenants`
- `/api-tokens`
- `/audit-logs`
- `/technical-ops`

## 14.2 Padrões
- versionamento `/v1`;
- DTOs tipados;
- validação de entrada com Zod/class-validator;
- respostas consistentes;
- paginação padrão;
- filtros previsíveis;
- idempotency-key para operações críticas.

## 14.3 Eventos e webhooks
- pagamento confirmado;
- consulta concluída;
- convite aceito;
- saldo alterado;
- token revogado;
- integração falhou.

---

## 15. Observabilidade, auditoria e segurança

## 15.1 Logs
- logs estruturados com correlation id;
- logs por request;
- logs por job;
- logs de integrações externas.

## 15.2 Auditoria
Auditar no mínimo:
- login e recuperação de acesso;
- criação/edição de company;
- criação/edição de usuário;
- vínculos e permissões;
- ajustes de saldo;
- criação/edição de templates;
- geração/revogação de tokens;
- ações técnicas sensíveis.

## 15.3 Segurança
- hashing forte;
- secrets em vault/gerenciador seguro;
- criptografia de dados sensíveis quando necessário;
- rate limiting;
- proteção contra brute force;
- RBAC consistente;
- política de least privilege.

---

## 16. Estrutura sugerida de módulos

```text
src/
  modules/
    auth/
    users/
    companies/
    memberships/
    invites/
    wallets/
    transactions/
    payments/
    pricing/
    consulta-blocks/
    templates/
    consultas/
    reports/
    tenants/
    api-tokens/
    integrations/
    technical-ops/
    admin/
    audit/
    notifications/
  shared/
    domain/
    infra/
    utils/
    contracts/
    events/
  bootstrap/
```

Cada módulo pode seguir:
- domain/
- application/
- infra/
- presentation/

---

## 17. Infraestrutura e ambientes

## 17.1 Serviços mínimos
- app API
- worker de filas
- postgres
- redis
- storage S3
- serviço de observabilidade

## 17.2 Ambientes
- local
- staging
- production

## 17.3 Deploy
- containers Docker;
- CI/CD com testes e lint;
- migrations controladas;
- jobs separados da API;
- variáveis por ambiente.

## 17.4 Escala futura
- escalar workers separadamente;
- escalar API horizontalmente;
- separar geração de PDF e integrações pesadas se necessário.

---

## 18. Roadmap técnico

## Fase 1 — Core sólido
- auth;
- users/companies/memberships;
- invites;
- wallets/transações;
- pricing/tables;
- catálogo de blocos;
- templates;
- consulta order + filas;
- PDF;
- admin básico.

## Fase 2 — SaaS robusto
- dashboards analíticos;
- gestão avançada de permissões;
- conciliação ampliada;
- gestão técnica;
- reprocessamento e observabilidade.

## Fase 3 — White-label e integrações
- tenants completos;
- tokens/API pública controlada;
- embeds;
- rate limiting avançado;
- analytics de uso por tenant;
- onboarding comercial de parceiros.

