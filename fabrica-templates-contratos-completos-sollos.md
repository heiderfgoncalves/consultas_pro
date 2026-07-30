# Fábrica de Templates — contratos completos Sollos

## Objetivo

Preparar os 30 produtos Sollos como contratos de dados completos e específicos, usando o máximo de amostras oficiais disponível, sem transformar nenhum rascunho novo em produto catalogado antes da aprovação manual.

## Decisões confirmadas

- Ambiente exclusivo: homologação Sollos.
- Usuário: administrador que audita e aprova manualmente.
- Escopo: os 30 produtos já listados no Catálogo Mestre.
- Amostragem: até 30 documentos oficiais por produto; quando houver menos, executar todos.
- Cobertura: todos os caminhos observados em todas as respostas, inclusive campos que aparecem somente em itens posteriores de listas.
- Validação: origem → mapeamento → Preview, amostra por amostra e valor por valor.
- Persistência: rascunhos da Fábrica separados dos produtos e templates definitivos.
- Catalogação: somente após aprovação manual explícita.

## Tarefas

- [x] Corrigir a consolidação para preservar a união completa de objetos e listas.
- [x] Criar auditoria em lote que valide cada JSON individual contra o Preview.
- [x] Registrar cobertura estrutural, semântica e de valores por produto.
- [x] Persistir rascunhos versionados da Fábrica fora do catálogo definitivo.
- [x] Carregar automaticamente o rascunho preparado ao informar o ID Sollos.
- [x] Permitir revisar diferenças, campos inéditos e recursos ausentes sem edição manual de JSON.
- [x] Bloquear aprovação quando qualquer amostra, caminho ou valor estiver divergente.
- [x] Executar a homologação máxima dos 30 produtos e salvar seus rascunhos.
- [x] Validar testes, lint, build, backend e fluxo visual completo.
- [x] Criar commit somente quando todos os critérios estiverem comprovados.

## Concluído quando

- [x] 30/30 produtos possuem rascunho completo e recarregável na Fábrica.
- [x] Cada rascunho informa quantidade de amostras, caminhos descobertos e cobertura.
- [x] Todas as amostras válidas possuem validação individual origem → Preview.
- [x] Nenhum produto novo foi ativado ou catalogado automaticamente.
- [x] O usuário consegue abrir um ID, auditar o trabalho pronto e decidir aprovar ou rejeitar.
