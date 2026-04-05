# Plano: aba Configurações em Integrações

## Objetivo

Nova aba **Configurações** na área admin **Integrações** (`/admin/integracoes`):

| Aspecto | Definição |
|--------|-----------|
| Rótulo UI | Configurações |
| Query string | `aba=configuracoes` |
| Chave interna (tipo TS / estado) | `settings` |
| Ícone | Engrenagem (gear), alinhado às outras abas |
| Permissão | **Somente admin** (mesmo padrão das demais abas administrativas da página) |

**Por quê:** centralizar overrides operacionais (timeouts, filas, pausa, limites) sem misturar com catálogo de provedores ou templates.

---

## Brainstorm — 3 abordagens

1. **UI-only (mock)**  
   Formulários e estado local / `localStorage`, sem persistência. Rápido para protótipo; **não** atende produção nem multi-tenant.

2. **JSON por tenant + API genérica**  
   Um campo `settings` JSONB em `Company` ou `Tenant` + `GET/PATCH` únicos. Implementação curta; risco de “bolo” sem camadas, merges difíceis e sem defaults de plataforma.

3. **Camadas (recomendada)**  
   **Plataforma → tenant → produto/empresa** com merge explícito e validação Zod. Defaults em env/DB global; overrides granulares onde fizer sentido. Worker e HTTP leem a **config efetiva** resolvida.

---

## Abordagem recomendada

- **Config em camadas** (`platform` / `tenant` / `company` conforme modelo de domínio), com schema Zod versionável e documentação dos campos.
- **Worker:** retry **por item** de execução (consulta), com backoff e limite de tentativas; anotar **idempotência** nos pontos que chamam provedor (evitar débito duplicado / side effects).
- **UI:** seções agrupadas (operacional, provedores, filas, observabilidade), padrão visual alinhado a `IntegrationsPage` e componentes em `frontend/src/components/integrations/`.

---

## Checklist de implementação

### Dados e ambiente

- [ ] **Prisma:** decidir onde persistir (ex.: `Tenant.integrationSettings Json?`, `Company.integrationSettings Json?`, ou tabela `IntegrationSettings` com escopo) — evitar duplicar o mesmo conceito em dois lugares.
- [ ] **Merge:** função única `resolveIntegrationSettings(tenantId, companyId?)` usada por API e worker.
- [ ] **Env:** defaults globais (`PROVIDER_REQUEST_TIMEOUT_MS` já existe em `backend/src/config/env.ts`); novos opcionais só se forem realmente globais.

### API admin

- [ ] **GET** settings efetivos (leitura) + opcionalmente “raw” por escopo para edição.
- [ ] **PATCH** parcial com Zod (sem apagar chaves não enviadas); `requireRoles` admin coerente com `admin.routes.ts`.
- [ ] Rotas em módulo admin existente ou sub-rota dedicada; documentar no Swagger se o projeto expuser esses endpoints.

### Zod

- [ ] Schema único exportado (ex. `integrationSettingsSchema`) com `.partial()` para PATCH; limites numéricos (timeouts, retries, rate limits).

### Worker e filas

- [ ] `backend/src/workers/consultation.worker.ts`: loop de retry **por `ConsultationExecution` / item**, não só por job Bull genérico, se ainda não estiver assim.
- [ ] Respeitar `maxAttempts` / delays vindos da config efetiva.
- [ ] **Idempotência:** antes de reexecutar, checar estado terminal, cache, ou chave idempotente do provedor; documentar no código onde o dinheiro ou o efeito colateral ocorre.

### Frontend

- [ ] Novo componente `frontend/src/components/integrations/IntegrationsSettingsTab.tsx` (form + seções).
- [ ] Estender `frontend/src/lib/integrationsTabQuery.ts`: incluir `settings` em tipos union, mapear `aba=configuracoes`, `tabToIntegrationsAbaParam`, `buildIntegrationsAdminUrl`.
- [ ] `IntegrationsPage.tsx`: tab com ícone gear, render condicional, links internos que usam `buildIntegrationsAdminUrl('settings')`.

---

## Campos úteis extras (sugestão)

| Campo / conceito | Utilidade |
|------------------|-----------|
| Concorrência (exibição ou limite) | Transparência da fila; evitar saturar Redis/provedor |
| Override de timeout do provedor | Por tenant sem deploy |
| Pausar novas consultas | Manutenção / incidente |
| Logs verbosos em teste de provedor | Debug sem subir `LOG_LEVEL` global |
| Rate limits (req/min por tenant ou por provedor) | Proteção e fairness |
| Dead-letter / threshold para revisão manual | Após N falhas ou erro específico, marcar para fila humana |

Priorizar o que o worker e `providers.service` já conseguem honrar neste PR; o restante como “placeholder documentado” ou fase 2.

---

## Critérios de validação

- [ ] Apenas usuário admin vê a aba e chama GET/PATCH (403 para outros papéis).
- [ ] `?aba=configuracoes` abre direto na aba; refresh mantém estado.
- [ ] PATCH não corrompe JSON nem remove chaves não editadas (merge semântico).
- [ ] Worker aplica timeout/retry/pausa conforme config resolvida (teste integrado ou manual com env de dev).
- [ ] `npm run lint` / `tsc` sem erros nos arquivos tocados.

---

## Riscos

| Risco | Mitigação |
|-------|-----------|
| JSON livre sem schema | Zod estrito + migração gradual de chaves |
| Divergência env vs DB | Hierarquia clara: env = default absoluto; DB = override |
| Retry duplicando cobrança | Idempotência e checagem de estado antes de nova chamada ao provedor |
| UI poluída | Seções colapsáveis / “avançado” só para admin |

---

## Arquivos de referência (código existente)

Exploração do repositório — pontos de ancoragem:

| Área | Caminho |
|------|---------|
| Abas e query `aba` | `frontend/src/lib/integrationsTabQuery.ts` |
| Página Integrações | `frontend/src/pages/IntegrationsPage.tsx` |
| Rota admin | `frontend/src/App.tsx` (`/admin/integracoes`) |
| Componentes integrações | `frontend/src/components/integrations/*.tsx` |
| Rotas admin API | `backend/src/modules/admin/admin.routes.ts` |
| Schemas admin | `backend/src/modules/admin/admin.schemas.ts` |
| Env / timeout provedor | `backend/src/config/env.ts`, `backend/.env.example` |
| Worker consultas | `backend/src/workers/consultation.worker.ts` |
| Filas | `backend/src/queues/index.ts`, `backend/src/queues/names.ts` |
| Serviço provedores / testes | `backend/src/modules/providers/providers.service.ts` |
| Schema Prisma | `backend/prisma/schema.prisma` |

---

*Documento focado nesta feature; não substitui `docs/PLAN.md` (outro escopo).*
