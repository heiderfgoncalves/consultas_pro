# Homologação Sollos dos 30 produtos

## Objetivo

Executar e auditar a homologação real de cada produto solicitado, sem aprovação ou catalogação automática.

## Produtos

- [x] 676 — COMPLETA BRASIL PREMIUM PF/PJ
- [x] 2451 — QUOD COMPLETO PJ + SCORE
- [x] 2391 — QUOD RESTRITIVO + AÇÕES PF
- [x] 2392 — QUOD RESTRITIVO + AÇÕES PJ
- [x] 2450 — QUOD COMPLETO PF + SCORE
- [x] 723 — MAX BRASIL AVANÇADO CPF
- [x] 1723 — PROTESTO NACIONAL
- [x] 2502 — PROTESTO NACIONAL PROVEDOR 2
- [x] 708 — REALTIME PREMIUM + SCR BACEN
- [x] 1080 — SCR BACEN PREMIUM + SCORE
- [x] 756 — TOP +
- [x] 1076 — TOP BRASIL
- [x] 1264 — RELATÓRIO SIMPLES - PF/PJ
- [x] 1266 — REALTIME + BVS + SCORE PF/PJ
- [x] 707 — REALTIME + SCORE OFICIAL PF/PJ
- [x] 2259 — REALTIME PREMIUM PF/PJ
- [x] 1083 — CHECK-UP CRÉDITO
- [x] 1078 — COMPLETA BRASIL + SCORE CNPJ
- [x] 1079 — COMPLETA BRASIL + SCORE CPF
- [x] 680 — CENPROT + CCF BACEN
- [x] 1721 — BOA VISTA ACERTA/DEFINE + SCORE
- [x] 699 — CAPACIDADE CRÉDITO RATING PF/PJ
- [x] 700 — CAPACIDADE CRÉDITO RATING PREMIUM + SCR BACEN
- [x] 1082 — COMPLETA PLUS + SCORE PF/PJ
- [x] 1077 — COMPLETA PLUS PREMIUM
- [x] 724 — MAX BRASIL AVANÇADO CNPJ
- [x] 863 — COMPLETA PLUS + BVS + AÇÕES 24H CPF
- [x] 747 — COMPLETA PLUS
- [x] 697 — COMPLETA PLUS + AÇÕES 24H
- [x] 753 — COMPLETA PLUS + BVS + AÇÕES 24H CNPJ

## Critérios

- Usar somente documentos oficiais e o endpoint de homologação.
- Executar 20 amostras por padrão; usar todas quando a Sollos disponibilizar menos.
- Registrar sucesso, falhas, caminhos descobertos, estabilidade e bloqueios.
- Não aprovar sugestões nem catalogar produtos automaticamente.
- Encerrar somente após testes finais e publicação no GitHub.

## Resultado consolidado — 30/07/2026

- 30 de 30 produtos executados no ambiente de homologação.
- 560 respostas oficiais válidas no lote final.
- 0 falhas nas chamadas finais.
- 30 de 30 produtos chegaram ao Preview e à validação de origem contra destino.
- 30 de 30 produtos terminaram sem bloqueio de bases ou divergência de valor.
- Nenhuma sugestão foi aprovada e nenhum produto novo foi catalogado automaticamente.
- O produto 1079, já catalogado, foi novamente homologado e validado sem alterar seu cadastro.
- A Sollos ofereceu listas menores para 2391 (7 documentos), 2392 (5), 2502 (12) e 680 (16); todos os documentos disponíveis desses produtos foram executados.

O marcador concluído nesta lista significa que a homologação técnica foi executada e conferida. Os 29 produtos novos continuam aguardando auditoria e aprovação manual na Fábrica de Templates.

