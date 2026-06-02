# Exemplos de padrao

## Modelagem

- ❌ Guardar produtos de template em um `Json` solto dentro de `Template`.
- ✅ Relacionar `Template` e `ProviderProduct` por `TemplateItem`, mantendo `sortOrder`.

## Fluxo financeiro

- ❌ Atualizar `Wallet.balance` isoladamente e confiar que o historico sera preenchido depois.
- ✅ Registrar a movimentacao em `LedgerEntry` na mesma transacao que altera a carteira.

## Execucao de consulta

- ❌ Persistir todo o detalhe do provedor apenas em `Consultation.mergedPayload`.
- ✅ Usar `ConsultationExecution` para request/response por provedor e `MergeLog`/`mergedPayload` para consolidacao.

## Evolucao

- ❌ Criar migration manual fora do fluxo do Prisma sem motivo claro.
- ✅ Modelar primeiro em `schema.prisma`, gerar migration com Prisma e revisar os consumidores do backend.
