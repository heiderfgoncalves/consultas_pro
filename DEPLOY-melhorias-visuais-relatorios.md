# Deploy — melhorias visuais dos relatórios (padrão 1079)

Guia para o dev sênior aplicar em produção as melhorias de layout dos relatórios
Sollos. Reescreve a camada de apresentação: de posicionamento absoluto (que
cortava texto) para HTML de fluxo, mantendo o visual da matriz 1079.

**Não altera dados, mapeamentos, produtos nem o PRONAMPE.** Só o layout dos
templates Sollos gravados. O produto **1079 nunca é regravado** — é lido como
matriz.

## 1. O que mudou

| Arquivo | Papel |
|---|---|
| `src/modules/templates/consultas-pro-1079-composer.ts` | Compositor reescrito em HTML de fluxo (grid responsivo, sem corte). Exporta `PRUNE_BODY`. |
| `src/modules/templates/pivot-parallel-arrays.ts` | **Novo.** Converte arrays paralelos (SCR, histórico) em tabelas, agrupadas por tamanho. |
| `prisma/regenerate-sollos-templates-1079.ts` | Filtra tipos/campos técnicos, gera tabelas de pivô, remove seção de score quando não há score. |
| `prisma/export-template-pdf.ts` | Paginação por fluxo (puppeteer pagina A4, cabeçalho/rodapé repetidos); aplica pivô e limpeza. |
| `prisma/export-all-sollos-pdfs.ts` | **Novo.** Gera os 30 PDFs em lote, um browser reusado. |

## 2. Problemas corrigidos

- **Texto cortado / amontoado** — o layout absoluto tinha caixas de tamanho fixo.
  Agora é grid HTML: rótulos e valores quebram, nunca cortam.
- **Arrays despejados como JSON** (13 produtos) — viram tabelas. Arrays de
  tamanhos diferentes (5 faixas de atraso × 60 meses) viram tabelas separadas.
- **Lixo técnico** — tipos `HEADER/CONTROLE/PROTOCOLO/DADOS_RETORNADOS/…` e campos
  `CHAVE/HASH/VERSAO/CLIENTE/TESTE/…` ficam fora do relatório do cliente.
- **Cards, colunas e seções vazias** — ocultados. Coluna vazia em toda a tabela
  some; tabela sem linhas mostra "Nenhuma ocorrência".
- **Seção de score fantasma** — produto sem score não exibe o medidor.
- **Listas com pipe** (`AFINS|AUTOMOVEIS`) — viram `AFINS · AUTOMOVEIS`.

## 3. Como aplicar

```bash
cd backend

# 1) Confere sem gravar. 29/29, 0 falhas esperado.
npx tsx prisma/regenerate-sollos-templates-1079.ts

# 2) Regrava o layout dos 29 templates Sollos (o 1079 não é tocado).
npx tsx prisma/regenerate-sollos-templates-1079.ts --apply
```

Só isso altera produção. É idempotente: rodar de novo produz o mesmo layout.

## 4. Ponto de atenção no render de PDF em produção

Os templates novos têm `metadata.consultasProTemplate.flowing = true`. Quem gera
o PDF **precisa** tratar isso:

1. **Paginação por fluxo**: renderizar o `customHtml` do único frame e deixar o
   puppeteer paginar em A4 (não fatiar em folhas de altura fixa). Cabeçalho e
   rodapé vão em `headerTemplate`/`footerTemplate` do `page.pdf`, repetindo por
   página. Referência completa em `prisma/export-template-pdf.ts` (ramo `flowing`).
2. **Limpeza pós-render obrigatória**: após `setContent`, executar
   `page.evaluate(\`${PRUNE_BODY}; __cproClean();\`)` **antes** de `page.pdf`.
   Isso normaliza pipes e oculta vazios/colunas. O `<script>` embutido no HTML
   nem sempre roda no contexto de impressão — não dependa só dele.

`PRUNE_BODY` é exportado de `consultas-pro-1079-composer.ts`.

> Se o serviço de PDF em produção (rota/worker) ainda usa o caminho antigo de
> "folhas de altura fixa", ele **corta** os templates de fluxo. Alinhar esse
> ponto é o único ajuste de integração necessário.

## 5. Fonte de dados no render

Antes de renderizar, passar o `data` por `applyPivotToData` (de
`pivot-parallel-arrays.ts`) — é o que cria as linhas de tabela `${tipo}__rows0`,
`${tipo}__rows1`. Sem isso, os blocos de SCR/histórico saem vazios.

## 6. Verificação

```bash
# Gera os 30 PDFs de conferência com a amostra catalogada.
npx tsx prisma/export-all-sollos-pdfs.ts /tmp/pdfs-sollos
```

Esperado: 30/30, sem aviso de expressão pendente. Abrir alguns de perfis
diferentes (um com SCR como o 708, um de protesto como o 1723, um completo como
o 756).

## 7. Escopo e segurança

- Só o layout dos 29 templates Sollos muda. Dados, mapeamentos e preços intactos.
- O **1079** (matriz) e o **PRONAMPE** não são alterados.
- Nenhuma credencial ou PDF com PII entra no versionamento (`.env` e `pronampe/`
  no `.gitignore`).
