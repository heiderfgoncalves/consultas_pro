# 📊 Catálogo de Mapeamento de Contexto e Chaves Dinâmicas

Este documento detalha o catálogo de chaves lógicas canônicas de contexto injetadas pelo backend para os relatórios analíticos, especificando seus tipos, propósitos e formas de interpolação recomendadas através de expressões lógicas e tags Mustache no motor de exibição.

---

## 🏷️ 1. Variáveis Globais de Metadados

Estas variáveis fornecem informações de controle para o cabeçalho e rodapé do documento.

* **`{{template.date}}`** *(string)*: Data e hora de processamento da consulta (ex: `11/06/2026, 22:23`).
* **`{{template.protocol}}`** *(string)*: Código único identificador do protocolo (ex: `4E569AD6-CB66-4625-91A2-D4A3E267A28C`).
* **`{{document}}`** ou **`{{formatCpfCnpj document}}`** *(string)*: O documento principal consultado.

---

## 🏢 2. Cadastro de Registro Geral (`$CADASTRO_PRINCIPAL`)

Armazena os dados primários de registro cadastral do documento consultado.

* **`{{$CADASTRO_PRINCIPAL.razao_social}}`** *(string)*: Nome empresarial / Razão Social de pessoa jurídica.
* **`{{$CADASTRO_PRINCIPAL.situacao_cadastral}}`** *(string)*: Estado cadastral ativo ou inativo (ex: `ATIVA`).
* **`{{$CADASTRO_PRINCIPAL.data_abertura}}`** *(date)*: Data de fundação ou início das operações.
* **`{{$CADASTRO_PRINCIPAL.cnae_principal}}`** *(string)*: Descrição da atividade econômica primária.
* **`{{$CADASTRO_PRINCIPAL.telefones}}`** *(string)*: Números de contato cadastrados.
* **`{{$CADASTRO_PRINCIPAL.endereco}}`** *(string)*: Endereço físico completo formatado da matriz.

---

## 📈 3. Síntese Analítica e Parecer de Risco (`$SINTESE_ANALITICA`)

Consolida a pontuação de score de crédito e as análises analíticas de risco geradas na consulta.

* **`{{$SINTESE_ANALITICA.recomendacao_final}}`** *(string)*: Veredicto ou recomendação da operação (ex: `Inapto` ou `Apto`).
* **`{{$SINTESE_ANALITICA.credito_estimado}}`** *(currency)*: Limite de faturamento atribuído como teto. Deve ser formatado com o helper de moeda: `R$ {{formatBacenCurrency $SINTESE_ANALITICA.credito_estimado}}`.
* **`{{$SINTESE_ANALITICA.prob_inadimplencia}}`** *(string)*: Grau qualitativo de risco de inadimplência (ex: `Baixa`, `Moderada` ou `Alta`).
* **`{{$SINTESE_ANALITICA.rating_bancario}}`** *(string)*: Classificação ou rating financeiro (ex: `A`, `B`, `C` ou `D`).
* **`{{$SINTESE_ANALITICA.score}}`** *(number)*: Pontuação numérica consolidada (0 a 1000).
* **`{{$SINTESE_ANALITICA.faturamento_estimado}}`** *(currency)*: Volume de faturamento presumido.
* **`{{$SINTESE_ANALITICA.gasto_estimado}}`** *(currency)*: Passivo estimado de obrigações inferidas.
* **`{{$SINTESE_ANALITICA.parecer_executivo}}`** *(string)*: Resumo narrativo detalhado para subsidiar a tomada de decisão do analista.

---

## 👥 4. Quadro de Participantes / Sócios (`$QUADRO_SOCIETARIO`)

Representa um array dinâmico com a ficha de cada participante na estrutura social e seus respectivos apontamentos de restrições de forma agregada. Deve ser percorrido de forma dinâmica através de loops de repetição `{{#each}}`.

### Campos Disponíveis em Cada Participante:
* **`{{nome}}`** *(string)*: Nome completo ou razão social do participante.
* **`{{documento}}`** *(string)*: CPF ou CNPJ pessoal. Deve ser formatado com o helper correspondente: `{{formatCpfCnpj documento}}`.
* **`{{vinculo}}`** *(string)*: Tipo de relação na estrutura de participação (ex: `Sócio-Administrador`).
* **`{{participacao}}`** *(number)*: Percentual de cota de participação (ex: `25`).
* **`{{score}}`** *(number)*: Score individual do participante (caso ausente, use um fallback lógico: `{{#if score}}{{score}}{{else}}350{{/if}}`).
* **`{{qtd_refin}}`** *(number)*: Quantidade de apontamentos de restrições financeiras ativas.
* **`{{total_refin}}`** *(currency)*: Valor total em aberto das restrições financeiras.
* **`{{qtd_protestos}}`** *(number)*: Quantidade de protestos em cartórios em nome do participante.
* **`{{total_protestos}}`** *(currency)*: Valor total consolidado de protestos.

---

## 🏦 5. Exposição Financeira e Endividamento (`$EXPOSICAO_FINANCEIRA`)

Estatísticas consolidadas sobre os passivos operacionais e de crédito da entidade consultada.

* **`{{$EXPOSICAO_FINANCEIRA.limite}}`** *(currency)*: Limite de crédito rotativo concedido no mercado.
* **`{{$EXPOSICAO_FINANCEIRA.prejuizo}}`** *(currency)*: Créditos baixados como prejuízo (indicação gravíssima).
* **`{{$EXPOSICAO_FINANCEIRA.obrigacao_assumida}}`** *(currency)*: Volume total de obrigações contratadas vigentes.
* **`{{$EXPOSICAO_FINANCEIRA.vencer}}`** *(currency)*: Contratos adimplentes a vencer no futuro.
* **`{{$EXPOSICAO_FINANCEIRA.vencido}}`** *(currency)*: Contratos inadimplentes já vencidos no mercado.
* **`{{$EXPOSICAO_FINANCEIRA.responsabilidade_total}}`** *(currency)*: Exposição total da carteira.
* **`{{$EXPOSICAO_FINANCEIRA.faixa_risco}}`** *(string)*: Rating de risco atribuído.

---

## 🔍 6. Indicadores de Bureaus Complementares (`$INDICADORES_COMPLEMENTARES`)

Pontuações de bases alternativas de crédito consultadas secundariamente de forma acessória.

* **`{{$INDICADORES_COMPLEMENTARES.quod_score}}`** *(number)*: Score de birô da base complementar A.
* **`{{$INDICADORES_COMPLEMENTARES.quod_faixa}}`** *(string)*: Classificação qualitativa da base complementar A (ex: `Baixo Risco`).
* **`{{$INDICADORES_COMPLEMENTARES.boavista_score}}`** *(number)*: Score da base complementar B.
* **`{{$INDICADORES_COMPLEMENTARES.boavista_faixa}}`** *(string)*: Classificação qualitativa de risco da base complementar B.
