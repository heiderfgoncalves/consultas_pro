

## Plan: Melhorar Mapeador JSON e Cards de Consultas

### Contexto
O `JsonFieldMapper` já existe com layout de 3 colunas, mas está escondido atrás do botão "Abrir Mapeador" no modal de consulta. O drag-and-drop precisa de melhorias na interação visual (sombreamento adaptativo, snap em seções, ajuste de área após soltar).

### Mudanças

#### 1. Mostrar mapeador direto ao colar JSON (IntegrationsPage.tsx)
- Remover o estado `showMapper` e o botão "Abrir Mapeador"
- Quando o campo de JSON tiver conteúdo válido, exibir automaticamente o `JsonFieldMapper` abaixo do textarea
- Manter o textarea para colar/editar JSON acima do mapeador (colapsável)
- O modal expande para `max-w-[90vw]` assim que JSON é colado

#### 2. Melhorar interação de drag-and-drop (JsonFieldMapper.tsx)
- **Sombreamento adaptativo**: Ao arrastar um tipo sobre o JSON, a seção inteira sob o mouse fica sombreada com a cor do tipo, adaptando-se ao tamanho do objeto (seção menor ou maior conforme posição do mouse)
- **Primeira vez = snap**: Na primeira vez que solta, o tipo "gruda" na seção JSON completa
- **Após soltar = ajuste livre**: Mostrar handles de resize (cima/baixo) nas bordas da região mapeada para ajustar linha a linha, sem snap automático
- **Relocar**: A região mapeada pode ser arrastada para outra posição no JSON (drag da própria região)
- **Badge no catálogo**: Ao mapear, o item na coluna do meio mostra badge com path e intervalo de linhas (ex: "PARAMETROS: L50-69")

#### 3. Preview na coluna direita (JsonFieldMapper.tsx)
- Ao selecionar uma região mapeada, a coluna direita mostra:
  - Info do tipo (label, descrição, cor)
  - Intervalo de linhas selecionado
  - Preview do trecho JSON extraído formatado
  - Controles de ajuste fino (botões +/- para start/end line)

#### 4. Cards expansíveis na aba Consultas (IntegrationsPage.tsx)
- Os cards já estão expansíveis no código atual (linhas 657-784)
- Verificar se estão funcionando corretamente e ajustar se necessário

### Arquivos
- `src/components/integrations/JsonFieldMapper.tsx` — melhorias no drag-and-drop, sombreamento, resize handles
- `src/pages/IntegrationsPage.tsx` — remover barreira do "Abrir Mapeador", mostrar mapper inline

