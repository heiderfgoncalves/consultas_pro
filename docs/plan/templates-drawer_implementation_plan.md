# Unificação Estrutural: Dados do Template Drawer via Chaves Tipadas

## Contexto do Problema

O Template Drawer atualmente consome dados do JSON bruto do provedor usando os **caminhos de origem** (ex: `CREDCADASTRAL.PEND_FINANCEIRAS.OCORRENCIAS.VALOR`), quando deveria usar as **chaves dos campos tipados** (ex: `valor`, `contrato`, `origem`) definidas em [integrations.ts](file:///consultas-pro-app/frontend/src/types/integrations.ts#L34-L42).

### Problemas identificados:

1. **Campos fantasmas**: `{$DIVIDAS_SPC.quantidade}` aparece sem ter sido configurado (hardcoded em [LeftPanel.tsx:339-351](file:///consultas-pro-app/frontend/src/features/templates-drawer/components/LeftPanel.tsx#L339-L351))
2. **Console mostra JSON bruto**: Ao digitar `$DIVIDAS_SPC.linhas`, exibe a hierarquia nested do JSON de origem (`CREDCADASTRAL.PEND_FINANCEIRAS.OCORRENCIAS...`) ao invés dos campos tipados planos (`valor`, `contrato`, etc.)
3. **Sugestões de autocomplete incompletas/erradas**: As sugestões derivam de [getFlatPathsForCatalog](file:///consultas-pro-app/frontend/src/features/templates-drawer/components/LeftPanel.tsx#L75-L98) que percorre o `dataJson` bruto, ao invés de derivar dos campos configurados
4. **Uso da função errada**: [buildTypeLinkedConsultationMappedPreview](file:///consultas-pro-app/frontend/src/lib/consultationMappedPreview.ts#L193-L343) é projetada para a **aba Tipos da página de Integrações** (mostra hierarquia do JSON de origem). O Templates Drawer precisa de uma estrutura plana por **chaves "para"**

### Fluxo correto desejado:

```
[JSON do Provedor] → [Tipo configura de-para] → [Template Drawer consome "para"]

Exemplo:
  "de": CREDCADASTRAL.PEND_FINANCEIRAS.OCORRENCIAS.VALOR  →  "para": valor (Currency)
  "de": CREDCADASTRAL.PEND_FINANCEIRAS.OCORRENCIAS.DATA_VENCIMENTO  →  "para": data_ocorrencia (Date)
```

Resultado esperado no `dataJson` do editor:
```json
{
  "DIVIDAS_SPC": {
    "linhas": [
      { "data_ocorrencia": "01/10/2025", "data_inclusao": "30/03/2026", "origem": "SAO PAULO...", "contrato": "BBH0210...", "valor": "R$ 231,19" }
    ],
    "totaisCalculados": {
      "total": "R$ 14.877,35"
    }
  }
}
```

---

## Proposed Changes

### 1. Novo processador canônico para o Template Drawer

#### [NEW] [buildTypeKeyedDataForDrawer.ts](file:///consultas-pro-app/frontend/src/lib/buildTypeKeyedDataForDrawer.ts)

Nova função modular `buildTypeKeyedDataForDrawer` que:

- Recebe os mesmos inputs de `buildTypeLinkedConsultationMappedPreview` (sampleResponse, trechoMappings, fieldType, typeItemFilterConfig)
- Reutiliza a mesma infraestrutura de filtragem (`formatDeepFilteredValueAtPath`, `countActiveTypeItemRules`)
- Reutiliza `collectValuesAtPath`, `formatMappedPreviewValue`, `aggregateComputedFieldValue`
- **Diferença fundamental**: usa `reportField.key` como chave de saída (o "para") ao invés de `fullPathKey` (o "de")
- Aplica deduplicação por `dedupFieldIds`
- Retorna um **objeto JS** (não string JSON): `{ linhas: Record<string, unknown>[], totaisCalculados: Record<string, unknown> }` ou `Record<string, unknown>` para tipos escalares

```typescript
// Assinatura da nova função
export function buildTypeKeyedDataForDrawer(params: {
  sampleResponse: string;
  trechoMappings: FieldMapping[];
  fieldType: ConsultationFieldType;
  typeItemFilterConfig: TypeItemFilterConfig;
}): { linhas: Record<string, unknown>[]; totaisCalculados: Record<string, unknown> } | Record<string, unknown> | null;
```

---

### 2. Atualizar `mergeAndApplyPayloads` no LeftPanel

#### [MODIFY] [LeftPanel.tsx](file:///consultas-pro-app/frontend/src/features/templates-drawer/components/LeftPanel.tsx)

**Linhas ~505-526**: Substituir chamada a `buildTypeLinkedConsultationMappedPreview` por `buildTypeKeyedDataForDrawer`:

```diff
-const previewStr = buildTypeLinkedConsultationMappedPreview({...});
-let parsedVal = JSON.parse(previewStr);
+const parsedVal = buildTypeKeyedDataForDrawer({...});
```

Remover o bloco de fallback com `quantidade: 0` hardcoded (linhas 517-522).

---

### 3. Corrigir `dynamicFieldTypes` — remover campos fantasmas

#### [MODIFY] [LeftPanel.tsx](file:///consultas-pro-app/frontend/src/features/templates-drawer/components/LeftPanel.tsx)

**Linhas ~336-352**: Remover o bloco que injeta `total` e `quantidade` incondicionalmente. Substituir por lógica que:

1. Lê os `computedFields` dos `typeItemFilterConfig` das **consultas ativas** (selecionadas no painel)
2. Adiciona APENAS os campos calculados que foram realmente configurados na integração
3. Referência cada computed field pela sua `key` (ex: `total`)

```typescript
// ANTES (errado):
if (isListType) {
  calculatedFields.push({ key: "total", ... });     // ❌ hardcoded
  calculatedFields.push({ key: "quantidade", ... }); // ❌ fantasma
}

// DEPOIS (correto):
// Coleta computedFields das consultas ativas que mapeiam este tipo
const activeComputedFields = collectActiveComputedFieldsForType(ft.key, consultations, selectedConsultaIds);
for (const comp of activeComputedFields) {
  calculatedFields.push({
    id: `${ft.key}.${comp.key}`,
    key: comp.key,
    expression: `{$${ft.key}.${comp.key}}`,
    label: comp.label,
  });
}
```

---

### 4. Unificar autocomplete com a mesma fonte de dados

#### [MODIFY] [AutocompleteFields.tsx](file:///consultas-pro-app/frontend/src/features/templates-drawer/components/AutocompleteFields.tsx)

Nenhuma mudança no componente em si — ele já consome `availableVariables` da store. A correção upstream (item 3) garante que `dynamicFieldTypes` passa as variáveis corretas → `setAvailableVariables` propaga para o autocomplete automaticamente.

**Validação**: Após a correção, o autocomplete ao digitar `{{` deverá sugerir:
- `DIVIDAS_SPC.data_ocorrencia`
- `DIVIDAS_SPC.data_inclusao`
- `DIVIDAS_SPC.origem`
- `DIVIDAS_SPC.contrato`
- `DIVIDAS_SPC.valor`
- `DIVIDAS_SPC.total` (se computedField configurado)

E **NÃO** deverá sugerir `DIVIDAS_SPC.quantidade` (pois não foi configurado).

---

### 5. O console já resolve corretamente

#### [SEM ALTERAÇÃO] [resolveExpression.ts](file:///consultas-pro-app/frontend/src/features/templates-drawer/engine/resolveExpression.ts)

O `resolveExpression` já tem fallback para buscar em `totaisCalculados` e `linhas` (linhas 78-109). Com o `dataJson` correto (chaves tipadas planas), ele resolverá:

- `$DIVIDAS_SPC.total` → busca em `DIVIDAS_SPC.totaisCalculados.total` → `"R$ 14.877,35"` ✓
- `$DIVIDAS_SPC.valor` → busca em `DIVIDAS_SPC.linhas[*].valor` → `["R$ 231,19", ...]` ✓
- `$DIVIDAS_SPC.linhas` → retorna o array de linhas ✓

---

### 6. Ajustar `getFlatPathsForCatalog` no modo "ALL"

#### [MODIFY] [LeftPanel.tsx](file:///consultas-pro-app/frontend/src/features/templates-drawer/components/LeftPanel.tsx)

Quando `showAllFields` está ativado, a função `getFlatPathsForCatalog` percorre o `dataJson`. Com o `dataJson` agora usando chaves tipadas, os paths retornados serão automaticamente os paths tipados (ex: `DIVIDAS_SPC.linhas[*].valor`), e não mais os paths brutos do JSON de origem.

Nenhuma mudança de lógica necessária — a correção do `dataJson` corrige automaticamente.

---

## User Review Required

> [!IMPORTANT]
> **Impacto na aba "Dados" do console**: A aba "Dados (JSON)" do BottomConsole exibe o `dataJson` diretamente. Após esta mudança, ela mostrará a estrutura tipada plana (com chaves como `valor`, `contrato`) ao invés da hierarquia aninhada do JSON de origem (`CREDCADASTRAL.PEND_FINANCEIRAS...`). **Isso é o comportamento desejado?**

> [!WARNING]
> **Tipos sem `typeItemFilterConfig`**: Se uma consulta mapeia trechos a um tipo (via fieldMappings na aba Consultas), mas NÃO tem `typeItemFilterConfig` configurado para esse tipo (sem de-para de campos), a nova função retornará `null` para esse tipo no `dataJson`. Antes, o código fazia dump do JSON bruto. A opção A (aprovada anteriormente) é tratá-lo como vazio.

---

## Verification Plan

### Automated Tests
1. Verificar no navegador:
   - Abrir Template Drawer com uma consulta que possui tipo DIVIDAS_SPC configurado
   - Verificar que "Tipos e Campos" mostra APENAS: `data_ocorrencia`, `data_inclusao`, `origem`, `contrato`, `valor`, `total`
   - Verificar que `quantidade` NÃO aparece
   - Verificar no console que `$DIVIDAS_SPC.total` resolve para `"R$ 14.877,35"`
   - Verificar que autocomplete sugere apenas campos configurados
   - Verificar aba "Dados" mostra estrutura tipada

### Manual Verification
- Comparar os dados na aba `/integracoes?aba=tipos` com os dados no Template Drawer — devem ser idênticos em conteúdo, apenas organizados por chaves "para" no drawer
