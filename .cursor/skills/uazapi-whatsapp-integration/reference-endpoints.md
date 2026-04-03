# uazapiGO — mapa rápido de rotas

Base: `https://{subdomain}.uazapi.com` (ex.: `api`, `free` — ver `servers` em `openapi.yaml`).

Legenda: **A** = header `admintoken` | **T** = header `token` da instância.

## Administração

| Método | Caminho | Auth | Notas |
|--------|---------|------|--------|
| POST | `/instance/init` | A | Cria instância; resposta inclui `token` da instância |
| GET | `/instance/all` | A | Lista instâncias |
| GET/POST | `/globalwebhook` | A | Webhook para todas as instâncias |
| POST | `/admin/restart` | A | Reinício (ver spec) |

## Ciclo de vida da instância

| Método | Caminho | Auth | Notas |
|--------|---------|------|--------|
| POST | `/instance/connect` | T | Body opcional `{ "phone": "5511..." }` → pair code; sem phone → QR |
| GET | `/instance/status` | T | Poll de QR/pair/status |
| POST | `/instance/disconnect` | T | Encerra sessão; novo login depois |
| DELETE | `/instance` | T | Remove instância |
| POST | vários `/instance/update*` | T | Nome, campos admin, chatbot, delay, privacy, presence, proxy, fieldsMap |

## Webhook e tempo real

| Método | Caminho | Auth | Notas |
|--------|---------|------|--------|
| GET/POST | `/webhook` | T | Config por instância; GET retorna array |
| GET | `/sse` | (ver spec) | SSE; query `token` + `events` |

## Enviar mensagem

| Método | Caminho | Auth |
|--------|---------|------|
| POST | `/send/text` | T |
| POST | `/send/media` | T |
| POST | `/send/contact` | T |
| POST | `/send/location` | T |
| POST | `/send/status` | T |
| POST | `/send/menu` | T |
| POST | `/send/carousel` | T |
| POST | `/send/location-button` | T |
| POST | `/send/request-payment` | T |
| POST | `/send/pix-button` | T |

## Mensagens (ações e busca)

| Método | Caminho | Auth |
|--------|---------|------|
| POST | `/message/find` | T |
| POST | `/message/download` | T |
| POST | `/message/markread` | T |
| POST | `/message/presence` | T |
| POST | `/message/react` | T |
| POST | `/message/delete` | T |
| POST | `/message/edit` | T |

## Chats, contatos, etiquetas

| Método | Caminho | Auth |
|--------|---------|------|
| POST | `/chat/find` | T |
| POST | `/chat/details` | T |
| POST | `/chat/editLead` | T |
| POST | `/chat/read`, `/chat/mute`, `/chat/pin`, `/chat/archive`, `/chat/delete` | T |
| POST | `/chat/block`, `/chat/blocklist` | T |
| POST | `/chat/labels` | T |
| GET/POST | `/contacts`, `/contacts/list` | T |
| POST | `/contact/add`, `/contact/remove` | T |
| GET/POST | `/labels`, `/label/edit` | T |

## Grupos e comunidades

| Método | Caminho | Auth |
|--------|---------|------|
| POST | `/group/create`, `/group/info`, `/group/list`, ... | T |
| POST | `/community/create`, `/community/editgroups` | T |

## Perfil, negócio, chamadas

| Método | Caminho | Auth |
|--------|---------|------|
| POST | `/profile/name`, `/profile/image` | T |
| GET/POST | `/business/*` | T (experimental) |
| POST | `/call/make`, `/call/reject` | T |

## Chatbot / IA / campanhas (avançado)

| Método | Caminho | Auth |
|--------|---------|------|
| POST | `/agent/edit`, `/agent/list` | T |
| POST | `/trigger/edit`, `/trigger/list` | T |
| POST | `/knowledge/edit`, `/knowledge/list` | T |
| POST | `/function/edit`, `/function/list` | T |
| POST | `/sender/*` | T |
| POST | `/chatwoot/config` | T (beta) |

Para corpo de request, códigos de resposta e descrições completas, abrir o fragmento em `docs/integration/uazapi/spec/paths/<nome>.yaml` correspondente.
