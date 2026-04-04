# Plano: critérios por consulta + tipo (Integrações)

## Resumo do problema

Na página **Integrações**, os **critérios de filtro** (por trecho/tipo canônico) são configurados no fluxo da aba **Consultas** via `JsonFieldMapper`, alimentado por **`globalTypeFilters`**: um `Record<fieldTypeKey, MappingItemFilter[]>` **único para todo o estado da página**, espelhando o catálogo canônico (`CanonicalField` / `uiItemFilters`).

**Comportamento incorreto observado:** ao abrir a aba **Tipos**, **todos os cards** de consultas vinculadas àquele tipo mostram **os mesmos critérios**, porque o fallback é `globalTypeFilters[selectedFieldType]` — ou seja, o critério “parece do tipo” e **replica para todas as consultas**, em vez de refletir **apenas a consulta em que foi definido**.

**Modelagem esperada (produto):** critérios devem estar vinculados a **consulta (produto) + tipo (field type)**, não a um estado global por tipo compartilhado entre todas as consultas.

---

## Causa raiz (atual)

| Aspecto | Situação no código |
|--------|---------------------|
| Estado principal na edição | `ConsultationEditor` recebe `typeFilters={globalTypeFilters}` e `onTypeFiltersChange` → `handleGlobalTypeFiltersChange`, que persiste em **`CanonicalFieldCatalog.uiItemFilters`** via `patchCanonicalFieldApi` para cada tipo alterado. |
| Efeito | Qualquer edição na aba Consultas **atualiza o canônico do tipo**; todas as consultas que usam aquele tipo **herdam o mesmo conjunto de regras** na UI e no backend canônico. |
| Aba Tipos | `LinkedConsultationCard` usa `initialFilters={pc.typeItemFilters?.[tipo] ?? globalTypeFilters[tipo] ?? []}`. O fallback **global** faz todos os cards do mesmo tipo exibirem a **mesma lista** quando `pc.typeItemFilters` não está preenchido a partir da API. |
| Persistência por consulta | `ProviderConsultation.typeItemFilters` existe no tipo TypeScript, mas **`mapApiProduct` não hidrata** esse campo; **não há** coluna JSON em `ProviderProduct` no Prisma para armazenar filtros por produto+tipo. A persistência real está só no **canônico**, que é **por tipo**, não por consulta. |

**Conclusão:** o bug não é “sumir” critério — é **contaminação global por tipo**: a fonte de verdade implementada hoje é **canônica por tipo**, incompatível com o requisito **por consulta + tipo**.

---

## Arquivos e camadas afetados

| Camada | Arquivo / local | Papel |
|--------|-----------------|--------|
| UI página | `frontend/src/pages/IntegrationsPage.tsx` | `globalTypeFilters`, `handleGlobalTypeFiltersChange`, `useEffect` que copia `fieldTypes` → global, passagem de props para `ConsultationEditor` e `LinkedConsultationCard` |
| Mapeador | `frontend/src/components/integrations/JsonFieldMapper.tsx` | `typeFilters` / `onTypeFiltersChange` assumem um mapa por **tipo**, sem `productId` |
| API cliente | `frontend/src/api/admin-integrations.ts` | `mapApiProduct` — incluir mapeamento de filtros por produto; `patchProduct` / schemas conforme contrato |
| Tipos TS | `frontend/src/types/integrations.ts` | `ProviderConsultation.typeItemFilters` como `Record<fieldTypeKey, rules>` |
| Backend | `prisma/schema.prisma` (`ProviderProduct`), rotas admin de produto, Zod em `admin.schemas.ts` | Novo campo (ex.: JSON `itemFiltersByCanonicalPath` ou nome alinhado ao domínio) + leitura/escrita no PATCH de produto |
| Canônico (decisão) | `CanonicalFieldCatalog.uiItemFilters` | Definir se vira **default** opcional, deprecado na UI de Consultas, ou removido do fluxo de mapeamento — evitar duas fontes conflitantes |

---

## Abordagem de correção (objetiva)

1. **Persistência:** armazenar critérios **no produto (consulta)** como JSON estruturado por chave do tipo canônico (ex.: `Record<pathKey, MappingItemFilter[]>`), com **migração Prisma** e exposição nas APIs GET/PATCH de produto já usadas pelo admin.
2. **Hidratação:** estender `mapApiProduct` para preencher `ProviderConsultation.typeItemFilters` a partir do novo campo; garantir que a aba Tipos use **primariamente** `pc.typeItemFilters[tipo]` **sem** fallback para o global do canônico para “herdar” critério entre consultas (fallback só se produto for definido como “usar default do tipo” — opcional).
3. **Aba Consultas:** ao editar uma consulta específica, passar para `JsonFieldMapper` os filtros **daquela consulta** (ex.: derivados de `form.typeItemFilters` ou equivalente), e `onChange` deve atualizar **só o produto em edição** (e PATCH de produto), **não** `patchCanonicalFieldApi` em massa por tipo.
4. **Estado global `globalTypeFilters`:** reduzir papel — pode ser removido ou limitado a **defaults** lidos do canônico para novas consultas; não deve ser a única fonte durante edição de múltiplas consultas.
5. **Aba Tipos:** `LinkedConsultationCard` continua com `initialFilters` vindos **da consulta**; opcional: persistir edições no card via `onSave`/`patchProduct` se o card for editável (hoje há risco de estado só local — alinhar com produto).
6. **Compatibilidade:** migrar dados existentes em `CanonicalFieldCatalog.uiItemFilters` para o primeiro produto que “precisar” ou documentar cópia manual — decisão de negócio (script one-off vs. default no canônico copiado na primeira criação de consulta).

---

## Critérios de validação

- [ ] Configurar critérios diferentes na aba **Consultas** para **duas consultas distintas** que compartilham o **mesmo tipo**; na aba **Tipos**, cada card mostra **apenas** os critérios daquela consulta (não replica o do outro).
- [ ] Recarregar a página: critérios persistem **por produto**, não desaparecem nem se igualam entre consultas por efeito do canônico.
- [ ] O canônico **não** é mais atualizado ao salvar critérios a partir do editor de uma consulta isolada (a menos que se mantenha explicitamente um fluxo “default do tipo” separado).
- [ ] `npm run lint` e `npx tsc --noEmit` no `frontend` sem erros; migração Prisma aplicável e rotas admin cobrindo o novo campo.

---

## Riscos

| Risco | Mitigação |
|-------|-----------|
| Duas fontes (canônico vs produto) durante a transição | Regra única na UI: edição na consulta grava só produto; documentar o papel do canônico como default ou deprecar no mapeador. |
| Volume JSON no produto | Limites de tamanho e validação Zod dos filtros. |
| Dados legados só no canônico | Plano de migração ou UX “importar defaults do tipo” uma vez por consulta. |

---

*Plano revisado conforme requisito: critérios vinculados a **tipo + consulta**, não globais por tipo. Implementação deliberadamente fora deste documento.*
