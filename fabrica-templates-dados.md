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
- [x] Bloqueio para base desconhecida, ocorrência ausente ou enviada ao destino errado.
- [x] Distinção entre divergência real e tipo que não se aplica à amostra.
- [x] Resumo final com confirmação humana nunca marcada automaticamente.
- [x] Testes unitários, lint, build e validação visual do produto 1079.

## Próximo checkpoint

- [ ] Conectar a execução gratuita de um produto novo ao endpoint de homologação.
- [ ] Gerar uma proposta inicial de tipos, filtros e campos para produto ainda desconhecido.
- [ ] Permitir refinar a proposta dentro da esteira.
- [ ] Conectar o botão final à gravação transacional do produto e de seus mapeamentos.
- [ ] Exigir nova leitura/validação após qualquer alteração antes de permitir salvar.

## Critérios de segurança

- Integração externa exclusivamente no ambiente de homologação Sollos.
- A unidade do contrato é o ID do produto, não o CPF/CNPJ utilizado no teste.
- CPF/CNPJ serve somente para obter uma amostra representativa.
- Nenhum produto é salvo automaticamente.
- Base ausente ou desconhecida bloqueia a catalogação.
- Ordem dos blocos no JSON não altera a classificação.
- Credor, contrato e valor são reconciliados no destino esperado.
- O desenho visual do relatório não faz parte desta etapa.
