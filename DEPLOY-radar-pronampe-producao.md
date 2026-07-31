# Deploy em produção — Radar PRONAMPE (Brasil Cred)

Guia para o dev sênior subir o Radar PRONAMPE e os templates Sollos ajustados.
Cobre variáveis de ambiente, ordem de execução dos scripts, o passo manual de
banco e as pendências que impedem a venda.

O estado de banco é reproduzido por **scripts idempotentes** a partir de
arquivos versionados — **não há dump**. Rodar duas vezes produz o mesmo
resultado, e o diff é auditável no PR.

Branch: `feat/radar-pronampe-brasilcred` (commit `5cbf042`).

---

## 1. Variáveis de ambiente (`.env` do backend)

Nenhuma destas está versionada. Configurar no `.env` de produção antes de rodar.

| Variável | Papel | Observação |
|---|---|---|
| `BRASIL_CRED_TOKEN_API` | Token da API contratada (`bc_live_…`) | 40 chars. `bc_live_demo` (12 chars) é placeholder e **não funciona**. |
| `PORTAL` | URL de login do portal | `https://brasilcred.com.br/auth/login` |
| `USER` | E-mail da conta do portal | Usado no login automático que captura o PDF. |
| `PASSWORWD` | Senha da conta do portal | **Grafia proposital** — é o nome que a variável recebeu no ambiente. O código aceita `PASSWORD` também. |
| `BRASIL_CRED_PORTAL_ANON_KEY` | Chave pública (anon) do Supabase do portal | JWT ~208 chars. É pública (exposta no bundle do site deles), mas volátil: se a Brasil Cred trocar, atualizar aqui. |

Opcional:

| Variável | Padrão | Papel |
|---|---|---|
| `PORTAL_PDF_TIMEOUT_MS` | `120000` | Timeout da captura do PDF. |

> **Segurança:** `.env` e a pasta `pronampe/` (PDFs com CPF de terceiro) estão no
> `.gitignore`. Não versionar. Não colar credencial em log, PR ou chat.

### Como obter a `BRASIL_CRED_PORTAL_ANON_KEY`

É a `anon key` do Supabase do portal, publicada no bundle JavaScript do site.
Para extrair (ou revalidar quando o portal mudar):

```bash
curl -s https://brasilcred.com.br/assets/js/index-<hash>.js \
  | grep -oE 'eyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+' \
  | head -1
```

O `<hash>` do bundle muda a cada deploy deles; pegar o nome do arquivo em
`view-source` da página de login. A chave tem `role: anon` no payload do JWT.

---

## 2. Dependência de runtime

A captura do PDF usa **Puppeteer** (Chromium headless). Já está em
`backend/package.json`. Em produção, garantir que o Chromium do Puppeteer foi
baixado no build:

```bash
cd backend && npx puppeteer browsers install chrome
```

Em container, incluir as libs do Chromium na imagem (padrão do
`puppeteer/Dockerfile`) — o serviço sobe `--no-sandbox`.

---

## 3. Pré-requisitos no banco

| Item | Verificação |
|---|---|
| Provedor `brasil-cred` | `slug = 'brasil-cred'`, `baseUrl = https://sets.brasilcred.com.br/functions/v1/api-gateway/api/v1`, `authType = BEARER` |
| Produto `RADAR_PRONAMPE_PJ` | Já cadastrado. O script atualiza a amostra; preço e status são preservados. |
| Matriz visual **1079** | Template cujo nome contém `COMPLETA BRASIL + SCORE CPF`, com a logo oficial embutida (`data:image/`). Os geradores abortam sem ela. |
| Usuário `PLATFORM_ADMIN` | Necessário para gravar templates. |

---

## 4. Ordem de execução dos scripts

```bash
cd backend

# 1) Radar PRONAMPE: produto, 9 tipos canônicos, 34 mapeamentos, template base.
#    Confere 228 valores origem->Preview antes de gravar; falha sem gravar se divergir.
npx tsx prisma/generate-brasilcred-templates.ts            # dry-run
npx tsx prisma/generate-brasilcred-templates.ts --apply

# 2) Template da consulta composta (Radar + Diagnóstico), padrão 1079.
npx tsx prisma/generate-brasilcred-composicao.ts --apply

# 3) Recompõe os 29 templates Sollos no padrão 1079 (o 1079 nunca é regravado).
npx tsx prisma/regenerate-sollos-templates-1079.ts         # dry-run: confere 29/29
npx tsx prisma/regenerate-sollos-templates-1079.ts --apply
```

