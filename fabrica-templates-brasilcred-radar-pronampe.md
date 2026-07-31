# Fábrica de Templates — Radar PRONAMPE (Brasil Cred)

## Objetivo

Catalogar o produto **Radar PRONAMPE (CNPJ)** da Brasil Cred com contrato de dados completo, mapeamento exaustivo e relatório no padrão visual da Consultas PRO, sem alterar o caminho Sollos já homologado.

## Descoberta que definiu o trabalho — 31/07/2026

Existiam duas fontes concorrentes para o mesmo produto:

| | Dump interno | **Contrato da API** |
|---|---|---|
| Arquivo | `logs/radar_pronampe_brasilconsultas.json` | `openapi.yaml` → `RadarPronampeResult` |
| Caminhos folha | 522 | **34** |
| PII | CPF completo de sócio, razão social, endereço, operador do provedor | nenhuma |

O dump traz `refund_attempts`, `save_to_history`, `consultation_events[]` e `tenant_id` — campos de tabela, não de resposta HTTP. **É um registro interno da Brasil Cred, não o retorno da API.**

Sete consultas reais confirmaram: a API entrega o schema neutro de 34 campos, sempre. Não há parâmetro `raw`/`verbose`/`full`/`expand`, e o `openapi.yaml` declara *whitelist-only, por construção*. Mapear os 522 caminhos seria trabalho integralmente perdido.

## Entregue neste checkpoint

- [x] Contrato definido por evidência: 7 amostras reais, custo R$ 0,00.
- [x] Amostras versionadas em `backend/prisma/brasilcred-radar-pronampe-samples.json`, 6 delas pareadas com o PDF oficial do painel.
- [x] De-para de 34 caminhos para 9 tipos canônicos `PRONAMPE_*`, cobertura 100% nos dois sentidos.
- [x] Traduções validadas contra os PDFs: `01`→Microempresa (ME), `03`→Empresa de Pequeno Porte (EPP), `2`→Ativa, booleanos→Sim/Não.
- [x] Normalização de `risk_level` em inglês, preservando `credit_portfolio.risk_level` em português — são métricas distintas.
- [x] Bloco ausente na origem some do PARA, para a seção se auto-ocultar em vez de renderizar campo vazio.
- [x] Template gerado pela matriz protegida `CONSULTAS_PRO_1079`: 3 páginas, 174 elementos, logo e marca da Consultas PRO.
- [x] Fábrica de Templates aberta à Brasil Cred por política de provedor, sem afrouxar a trava da Sollos.
- [x] Mapeamentos antigos do dump interno desativados (42), preservados para reversão.
- [x] 13 testes automatizados, verificação de tipos e renderização das 7 amostras sem expressão pendente.

## Evidências

| Verificação | Resultado |
|---|---|
| Caminhos da origem com destino no PARA | 34/34 |
| Mapeamentos apontando para caminho inexistente | 0 |
| Valores conferidos origem → Preview | 228, sem divergência |
| Páginas renderizadas com amostra real | 21/21 sem expressão pendente |
| Documento de sócio sem máscara | 0 |
| Testes | 13/13 |
| Regressão nos 30 templates Sollos | nenhuma |

## Ordem editorial

Herdada dos relatórios oficiais do painel Brasil Cred — veredicto primeiro, evidência depois:

1. Identificação da consulta
2. Score de crédito
3. Recomendação de crédito
4. Capacidade de pagamento
5. Dívida ativa da União
6. Certidão de regularidade fiscal
7. Carteira de crédito — SCR Bacen
8. Cadastro na Receita Federal
9. Quadro societário

## Pendências conhecidas

- [ ] **Integração assíncrona.** O produto responde `202` e exige polling em `GET /consultations/{id}`. O backend não implementa `Idempotency-Key` (obrigatório desde 2026-04-27), tratamento de `202` nem polling — nenhuma chamada a `POST /consult/*` funciona hoje.
- [ ] **Payload analítico.** A API não entrega trilha, veredicto, rating bancário, camadas de análise, quadro societário nominal, SCR por modalidade nem Bases II/III/IV — presentes no PDF do painel. Cobertura atual do relatório oficial: ~25%. Depende de liberação da Brasil Cred.
- [ ] **Aprovação manual.** O produto permanece como estava e o template está `PRIVATE`, aguardando revisão.

## Critérios de segurança

- Nenhuma consulta paga foi executada; as amostras vieram do histórico via `GET /consultations/{id}`, gratuito.
- O produto em produção não teve preço, status nem endpoint alterados.
- O template 1079 permanece intocado e é lido apenas como matriz visual.
- Os 30 templates Sollos foram verificados por teste após cada alteração compartilhada.
- A trava de destino da Sollos (https + `api.sollosconsultas.com.br` + `/json/homologa.aspx`) segue exata, com teste dedicado.
