---
name: consultas-pro-database-canonical
description: Defines the canonical database workflow of Consultas PRO with Prisma as the source of truth over PostgreSQL. Use when changing models, relations, migrations, money flows, provider structures or backend database integration in this repository.
---

# Consultas PRO Database Canonical

## Objetivo

Padronizar alteracoes de banco no Consultas PRO com foco em Prisma, PostgreSQL, compatibilidade com o backend e baixo risco de drift.

## Fonte de verdade e dominio atual

- Fonte principal: `backend/prisma/schema.prisma`
- Entidades centrais atuais: `Tenant`, `Company`, `User`, `Invite`, `Wallet`, `LedgerEntry`
- Dominio de consulta e integracao: `Provider`, `ProviderOperation`, `ProviderProduct`, `ProviderFieldMapping`, `ProviderTestLog`
- Dominio de templates e emissao: `Template`, `TemplateItem`, `Consultation`, `ConsultationItem`, `ConsultationExecution`, `MergeLog`

## Workflow obrigatorio

1. **Reuse-first**: revisar `backend/prisma/schema.prisma` antes de criar novos modelos, enums ou relacoes.
2. **Prisma-first**: considerar o schema Prisma como fonte principal da modelagem neste repositorio.
3. **Modelagem robusta**: manter PK/FK, unicidades, enums e tipos alinhados ao dominio real.
4. **Dinheiro com Decimal**: saldo, custo e valores monetarios devem seguir `Decimal` e a logica de `Wallet` + `LedgerEntry`.
5. **Json com criterio**: usar `Json` apenas para branding, metadata e payloads variaveis; nao como atalho para relacoes conhecidas.
6. **Sem assumir o que ainda nao existe**: o schema atual modela carteira compartilhada da `Company`; nao presumir wallet individual sem pedido explicito e mudanca de dominio.
7. **Templates e consulta**: compor templates por `TemplateItem -> ProviderProduct`; emissao por `ConsultationItem` e execucao por `ConsultationExecution`.
8. **Performance**: criar indices e relacoes pensando nas consultas reais do backend.
9. **Migracoes**: preferir `prisma migrate` como fluxo padrao; SQL cru so quando houver limitacao clara do Prisma.
10. **Compatibilidade**: sempre pensar no impacto da mudanca em `app.prisma`, services, workers e seeds.
11. **Validacao**: apos mudanca estrutural, lembrar de gerar client e validar o backend consumidor.

## Fluxo recomendado

1. Editar `backend/prisma/schema.prisma`.
2. Gerar a migration apropriada com Prisma.
3. Atualizar codigo afetado se o tipo/relacionamento mudou.
4. Rodar `npm run prisma:generate`.
5. Validar o backend que consome o schema.

## Checklist antes de finalizar

- [ ] Reuso validado antes de criar novos objetos
- [ ] `schema.prisma` alinhado ao dominio
- [ ] FK/constraints/indices aplicados quando necessarios
- [ ] Mudanca monetaria respeita `Wallet` + `LedgerEntry`
- [ ] Template/consulta/provedor seguem relacoes existentes, sem atalho em `Json`
- [ ] Migracao segue o fluxo do Prisma
- [ ] `prisma generate` considerado
- [ ] Codigo backend afetado foi revisado
- [ ] Sem erros de diagnostics/linter

## Referencia

- Exemplos: [examples.md](examples.md)
