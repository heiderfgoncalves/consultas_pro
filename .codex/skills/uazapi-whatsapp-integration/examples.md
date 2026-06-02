# uazapiGO — exemplos de requisição (copiar e adaptar)

Substitua:

- `BASE_URL` — ex.: `https://api.uazapi.com` ou o host do seu servidor (sem barra final).
- `ADMINTOKEN` — token de administrador.
- `INSTANCE_TOKEN` — token retornado ao criar a instância (`POST /instance/init`).

Todos os bodies são JSON (`Content-Type: application/json`).

---

## 1. Criar instância (admin)

`POST {BASE_URL}/instance/init`

Header: `admintoken: ADMINTOKEN`

```json
{
  "name": "consultas-pro-prod-01",
  "systemName": "consultas-pro",
  "adminField01": "account_uuid_aqui",
  "adminField02": "opcional"
}
```

Resposta típica inclui `token` da instância (guarde como `INSTANCE_TOKEN`).

---

## 2. Conectar — QR Code (sem telefone)

`POST {BASE_URL}/instance/connect`

Header: `token: INSTANCE_TOKEN`

```json
{}
```

Use `GET /instance/status` em seguida para obter `qrcode` / `paircode` atualizados.

---

## 3. Conectar — código de pareamento (com telefone)

`POST {BASE_URL}/instance/connect`

Header: `token: INSTANCE_TOKEN`

```json
{
  "phone": "5511999999999"
}
```

`phone`: apenas dígitos, formato internacional (10–15 dígitos, ver spec).

---

## 4. Status da instância (polling)

`GET {BASE_URL}/instance/status`

Header: `token: INSTANCE_TOKEN`

Sem body.

---

## 5. Webhook por instância — modo simples (recomendado)

`POST {BASE_URL}/webhook`

Header: `token: INSTANCE_TOKEN`

```json
{
  "enabled": true,
  "url": "https://api.seudominio.com/webhooks/uazapi",
  "events": ["messages", "messages_update", "connection", "history"],
  "excludeMessages": ["wasSentByApi"]
}
```

**Anti-loop:** manter `wasSentByApi` em `excludeMessages` se a automação também envia pela API.

Com URLs dinâmicas por evento:

```json
{
  "enabled": true,
  "url": "https://api.seudominio.com/webhooks/uazapi",
  "events": ["messages", "connection"],
  "excludeMessages": ["wasSentByApi"],
  "addUrlEvents": true,
  "addUrlTypesMessages": false
}
```

---

## 6. Ler configuração atual do webhook

`GET {BASE_URL}/webhook`

Header: `token: INSTANCE_TOKEN`

Resposta: **array** (mesmo com um único webhook).

---

## 7. Webhook global (admin)

`POST {BASE_URL}/globalwebhook`

Header: `admintoken: ADMINTOKEN`

```json
{
  "url": "https://api.seudominio.com/webhooks/uazapi-global",
  "events": ["messages", "connection"],
  "excludeMessages": ["wasSentByApi"]
}
```

---

## 8. Enviar texto

`POST {BASE_URL}/send/text`

Header: `token: INSTANCE_TOKEN`

Mínimo:

```json
{
  "number": "5511999999999",
  "text": "Olá! Mensagem de teste."
}
```

Com opções comuns:

```json
{
  "number": "5511999999999",
  "text": "Segue o link https://exemplo.com",
  "linkPreview": true,
  "readchat": true,
  "delay": 1000,
  "async": false
}
```

Grupo (exemplo de destino):

```json
{
  "number": "120363012345678901@g.us",
  "text": "Mensagem para o grupo"
}
```

Placeholders (requer dados de lead/chat no lado uazapi):

```json
{
  "number": "5511999999999",
  "text": "Olá {{name}}! Podemos falar sobre seu pedido?"
}
```

---

## 9. Buscar mensagens

`POST {BASE_URL}/message/find`

Header: `token: INSTANCE_TOKEN`

Por chat:

```json
{
  "chatid": "5511999999999@s.whatsapp.net",
  "limit": 20,
  "offset": 0
}
```

Por ID de mensagem:

```json
{
  "id": "user123:r3EB0538"
}
```

Por rastreamento:

```json
{
  "track_source": "consultas-pro",
  "track_id": "msg_001",
  "limit": 50,
  "offset": 0
}
```

> A estrutura exata da resposta pode incluir `messages`, metadados de paginação, etc. Ver spec e normalizar no client (ex.: `uazapi.client.ts`).

---

## 10. Baixar mídia de uma mensagem

`POST {BASE_URL}/message/download`

Header: `token: INSTANCE_TOKEN`

```json
{
  "id": "7EB0F01D7244B421048F0706368376E0",
  "return_base64": true,
  "return_link": true,
  "generate_mp3": true,
  "transcribe": false
}
```

Áudio com transcrição (OpenAI — chave pode estar na instância):

```json
{
  "id": "7EB0F01D7244B421048F0706368376E0",
  "transcribe": true
}
```

---

## 11. Buscar chats

`POST {BASE_URL}/chat/find`

Header: `token: INSTANCE_TOKEN`

Exemplo mínimo (ajuste `limit` / filtros conforme spec):

```json
{
  "limit": 20,
  "offset": 0,
  "operator": "AND",
  "sort": "-wa_lastMsgTimestamp"
}
```

Filtro por nome (LIKE implícito na spec):

```json
{
  "wa_contactName": "Maria",
  "limit": 10,
  "offset": 0
}
```

---

## 12. Desconectar

`POST {BASE_URL}/instance/disconnect`

Header: `token: INSTANCE_TOKEN`

Sem body (ou `{}` conforme implementação do servidor).

---

## 13. Deletar instância

`DELETE {BASE_URL}/instance`

Header: `token: INSTANCE_TOKEN`

---

## Exemplo cURL (criar instância)

```bash
curl -sS -X POST "${BASE_URL}/instance/init" \
  -H "Content-Type: application/json" \
  -H "admintoken: ${ADMINTOKEN}" \
  -d '{"name":"teste-cli"}'
```

## Exemplo cURL (enviar texto)

```bash
curl -sS -X POST "${BASE_URL}/send/text" \
  -H "Content-Type: application/json" \
  -H "token: ${INSTANCE_TOKEN}" \
  -d '{"number":"5511999999999","text":"ping"}'
```

---

## Payload ilustrativo de webhook (entrada no seu backend)

O formato exato varia por evento; trate como semi-estruturado e valide no handler.

```json
{
  "event": "message",
  "instance": "id_da_instancia_uazapi",
  "data": {}
}
```

Implementações devem usar o schema em `docs/integration/uazapi/spec/components/schemas/WebhookEvent.yaml` e exemplos reais capturados (ex. webhook.cool) para cada `event` usado.