Cada script valida a renderização (nenhuma expressão `{{...}}` pendente) antes
de gravar. O dry-run de cada um deve terminar sem falhas.

---

## 5. Passo manual de banco (obrigatório)

O produto pode ter mapeamentos antigos apontando para `recomenda.data`,
`pgfn.retorno.naturezas` e `scrBacen.retorno` — caminhos do dump interno do
provedor, que **não existem** na resposta da API. Desativar (sem apagar, para
permitir reversão):

```sql
UPDATE "ProviderFieldMapping" m
SET "isActive" = false
FROM "ProviderProduct" p
WHERE m."productId" = p.id
  AND p.code = 'RADAR_PRONAMPE_PJ'
  AND (m.notes IS NULL OR m.notes NOT LIKE '%brasilcred%');
```

Conferir: devem restar **9 ativos** (marcados `brasilcred`) e os antigos inativos.

---

## 6. Entrega do PDF original (portal)

Rota já registrada:

```
GET /consultations/pronampe/:portalId/pdf   (requer autenticação)
```

Serve o PDF original do provedor por link interno. O `:portalId` é o id da
consulta no portal Brasil Cred. Fluxo interno: login → Bearer Token → página de
impressão → PDF (~1,5 MB).

**Ponto de integração pendente:** hoje a rota recebe o `portalId` direto. Ligar
esse id ao registro de consulta do nosso sistema depende do fluxo assíncrono
(item 7) estar ativo — é ele que descobre o `consultation_id` do provedor. Até
lá, a rota funciona com o id informado manualmente.

Verificar em produção (esperado: PDF de ~1,5 MB, não a tela de login):

```bash
npx tsx prisma/export-template-pdf.ts 1080 /tmp/sollos-1080.pdf   # template nosso
# e a rota do portal, autenticado:
curl -H "Authorization: Bearer <jwt-do-app>" \
  https://<api>/consultations/pronampe/<portalId>/pdf -o /tmp/portal.pdf
```

---

## 7. Pendências que impedem a venda

- [ ] **Integração assíncrona não está ligada ao worker.**
      `async-consultation.service.ts` traz idempotência, leitura do `202` e
      classificação do polling, com testes — mas `consultation.worker.ts` ainda
      não a consome. Sem isso, `POST /consult/*` retorna
      `400 idempotency_key_required` (obrigatório desde 2026-04-27) e o sistema
      não descobre sozinho o `portalId`.
- [ ] **Produto do Diagnóstico não contratado.** O bloco de rating do template
      composto usa `brasilcred-composicao-sample.json`, montado com valores do
      relatório oficial e marcado `"validated": false`. Trocar por resposta real
      de `/consult/diagnostico/pj` e rodar o passo 2 de novo.
- [ ] **Produto nasce inativo; templates `PRIVATE`.** Ativar e publicar só após
      revisão manual.
- [ ] **CPF no PDF do portal.** O JSON que persistimos mascara o CPF de sócio; o
      PDF renderizado do portal **ainda contém o CPF completo**. Se a política
      exigir mascarar no documento entregue ao cliente, é uma etapa à parte.

---

## 8. Riscos operacionais do caminho do portal

O PDF completo vem do **backend do portal** (Supabase REST + página de print),
não da API contratada. Consequências a monitorar:

- Se a Brasil Cred mudar o Supabase, o RLS ou a anon key, a captura para **sem
  aviso**. O serviço degrada com erro claro (`PORTAL_LOGIN_FAILED`,
  `PORTAL_PDF_EMPTY`), sem derrubar a consulta — mas o PDF não sai.
- Login automático repetido pode acionar antifraude do portal.
- Automação de portal costuma ser restrita nos Termos de Uso do provedor.

**Recomendação:** usar isto como ponte e, em paralelo, negociar com a Brasil Cred
o acesso ao payload completo pela API contratada — a via sustentável.

---

## 9. Checklist de subida

- [ ] `.env` de produção com as 5 variáveis da seção 1.
- [ ] Chromium do Puppeteer instalado (seção 2).
- [ ] Pré-requisitos de banco conferidos (seção 3).
- [ ] Scripts 1–3 aplicados, dry-run sem falhas (seção 4).
- [ ] SQL de desativação executado; 9 mapeamentos ativos (seção 5).
- [ ] PDF do portal testado, ~1,5 MB (seção 6).
- [ ] Produto ativado e templates publicados após revisão (seção 7).
