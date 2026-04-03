# Consultas Pró — Backend

Base backend modular em Node.js + Fastify + Prisma + PostgreSQL + Redis + BullMQ para o sistema **Consultas Pró**.

## O que esta base já cobre

- autenticação com JWT
- RBAC com perfis `PLATFORM_ADMIN`, `COMPANY_OWNER`, `COMPANY_MANAGER` e `USER`
- cadastro aberto de usuário e de company
- convites de company para usuários
- convites do admin para company e para usuários
- vínculo manual de usuários a companies
- carteira/saldo com ledger
- catálogo de provedores, operações, produtos e custos
- catálogo de tipos de consulta
- catálogo canônico de campos para de-para
- teste de endpoints de provedor em tempo real
- mapeamento de JSON com JSONPath para payload normalizado
- fila assíncrona para processamento de consultas
- persistência de logs brutos e payloads normalizados
- merge de consultas históricas para preview sem gastar saldo novamente
- estrutura inicial para white-label/tenants e API tokens

## Stack

- Fastify: framework HTTP com plugins e baixo overhead. citeturn0search8turn0search4turn0search19
- Prisma + PostgreSQL: tipagem, migrações e acesso ao banco. citeturn0search1turn0search9turn0search17
- BullMQ + Redis: filas e workers para integrações assíncronas com provedores. citeturn0search2turn0search6turn0search10turn0search24
- Pino/Fastify logging: logs estruturados com request id. citeturn0search3turn0search7

## Como subir localmente

1. Copie o arquivo de ambiente:
   ```bash
   cp .env.example .env
   ```

2. Suba Postgres e Redis:
   ```bash
   docker compose up -d
   ```

3. Instale as dependências:
   ```bash
   npm install
   ```

4. Gere o client do Prisma e rode migrations:
   ```bash
   npm run prisma:generate
   npm run prisma:migrate
   ```

5. Rode o seed inicial:
   ```bash
   npm run prisma:seed
   ```

6. Inicie a API:
   ```bash
   npm run dev
   ```

7. Em outro terminal, inicie o worker:
   ```bash
   npm run worker
   ```

## Estrutura resumida

```text
src/
  app.ts
  server.ts
  config/
  core/
  db/
  lib/
  modules/
  queues/
  workers/
prisma/
  schema.prisma
  seed.ts
```

## Fluxo principal de consulta

1. Admin cadastra provedor, operações e produtos
2. Admin testa endpoint e define de-para do JSON
3. Admin cataloga tipos de consulta e campos canônicos
4. Usuário/Company monta template e emite consulta
5. API cria `consultation`, `consultation_items` e enfileira job
6. Worker chama os provedores, salva resposta bruta, normaliza via mappings e persiste logs
7. Worker faz merge dos payloads e atualiza a consulta
8. Histórico fica reaproveitável para preview de merge sem reconsumo

## Observações

- Esta base é sólida e funcional, mas ainda é uma fundação. Ela não substitui as fases seguintes de hardening, testes automatizados completos, observabilidade avançada, antifraude, billing real e geração final de PDF.
- As credenciais de provedores estão modeladas para armazenamento estruturado. Em produção, o ideal é criptografar ou externalizar segredos em um secret manager.
