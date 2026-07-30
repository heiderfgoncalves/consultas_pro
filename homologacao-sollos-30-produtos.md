# Homologação Sollos — 30 produtos

## Objetivo

Preparar contratos de dados completos e específicos para os 30 produtos solicitados, usando somente a homologação da Sollos e sem catalogação automática.

Cada rascunho preserva a cadeia:

1. JSON original Sollos;
2. DE idêntico ao original;
3. mapeamento integral;
4. PARA entregue ao Preview e à Templates Drawer;
5. prova por amostra, caminho, valor e ocorrência;
6. aprovação manual antes de qualquer alteração no catálogo definitivo.

## Resultado consolidado — 30/07/2026

- 30/30 produtos possuem rascunho técnico versionado e recarregável na Fábrica de Templates.
- 817/817 respostas oficiais de homologação foram validadas.
- 14.142/14.142 caminhos de dados observados possuem destino no Preview.
- 334.005 valores de campos foram conferidos da origem ao Preview.
- 2.132 ocorrências de dívidas foram conferidas integralmente e separadas por base.
- 0 amostras inválidas.
- 0 campos divergentes.
- 0 ocorrências ausentes ou em base errada.
- 0 caminhos sem destino.
- 30/30 rascunhos estão em `READY_FOR_MANUAL_REVIEW`.
- Nenhum rascunho foi catalogado ou ativado automaticamente.

A quantidade máxima foi de 30 respostas por produto. Quando a lista gratuita oficial tinha menos documentos, todos foram executados: 2259 (27), 680 (16), 2502 (12), 2391 (7) e 2392 (5).

O 1079 já existia no catálogo, mas sua configuração anterior cobria apenas parte do JSON completo. A Fábrica gerou um rascunho técnico de atualização com 392/392 caminhos, sem alterar o cadastro atual.

## Evidências por produto

| ID | Produto | JSONs válidos | Caminhos estruturais | Cobertura | Valores conferidos | Ocorrências |
|---:|---|---:|---:|---:|---:|---:|
| 2451 | QUOD COMPLETO PJ + SCORE | 30/30 | 484 | 471/471 | 10.695 | 21 |
| 2391 | QUOD RESTRITIVO + AÇÕES PF | 7/7 | 337 | 331/331 | 2.211 | 0 |
| 2392 | QUOD RESTRITIVO + AÇÕES PJ | 5/5 | 347 | 340/340 | 1.566 | 1 |
| 2450 | QUOD COMPLETO PF + SCORE | 30/30 | 455 | 442/442 | 12.385 | 27 |
| 723 | MAX BRASIL AVANÇADO CPF | 30/30 | 406 | 395/395 | 11.185 | 116 |
| 1723 | PROTESTO NACIONAL | 30/30 | 287 | 284/284 | 8.078 | 0 |
| 2502 | PROTESTO NACIONAL PROVEDOR 2 | 12/12 | 274 | 271/271 | 3.174 | 0 |
| 708 | REALTIME PREMIUM + SCR BACEN | 30/30 | 731 | 692/692 | 15.810 | 97 |
| 1080 | SCR BACEN PREMIUM + SCORE | 30/30 | 322 | 314/314 | 9.140 | 0 |
| 756 | TOP + | 30/30 | 782 | 750/750 | 13.213 | 50 |
| 1076 | TOP BRASIL | 30/30 | 381 | 371/371 | 10.816 | 99 |
| 1264 | RELATÓRIO SIMPLES - PF/PJ | 30/30 | 435 | 425/425 | 9.780 | 57 |
| 1266 | REALTIME + BVS + SCORE PF/PJ | 30/30 | 655 | 623/623 | 14.936 | 124 |
| 707 | REALTIME + SCORE OFICIAL PF/PJ | 30/30 | 383 | 373/373 | 10.412 | 46 |
| 2259 | REALTIME PREMIUM PF/PJ | 27/27 | 396 | 386/386 | 9.119 | 22 |
| 1083 | CHECK-UP CRÉDITO | 30/30 | 627 | 598/598 | 15.867 | 114 |
| 1078 | COMPLETA BRASIL + SCORE CNPJ | 30/30 | 364 | 355/355 | 10.400 | 55 |
| 1079 | COMPLETA BRASIL + SCORE CPF | 30/30 | 404 | 392/392 | 12.672 | 206 |
| 680 | CENPROT + CCF BACEN | 16/16 | 302 | 298/298 | 4.378 | 0 |
| 1721 | BOA VISTA ACERTA/DEFINE + SCORE | 30/30 | 594 | 566/566 | 12.825 | 43 |
| 699 | CAPACIDADE CRÉDITO RATING PF/PJ | 30/30 | 600 | 581/581 | 13.364 | 25 |
| 700 | CAPACIDADE CRÉDITO RATING PREMIUM + SCR BACEN | 30/30 | 681 | 655/655 | 15.079 | 64 |
| 676 | COMPLETA BRASIL PREMIUM PF/PJ | 30/30 | 582 | 557/557 | 14.673 | 273 |
| 1082 | COMPLETA PLUS + SCORE PF/PJ | 30/30 | 781 | 748/748 | 15.952 | 140 |
| 1077 | COMPLETA PLUS PREMIUM | 30/30 | 641 | 619/619 | 15.591 | 210 |
| 724 | MAX BRASIL AVANÇADO CNPJ | 30/30 | 364 | 355/355 | 10.794 | 89 |
| 863 | COMPLETA PLUS + BVS + AÇÕES 24H CPF | 30/30 | 385 | 376/376 | 10.748 | 44 |
| 747 | COMPLETA PLUS | 30/30 | 745 | 715/715 | 14.854 | 76 |
| 697 | COMPLETA PLUS + AÇÕES 24H | 30/30 | 394 | 384/384 | 11.471 | 113 |
| 753 | COMPLETA PLUS + BVS + AÇÕES 24H CNPJ | 30/30 | 494 | 475/475 | 12.817 | 20 |

## Garantias incorporadas à Fábrica

- A consolidação estrutural usa todos os itens das listas, inclusive campos que aparecem somente em respostas ou posições posteriores.
- Todo campo novo começa como texto fiel à origem; formatações não são inferidas a partir de uma única amostra.
- CPF/CNPJ com ou sem máscara são comparados pelo mesmo documento.
- Datas com horário e datas exibidas no Preview são comparadas pelo mesmo dia.
- Números com separador de milhar são comparados pelo valor numérico.
- Dívidas são roteadas ocorrência por ocorrência: Base I → Serasa, Base II → SPC, Base III → Boa Vista/SCPC e Base IV → Quod.
- Todos os campos de cada ocorrência de dívida são preservados e comprovados, não apenas credor, contrato e valor.
- Metadados dos blocos de dívida permanecem separados das ocorrências canônicas, evitando duplicação.
- Tipos e mapeamentos são reaproveitados somente de produtos Sollos.
- Um único JSON divergente bloqueia o salvamento do rascunho.
- Produtos já catalogados podem receber um rascunho de atualização sem alteração automática do catálogo.
- A Fábrica mostra os campos exatos de origem e Preview quando há divergência.

## Estado de aprovação

Todos os itens deste relatório são rascunhos técnicos. A catalogação definitiva, a atualização do 1079 e o desenho visual dos relatórios continuam dependendo de leitura e aprovação manual na Fábrica de Templates.
