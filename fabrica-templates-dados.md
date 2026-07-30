# Fábrica de Templates — Esteira de dados Sollos

## Objetivo

Catalogar os produtos Sollos por ID, reproduzindo seus dados com fidelidade antes da etapa de desenho visual.

## Entregue neste checkpoint

- [x] Entrada “Fábrica de Templates” em Admin > Integrações.
- [x] Esteira com seis páginas: Produto, Amostra, Mapeamento, Preview, Validação e Catalogação.
- [x] Escolha por ID e reutilização do JSON salvo ou de logs homologados.
- [x] Comparação entre JSON original, DE, PARA e entrada da Templates Drawer.
- [x] Prova campo a campo entre caminho de origem e valor no Preview.
- [x] Classificação individual das ocorrências financeiras:
  - BASE I → Serasa → `DIVIDAS_SERASA`
  - BASE II → SPC Brasil → `DIVIDAS_SPC`
  - BASE III → Boa Vista/SCPC → `DIVIDAS_BOA_VISTA`
  - BASE IV → QUOD → `DIVIDAS_QUOD`
- [x] Catálogo Mestre com os 30 produtos solicitados e seus IDs oficiais.
- [x] Documentos oficiais de homologação organizados por produto, com limite real informado quando a Sollos oferece menos de dez.
- [x] Lote adaptativo de 10, 20 ou 30 amostras, executado em sequência e somente na homologação.
- [x] Consolidação estrutural das amostras e separação automática das quatro bases de dívidas.
- [x] Descoberta de estruturas inéditas como tipos provisórios, sempre sujeita à revisão humana.
- [x] Gravação final transacional, com produto inicialmente inativo e rollback integral em caso de falha.
- [x] Bloqueio para base desconhecida, ocorrência ausente ou enviada ao destino errado.
- [x] Distinção entre divergência real e tipo que não se aplica à amostra.
- [x] Resumo final com confirmação humana nunca marcada automaticamente.
- [x] Testes unitários, lint, build e validação visual do produto 1079.

## Próximo checkpoint

- [ ] Auditar e aprovar manualmente cada produto pela própria Fábrica.
- [ ] Desenhar os relatórios aprovados na Templates Drawer, sem alterar seus contratos de dados.

## Critérios de segurança

- Integração externa exclusivamente no ambiente de homologação Sollos.
- A unidade do contrato é o ID do produto, não o CPF/CNPJ utilizado no teste.
- CPF/CNPJ serve somente para obter uma amostra representativa.
- Nenhum produto é salvo automaticamente.
- Base ausente ou desconhecida bloqueia a catalogação.
- Ordem dos blocos no JSON não altera a classificação.
- Credor, contrato e valor são reconciliados no destino esperado.
- O desenho visual do relatório não faz parte desta etapa.
