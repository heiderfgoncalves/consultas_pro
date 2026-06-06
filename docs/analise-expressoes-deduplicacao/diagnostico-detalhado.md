# Diagnóstico Técnico Detalhado

Este documento fornece um detalhamento minucioso dos dados da consulta, mapeamentos de campos e do comportamento do código-fonte que causaram o cálculo de totais irreais e inconsistências no motor de expressões.

---

## 🔍 Análise Comparativa dos Registros Originais

Com base nos logs reais de integração (`completa_brasil_mapeamento_1.json`), a resposta do provedor Sollos continha os seguintes débitos e protestos brutos:

### 1. SPC & Serasa (Compartilhavam as mesmas 5 ocorrências)
| Data Vencimento | Credor | Contrato | Valor |
| :--- | :--- | :--- | :--- |
| 01/10/2025 | BANRISUL | BBH02100062970699 | R$ 231,19 |
| 01/09/2021 | BANCO BMG | 0000033240021171 | R$ 630,23 |
| 01/06/2021 | BANCO BMG | 0000033240021463 | R$ 13.097,76 |
| 24/05/2021 | BANCO BMG | 603475599979839 | R$ 683,13 |
| 10/05/2021 | BANRISUL | BBH02100049991283 | R$ 235,04 |
* **Total bruto apontado individual por bureau:** **R$ 14.877,35**

### 2. Boa Vista (Continha 3 ocorrências)
| Data Vencimento | Credor | Contrato | Valor |
| :--- | :--- | :--- | :--- |
| 25/12/2025 | SCPC SAO PAULO - SP | UG114532000031687032 | R$ 79.591,37 (Exclusivo Boa Vista) |
| 25/12/2025 | SCPC SAO PAULO - SP | 0000000000033240021171 | R$ 630,23 (Duplicado do BMG SPC/Serasa) |
| 25/12/2025 | SCPC SAO PAULO - SP | 0000000000033240021463 | R$ 13.097,76 (Duplicado do BMG SPC/Serasa) |
* **Total bruto apontado Boa Vista:** **R$ 93.319,36**

### 3. Protesto Cartório (Continha 4 ocorrências)
| Data | Cartório | Local | Valor |
| :--- | :--- | :--- | :--- |
| NAO DIVULGADO | 01-ROCHA BRITO SERVICO NOTARIAL | PELOTAS | R$ 8.567,96 |
| NAO DIVULGADO | 02-TABELIONATO DE PROTESTO | PELOTAS | R$ 1.066,91 |
| NAO DIVULGADO | 02-TABELIONATO DE PROTESTO | PELOTAS | R$ 2.832,21 |
| NAO DIVULGADO | 02-TABELIONATO DE PROTESTO | PELOTAS | R$ 46.903,93 |
* **Total bruto de protestos:** **R$ 59.371,01** (com custos residuais calculados, chega a **R$ 65.122,65** em algumas configurações)

---

## ⚙️ A Causa Raiz da Falha na Deduplicação Global

A deduplicação global no frontend é orientada por chaves canônicas comuns identificadas a partir de `dedupFieldIds`. No entanto, para a **Boa Vista**, ela não funcionou devido a dois fatores:

1. **Divergência de Dados de Origem:** Os bureaus registraram datas de vencimento diferentes para as mesmas dívidas. O BMG registrou as dívidas como vencidas em 2021 no SPC, mas a Boa Vista registrou como 25/12/2025.
2. **Campos Chave Incompletos:** Como o critério de deduplicação global utilizava a data de vencimento e o valor como campos de comparação primários, a diferença de datas impediu que o sistema identificasse que o débito de `R$ 13.097,76` da Boa Vista e o do SPC eram a mesma ocorrência.
3. **Formatos de Contrato Divergentes:** O SPC registrou o contrato como `0000033240021171` e a Boa Vista registrou como `0000000000033240021171` (com zeros extras à esquerda). Mesmo que o contrato fosse chave de dedup, a falta de normalização string impediria a correspondência exata.

Com a falha de deduplicação, a Boa Vista reteve o total de **R$ 93.319,36**, quando na verdade deveria ter sido limpa das duplicidades e restado apenas **R$ 79.591,37**.

---

## 💻 Comportamento do Mecanismo de Expressões (`resolveExpression`)

A expressão `{{sum($[*].totaldeduzido)}}` é processada da seguinte forma pelo motor `resolveExpression.ts`:

1. **Varredura `$[*]`:** O motor acessa o objeto raiz do JSON da consulta e itera sobre todas as chaves (ignorando propriedades internas como `template` ou `medidas`).
2. **Acesso à Propriedade `totaldeduzido`:**
   * Para cada chave (ex: `DIVIDAS_SPC`), ele busca pela propriedade `totaldeduzido`.
   * Se não existir na raiz do objeto da chave, ele aplica o **fallback inteligente** e procura dentro do sub-objeto `totaisCalculados`.
3. **Injeção de Totais no Frontend:** 
   O frontend força a criação do campo `totaldeduzido` no Zustand store para todas as seções ativas de dívidas comercializadas (`DIVIDAS_SPC`, `DIVIDAS_SERASA`, `DIVIDAS_BOA_VISTA`), resultando em:
   * `DIVIDAS_SPC.totaisCalculados.totaldeduzido` = `"R$ 14.877,35"`
   * `DIVIDAS_SERASA.totaisCalculados.totaldeduzido` = `"R$ 0,00"` (recalculado pós-dedup global no frontend)
   * `DIVIDAS_BOA_VISTA.totaisCalculados.totaldeduzido` = `"R$ 93.319,36"` (mantido bruto)
4. **Cálculo da Soma (`sum(...)`):**
   * O motor extrai a lista: `["R$ 14.877,35", "R$ 0,00", "R$ 93.319,36"]` (e potencialmente o valor de protestos em estados anteriores onde a Serasa não estava zerada ou onde o protesto cartório continha dados poluídos de outros testes na store).
   * Ele converte cada string em número flutuante: `14877.35`, `0.00`, `93319.36`.
   * Realiza a soma: $14877.35 + 93319.36 = 108196.71$.

Como o total deduzido real das dívidas de SPC e Boa Vista juntos (se tivessem sido deduplicados corretamente) deveria ser **R$ 94.468,72** ($14.877,35 + 79.591,37$), o valor apresentado de **R$ 108.196,71** (ou **R$ 188.196,71** incluindo protestos e duplicidade da Serasa) tornou-se irreal e incoerente com a realidade do CPF analisado.
