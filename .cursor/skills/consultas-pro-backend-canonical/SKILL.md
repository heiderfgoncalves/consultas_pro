---
name: consultas-pro-backend-canonical
description: Enforces the canonical backend architecture of Consultas PRO using Fastify 5, Prisma 6, Zod and BullMQ. Use when creating or changing backend modules, routes, services, provider integrations, queues, workers or ledger/consultation flows in this repository.
---

# Consultas PRO Backend Canonical

## Objetivo

Padronizar mudancas no backend do Consultas PRO de acordo com a estrutura real do repositorio, priorizando reuso, clareza de camadas, consistencia de dominio e seguranca operacional.

## Stack e estrutura real

- `backend/src/modules/`: `auth`, `users`, `companies`, `finance`, `templates`, `consultations`, `providers`, `admin`, `system`
- `backend/src/core/`: autenticacao, permissoes, contratos HTTP e erros
- `backend/src/db/`: cliente Prisma
- `backend/src/lib/`: helpers de documento, hash, slug e renderizacao de templates
- `backend/src/queues/` e `backend/src/workers/`: processamento assincrono de consultas

## Workflow obrigatorio

1. **Reuse-first**: procure implementacao existente antes de criar algo novo.
2. **Estrutura real**: preferir `*.routes.ts`, `*.schemas.ts` e `*.service.ts` quando fizer sentido; nao inventar `controller`/`repository` por padrao.
3. **Borda da API**: validar input/output com Zod nos schemas do modulo.
4. **Negocio no service**: rotas simples podem usar `app.prisma` direto; fluxos com saldo, consulta, provider, merge, fila ou validacao multi-etapa devem ir para `service`.
5. **Banco no padrao do repo**: usar `app.prisma` e `app.prisma.$transaction(...)`; nao orientar `pgPool.connect()` como caminho canonico aqui.
6. **Integracao externa**: encapsular chamadas a provedores em `modules/providers/*` ou services dedicados; nao espalhar `fetch` em rotas.
7. **Assincrono para consulta**: usar `queues/` e `workers/consultation.worker.ts` para execucao desacoplada, retries e consolidacao.
8. **Dominio financeiro**: alteracao de saldo deve respeitar `Wallet` + `LedgerEntry`; nao debitar carteira sem trilha de ledger.
9. **Dominio de consulta**: `Template` referencia `ProviderProduct` por `TemplateItem`; emissao gera `Consultation`, `ConsultationItem` e `ConsultationExecution`.
10. **Seguranca**: preservar autenticacao, RBAC, validacao e contratos de erro em `core/`.
11. **Observabilidade**: manter logs estruturados coerentes com Fastify/Pino e mensagens de erro acionaveis.
12. **Quality gate**: priorizar `npm run check` no backend e corrigir diagnostics novos antes de concluir.

## Sinais do dominio

- `Company` concentra saldo compartilhado quando ha operacao empresarial.
- `User.role` e `core/permissions.ts` orientam o acesso.
- `Provider`, `ProviderOperation`, `ProviderProduct` e `ProviderFieldMapping` modelam integracoes e normalizacao.
- `Consultation.mergedPayload` e `MergeLog` guardam consolidacao, nao apenas o payload cru do provedor.

## Estrutura padrao

```txt
backend/src/modules/<dominio>/
  <dominio>.routes.ts
  <dominio>.service.ts
  <dominio>.schemas.ts

backend/src/core/
backend/src/db/
backend/src/lib/
backend/src/queues/
backend/src/workers/
```

## Checklist antes de finalizar

- [ ] Reuso validado (sem duplicacao desnecessaria)
- [ ] Novo codigo no modulo correto
- [ ] Sem regra de negocio critica espalhada em rota quando a logica nao e trivial
- [ ] Validacao de schema nas entradas
- [ ] Prisma/transaction usados de forma consistente
- [ ] Saldo e ledger tratados juntos quando houver impacto financeiro
- [ ] Emissao de consulta respeita Template/ProviderProduct/ConsultationExecution
- [ ] Erros alinhados com `backend/src/core/errors`
- [ ] Check de TypeScript executado quando aplicavel (`npm run check`)
- [ ] Diagnostics/linter sem erros

## Skill aninhada: uazapi / WhatsApp

Somente quando o trabalho envolver de fato **integracao uazapiGO**, **WhatsApp**, variaveis **`UAZ_API_*`**, webhooks do provedor ou endpoints como `/instance/connect`, `/webhook` e `/send/text`:

1. Ler **em conjunto** com esta skill: `.cursor/skills/uazapi-whatsapp-integration/SKILL.md`.
2. Usar payloads de referencia: `uazapi-whatsapp-integration/examples.md`.
3. Manter **camadas**: alteracoes HTTP ao provedor em service/integracao dedicada e orquestracao no **service** do modulo.

Isso complementa as regras deste documento sem substituir Prisma, Zod e o padrao modular do repo.

## Referencia

- Exemplos alinhados ao repo: [examples.md](examples.md)