| ID | Produto | Amostras | Caminhos | Cobertura do rascunho | Validação origem → Preview |
|---:|---|---:|---:|---:|---:|
| 2451 | QUOD COMPLETO PJ + SCORE | 20 | 484 | 471/471 | 355 campos / 18 ocorrências |
| 2391 | QUOD RESTRITIVO + AÇÕES PF | 7 | 337 | 331/331 | 250 campos / 0 ocorrências |
| 2392 | QUOD RESTRITIVO + AÇÕES PJ | 5 | 347 | 340/340 | 224 campos / 1 ocorrência |
| 2450 | QUOD COMPLETO PF + SCORE | 20 | 455 | 442/442 | 370 campos / 17 ocorrências |
| 723 | MAX BRASIL AVANÇADO CPF | 20 | 397 | 387/387 | 306 campos / 60 ocorrências |
| 1723 | PROTESTO NACIONAL | 20 | 287 | 284/284 | 230 campos / 0 ocorrências |
| 2502 | PROTESTO NACIONAL PROVEDOR 2 | 12 | 274 | 271/271 | 217 campos / 0 ocorrências |
| 708 | REALTIME PREMIUM + SCR BACEN | 20 | 731 | 692/692 | 594 campos / 41 ocorrências |
| 1080 | SCR BACEN PREMIUM + SCORE | 20 | 322 | 314/314 | 236 campos / 0 ocorrências |
| 756 | TOP + | 20 | 782 | 750/750 | 642 campos / 25 ocorrências |
| 1076 | TOP BRASIL | 20 | 369 | 360/360 | 279 campos / 29 ocorrências |
| 1264 | RELATÓRIO SIMPLES - PF/PJ | 20 | 435 | 425/425 | 336 campos / 25 ocorrências |
| 1266 | REALTIME + BVS + SCORE PF/PJ | 20 | 655 | 623/623 | 533 campos / 36 ocorrências |
| 707 | REALTIME + SCORE OFICIAL PF/PJ | 20 | 383 | 373/373 | 284 campos / 38 ocorrências |
| 2259 | REALTIME PREMIUM PF/PJ | 20 | 396 | 386/386 | 305 campos / 21 ocorrências |
| 1083 | CHECK-UP CRÉDITO | 20 | 627 | 598/598 | 473 campos / 33 ocorrências |
| 1078 | COMPLETA BRASIL + SCORE CNPJ | 20 | 364 | 355/355 | 266 campos / 40 ocorrências |
| 1079 | COMPLETA BRASIL + SCORE CPF | 20 | 395 | Catálogo existente | 27 campos / 59 ocorrências |
| 680 | CENPROT + CCF BACEN | 16 | 302 | 298/298 | 233 campos / 0 ocorrências |
| 1721 | BOA VISTA ACERTA/DEFINE + SCORE | 20 | 594 | 566/566 | 476 campos / 25 ocorrências |
| 699 | CAPACIDADE CRÉDITO RATING PF/PJ | 20 | 600 | 581/581 | 483 campos / 25 ocorrências |
| 700 | CAPACIDADE CRÉDITO RATING PREMIUM + SCR BACEN | 20 | 681 | 655/655 | 557 campos / 38 ocorrências |
| 676 | COMPLETA BRASIL PREMIUM PF/PJ | 20 | 570 | 546/546 | 430 campos / 50 ocorrências |
| 1082 | COMPLETA PLUS + SCORE PF/PJ | 20 | 733 | 700/700 | 611 campos / 25 ocorrências |
| 1077 | COMPLETA PLUS PREMIUM | 20 | 641 | 619/619 | 503 campos / 25 ocorrências |
| 724 | MAX BRASIL AVANÇADO CNPJ | 20 | 364 | 355/355 | 266 campos / 47 ocorrências |
| 863 | COMPLETA PLUS + BVS + AÇÕES 24H CPF | 20 | 372 | 364/364 | 256 campos / 25 ocorrências |
| 747 | COMPLETA PLUS | 20 | 697 | 667/667 | 586 campos / 25 ocorrências |
| 697 | COMPLETA PLUS + AÇÕES 24H | 20 | 394 | 384/384 | 268 campos / 25 ocorrências |
| 753 | COMPLETA PLUS + BVS + AÇÕES 24H CNPJ | 20 | 494 | 475/475 | 386 campos / 4 ocorrências |

## Correções incorporadas à Fábrica

- Campos com o mesmo nome em estruturas diferentes agora recebem chaves únicas pelo caminho completo.
- Dívidas de Serasa, SPC, Boa Vista/SCPC e demais bases são comprovadas pela auditoria específica de ocorrências, sem gerar divergências duplicadas no relatório geral.
- CPF e CNPJ formatados ou sem pontuação são tratados como o mesmo documento.
- Datas com horário na origem e somente data no Preview são comparadas pelo mesmo dia.
- Produtos já catalogados também podem ser re-homologados pelo lote oficial.
- Ao informar qualquer um dos 30 IDs, a etapa Produto mostra a evidência da última homologação e deixa explícito que a aprovação continua sendo manual.
