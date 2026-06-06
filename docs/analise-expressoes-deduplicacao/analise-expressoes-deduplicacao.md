# Análise: Expressões, Deduplicação e Fonte de Verdade (Consultas PRO)

Este documento sumariza a investigação profunda realizada sobre a divergência matemática e a dessincronização de dados na interface de *Templates Drawer*.

## 1. O Problema Relatado
O usuário encontrou dois problemas principais no **Templates Drawer**:
1. O cálculo de `{{sum($[*].totalapontado)}}` retorna **29.985,89**, enquanto `{{sum($[*].totaldeduzido)}}` retorna **108.196,74**.
2. A edição do JSON de retorno (na aba de preview/configuração) desaparece do Drawer após recarregar a página, evidenciando uma falha na **fonte de verdade** em tempo real do sistema.

## 2. Investigação e Diagnóstico Profundo

### A. A Divergência Matemática
Através da análise da engine de template (`interpolate.ts` e `resolveExpression.ts`) e do motor de unificação (`LeftPanel.tsx`), descobrimos que:

- **Por que o `totaldeduzido` (108.196,74) está correto?**
  O valor `108.196,74` é calculado **dinamicamente no frontend** (`LeftPanel.tsx`, linha 812). O sistema aplica a deduplicação global (removendo as duplicatas entre Boa Vista, SPC e Serasa) e **recalcula** o `totaldeduzido` somando as `linhas` remanescentes de cada bureau. 
  - Boa Vista reteve `93.319,36`.
  - SPC reteve o residual de `14.877,35`.
  - Serasa teve `0,00` (linhas totalmente removidas pelo dedup).
  - A soma matemática residual pós-dedup é `108.196,74`. A expressão `sum($[*].totaldeduzido)` funciona perfeitamente pois reflete o valor único residual e é recalculada *on-the-fly*.

- **Por que o `totalapontado` (29.985,89) é duplicado?** 
  O campo `totalapontado` não sofre recálculo dinâmico no `LeftPanel.tsx`. Ele é extraído de forma **estática** dos totais mapeados pela API/Provider para cada bureau. 
  Se o Serasa retorna `14.877,35` e o SPC retorna os mesmos `14.877,35` no JSON (pois são as mesmas dívidas brutas), a expressão `sum($[*].totalapontado)` soma ambos de forma estática, resultando em uma dupla contagem (`29.754,70` + juros marginais dependendo do log). O motor de expressões soma os totais de forma cega porque não há unificação ou recálculo do "Total Apontado" por tipo.

### B. O Problema da Fonte de Verdade em Tempo Real
No `LeftPanel.tsx` (linha 655), a prioridade de exibição é:
```typescript
const rawPayload = (poolItem && poolItem.payload) ? poolItem.payload : consultation?.sampleResponse;
```
Quando você cria ou seleciona um **Cenário de Teste**, o sistema utiliza o `payload` salvo estaticamente naquele cenário.
Quando você edita o JSON na aba de Configuração (o `sampleResponse`), o Drawer ignora essa nova edição caso um cenário antigo ainda esteja ativo, causando a confusão de "o valor sumiu mas o total permaneceu". A reatividade em tempo real é sobreposta pela hierarquia de cache do cenário.

## 3. Solução Sistêmica e Arquitetural (Cérebro Único)

### Etapa 1: Tornar o `totalapontado` reativo e autônomo
O `totalapontado` passará a ser recalculado dinamicamente para cada bureau, somando as `.linhas` **antes** de passarem pela Deduplicação Global no `LeftPanel.tsx`.
Isso garante que, ao editar qualquer linha do JSON na aba de configurações, tanto o `totalapontado` quanto o `totaldeduzido` sejam recalculados e a expressão `sum($[*].totalapontado)` sempre represente a soma matemática das linhas que de fato existem no JSON do provedor.

### Etapa 2: Unificação da Reatividade (Cérebro Único)
Para evitar conflito de informações, o Zustand (Store) será a fonte de verdade única durante a edição.
- Quando o editor JSON da página estiver recebendo input (`testJson` draft), o **Cenário Ativo** será temporariamente suprimido e o `mergeAndApplyPayloads` lerá diretamente do buffer de edição.
- Isso fará com que o Drawer reaja **imediatamente** (em tempo real) a cada tecla digitada no JSON, independentemente de um cenário de teste estar salvo no histórico.
