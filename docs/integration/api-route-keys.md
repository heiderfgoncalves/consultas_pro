# Chaves de rota externa (`routeKey`) e escopos

As permissões por papel para endpoints HTTP de integração usam chaves estáveis no formato `api.<domínio>.<ação>`.

- **Fonte canônica no código:** [`backend/src/core/external-endpoints.catalog.ts`](../../backend/src/core/external-endpoints.catalog.ts)
- **Persistência:** tabela `RoleEndpointPolicy` (matriz global `Role` × `routeKey`)
- **Admin UI:** aba **Acesso API** em `/admin`

## Consultas (JWT)

| routeKey | Método | Path |
|----------|--------|------|
| `api.consultations.create` | POST | `/consultations` |
| `api.consultations.list` | GET | `/consultations` |
| `api.consultations.get` | GET | `/consultations/:id` |
| `api.consultations.mergePreview` | POST | `/consultations/merge-preview` |

## `ApiToken.scopes`

Para alinhar tokens de integração à mesma nomenclatura, use objetos JSON cujo booleano indica capacidade, por exemplo:

```json
{
  "api.consultations.create": true,
  "api.consultations.list": true
}
```

A aplicação desses escopos em middleware de token pode reutilizar as mesmas chaves do catálogo acima.
