# OpenAPI (Swagger) — Consultas Pró

## Objetivo

Expor a especificação **OpenAPI 3** da API REST para integração e testes, com UI Swagger apenas para perfis autorizados na aplicação web.

## Quick start

1. Faça login na aplicação com um usuário **COMPANY_MANAGER**, **COMPANY_OWNER** ou **PLATFORM_ADMIN**.
2. Abra **Documentação API** no menu lateral (rota `/documentacao/api`).
3. A interface carrega `GET /openapi.json` usando o token da sessão automaticamente nas requisições.

## URL da especificação

| Ambiente | Endpoint |
|----------|----------|
| API | `GET {APP_URL}/openapi.json` |

Substitua `{APP_URL}` pela URL base configurada em `APP_URL` no backend (equivalente a `VITE_API_URL` no frontend).

## Autenticação e papéis

| Requisito | Detalhe |
|-----------|---------|
| **Acesso à spec** | JWT válido no header `Authorization: Bearer <token>`. |
| **Papéis permitidos** | `PLATFORM_ADMIN`, `COMPANY_OWNER`, `COMPANY_MANAGER`. |
| **Papel excluído** | `USER` (operador) não recebe a spec nem a página da UI. |

Rotas públicas documentadas (ex.: `POST /auth/login`) não exigem token na spec; demais endpoints devem usar o esquema **bearerAuth** quando documentados.

## Formato das respostas

A API segue o envelope definido em `backend/src/core/http.ts`:

- Sucesso: `{ "success": true, "data": ... }`
- Erro: `{ "success": false, "error": { "code", "message", "details?" } }`

## Limitações (escopo atual)

- A documentação é **incremental**: nem todas as rotas aparecem na spec na primeira entrega.
- Prioridade de expansão: módulos em `backend/src/modules/` recebendo `schema` Fastify alinhado ao OpenAPI.

## Documentação relacionada

- Visão geral de APIs: [Documentação técnica de back-end](../arquitetura/backend.md).

## Licença

UNLICENSED (projeto privado).
