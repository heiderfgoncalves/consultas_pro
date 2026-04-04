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

## Checklist antes de finalizar

- [ ] Tokens e utilitarios visuais seguem `index.css`
- [ ] Componente existente reutilizado quando possivel
- [ ] Responsivo em mobile/tablet/desktop
- [ ] Dark mode funcional
- [ ] Componentes `ui/` ou `shared/` reaproveitados
- [ ] Shell autenticado e rotas permanecem coerentes com `App.tsx`
- [ ] Fluxo de consulta preserva clareza de saldo, custo e emissao
- [ ] Sem abstracoes importadas de outros projetos por habito
