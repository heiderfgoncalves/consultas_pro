# Guia de Implementação — Padrão Visual Consultas PRO

> Como aplicar o novo design system (dark + aurora azul, HUD frames, tipografia
> Geist) em todas as telas internas do app a partir da landing já entregue.

---

## 1. Tokens (já definidos em `src/styles.css`)

Use **sempre** tokens semânticos — nunca `text-white`, `bg-blue-500`, etc.

| Token            | Uso                                              |
| ---------------- | ------------------------------------------------ |
| `bg-background`  | Fundo da página                                  |
| `bg-surface`     | Cards, painéis, modais                           |
| `bg-surface-2`   | Inputs, hover de itens de lista                  |
| `border-hairline`| Linhas 1px (divisores, bordas de card)           |
| `text-foreground`/`text-muted-foreground` | Texto primário / secundário     |
| `text-brand` / `bg-brand` | Único acento — KPIs, CTAs, badges ativos|
| `brand-text`     | Gradiente azul para palavras-chave em headlines  |
| `mono`           | Aplica Geist Mono                                |
| `eyebrow`        | Label monospace 11px uppercase com tracking      |
| `hud-frame` + `hud-corners` | Card "premium" com cantos em L         |
| `glass-card`     | Variante mais leve, translúcida                  |

## 2. Tipografia

- `font-sans` (Geist) para tudo
- `mono` em labels técnicas, métricas pequenas, "tags" `[ FOO ]`
- Headlines: `font-medium tracking-[-0.03em]` — nunca `font-bold`
- Use uma palavra-chave em `brand-text` por headline, no máximo

```tsx
<h2 className="text-3xl md:text-5xl font-medium tracking-[-0.03em]">
  Pipeline <span className="brand-text">auditável</span> ponta a ponta.
</h2>
```

## 3. Layout & espaçamento (business, denso)

- Container: `mx-auto max-w-7xl px-6`
- Seção: `py-20 md:py-24`
- Grid de cards: `gap-5` (não `gap-8`)
- Card interno: `p-6 md:p-8`
- Eyebrow → headline: `mt-4`; headline → parágrafo: `mt-3`
- Botão primário sempre com glow:
  `shadow-[0_0_36px_-8px_var(--color-brand)]`

## 4. Animações (todas via framer-motion)

**Regra de ouro:** sempre use o helper `FadeUp` de
`src/components/landing/primitives.tsx`. Ele já implementa a versão correta
de `useInView` (a versão `whileInView` com `margin` da v12 falha em SSR).

```tsx
import { FadeUp } from "@/components/landing/primitives";

<FadeUp delay={0.1}>
  <Card>...</Card>
</FadeUp>
```

Padrões reutilizáveis:

- **Stagger de lista:** itera com `motion.li` + `transition={{ delay: i * 0.06 }}`
- **Drawing line:** `motion.div initial={{ height: 0 }} animate={{ height: "100%" }}`
- **Counter:** ver `Metrics.tsx` (`useInView({ once: true, amount: 0 })`)
- **Page transition:** envolva o conteúdo da rota em `<PageTransition>` de
  `src/components/PageTransition.tsx`
- **Splash:** já injetada em `__root.tsx` — só na primeira carga

## 5. Componentes shadcn existentes

Mantenha-os, mas troque variantes para o novo tom:

```tsx
// Button primário institucional
<Button className="bg-brand text-primary-foreground shadow-[0_0_24px_-6px_var(--color-brand)] hover:shadow-[0_0_36px_-4px_var(--color-brand)]">
  Emitir relatório
</Button>

// Input no novo padrão
<div className="rounded-md border border-hairline bg-surface/40 backdrop-blur
  focus-within:border-brand/60
  focus-within:shadow-[0_0_0_3px_color-mix(in_oklab,var(--color-brand)_18%,transparent)]">
  <Input className="bg-transparent border-0 focus-visible:ring-0" />
</div>
```

## 6. Estrutura recomendada para telas do app

Cada tela interna deve ter:

