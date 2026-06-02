# Exemplos Canonicos

## Reuso

- ❌ Criar `consultations.controller.ts` ou `providers.repository.ts` so por habito de outro projeto.
- ✅ Reaproveitar `consultations.routes.ts`, `consultations.service.ts` e os services ja existentes em `modules/providers/`.

## Camadas

- ❌ Debitar saldo, criar consulta e enfileirar job tudo direto na rota.
- ✅ Validar na rota e concentrar a orquestracao no `service`, usando transacao Prisma quando houver impacto financeiro.

## Fluxo financeiro

- ❌ Atualizar `Wallet.balance` sem registrar `LedgerEntry`.
- ✅ Tratar `Wallet` e `LedgerEntry` juntos dentro de `app.prisma.$transaction(...)`.

## Integracoes externas

- ❌ Fazer `fetch` direto em `*.routes.ts`.
- ✅ Encapsular chamadas em `provider-client.service.ts`, com normalizacao e merge em services dedicados.
