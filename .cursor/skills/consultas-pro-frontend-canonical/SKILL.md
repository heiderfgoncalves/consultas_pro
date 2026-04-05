---
name: consultas-pro-frontend-canonical
description: Guides canonical frontend changes in Consultas PRO using Vite 5, React 18, React Router, shadcn/ui and Tailwind CSS v3. Use when creating or changing pages, components, styles, navigation or frontend state in this repository.
---

# Consultas PRO Frontend Canonical

## Stack

- React 18 + TypeScript + Vite
- Tailwind CSS v3
- shadcn/ui components (Radix UI primitives)
- Lucide React icons
- react-router-dom para routing
- TanStack Query + Zustand no app shell
- Framer Motion, dnd-kit, React Hook Form e Zod em fluxos especificos

## Estrutura real

```txt
frontend/src/
  components/
    consultation/
    layout/
    shared/
    ui/
  pages/
  stores/
  lib/
  App.tsx
  index.css
```

## Shell e navegacao atual

- Paginas publicas: `/login`, `/cadastro`, `/recuperar-acesso`
- Shell autenticado: `AuthenticatedLayout` + `AppSidebar` + `TopBar`
- Rotas internas atuais: `/dashboard`, `/consulta/nova`, `/consulta/historico`, `/financeiro`, `/financeiro/recarga`, `/equipe`, `/perfil`, `/admin`, `/admin/integracoes`

## Workflow obrigatorio

1. **Reuse-first**: verificar `components/ui/`, `components/shared/` e padroes de paginas existentes antes de criar algo novo.
2. **Tokens reais**: usar os tokens existentes de `frontend/src/index.css`, como `--background`, `--foreground`, `--card`, `--primary`, `--border`, `--sidebar-*` e `--radius`.
3. **Nao inventar abstracoes ausentes**: nao presumir `PageShell`, `PageSection`, `@/lib/api.ts` ou tokens `--sf-*` sem validar no codigo.
4. **Classes utilitarias do repo**: priorizar `bg-card`, `text-foreground`, `border-border`, `text-muted-foreground`, `shadow-card`, `shadow-elevated`, `gradient-primary`.
5. **Responsividade real**: seguir o padrao mobile-first ja usado nas paginas com `sm:`, `md:` e `lg:`.
6. **Tema**: preservar o comportamento de `ThemeProvider` e `ThemeToggle` ja existentes.
7. **Estado e dados**: respeitar o stack atual com `React Router`, `TanStack Query` e `Zustand`, sem introduzir frameworks paralelos.
8. **Shell atual**: preservar o fluxo de `AuthenticatedLayout`, `AppSidebar` e `TopBar` ao mexer em navegacao ou layout global.
9. **Builder de consulta**: manter o principio do produto descrito em `docs`: desktop com experiencia ampla e saldo/total visiveis; mobile em passos quando o fluxo ficar denso.
10. **Reuso utilitario**: para composicao de classes, usar `cn()` de `frontend/src/lib/utils.ts`; para dialog, drawer, tabs, tables e formularios, preferir componentes existentes.

## Desenvolvimento local: Vite, HMR e React Fast Refresh

O `npm run dev` no `frontend/` usa **Vite 5**, que ja entrega **HMR** (troca de modulo sem recarregar a pagina inteira). Para UI React, o que preserva estado entre edits e **nao** fecha modais é o **React Fast Refresh**, embutido em `@vitejs/plugin-react-swc` — nao é um segundo “modo” a ligar; depende de o grafo de modulos ser compativel com as regras do Fast Refresh.

### Por que a pagina “pisca” e o modal fecha

Quando o Fast Refresh **nao** pode aplicar um patch seguro, o runtime **cai no reload completo** (comportamento documentado pelo ecossistema React Refresh). Sintomas: flash branco, perda de estado local, WebSocket/Full reload no console do Vite.

A causa mais comum em `.tsx`: **exportar no mesmo arquivo um componente React e outros valores** (funcoes utilitarias, hooks exportados, objetos de configuracao, etc.). Arquivos assim deixam de ser “modulos so de componentes” e o refresh costuma invalidar **todo** o boundary, subindo até recarregar a app.

Referencias oficiais / canonicas para a regra mental:

- [Vite — Hot Module Replacement](https://vitejs.dev/guide/features.html#hot-module-replacement): transporte de atualizacao em dev; o comportamento fino na UI React vem do plugin + Fast Refresh.
- [React — pacote `react-refresh` (README)](https://github.com/facebook/react/blob/main/packages/react-refresh/README.md): Fast Refresh evita perder estado ao editar componentes; bundlers usam esse pacote para decidir o que pode ser patchado.
- [Nota de integracao (Fast Refresh + bundlers)](https://github.com/facebook/react/issues/16604#issuecomment-528663101): guia historico usado por plugins; reforca que **modulos que misturam componentes com outros exports** tendem a forcar invalidacao larga ou reload completo.

### Padrao deste repositorio

1. **Um arquivo `.tsx` de componente deve exportar só componentes** (e, quando necessario, **somente tipos** em `export type` — tipos somem em runtime e nao quebram o Fast Refresh).
2. **Funcoes puras, helpers, parsers, builders, constantes nao triviais** compartilhadas: colocar em **`frontend/src/lib/*.ts`** (ou outro `.ts` dedicado), nao no mesmo `.tsx` que exporta o componente visual.
3. **Excecao ESLint**: `react-refresh/only-export-components` esta habilitada com `allowConstantExport: true` em `frontend/eslint.config.js` — **constantes** exportadas no mesmo arquivo que um componente podem ser aceitas pela regra; **funcoes exportadas** nao.
4. **Nao refatorar o repo inteiro por precaução**: corrigir quando houver **reload completo** ao salvar ou quando o ESLint apontar o aviso; priorizar arquivos grandes de fluxo (ex.: integracoes, dialogs) onde perder estado dói.

### Verificação rápida

- Rodar `npm run lint` no `frontend/` e tratar avisos `react-refresh/only-export-components`.
- Se após salvar um `.tsx` a aba recarregar por completo, inspecionar `export` mistos nesse arquivo ou nos imports diretos do mesmo “chunk” de UI.

## Checklist antes de finalizar

- [ ] Tokens e utilitarios visuais seguem `index.css`
- [ ] Componente existente reutilizado quando possivel
- [ ] Responsivo em mobile/tablet/desktop
- [ ] Dark mode funcional
- [ ] Componentes `ui/` ou `shared/` reaproveitados
- [ ] Shell autenticado e rotas permanecem coerentes com `App.tsx`
- [ ] Fluxo de consulta preserva clareza de saldo, custo e emissao
- [ ] Sem abstracoes importadas de outros projetos por habito
- [ ] Arquivos `.tsx` que exportam componentes nao misturam exports de funcoes/helpers (usar `lib/*.ts` quando preciso preservar HMR/Fast Refresh)
