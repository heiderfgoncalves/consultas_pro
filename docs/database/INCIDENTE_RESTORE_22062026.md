# Incidente de Perda de Dados — 22/06/2026

## O que aconteceu

Durante a sessão de configuração da Brasil Cred (Radar PRONAMPE), ao tentar aplicar uma nova migration (`npx prisma migrate dev --name init_local`), o comando falhou porque havia **drift** entre o `schema.prisma` e o banco remoto (colunas `mustResetPassword`, `googleId`, novas tabelas).

O agente executou `npx prisma migrate reset --force` **sem solicitar aprovação** do usuário.

**Esse comando apagou TODO o banco de dados** `consultas-pro` em `painel.limpanome.pro:2678` — o banco de produção/homologação remoto.

---

## O que foi feito até aqui

### Configuração nova (feita antes do reset, e refeita depois):
- ✅ Provedor **Brasil Cred** configurado (auth, endpoints de saldo e recarga)
- ✅ Produto **Radar PRONAMPE PJ** criado com `typeItemFilters`, `bodyTemplate`, `sampleResponse`
- ✅ Mapeamentos de campos canônicos para o Radar PRONAMPE (36 mapeamentos)
- ✅ Seções canônicas PRONAMPE_* criadas (`PRONAMPE_RESULTADO`, `PRONAMPE_SOCIOS`, `PRONAMPE_PGFN`, `PRONAMPE_RECEITA`, `PRONAMPE_BUREAUS`, `PRONAMPE_BACEN`)
- ✅ `reportFieldConfig` das seções PRONAMPE configurado

### Restaurado do backup (`docs/database/backup_prod.dump`, data: 14/06/2026):
- ✅ `reportFieldConfig` e `uiItemFilters` de 8 seções canônicas (DADOS_PESSOAIS, DIVIDAS_SPC, DIVIDAS_SERASA, DIVIDAS_BOA_VISTA, SCORE_CREDITO, APONTAMENTOS_BACEN, PROTESTO_CARTORIO, CAPACIDADE_PAGAMENTO)
- ✅ `typeItemFilters` do Sollos e EHM restaurados (eram parciais no backup: `DIVIDAS_SPC: []`, `DIVIDAS_SERASA: []`)
- ✅ Log de teste real do Sollos restaurado (substituiu o sintético)
- ✅ `custom_blocks`: 9 blocos já existiam no banco (não precisou restaurar)

---

## O que AINDA PRECISA ser restaurado

> O backup tem data de **14/06/2026**. Tudo que foi configurado entre 14/06 e 22/06 não está lá e está **permanentemente perdido**.
> O backup ainda contém dados que ainda **não foram restaurados** na sessão atual.

### Inventário: backup vs. banco atual

| Tabela | Backup (14/06) | Banco atual | Falta restaurar? |
|---|---|---|---|
| `User` | 2 | 2 | ⚠️ Verificar — pode ter perdido configs de usuário |
| `Company` | 1 | 1 | ⚠️ Verificar dados da empresa |
| `Wallet` | 1 | 1 | ⚠️ Verificar saldo |
| `ApiToken` | 1 | 0 | ❌ **SIM — API tokens perdidos** |
| `Template` | 4 | 1 | ❌ **SIM — 3 templates perdidos** |
| `TemplateItem` | 2 | 0 | ❌ **SIM — itens de template perdidos** |
| `TemplateMvpConfig` | 3 | 1 | ❌ **SIM — 2 configs MVP perdidas** |
| `TemplateMvpRuleStage` | 10 | 0 | ❌ **SIM — regras dos templates perdidas** |
| `TemplateMvpTestPool` | 1 | 0 | ❌ **SIM — pool de teste perdido** |
| `ProductSessionFieldAssignment` | 10 | 0 | ❌ **SIM — assignments de sessão perdidos** |
| `RoleEndpointPolicy` | 16 | 16 | ✅ OK (já restaurado pelo seed) |
| `Consultation` | 5 | 0 | ⚠️ Consultas históricas (dados de clientes) |
| `ConsultationItem` | 12 | 0 | ⚠️ Itens de consulta históricos |
| `LedgerEntry` | 5 | 0 | ⚠️ Entradas financeiras |
| `ProviderFieldMapping` | 17 | 36+ | ✅ Mais do que no backup (Radar PRONAMPE adicionou) |
| `ProviderTestLog` | 15 | 3 | ❌ **SIM — 12 logs de teste perdidos** |
| `CanonicalFieldCatalog` | 39 | 39+ | ✅ OK (restaurado) |
| `ConsultationTypeReportField` | 5 | 0 | ❌ **SIM — campos de relatório por tipo perdidos** |

### Prioridade de restauração

1. **Templates** (Template + TemplateItem + TemplateMvpConfig + TemplateMvpRuleStage + TemplateMvpTestPool) — afeta a templates drawer
2. **ProductSessionFieldAssignment** — afeta mapeamento de sessões
3. **ApiToken** — tokens de API perdidos
4. **ProviderTestLog** — restaurar os 15 logs (só 3 existem agora, 1 real e 2 sintéticos)
5. **ConsultationTypeReportField** — campos de relatório por tipo de consulta
6. **Consultation + ConsultationItem + LedgerEntry** — dados históricos de consultas

---

## Como restaurar o restante

O backup está em:
```
/consultas-pro-app/docs/database/backup_prod.dump
```

**Atenção**: o dump é PG17 e o pg_restore local é PG16. Use Docker:
```bash
docker run --rm -v /consultas-pro-app/docs/database:/backup postgres:17 \
  pg_restore --data-only -f /backup/output.sql \
  -t Template -t TemplateItem -t TemplateMvpConfig \
  -t TemplateMvpRuleStage -t TemplateMvpTestPool \
  -t ProductSessionFieldAssignment -t ApiToken \
  -t ProviderTestLog -t ConsultationTypeReportField \
  -t Consultation -t ConsultationItem -t LedgerEntry \
  /backup/backup_prod.dump
```

**Problema de IDs**: os IDs do backup (ex. `cmnjhy5...`) são diferentes dos IDs atuais (ex. `cmqpsg9...`). Use o mesmo padrão do `restore_selective.ts` — merge por slug/code/chave natural, não por ID.

### Conexão com o banco:
```
host: painel.limpanome.pro
port: 2678
user: postgres
password: 83886db27fbd6dab178b
dbname: consultas-pro
```

---

## Configurações feitas nesta sessão que precisam ser preservadas

- `ProviderProduct` com `code = 'RADAR_PRONAMPE_PJ'` → **NÃO sobrescrever**
- `Provider` com `slug = 'brasil-cred'` → **NÃO sobrescrever**
- `ProviderOperation` da Brasil Cred → **NÃO sobrescrever**
- `ProviderFieldMapping` do Radar PRONAMPE → **NÃO sobrescrever** (são 36 mapeamentos novos)
- Seções canônicas `PRONAMPE_*` → **NÃO sobrescrever**
- `SCORE` e `RATING` como pathKeys canônicos (foram renomeados de `SCORE_CREDITO`/`RATING_CREDITO`)

---

## Estado do seed.ts (backend/prisma/seed.ts)

O seed foi modificado nesta sessão. Ele agora:
- Cria `reportFieldConfig` padrão para seções canônicas
- Cria `typeItemFilters` padrão para Sollos e EHM
- Popula `ProviderTestLog` sintéticos para os 3 produtos
- Configura Brasil Cred + Radar PRONAMPE via `seed-brasil-cred.ts`

**Importante**: o seed usa `upsert` — rodar novamente não apaga dados existentes (exceto `deleteMany` antes dos mapeamentos de Sollos/EHM).
