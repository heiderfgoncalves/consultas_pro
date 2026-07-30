# Padrão visual Sollos baseado no produto 1079

## Objetivo

Reconstruir os relatórios Sollos com a identidade visual da Consultas PRO, usando o template 1079 como matriz protegida e mantendo integralmente os mapeamentos homologados.

## Tarefas

- [x] Identificar por que os novos templates ficaram diferentes do 1079.
- [x] Definir o 1079 como matriz visual e editorial, sem sobrescrevê-lo.
- [x] Extrair do 1079 a estrutura reutilizável de páginas, elementos, estilos e marca.
- [x] Agrupar tipos e campos em seções de negócio, sem criar uma página por tipo técnico.
- [x] Manter estruturas técnicas na auditoria, sem transformá-las em páginas do cliente.
- [x] Regenerar somente os 29 templates produzidos pela fábrica.
- [x] Comparar visualmente produtos PF, PJ e PF/PJ com o 1079.
- [x] Executar testes, verificação de tipos, renderização e auditoria de cobertura.

## Concluído quando

- [x] Os relatórios usam a marca, as cores, o cabeçalho e o rodapé do padrão Consultas PRO.
- [x] Nenhum template cresce artificialmente por causa da estrutura técnica do JSON.
- [x] Todos os campos homologados continuam inventariados e ligados ao relatório ou à auditoria.
- [x] O produto 1079 permanece intacto.

## Resultado

- O 1079 é consultado como matriz global protegida; a geração é bloqueada se a logo e os componentes oficiais não estiverem disponíveis.
- Cada página exige logo oficial, título, divisor de marca e rodapé.
- Os 29 templates privados foram regenerados no padrão `CONSULTAS_PRO_1079`.
- Os relatórios agora possuem de 2 a 7 páginas; o produto 753 passou de 17 para 6 páginas.
- A assinatura do layout do 1079 é conferida antes e depois da operação.
- A validação visual foi realizada em produtos PF, PJ e PF/PJ.
