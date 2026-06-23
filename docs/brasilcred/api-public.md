# Brasil Cred — Public REST API v1

Reference completa para parceiros integrando com a API de consultas Brasil Cred.

- **Base URL:** `https://sets.brasilcred.com.br/functions/v1/api-gateway/api/v1`
- **Authentication:** `Authorization: Bearer bc_live_…` ou `X-API-Key: bc_live_…`
- **Content-Type (POST):** `application/json`
- **Error format:** [RFC 7807 Problem Details](https://www.rfc-editor.org/rfc/rfc7807) (`application/problem+json`)
- **Rate limit:** 60 requests / minute por token
- **Token lifetime:** permanente (sem TTL); revogue pelo dashboard quando quiser
- **Idempotency:** obrigatório em todo `POST /consult/*` (header `Idempotency-Key`, janela de 24h)
- **Request correlation:** todo response carrega `X-Request-ID` (header) + `request_id` (body em erros)

---

## Índice

1. [Quickstart](#1-quickstart)
2. [Authentication](#2-authentication)
3. [Request Correlation](#3-request-correlation)
4. [Idempotency](#4-idempotency)
5. [Errors](#5-errors)
6. [Sanitization & PII](#6-sanitization--pii)
7. [Rate Limits](#7-rate-limits)
8. [Endpoint Reference — Credit](#8-endpoint-reference--credit)
9. [Endpoint Reference — Scores & Bureaus](#9-endpoint-reference--scores--bureaus)
10. [Endpoint Reference — Restrições & Pendências](#10-endpoint-reference--restrições--pendências)
11. [Endpoint Reference — Diagnostics](#11-endpoint-reference--diagnostics)
12. [Endpoint Reference — Cadastral](#12-endpoint-reference--cadastral)
13. [Endpoint Reference — Judicial](#13-endpoint-reference--judicial)
14. [Endpoint Reference — Agro](#14-endpoint-reference--agro)
15. [Endpoint Reference — Vehicle](#15-endpoint-reference--vehicle)
16. [Endpoint Reference — Tributário](#16-endpoint-reference--tributário)
17. [Endpoint Reference — SPC (direct)](#17-endpoint-reference--spc-direct)
18. [Account & History](#18-account--history)
19. [Sandbox & Testing](#19-sandbox--testing)
20. [Changelog](#20-changelog)
21. [Support & Incident Reporting](#21-support--incident-reporting)

---

## 1. Quickstart

Sua primeira consulta funcionando em 30 segundos.

### 1.1. Obter um token

Crie um token `bc_live_*` no dashboard (Settings → API Tokens → Generate). Guarde o valor — ele não é exibido novamente.

### 1.2. Hello world — consulta CADIN da Secretaria da Fazenda

#### cURL

```bash
curl -X POST https://sets.brasilcred.com.br/functions/v1/api-gateway/api/v1/consult/cadin \
  -H "Authorization: Bearer bc_live_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx" \
  -H "Content-Type: application/json" \
  -H "Idempotency-Key: $(uuidgen)" \
  -d '{"document": "12345678909", "state": "SP"}'
```

#### Node.js (fetch nativo, Node 18+)

```javascript
const res = await fetch(
  "https://sets.brasilcred.com.br/functions/v1/api-gateway/api/v1/consult/cadin",
  {
    method: "POST",
    headers: {
      "Authorization": "Bearer bc_live_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx",
      "Content-Type": "application/json",
      "Idempotency-Key": crypto.randomUUID(),
    },
    body: JSON.stringify({ document: "12345678909", state: "SP" }),
  }
);

const data = await res.json();
console.log("Status:", res.status, "Request ID:", res.headers.get("x-request-id"));
console.log(data);
```

#### Python (`requests`)

```python
import requests, uuid

res = requests.post(
    "https://sets.brasilcred.com.br/functions/v1/api-gateway/api/v1/consult/cadin",
    headers={
        "Authorization": "Bearer bc_live_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx",
        "Content-Type": "application/json",
        "Idempotency-Key": str(uuid.uuid4()),
    },
    json={"document": "12345678909", "state": "SP"},
    timeout=60,
)

print("Status:", res.status_code, "Request ID:", res.headers.get("x-request-id"))
print(res.json())
```

### 1.3. O que esperar

- **`201 Created`** com o resultado da consulta (sanitizado de nomes de provedor)
- Header **`X-Request-ID`** com UUID único — guarde-o se for abrir ticket de suporte
- Saldo debitado pelo preço do produto consultado (visível em `GET /account`)

Se você receber qualquer status diferente de 2xx, vá direto para [§5 — Errors](#5-errors).

---

## 2. Authentication

### 2.1. Token format

Todo token tem prefixo `bc_live_` seguido de 32 caracteres hexadecimais. Exemplo: `bc_live_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx`.

### 2.2. Como enviar

Dois headers equivalentes — escolha um:

```http
Authorization: Bearer bc_live_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
```

ou

```http
X-API-Key: bc_live_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
```

Se ambos forem enviados, `X-API-Key` tem prioridade.

### 2.3. Lifecycle

- **Criação:** pelo dashboard. O token raw é exibido **uma única vez** — copie e guarde em secret manager.
- **Uso:** sem TTL. Cada chamada bem-sucedida atualiza `last_used_at`.
- **Rotação:** gerar um token novo desativa o anterior automaticamente. Para troca sem downtime: gere o novo, deploy nos seus serviços com fallback ao antigo, depois revogue o antigo.
- **Revogação:** marca `is_active = false`. Tem efeito no próximo request (sem cache).

### 2.4. Limites

Cada usuário pode ter **apenas 1 token ativo** por vez. A criação de um novo desativa o anterior.

### 2.5. Security best practices

- Armazene o token em secret manager (AWS Secrets Manager, HashiCorp Vault, GCP Secret Manager). **Nunca** em código-fonte, `.env` commitado, ou logs.
- Trate o token como senha de produção: rotacione periodicamente, revogue ao desligar integração.
- Restrinja o IP de origem dos seus servidores na sua firewall, e mantenha apenas eles permitidos a chamar a API.
- Em frontend público, **nunca** exponha o token. Use sempre um backend intermediário.
- Quando suspeitar de vazamento: revogue imediatamente pelo dashboard, gere novo, faça rotate.

### 2.6. Erros de autenticação

| Resposta | Significado | Ação |
|---|---|---|
| `401 unauthorized` (sem prefixo `bc_live_`) | Header ausente ou malformado | Verifique header `Authorization` ou `X-API-Key` |
| `401 unauthorized` (token inválido) | Token não existe ou `is_active = false` | Token revogado ou typo — gere novo pelo dashboard |

---

## 3. Request Correlation

A API usa **`X-Request-ID`** como identificador único de request, fundamental para correlacionar logs entre você, suporte, e nossos sistemas internos.

### 3.1. Outbound — toda response carrega

Toda resposta (sucesso ou erro) inclui o header:

```http
X-Request-ID: 1000fb8b-ddf0-4640-91b8-57d15c872a66
```

Em respostas de erro (RFC 7807), o mesmo ID aparece também no body:

```json
{
  "type":   "https://brasilcred.com.br/errors/bad_request",
  "title":  "Invalid request",
  "status": 400,
  "detail": "Field 'document' is required.",
  "request_id": "1000fb8b-ddf0-4640-91b8-57d15c872a66"
}
```

### 3.2. Inbound — você pode propagar o seu

Se você já gera um trace ID por request no seu sistema (Datadog, OpenTelemetry, Sentry, X-Cloud-Trace, etc.), pode passá-lo via header — o gateway preserva se for um UUID-like (16-64 chars hex+hífen):

```http
X-Request-ID: 8e4f9a01-b2c3-4d5e-9f78-1a2b3c4d5e6f
```

Caso contrário (ausente ou formato inválido), o gateway gera um UUID v4 novo.

### 3.3. Logue o request_id

Toda integração robusta deve persistir o `X-Request-ID` por request:

```javascript
const requestId = res.headers.get("x-request-id");
logger.info("brasil_cred_call", {
  endpoint: "/consult/cadin",
  status: res.status,
  requestId,
  durationMs: Date.now() - start,
});
```

Quando abrir um ticket de suporte ou reportar incidente, **incluir o `request_id` resolve em segundos** o que sem ele leva horas (timestamp + endpoint + filtragem manual).

### 3.4. Persistência no nosso lado

Toda chamada vai para `api_usage_log.request_id`. O suporte usa isso para join `seus logs ↔ nossos logs ↔ row de billing` em uma única query.

---

## 4. Idempotency

A API é **idempotente em todo `POST /consult/*`** desde que você envie o header `Idempotency-Key`. Sem ele, retornamos `400 idempotency_key_required`.

### 4.1. Por quê

Network falha. Timeouts acontecem. Sua função Lambda pode reiniciar entre o request e o response. Sem idempotency, qualquer retry pode duplicar consulta (e o débito). Com idempotency: **mesmo key = mesmo resultado, sem novo débito**.

### 4.2. Formato do key

- 16 a 64 caracteres
- Charset: `[A-Za-z0-9_-]` (URL-safe)
- Regex: `^[A-Za-z0-9_-]{16,64}$`

Formatos compatíveis: **UUIDv4** (36 chars com hífens), **ULID** (26 chars), qualquer string aleatória forte. Não use timestamps puros, sequência crescente, ou strings curtas previsíveis — risco de colisão entre clientes.

### 4.3. Window de 24 horas

A mesma key, dentro de 24h, retorna o **resultado cached** sem re-cobrar nem re-chamar o provedor. Após 24h o key expira e uma nova chamada com o mesmo key conta como request novo (vai cobrar).

### 4.4. Semantics de retry por status code

| Status | Cobrou? | Pode retry com mesma key? | Estratégia |
|---|---|---|---|
| `200/201` | Sim | Sim — retorna cached | Idempotente nativo |
| `400` | Não | Não | Corrija o input antes |
| `401`/`403` | Não | Não | Corrija auth antes |
| `402` insufficient_balance | Não | **Sim, após top-up** | Adicione saldo, retry com mesma key |
| `404` not_found | Não | Não | Endpoint ou recurso não existe |
| `409` conflict | Não | Não | Mesma key, payload diferente — gere key novo |
| `422` unprocessable_entity | Não | Não | Documento inválido (DV errado, etc.) — corrija |
| `429` rate_limit | Não | **Sim, após `Retry-After`** | Aguarde header `Retry-After` |
| `500` internal | Talvez | **Sim, mas só 1 vez** | Erro interno raro; retry once |
| `502` upstream_failed | **Sim** (com refund automático em curso) | **Não** | Refund retry server-side; saldo restaurado em até 25min |
| `502` upstream_misconfigured | Não | Sim, mas aguarde — bug nosso de config interna | Reporte com `request_id` |
| `503` service_unavailable | Não | **Sim, após `Retry-After`** | Subsistema interno down |
| `504` gateway_timeout | Não | **Sim, mesma key** | Provedor não respondeu em 45s |

### 4.5. Regra de ouro

**Reuse a mesma key apenas em retries do mesmo logical request.** Nova consulta (mesmo que mesmo CPF) = key nova. Mesma key + payload diferente = `409 conflict`.

```javascript
// ✅ Correto: 1 key por logical request, reused em retries
const key = crypto.randomUUID();
async function callWithRetry(maxAttempts = 3) {
  for (let i = 0; i < maxAttempts; i++) {
    const res = await fetch(url, { headers: { "Idempotency-Key": key, ... } });
    if (res.status >= 500 || res.status === 504) {
      await sleep(Math.pow(2, i) * 1000);  // exponential backoff
      continue;
    }
    return res;
  }
}

// ❌ Errado: key fixo entre logical requests diferentes
const HARDCODED_KEY = "my-fixed-key-1234567890123456";  // VAI DAR 409 NO SEGUNDO CALL
```

---

## 5. Errors

Toda resposta não-2xx segue [RFC 7807 Problem Details](https://www.rfc-editor.org/rfc/rfc7807) com `Content-Type: application/problem+json`:

```json
{
  "type":       "https://brasilcred.com.br/errors/<code>",
  "title":      "<short human-readable summary>",
  "status":     <http-status>,
  "detail":     "<actionable description>",
  "request_id": "<UUID for support correlation>"
}
```

Algumas respostas incluem campos extras ("extensions" no RFC 7807):

- `current_balance_cents`, `required_cents` (402)
- `refund_consultation_id` (502 upstream_failed)
- `Retry-After` (header, 429 e 503)

### 5.1. Catálogo completo

| Status | `code` | Quando ocorre | Extensions | Retry-safe? |
|---|---|---|---|---|
| `400` | `bad_request` | Body malformado, JSON inválido, campo obrigatório ausente | — | ❌ |
| `400` | `idempotency_key_required` | Header `Idempotency-Key` ausente ou fora do formato | — | ❌ |
| `401` | `unauthorized` | Token ausente, malformado, inativo ou inexistente | — | ❌ |
| `402` | `insufficient_balance` | Saldo do usuário < preço do produto | `current_balance_cents`, `required_cents` | ✅ após top-up, com mesma key |
| `403` | `forbidden` | Autenticado mas sem permissão para o recurso | — | ❌ |
| `404` | `not_found` | Endpoint inexistente ou recurso (consultation_id) não pertence ao seu token | — | ❌ |
| `409` | `conflict` | Mesma `Idempotency-Key` usada com payload diferente | — | ❌ — gere key novo |
| `422` | `unprocessable_entity` | Documento bem-formado mas semanticamente inválido (DV errado, CNPJ com 11 dígitos, etc.) | — | ❌ — corrija e use key novo |
| `429` | `rate_limit_exceeded` | Mais de 60 req/min para o token | header `Retry-After` (segundos) | ✅ após Retry-After |
| `500` | `internal_error` | Erro inesperado no nosso lado (raro pós-2026-05-26) | — | ⚠️ retry 1 vez com mesma key |
| `502` | `upstream_failed` | Provedor falhou **após** debitarmos seu saldo. Refund automático em curso. | `refund_consultation_id` (quando disponível) | ❌ — não retry; refund tratado server-side |
| `502` | `upstream_misconfigured` | Auth interno entre nossos serviços está desconfigurado (nunca culpa sua) | — | ✅ aguarde e retry, ou reporte com request_id |
| `503` | `service_unavailable` | Subsistema interno failando (rate-limit DB, etc.) | header `Retry-After` (default 30s) | ✅ após Retry-After |
| `504` | `gateway_timeout` | Provedor não respondeu em 45s. **Sem débito.** | — | ✅ mesma key, retry seguro |

### 5.2. Exemplos de body

**400 — Idempotency-Key inválida**
```json
{
  "type":   "https://brasilcred.com.br/errors/idempotency_key_required",
  "title":  "Idempotency-Key header required",
  "status": 400,
  "detail": "Idempotency-Key must match /^[A-Za-z0-9_-]{16,64}$/. Received 9 chars.",
  "request_id": "a3f8b2e1-9c4d-4e5f-8a6b-1c2d3e4f5a6b"
}
```

**402 — Saldo insuficiente**
```json
{
  "type":   "https://brasilcred.com.br/errors/insufficient_balance",
  "title":  "Insufficient balance",
  "status": 402,
  "detail": "Insufficient balance to perform this consultation. Top up your balance and retry with the same Idempotency-Key.",
  "current_balance_cents": 180,
  "required_cents": 357,
  "request_id": "b4c9d2e3-1f5a-4b6c-9d8e-7f6a5b4c3d2e"
}
```

**502 — Upstream failed (com refund)**
```json
{
  "type":   "https://brasilcred.com.br/errors/upstream_failed",
  "title":  "Upstream provider failed",
  "status": 502,
  "detail": "The data provider returned an error. Your balance refund is being processed automatically.",
  "refund_consultation_id": "c5d8e3f4-2a6b-4c7d-9e8f-7a6b5c4d3e2f",
  "request_id": "d6e9f4a5-3b7c-4d8e-9f8a-7b6c5d4e3f2a"
}
```

**429 — Rate limit**
```http
HTTP/2 429
Retry-After: 47
Content-Type: application/problem+json
X-Request-ID: e7f0a5b6-4c8d-4e9f-8a7b-6c5d4e3f2a1b

{
  "type":   "https://brasilcred.com.br/errors/rate_limit_exceeded",
  "title":  "Rate limit exceeded",
  "status": 429,
  "detail": "Maximum 60 requests per minute. Wait and retry.",
  "request_id": "e7f0a5b6-4c8d-4e9f-8a7b-6c5d4e3f2a1b"
}
```

### 5.3. Tratamento recomendado (Node)

```javascript
async function callConsult(path, body, idempotencyKey) {
  const res = await fetch(`${BASE}/consult/${path}`, {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${TOKEN}`,
      "Content-Type": "application/json",
      "Idempotency-Key": idempotencyKey,
    },
    body: JSON.stringify(body),
  });

  const requestId = res.headers.get("x-request-id");

  if (res.ok) return { ok: true, data: await res.json(), requestId };

  const err = await res.json();
  switch (err.type.split("/").pop()) {
    case "insufficient_balance":
      throw new InsufficientBalanceError(err, requestId);
    case "rate_limit_exceeded":
      const retryAfter = Number(res.headers.get("retry-after") ?? 60);
      throw new RateLimitError(retryAfter, requestId);
    case "upstream_failed":
      // Don't retry — refund is automatic
      throw new UpstreamFailedError(err.refund_consultation_id, requestId);
    case "gateway_timeout":
    case "service_unavailable":
      // Safe to retry with same key
      throw new RetryableError(err, requestId);
    default:
      throw new ApiError(err, requestId);
  }
}
```

---

## 6. Sanitization & PII

### 6.1. Nomes de provedor

Toda response (sucesso ou erro) é processada por um sanitizer que **nunca expõe** nomes de provedores subjacentes (Serasa, SPC, DirectD, Validocar, Boa Vista, Quod, Escavador, Orago, SERPRO, etc.). Você compra **Brasil Cred**, não "Serasa via Brasil Cred".

Quando uma mensagem do upstream menciona um provedor, ele é substituído por `[data provider]`:

```
"Failed to process: No price rule for product_code=PF, line=[data provider]-[data provider]-score"
```

### 6.2. Campos NUNCA expostos

A resposta de erro (RFC 7807) usa whitelist — só campos explicitamente permitidos aparecem. Os seguintes nunca vazam:

- Estrutura de custo: `cost_cents`, `wholesale_*`, `margin_*`, `adm_minimum_price_cents`, `tenant_unit_price_cents`
- IDs internos: `tenant_id`, `account_id`, `purchase_id` cru, `api_token_id`, schemas internos
- Secrets: JWTs (`eyJ…`), tokens (`bc_live_*`, `sb_secret_*`), Bearer headers
- Stack traces, file paths (`/home/…`, `supabase/functions/…`), erro raw do Postgres
- URLs internas (`*.supabase.co/functions/*`, IPs privados)

### 6.3. Campos permitidos em erros

- `type`, `title`, `status`, `detail`, `request_id`
- Extensions tipadas: `current_balance_cents`, `required_cents`, `refund_consultation_id`, `retry_after_seconds`
- `idempotency_key` (apenas como confirmação do que você enviou, nunca o nosso namespace interno)

### 6.4. Privacy & LGPD

- Documento (CPF/CNPJ/placa) que você envia é processado para a consulta e retornado no resultado.
- A consulta resultado pode conter dados sensíveis (nome, endereço, score, restrições) — você é o data controller perante LGPD.
- Não logamos seu request body cru — só metadata (endpoint, status, duration, idempotency_key, request_id).
- Logs de audit em `api_usage_log` retidos por 12 meses para reconciliação financeira.

---

## 7. Rate Limits

### 7.1. Limite

**60 requests por minuto por token** (sliding window).

Quando excedido, retornamos `429 rate_limit_exceeded`:

```http
HTTP/2 429
Retry-After: 60
Content-Type: application/problem+json
X-Request-ID: …

{ "type": "...", "title": "Rate limit exceeded", "status": 429, "detail": "...", "request_id": "..." }
```

### 7.2. Honre o `Retry-After`

O valor (em segundos) indica quanto tempo aguardar antes de retentar. Implementação recomendada (Python):

```python
def call_with_rate_limit(fn, *args, **kwargs):
    while True:
        res = fn(*args, **kwargs)
        if res.status_code != 429:
            return res
        wait = int(res.headers.get("retry-after", "60"))
        time.sleep(wait)
```

### 7.3. Burst

O algoritmo é sliding window — burst inicial até 60 req em poucos segundos é tolerado, mas a janela de 60s acompanha. Para sustained throughput, distribua as chamadas uniformemente (~1 req/s).

### 7.4. Aumentar o limite

Para casos de alto volume (>60 req/min sustentado), abra ticket descrevendo: volume esperado, padrão de uso (batch/streaming), endpoints mais usados. Avaliamos uplift caso a caso.

---

## Padrão dos endpoints `POST /consult/*`

Todas as rotas de consulta seguem o mesmo padrão:

### Request

```http
POST /api/v1/consult/{product}
Authorization: Bearer bc_live_…
Content-Type: application/json
Idempotency-Key: <16-64 chars [A-Za-z0-9_-]>
X-Request-ID: <optional, your own trace id>
X-Brand-Name: <optional, used to brand generated PDFs>
X-Brand-Logo-Url: <optional, used to brand generated PDFs>

{
  "document": "<CPF, CNPJ, or vehicle plate>",
  "state":    "<optional, 2-letter UF — required for some products>"
}
```

### Response

- **`201 Created`** — sucesso, body sanitizado contém o resultado
- **Headers:** `X-Request-ID` + `Content-Type: application/json`
- Veja [§5 — Errors](#5-errors) para non-2xx

A maioria dos endpoints aceita apenas `document`. Os que requerem `state` (UF) estão marcados explicitamente.

---

## 8. Endpoint Reference — Credit

### 8.1. `POST /consult/credit/pf` — Premium individual

Relatório completo de crédito do CPF (score, restrições, score history). **Documento: CPF.**

```bash
curl -X POST https://sets.brasilcred.com.br/functions/v1/api-gateway/api/v1/consult/credit/pf \
  -H "Authorization: Bearer bc_live_…" \
  -H "Content-Type: application/json" \
  -H "Idempotency-Key: $(uuidgen)" \
  -d '{"document":"12345678909"}'
```

```javascript
await fetch(`${BASE}/consult/credit/pf`, {
  method: "POST",
  headers: { ...authHeaders, "Idempotency-Key": crypto.randomUUID() },
  body: JSON.stringify({ document: "12345678909" }),
});
```

```python
requests.post(f"{BASE}/consult/credit/pf",
    headers={**auth_headers, "Idempotency-Key": str(uuid.uuid4())},
    json={"document": "12345678909"})
```

### 8.2. `POST /consult/credit/pj` — Premium company

Idem 8.1 para CNPJ. **Documento: CNPJ.** Payload `{"document": "<CNPJ>"}`.

### 8.3. `POST /consult/premium-avancado/pf` e `/pj` — Premium Avançado

Versão avançada do relatório premium, com bureau adicional.

```bash
curl -X POST https://sets.brasilcred.com.br/functions/v1/api-gateway/api/v1/consult/premium-avancado/pf \
  -H "Authorization: Bearer bc_live_…" \
  -H "Content-Type: application/json" \
  -H "Idempotency-Key: $(uuidgen)" \
  -d '{"document":"12345678909"}'
```

Para PJ trocar `/pf` por `/pj` e enviar CNPJ.

### 8.4. `POST /consult/relatorio-especial/pf` e `/pj` — Relatório Especial

Relatório especializado com dados de pendências, ações e restrições aprofundadas.

```bash
curl -X POST https://sets.brasilcred.com.br/functions/v1/api-gateway/api/v1/consult/relatorio-especial/pf \
  -H "Authorization: Bearer bc_live_…" -H "Content-Type: application/json" \
  -H "Idempotency-Key: $(uuidgen)" -d '{"document":"12345678909"}'
```

### 8.5. `POST /consult/recomenda/pf` e `/pj` — Serasa Recomenda

Score Recomenda com análise contextual de risco. **Pode estar desabilitado dependendo do seu plano** — se receber `503` ou `402` mesmo com saldo, contate suporte.

```bash
curl -X POST https://sets.brasilcred.com.br/functions/v1/api-gateway/api/v1/consult/recomenda/pf \
  -H "Authorization: Bearer bc_live_…" -H "Content-Type: application/json" \
  -H "Idempotency-Key: $(uuidgen)" -d '{"document":"12345678909"}'
```

### 8.6. `POST /consult/complete/pf` e `/pj` — Consulta Completa

Bundle completo: credit + judicial + cadastral + score em uma única chamada. Latência maior (~10-30s); use timeout ≥ 45s.

```bash
curl -X POST https://sets.brasilcred.com.br/functions/v1/api-gateway/api/v1/consult/complete/pf \
  -H "Authorization: Bearer bc_live_…" -H "Content-Type: application/json" \
  -H "Idempotency-Key: $(uuidgen)" -d '{"document":"12345678909"}' \
  --max-time 60
```

---

## 9. Endpoint Reference — Scores & Bureaus

### 9.1. `POST /consult/score` — Score V (Base V CPF e CNPJ)

Score consolidado de múltiplos bureaus. **Documento: CPF ou CNPJ.**

```bash
curl -X POST https://sets.brasilcred.com.br/functions/v1/api-gateway/api/v1/consult/score \
  -H "Authorization: Bearer bc_live_…" -H "Content-Type: application/json" \
  -H "Idempotency-Key: $(uuidgen)" -d '{"document":"12345678909"}'
```

### 9.2. `POST /consult/boa-vista` — Base IV + Score

Bureau IV com score próprio. **Documento: CPF.** Status: pode estar oculto da plataforma; consulte suporte.

### 9.3. `POST /consult/avalie-credito` — Avalie Crédito

Análise de crédito com recomendação. **Documento: CPF.**

```bash
curl -X POST https://sets.brasilcred.com.br/functions/v1/api-gateway/api/v1/consult/avalie-credito \
  -H "Authorization: Bearer bc_live_…" -H "Content-Type: application/json" \
  -H "Idempotency-Key: $(uuidgen)" -d '{"document":"12345678909"}'
```

### 9.4. `POST /consult/credito-total` — Crédito Total + Score

Bundle de score com features adicionais. **Documento: CPF.**

### 9.5. `POST /consult/scr-bacen` — SCR Bacen Detalhado

Sistema de Informações de Crédito do Banco Central. **Documento: CPF ou CNPJ.** Latência típica: 5-15s.

```bash
curl -X POST https://sets.brasilcred.com.br/functions/v1/api-gateway/api/v1/consult/scr-bacen \
  -H "Authorization: Bearer bc_live_…" -H "Content-Type: application/json" \
  -H "Idempotency-Key: $(uuidgen)" -d '{"document":"12345678909"}'
```

---

## 10. Endpoint Reference — Restrições & Pendências

### 10.1. `POST /consult/popular` — Consulta Popular

Status: oculto da plataforma desde 2026-05-22. Pode retornar `404` ou estar indisponível.

### 10.2. `POST /consult/ccf` — Cheque sem Fundo

Histórico de cheques sem fundo (CCF). **Documento: CPF.**

```bash
curl -X POST https://sets.brasilcred.com.br/functions/v1/api-gateway/api/v1/consult/ccf \
  -H "Authorization: Bearer bc_live_…" -H "Content-Type: application/json" \
  -H "Idempotency-Key: $(uuidgen)" -d '{"document":"12345678909"}'
```

### 10.3. `POST /consult/cadin` — CADIN Secretaria da Fazenda

Cadastro de Inadimplentes da Secretaria da Fazenda. **Requer `state` (UF).**

```bash
curl -X POST https://sets.brasilcred.com.br/functions/v1/api-gateway/api/v1/consult/cadin \
  -H "Authorization: Bearer bc_live_…" -H "Content-Type: application/json" \
  -H "Idempotency-Key: $(uuidgen)" \
  -d '{"document":"12345678909","state":"SP"}'
```

**Sem `state` válido** (UF de 2 letras), retorna `400 bad_request`.

### 10.4. `POST /consult/protestos` — Protestos Nacional (IEPTB)

Protestos registrados nacionalmente. **Documento: CPF.**

```bash
curl -X POST https://sets.brasilcred.com.br/functions/v1/api-gateway/api/v1/consult/protestos \
  -H "Authorization: Bearer bc_live_…" -H "Content-Type: application/json" \
  -H "Idempotency-Key: $(uuidgen)" -d '{"document":"12345678909"}'
```

### 10.5. `POST /consult/pgfn` — PGFN Lista de Devedores da União

Dívida ativa da União. **Documento: CPF ou CNPJ.**

```bash
curl -X POST https://sets.brasilcred.com.br/functions/v1/api-gateway/api/v1/consult/pgfn \
  -H "Authorization: Bearer bc_live_…" -H "Content-Type: application/json" \
  -H "Idempotency-Key: $(uuidgen)" -d '{"document":"12345678909"}'
```

### 10.6. `POST /consult/indicadores` — Indicadores Sociodemográficos + Score

Indicadores agregados de risco sociodemográfico. **Documento: CPF.**

---

## 11. Endpoint Reference — Diagnostics

### 11.1. `POST /consult/diagnostico/pf` e `/pj` — Diagnóstico Financeiro Avançado

Análise consolidada com SCR Bacen + score + restrições + recomendação. Latência típica: 15-30s; use timeout ≥ 45s.

```bash
curl -X POST https://sets.brasilcred.com.br/functions/v1/api-gateway/api/v1/consult/diagnostico/pf \
  -H "Authorization: Bearer bc_live_…" -H "Content-Type: application/json" \
  -H "Idempotency-Key: $(uuidgen)" -d '{"document":"12345678909"}' \
  --max-time 60
```

Para PJ: `/diagnostico/pj` com CNPJ.

### 11.2. `POST /consult/diagnostico-premium` — Diagnóstico Financeiro Premium

Diagnóstico premium com motor de crédito proprietário + SCR Bacen + bureau adicional. **Documento: CPF.**

### 11.3. `POST /consult/diagnostico-locacao` — Diagnóstico para Locação Imobiliário

Análise específica para mercado de locação residencial/comercial. **Documento: CPF.**

---

## 12. Endpoint Reference — Cadastral

### 12.1. `POST /consult/cadastro` — Cadastro Plus

Dados cadastrais consolidados (endereço, telefones, vínculos). **Documento: CPF.**

```bash
curl -X POST https://sets.brasilcred.com.br/functions/v1/api-gateway/api/v1/consult/cadastro \
  -H "Authorization: Bearer bc_live_…" -H "Content-Type: application/json" \
  -H "Idempotency-Key: $(uuidgen)" -d '{"document":"12345678909"}'
```

---

## 13. Endpoint Reference — Judicial

### 13.1. `POST /consult/acoes-judiciais` — Ações e Processos

Processos judiciais nacionais consolidados. **Documento: CPF.**

```bash
curl -X POST https://sets.brasilcred.com.br/functions/v1/api-gateway/api/v1/consult/acoes-judiciais \
  -H "Authorization: Bearer bc_live_…" -H "Content-Type: application/json" \
  -H "Idempotency-Key: $(uuidgen)" -d '{"document":"12345678909"}'
```

### 13.2. `POST /consult/certidao-negativa` — Certidão Negativa

Verificação de certidões negativas. **Documento: CPF.**

### 13.3. `POST /consult/orago/judicial/pf` e `/pj` — Análise Judicial

Análise judicial detalhada via Orago. PF (CPF) ou PJ (CNPJ).

```bash
curl -X POST https://sets.brasilcred.com.br/functions/v1/api-gateway/api/v1/consult/orago/judicial/pf \
  -H "Authorization: Bearer bc_live_…" -H "Content-Type: application/json" \
  -H "Idempotency-Key: $(uuidgen)" -d '{"document":"12345678909"}'
```

### 13.4. `POST /consult/orago/process-details/pf` e `/pj` — Detalhamento de Processos

Detalhamento profundo dos processos judiciais. PF/PJ.

```bash
curl -X POST https://sets.brasilcred.com.br/functions/v1/api-gateway/api/v1/consult/orago/process-details/pf \
  -H "Authorization: Bearer bc_live_…" -H "Content-Type: application/json" \
  -H "Idempotency-Key: $(uuidgen)" -d '{"document":"12345678909"}'
```

---

## 14. Endpoint Reference — Agro

### 14.1. `POST /consult/cafir` — CAFIR

Cadastro Ambiental de Imóveis Rurais. **Documento: CPF.**

```bash
curl -X POST https://sets.brasilcred.com.br/functions/v1/api-gateway/api/v1/consult/cafir \
  -H "Authorization: Bearer bc_live_…" -H "Content-Type: application/json" \
  -H "Idempotency-Key: $(uuidgen)" -d '{"document":"12345678909"}'
```

### 14.2. `POST /consult/car` — CAR

Cadastro Ambiental Rural. **Documento: CPF.**

---

## 15. Endpoint Reference — Vehicle

Endpoints veiculares usam **placa** como `document` (não CPF/CNPJ) salvo onde indicado.

### 15.1. `POST /consult/vehicle` — CRLVe Digital

Certificado de Registro e Licenciamento Eletrônico. **Documento: placa.**

```bash
curl -X POST https://sets.brasilcred.com.br/functions/v1/api-gateway/api/v1/consult/vehicle \
  -H "Authorization: Bearer bc_live_…" -H "Content-Type: application/json" \
  -H "Idempotency-Key: $(uuidgen)" -d '{"document":"ABC1234"}'
```

### 15.2. `POST /consult/vehicle/agregado` — Dados Agregados

Dados consolidados do veículo (histórico, multas, taxas). **Documento: placa.**

### 15.3. `POST /consult/vehicle/gravame` — Gravame Detalhamento

Detalhes de gravame (alienação fiduciária, leasing). **Documento: placa.**

### 15.4. `POST /consult/vehicle/roubo-furto` — Histórico Roubo/Furto

Histórico de registros de roubo e furto. **Documento: placa.**

### 15.5. `POST /consult/vehicle/leilao` — Leilão + Parecer Técnico

Histórico de leilões com parecer técnico de avaliação. **Documento: placa.**

### 15.6. `POST /consult/vehicle/leilao-score` — Leilão Score Veicular

Score específico para análise de leilões. **Documento: placa.**

### 15.7. `POST /consult/vehicle/por-documento` — Dados Veículo por CPF/CNPJ

Lista veículos vinculados a um documento. **`document`: CPF ou CNPJ.**

```bash
curl -X POST https://sets.brasilcred.com.br/functions/v1/api-gateway/api/v1/consult/vehicle/por-documento \
  -H "Authorization: Bearer bc_live_…" -H "Content-Type: application/json" \
  -H "Idempotency-Key: $(uuidgen)" -d '{"document":"12345678909"}'
```

### 15.8. `POST /consult/vehicle/desmonte` — Dados Nacionais de Desmonte

Registro nacional de desmonte. **Documento: placa.**

---

## 16. Endpoint Reference — Tributário

### 16.1. `POST /consult/tributario/diagnostico` — Diagnóstico Tributário PJ (SERPRO)

Diagnóstico tributário completo via SERPRO Integra Contador. **Documento: CNPJ.** Latência típica: 20-40s; use timeout ≥ 60s.

```bash
curl -X POST https://sets.brasilcred.com.br/functions/v1/api-gateway/api/v1/consult/tributario/diagnostico \
  -H "Authorization: Bearer bc_live_…" -H "Content-Type: application/json" \
  -H "Idempotency-Key: $(uuidgen)" -d '{"document":"12345678000190"}' \
  --max-time 90
```

---

## 17. Endpoint Reference — SPC (direct)

Integração direta com SPC Brasil. Gated por feature flag — confirme com suporte se sua conta tem acesso.

### 17.1. `POST /consult/spc/cadastro-pf` e `/cadastro-pj` — SPC Cadastral

```bash
curl -X POST https://sets.brasilcred.com.br/functions/v1/api-gateway/api/v1/consult/spc/cadastro-pf \
  -H "Authorization: Bearer bc_live_…" -H "Content-Type: application/json" \
  -H "Idempotency-Key: $(uuidgen)" -d '{"document":"12345678909"}'
```

### 17.2. `POST /consult/spc/completo-pf` e `/completo-pj` — SPC Completo

Relatório completo SPC (cadastral + restrições + score).

### 17.3. `POST /consult/spc/confirme-pf` e `/confirme-pj` — SPC Confirme

Atualização cadastral via SPC Confirme.

---

## 18. Account & History

### 18.1. `GET /account`

Saldo atual, info do token, uso mensal.

```bash
curl https://sets.brasilcred.com.br/functions/v1/api-gateway/api/v1/account \
  -H "Authorization: Bearer bc_live_…"
```

```json
{
  "balance":   { "available_cents": 55945, "available_brl": "559.45" },
  "api_token": {
    "name":         "Prod",
    "last_used_at": "2026-05-26T13:03:28+00:00",
    "created_at":   "2026-04-27T12:55:47+00:00"
  },
  "usage": { "this_month": 9 }
}
```

### 18.2. `GET /consultations`

Lista de consultas passadas feitas via API token (consultas via web app não aparecem aqui).

Query params:
- `page` — default `1`, min `1`
- `limit` — default `20`, min `1`, max `50`

```bash
curl "https://sets.brasilcred.com.br/functions/v1/api-gateway/api/v1/consultations?page=1&limit=20" \
  -H "Authorization: Bearer bc_live_…"
```

```json
{
  "data": [
    {
      "id":         "4b63c025-08bc-4607-bdc4-72cd5960fa23",
      "product":    "credit_report_individual",
      "document":   "24550120851",
      "status":     "success",
      "queried_at": "2026-05-26T13:02:39+00:00"
    }
  ],
  "pagination": { "page": 1, "limit": 20, "total": 1, "total_pages": 1 }
}
```

Valores de `product` são vendor-neutral: `credit_report_individual`, `credit_report_company`, `credit_report_complete_individual`, `credit_report_complete_company`, `credit_score`, `vehicle_report`, `consultation`.

### 18.3. `GET /consultations/{id}`

Detalhes sanitizados de uma consulta. Retorna `404` se o id não pertence ao owner do token autenticado.

```bash
curl https://sets.brasilcred.com.br/functions/v1/api-gateway/api/v1/consultations/4b63c025-08bc-4607-bdc4-72cd5960fa23 \
  -H "Authorization: Bearer bc_live_…"
```

A response espelha o shape do `POST /consult/<product>` correspondente.

---

## 19. Sandbox & Testing

### 19.1. Não há sandbox separado

Use uma conta de staging com baixo saldo (top up ~R$ 50) para teste de integração. **Consultas que falham por validação ou timeout não cobram**; sucesso cobra normalmente.

### 19.2. Documentos de teste

| Documento | Comportamento esperado |
|---|---|
| `00000000000` (CPF) | Tipicamente "not found" na maioria dos provedores; bom pra testar 200 sem dados |
| `00000000000000` (CNPJ) | Idem |
| `12345678909` (CPF) | DV válido mas geralmente sem registros |
| `11144477735` (CPF) | DV válido clássico de teste, sem registros reais |
| `ABC1234` (placa) | Formato válido; depende do provedor para retornar 200/404 |

### 19.3. Fluxo recomendado de validação de integração

1. `GET /account` — confirma auth funciona
2. `POST /consult/ccf` com Idempotency-Key gerado — endpoint barato, exercita o full chain
3. Repetir o mesmo POST com mesma Idempotency-Key — confirma cache de idempotency (não cobra de novo)
4. `POST /consult/ccf` com `Idempotency-Key: too-short` — confirma 400 idempotency_key_required
5. `POST /consult/inexistente` — confirma 404
6. Validar que TODA response tem `X-Request-ID` no header

### 19.4. Sniff de leak

Em ambiente de QA, escaneie responses contra grep para garantir sanitização:

```bash
curl … | grep -iE 'serasa|spc|directd|escavador|tayane|validocar|orago|serpro|boa.vista|quod'
# Expected: ZERO matches (todos os nomes de provedor devem aparecer como [data provider])
```

---

## 20. Changelog

### 2026-05-26 — Tenant context + error propagation
- **FIX:** `POST /consult/*` voltou a funcionar após bug introduzido em 2026-05-22 que retornava `500` mascarado para todas as chamadas. Causa raiz: api-gateway não propagava `x-tenant-id` para o serviço interno.
- **NEW:** todo response carrega header `X-Request-ID` (UUID v4) — correlação entre seus logs e os nossos. Você também pode passar inbound — preservamos se for UUID-like.
- **NEW:** body de erro (problem+json) carrega extension `request_id`.
- **NEW:** status codes propagados corretamente — `400/402/403/404/409/422/429` agora retornados onde antes era `500` genérico.
- **NEW:** `409 conflict` para mesma Idempotency-Key com payload diferente.
- **NEW:** `422 unprocessable_entity` para documento bem-formado mas semanticamente inválido (DV errado).
- **NEW:** `502 upstream_misconfigured` (sub-tipo) para falhas de auth s2s internas — diferenciado de `502 upstream_failed` (provedor caiu).
- **NEW:** envelope handler de erros do serviço interno é robusto e propaga status correto (não cai mais em `500` genérico).
- **NEW:** detail de erro sanitizado pra remover nomes de provedor, secrets, IDs internos, paths, IPs privados.

### 2026-04-27 — Hardening release
- `Idempotency-Key` agora **obrigatório** em `POST /consult/*` (16-64 char alphanumeric).
- Saldo insuficiente retorna `402` (era `400`) com `code: insufficient_balance`.
- Provedor falhando após débito retorna `502` com `code: upstream_failed` + `refund_consultation_id`; refund automático.
- Timeout do provedor retorna `504` com `code: gateway_timeout`. Sem cobrança.
- Subsistema interno indisponível retorna `503` com `code: service_unavailable` + `Retry-After`.
- `api_usage_log` agora registra `amount_charged_cents`, `purchase_id`, `idempotency_key` em toda chamada cobrada.
- Validação de token aceita SHA-256 legacy e HMAC nova (backwards compat).
- URL legacy `https://brasilcred.com.br/api/v1/*` removida do Vercel rewrite. Use **`sets.brasilcred.com.br`** exclusivamente.

---

## 21. Support & Incident Reporting

### 21.1. Canal

Pelo canal de suporte fornecido no email de onboarding.

### 21.2. O que incluir num ticket

**Sempre que possível, envie o `request_id`** — é a chave canônica de correlação no nosso lado. Com ele resolvemos em segundos o que sem ele leva horas.

Para incidentes (5xx persistente, latência anômala, response shape errado):

- `request_id` (do header `X-Request-ID` ou do body de erro)
- Timestamp da chamada (com timezone)
- Endpoint (path completo)
- HTTP status retornado
- Body de erro recebido (se aplicável)
- `Idempotency-Key` enviado (se POST)
- `consultation_id` ou `refund_consultation_id` (se aplicável)

Para dúvidas de integração ou onboarding de novos casos de uso:

- Descrição do caso de uso
- Volume esperado (req/dia, req/min pico)
- Endpoints que pretende usar

### 21.3. SLAs

- **Tempo de resposta:** próximo dia útil para tickets normais
- **Incidentes críticos** (sua produção parou): canal direto comunicado no onboarding
- **Manutenção planejada:** comunicada com 48h de antecedência via email para todos os tokens ativos

### 21.4. Status page

Não há status page pública no momento. Para incidentes amplos comunicaremos por email aos tokens ativos.
