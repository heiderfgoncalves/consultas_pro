## Fase 2 — Motor de containers genéricos (estilo Miro/Canva)

Objetivo: transformar cada seção numa **árvore livre** de containers e elementos, onde o usuário desenha o layout arrastando blocos para dentro de linhas, colunas e grids aninhados — com resize, reordenação, drop em qualquer nível e responsividade real.

### 1. Modelo de dados unificado

- Toda `SectionNode` passa a renderizar via um único **`ContainerNode`** raiz (não mais um switch por `kind`).
- `FieldNode` ganha papel duplo: pode ser **leaf** (text/value/icon/image/divider/table) ou **container** (`tag: "container"`, com `layout`, `columns`, `gap`, `children`).
- Adicionar em `FieldNode`:
  - `flex?: number` (peso ao longo do eixo principal — habilita resize tipo Miro)
  - `minWidth?: number`, `minHeight?: number`
  - `wrap?: boolean` (controla `flex-wrap` em row)
  - `responsive?: { stackBelow?: number }` (largura em px abaixo da qual filhos de row empilham)
- Os blocos atuais (Serasa, SPC, BACEN, Score, etc.) continuam existindo como **templates de container pré-montados** na biblioteca — passam a ser materializados como árvore de FieldNodes em vez de componentes monolíticos.

### 2. Renderer genérico

- Novo `ContainerRenderer` recursivo substitui os ramos hardcoded de `SectionRenderer`.
  - Lê `layout`/`columns`/`gap`/`align` e renderiza com flex/grid.
  - Resolve estilos via `fieldStyle`/`layoutStyle` já existentes + novos campos.
- `SectionRenderer` vira só um wrapper fino: provider de contexto + chama `ContainerRenderer` na raiz.
- Renderers especializados antigos (`SerasaTable`, `BacenBlock`, `DebtTableGeneric`, …) são preservados como **leaf renderers** acionados por `field.tag === "table"` + `meta.kind`, para não perder a formatação tabular específica.

### 3. Drag-and-drop multinível

Usando `@dnd-kit` já presente:

- **Paleta lateral** (LibraryColumn) passa a oferecer, além das seções inteiras, **primitivos**: Linha, Coluna, Grid, Texto, Valor, Ícone, Imagem, Divisor, Tabela.
- Em qualquer container renderizado, cada espaço-entre-filhos e cada container vazio vira **dropzone** com indicador visual (linha de 2px accent).
- Reordenar filhos dentro do mesmo container = `SortableContext` por container.
- Mover entre containers = `DndContext` global na seção; `onDragEnd` recoloca o nó na árvore (helper `moveNode(tree, fromPath, toPath, index)` no store).
- Soltar um primitivo da paleta = `insertNode(sectionId, parentPath, index, makeNode(type))`.

### 4. Resize ao vivo (Miro-style)

- Em containers `layout: "row"`, cada filho ganha uma **alça vertical** na borda direita (handle 4px). Drag ajusta o `flex` proporcional do filho atual e do próximo (somando para manter total) — sem biblioteca extra, listeners pointer simples.
- Em `layout: "column"`, alça horizontal análoga ajusta altura via `flex`.
- `layout: "grid"`: drag das linhas-divisórias ajusta `gridTemplateColumns` em frações.
- Tudo persiste em store; debounce 120ms para escrita.

### 5. Hotbar contextual estendida

- A `ItemHotbar` (já fixa no clique, posição inferior) detecta o tipo do nó selecionado:
  - **Container**: layout (row/col/grid), columns, gap, padding, wrap, align, background, border.
  - **Leaf**: controles atuais (fonte, cor, borda, etc.) + width/flex.
- Adicionar botões: "Envolver em container", "Duplicar", "Remover", "Mover para cima/baixo".

### 6. Responsividade real

- Wrapper de cada section observa largura via `ResizeObserver`.
- Quando `container.responsive.stackBelow` é atingido, `flex-direction` força `column` (sem mexer no modelo).
- Hotbar mostra breakpoint atual (Desktop/Tablet/Mobile) e permite preview.

### 7. Store / undo

- Operações da árvore (`insertNode`, `moveNode`, `removeNode`, `updateNode`, `resizeFlex`) centralizadas em `store.ts`.
- Histórico simples (stack de snapshots, máx 30) com Ctrl+Z / Ctrl+Shift+Z. Sem persistência do histórico.

### 8. Migração / compatibilidade

- `STORAGE_KEY` bump para `v5`.
- Migrator lê docs `v4` e converte cada section antiga numa árvore container equivalente (preservando IDs de campos).
- Serializer XML (`xml/index.ts`) atualizado para emitir `<container layout="…" flex="…" …>` recursivo.

### Arquivos afetados

- `types.ts` — novos campos em `FieldNode`.
- `store.ts` — operações de árvore + histórico + migração v4→v5.
- `components/SectionRenderer.tsx` — refatorado para usar `ContainerRenderer`.
- `components/ContainerRenderer.tsx` — **novo**, renderer recursivo + dropzones + handles de resize.
- `components/LibraryColumn.tsx` — paleta de primitivos.
- `components/ItemHotbar.tsx` — controles condicionais por tipo de nó.
- `components/SectionCard.tsx` — `DndContext` por seção, `ResizeObserver` para breakpoint.
- `xml/index.ts` — serialização recursiva.
- `mocks/index.ts` — blocos da biblioteca convertidos para árvore.

### Fora de escopo desta fase

- Free-positioning absoluto (arrastar pixel-a-pixel em canvas infinito) — continuamos no modelo flex/grid, mas com flexibilidade total dentro dele.
- Snapping a guias, multi-seleção, agrupamento.
- Templates compartilhados entre projetos.

### Como vou validar

1. Criar seção vazia → arrastar Row → arrastar Coluna dentro → arrastar Texto e Valor.
2. Redimensionar via handle entre colunas.
3. Mover um campo entre containers diferentes.
4. Reduzir largura da viewport e ver row empilhar.
5. Round-trip XML preservando árvore.