```tsx
<div className="dark min-h-screen text-foreground relative isolate">
  <BackgroundFX />                              {/* aurora + grid sutil */}
  <AppShell>                                    {/* sidebar + topbar */}
    <PageTransition>
      <PageHeader
        eyebrow="CONSULTAS // OUTPUT"
        title={<>Histórico de <span className="brand-text">emissões</span></>}
        actions={<Button>Nova consulta</Button>}
      />
      <FadeUp>
        <HUDFrame>...conteúdo...</HUDFrame>
      </FadeUp>
    </PageTransition>
  </AppShell>
</div>
```

## 7. Mapa de migração — telas do Consultas PRO

| Tela atual                    | Como migrar                                                                 |
| ----------------------------- | --------------------------------------------------------------------------- |
| **Login**                     | ✅ pronto em `/login` — usar como referência canônica                       |
| **Dashboard**                 | KPIs com `Counter`, cards em `hud-frame`, gráficos com cor `--color-brand` |
| **Consultas — listar**        | Tabela em `glass-card`, linhas `border-hairline`, status com `PulseDot`    |
| **Consultas — emitir**        | Wizard estilo SevenSteps (linha drawing), terminal de output como `TerminalOutput` |
| **Templates — editor**        | Sidebar de blocos como Drawer dark, canvas com grid igual `BackgroundFX`   |
| **Carteira / Saldo**          | `Counter` no saldo, transações em lista densa com `mono` nos valores       |
| **Integrações**               | Grid `grid-cols-4` igual `WorkflowSplit.tsx`, cards com hover `border-brand/50` |
| **Equipe / Permissões**       | Tabela densa, badges de role em `bg-brand/15 text-brand mono uppercase`    |
| **Configurações / White-label** | Form em `hud-frame`, color picker mostrando o gradient brand              |
| **Documentação API**          | Layout 2 colunas, code blocks em `bg-surface-2` com `mono`, scrollspy      |
| **Webhooks / Logs**           | Stream estilo `TerminalOutput`, severidade colorida (brand / destructive)  |

## 8. Plugar no backend (ngrok)

Está exposto em `https://coyness-mummified-hardhead.ngrok-free.dev`.
Defina um helper em `src/lib/api.ts`:

```ts
const BASE = import.meta.env.VITE_API_BASE ??
  "https://coyness-mummified-hardhead.ngrok-free.dev";

export async function api<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    ...init,
    headers: { "Content-Type": "application/json", ...(init?.headers ?? {}) },
  });
  if (!res.ok) throw new Error(`${res.status} ${await res.text()}`);
  return res.json() as Promise<T>;
}
```

Use sempre dentro de `useQuery` para se beneficiar do TanStack Query já
configurado em `src/router.tsx`.

## 9. Checklist por tela

- [ ] `BackgroundFX` montado uma única vez no shell
- [ ] Headlines em `font-medium`, nunca `font-bold`
- [ ] Apenas **uma** palavra em `brand-text` por headline
- [ ] Listas longas usam `FadeUp` com stagger (delay `i * 0.05`)
- [ ] CTAs primários com glow azul
- [ ] Inputs com `border-hairline` + foco azul
- [ ] Métricas usam `tabular-nums` + `Counter`
- [ ] Bordas e divisores em `border-hairline` (1px, nunca 2px+)
- [ ] Nada de `bg-white`, `text-black`, `bg-gray-*` literais

## 10. Anti-patterns a evitar

- ❌ Múltiplas cores de acento (vermelho, verde, roxo) — apenas azul + destructive
- ❌ Sombras "drop-shadow" pesadas — use glow azul controlado
- ❌ Cards opacos `bg-card` puro — prefira `hud-frame` / `glass-card`
- ❌ Headlines com `tracking-tight` padrão — use `tracking-[-0.03em]`
- ❌ Animar tudo — só elementos de entrada de seção e KPIs
- ❌ Hover scale > 1.02 — o ar premium vem do glow, não da escala

---

**Pronto.** Seguindo este guia, toda tela do app vai herdar o mesmo padrão
visual da landing sem refazer decisões de design.
