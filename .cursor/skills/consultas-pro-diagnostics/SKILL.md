---
name: consultas-pro-diagnostics
description: Diagnostics, API testing and data verification for the Consultas PRO stack. Use when something is not working, when validating business rules, when checking data consistency, or when reproducing API and consultation pipeline issues in this repository.
---

# Consultas PRO Diagnostics

## Quando usar

- Usuario reporta que algo nao funciona como esperado.
- Precisa verificar como dados estao sendo salvos/lidos.
- Precisa testar um endpoint e validar o retorno.
- Precisa simular comportamento da API e comparar com banco.
- Precisa investigar saldo, templates, consultas, providers ou fila/worker.

## Workflow de diagnostico

1. **Localizar o modulo real**: comece por `*.routes.ts`, `*.schemas.ts` e `*.service.ts` do dominio afetado (`auth`, `companies`, `finance`, `templates`, `consultations`, `providers`, `admin`).
2. **Subir somente o necessario**: no backend use `npm run dev`; para pipeline assincrono, subir tambem `npm run worker`; no frontend, `npm run dev`.
3. **Verificar saude HTTP**: usar `GET /health` na API local.
4. **Conferir contrato**: validar payload esperado nos schemas e a regra de negocio no service antes de assumir erro de banco.
5. **Comparar persistencia vs retorno**: conferir se o problema esta na escrita, na leitura, na consolidacao ou na camada de UI.
6. **Fechar o loop**: se o banco estiver certo e a API errada, corrigir serializacao/consulta; se a API estiver certa e a UI errada, corrigir o consumo no frontend.

## Comandos uteis do repo

```bash
# Backend
cd backend
npm run dev
npm run worker
npm run check

# Frontend
cd frontend
npm run dev
npm run lint
npm run test

# Health check local
curl http://localhost:3333/health
```

## Pontos de verificacao por dominio

- **Saldo e financeiro**: `Wallet` e `LedgerEntry` devem ficar consistentes entre saldo atual e historico.
- **Templates**: revisar `Template` + `TemplateItem`; nao assumir que o produto esta salvo em `Json`.
- **Consultas**: revisar `Consultation`, `ConsultationItem`, `ConsultationExecution`, `MergeLog` e fila `consultation.execute`.
- **Providers**: revisar `Provider`, `ProviderOperation`, `ProviderProduct`, `ProviderFieldMapping` e `ProviderTestLog`.
- **Permissao/acesso**: revisar `core/auth.ts`, `core/permissions.ts` e `User.role`.

## Banco e escrita

- Leitura no banco deve ser o padrao durante diagnostico.
- Escrita so entra quando o usuario pedir explicitamente ou quando a propria correcao exigir uma migration/seed autorizada.
- Ao consultar dados, preferir Prisma/schema e comandos nao destrutivos do ambiente local antes de SQL manual.

## Regras de seguranca

- **Padrao**: somente leitura no banco.
- **Escrita**: apenas quando o usuario pedir explicitamente.
- **Segredos**: nunca expor `DATABASE_URL`, `JWT_SECRET`, credenciais de provider ou payloads sensiveis sem necessidade.
- **Ambiente**: confirmar se a investigacao e local/staging antes de executar algo invasivo.
