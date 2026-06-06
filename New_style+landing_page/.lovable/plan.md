
# Plano: Landing institucional do Consultas PRO — estilo Compozy em azul

Mudança de rumo: **só a landing por enquanto**, direto, inspirada nos prints. Sem importar app, sem refazer sistema. Depois do seu OK, incorporo no app.

## Identidade visual (travada)
- **Estética**: dark-first, console técnico, denso, brackets `[ ]`, eyebrows em mono uppercase com tracking largo, divisores 1px com gradiente, cantos em "L" tipo HUD (igual ao print do COMPOZY.PIPELINE).
- **Azul de marca**: `#0A84FF` light / `#2196FF` dark — substitui 100% o verde neon do Compozy. Único acento, usado com parcimônia (badges "RUNNING", pulses, highlights de etapas, números das listas).
- **Neutros**: zinc-950 fundo, zinc-925 superfícies, zinc-900 bordas, zinc-400/500 texto secundário.
- **Tipografia**: Geist Sans (display/body) + Geist Mono (eyebrows, terminais, badges, labels técnicos). Display 56-72px com tracking -0.03em, corpo 14-15px, mono 10-11px uppercase tracking 0.2em.
- **Espaçamento**: compacto (py-20 entre seções, max-w-7xl, gap-4 entre cards). Nada de respiração exagerada.

## Animações ("nem sutil, nem exagerado")
Tudo com `framer-motion` + CSS. Aplicação:
- **Hero**: fade-up sequencial (eyebrow → headline → sub → CTAs → mockup), duração 600ms, stagger 80ms.
- **Pipeline horizontal de 7 etapas** (igual print 2): linha que se desenha da esquerda pra direita ao entrar no viewport, ícones aparecem 1 a 1, número badge faz pop, etapa ativa pulsa em azul.
- **Cards de feature**: hover-lift 2px + border azul translúcida + glow sutil; entrada com fade-up no scroll, stagger 60ms entre cards do mesmo grid.
- **Terminal "// OUTPUT"** (igual print 1, bloco inferior direito): linhas de log digitando em sequência com cursor piscando, loop infinito reiniciando a cada 6s.
- **Badges "RUNNING"**: ponto verde-azul com `ping` pulse.
- **Contadores de métricas**: animação de 0 → valor final em 1.2s ao entrar no viewport.
- **CTA final**: border-beam azul rodando pelo perímetro do card.
- **Gradient mesh**: blob azul no hero respirando lentamente (12s loop).
- **Logos / abas que trocam**: tabs do "STRUCTURED PIPELINE" com indicador deslizante (layoutId).

## Estrutura da landing (preenchida com info real das docs)

1. **Top nav slim** — logo `[ CONSULTAS_PRO ]` + links (Plataforma, Integrações, Templates, Preços, Docs) + "Entrar" + CTA "Começar grátis".

2. **Hero**
   - Eyebrow chip `[ v2.0 — PIPELINE ENGINE ]` com dot pulsante.
   - Headline: **"Relatórios de crédito que você desenha. Em segundos."** (palavra "desenha" em azul gradient).
   - Sub: "SaaS modular para consulta de dívidas, cadastro e crédito. Monte o layout do seu relatório, escolha os blocos que importa pagar, e emita com saldo em carteira — sem pacotes engessados."
   - CTAs: "Começar grátis" (sólido azul) + "Ver documentação →" (ghost).
   - Linha de métricas inline embaixo: `40+ FORNECEDORES • 9 TIPOS DE CONSULTA • <250ms LATÊNCIA`.

3. **Hero Mockup** — réplica do card "COMPOZY.PIPELINE" adaptado:
   - Frame com cantos em L, header `[ >> CONSULTAS.PIPELINE ]` + badge "RUNNING" azul.
   
   ## Component Analysis: Cyberpunk Progress & Status Bars

   **Context**
   Two distinct interactive components were analyzed: a vertical "Futuristic Steps" timeline and a horizontal "System Status" progress bar. Both utilize a high-tech/cyberpunk aesthetic involving lime-green accents and smooth state transitions.

   ### 1. Vertical Timeline (Steps)
   Analysis of a vertical sequence featuring a "scanning" progress animation and synchronized hover effects.

   **Diagnostics**
   *   **Scanning Effect:** A vertical track contains an absolute-positioned element with a lime-green gradient.
   *   **State Management:** Uses Tailwind's `group/step` to trigger multiple child transitions simultaneously.

   | Animation Element | Technical Implementation | Timing Function |
   | :--- | :--- | :--- |
   | **Scanner Bar** | `translateY(-100% to 300%)` | Linear (Infinite) |
   | **Step Label** | `translate-x-2` on group hover | 300ms Cubic-bezier |
   | **Active Glow** | `animate-pulse` + `box-shadow` | 2s Infinite |

   **Actionable Recommendations**
   *   **Scanning Logic:** Implement the scanner using `transform: translateY` rather than `top` for hardware acceleration.
   *   **Smooth Hover:** Apply `transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1)` to text containers for a fluid response.

   ```css
   @keyframes scan {
     0% { transform: translateY(-100%); }
     100% { transform: translateY(300%); }
   }
   .scanner { animation: scan 3s linear infinite; }
   ```

   ---

   ### 2. Horizontal Status Bar
   Analysis of a 6-item horizontal status grid used for system features or activated traits.

   **Diagnostics**
   *   **Flex Distribution:** Uses `flex-1` on all items within a `justify-between` container to ensure equal spacing regardless of screen width.
   *   **Connector Logic:** Each item features an absolute-positioned `1px` high `div` starting at `left: 50%`. These overlap to create a continuous track.

   | Feature | Styling Finding | State Trigger |
   | :--- | :--- | :--- |
   | **Connectors** | `absolute top-[20px] left-[50%] h-[1px]` | Passive |
   | **Active Icon** | `border-lime-500/40`, `text-lime-500` | Conditional Class |
   | **Inactive Icon** | `border-stone-700`, `text-stone-500` | Default Class |

   **Actionable Recommendations**
   *   **Layered Connectors:** Place the progress line at `z-index: -10` to ensure it appears behind icon boxes.
   *   **Visual Continuity:** Overlap a green connector on top of the grey one for "Active" items to represent progress.
   *   **Micro-interactions:** Use `rounded-sm` (approx. 2px radius) on `10x10` containers to maintain the "military/chip" aesthetic.

   ```jsx
   // Suggested logic for dynamic states
   <div className={`w-10 h-10 border transition-all duration-500 ${
     active ? 'border-lime-500 text-lime-500' : 'border-stone-800 text-stone-600'
   }`}>
     {icon}
   </div>
   ```

   *Note: The code fixes and findings above were identified on a live page in DevTools. When applying them to your codebase, please adapt them to your project's specific technical stack (e.g., Tailwind CSS classes, CSS modules, framework components) rather than applying them as literal CSS overrides.*

4. **Bento split (igual print 1 inferior)** — 2 colunas:
   - **Esquerda — `WORKFLOW`**: título "PIPELINE ESTRUTURADO / EM 5 ETAPAS" com "5 ETAPAS" em azul.
     
     ## Animation Breakdown: Futuristic Timeline Component

     **Context**
     Analysis of a vertical "Steps" or "Timeline" component featuring a cyberpunk aesthetic with a scanning progress bar and interactive hover states.

     **Diagnostics**
     The component utilizes a combination of Tailwind CSS classes and custom keyframe animations to achieve its visual effects.

     | Element Role | Key Animation Properties | Transition Timing |
     | :--- | :--- | :--- |
     | **Progress Line** | `translateY`, `opacity` | Infinite (Linear) |
     | **Step Container** | `translate-x`, `color` | 300ms (Cubic-bezier) |
     | **Active Indicator** | `scale`, `box-shadow` | 500ms (Cubic-bezier) |
     | **Active Background** | `pulse` animation | Infinite (Pulse) |

     **Actionable Findings**
     *   **Scanning Effect:** The vertical progress line (`div.bg-stone-900`) contains absolute-positioned "scanner" elements. These move from `-top-full` to beyond the bottom using CSS keyframes, combined with a lime-green gradient and glow.
     *   **Group Hover Interactions:** Using `group/step` classes, hovering over a step triggers a `2px` horizontal shift (`translate-x-2`) of the text container and a color transition for the step number's border.
     *   **Active State:** The currently active step is emphasized via `scale-110` and an internal `animate-pulse` div with a low-opacity lime background.
     *   **Connector Logic:** Small horizontal lines (`h-[1px]`) link the main vertical track to each step number, changing color on hover to simulate "activation."

     **Code Fixes**
     The following CSS and structure are identified as a potential implementation for the scanning and hover logic:

     ```css
     /* Custom Scanning Keyframes */
     @keyframes scan {
       0% { transform: translateY(-100%); }
       100% { transform: translateY(300%); }
     }

     .scanning-line-primary {
       animation: scan 3s linear infinite;
       background: linear-gradient(to bottom, transparent, #84cc16);
       filter: drop-shadow(0 0 10px rgba(132, 204, 22, 0.8));
     }

     /* Hover Interaction Example */
     .step-item:hover .text-container {
       transform: translateX(8px);
       transition: transform 0.3s cubic-bezier(0.4, 0, 0.2, 1);
     }
     ```

     **Recommendations**
     *   **Fluidity:** Ensure all transitions use `cubic-bezier(0.4, 0, 0.2, 1)` to maintain the premium feel of the original UI.
     *   **Stacking:** Maintain `z-index: 10` on step items to ensure they sit above the absolute-positioned progress line.
     *   **Performance:** Use `transform: translateY` instead of `top` for the scanning animation to ensure 60fps performance by avoiding layout recalculations.

     *Note: The code fixes and findings above were identified on a live page in DevTools. When applying them to your codebase, please adapt them to your project's specific technical stack (e.g., Tailwind CSS classes, CSS modules, framework components) rather than applying them as literal CSS overrides.*
   - Item ativo (03) destacado em quadrado azul.
   - Footer chip: `MODO: PROD` / `FLAT_FIRST`.
   - **Direita — `INTEGRAÇÕES`**: número grande "40+", grid 2x4 de mini-cards com ícones de provedores (SOLLOS, etc.), abaixo stats `TIPOS 9 built-in / ETAPAS 5 / DEPS Zero`.
   - Abaixo: **CONSULTAS // OUTPUT** — terminal animado com logs reais do fluxo:
     ```
     [10:00:08] EMIT  Enfileirando job de emissão...
     [10:00:10] FETCH Consultando 4 provedores em paralelo...
     [10:00:12] MAP   Aplicando de-para FLAT → TEMPLATE
     [10:00:14] LEDGER Débito R$ 14,77 confirmado
     [10:00:15] DONE  PDF gerado em 1.2s
     ```

5. **Pipeline horizontal de 7 etapas** (igual print 2, full-width):
   IDEIA → CONSULTA → DE-PARA → TEMPLATE → EMISSÃO → ENTREGA → AUDITORIA. Linha conectora desenhando, badges numerados, descrições curtas embaixo.

6. **"100% LOCAL OU CLOUD" (igual print 3)** — split 50/50:
   - Esquerda: card com 4 sub-cards (SEU TERMINAL / API ENGINE / IA AGENTS / SEUS DADOS) com bolinhas azul pulsantes.
   - Direita: "06 — WHITE-LABEL" + "Seu produto, sua marca, seu domínio." + bullets (multi-tenant, domínio customizado, tema próprio, isolamento de dados).

7. **Bento de diferenciais** (3x2 mistos):
   - Templates Drawer (drag-and-drop) [grande]
   - Motor `math()` com purificação BR
   - LGPD + Auditoria
   - 5 perfis de acesso (Admin/Master/Gestor/Operador/Indiv.)
   - Carteira compartilhada
   - White-label completo

8. **"COMECE AQUI / Instale em segundos" (igual print 4)** — 4 cards de início:
   - WEB (RECOMENDADO) → `app.consultaspro.com`
   - API REST → `curl https://api.consultaspro.com/v1/emit`
   - SDK Node → `npm install @consultas-pro/sdk`
   - WHITE-LABEL → "Fale com vendas"
   Botão copy nos snippets.

9. **Métricas animadas** — 4 números: 40+ fornecedores / 9 tipos / 99.9% uptime / <250ms latência.

10. **FAQ** accordion 5-6 itens (LGPD, white-label, tipos suportados, integração, preços).

11. **CTA final** — card com border-beam azul: "Pronto para emitir relatórios sob medida?" + 2 CTAs.

12. **Footer 4 colunas** + linha de créditos com mono.

## Arquivos a criar/editar (apenas isto)
- `src/styles.css` — tokens dark-first + paleta azul + fontes Geist + utilitárias (`.hud-corner`, `.eyebrow`, `.terminal-line`).
- `src/routes/__root.tsx` — registrar fontes Geist (via @fontsource), `dark` class no html.
- `src/routes/index.tsx` — landing montada a partir das seções abaixo.
- `src/components/landing/Nav.tsx`
- `src/components/landing/Hero.tsx`
- `src/components/landing/PipelineCard.tsx` (réplica do "COMPOZY.PIPELINE")
- `src/components/landing/WorkflowSplit.tsx` (réplica do split print 1)
- `src/components/landing/TerminalOutput.tsx` (logs animados)
- `src/components/landing/SevenSteps.tsx`
- `src/components/landing/LocalOrCloud.tsx`
- `src/components/landing/FeaturesBento.tsx`
- `src/components/landing/StartHere.tsx`
- `src/components/landing/Metrics.tsx`
- `src/components/landing/FAQ.tsx`
- `src/components/landing/FinalCTA.tsx`
- `src/components/landing/Footer.tsx`
- `src/components/landing/primitives.tsx` (HUDFrame, Eyebrow, BorderBeam, FadeUp)
- Instalar: `framer-motion`, `@fontsource/geist-sans`, `@fontsource/geist-mono`, `lucide-react`.

## Fora deste turno
- Não importar `frontend/` ainda.
- Não conectar backend ngrok (landing é estática).
- Não migrar páginas internas, não tocar em login/dashboard, não criar sistema de temas trocáveis.

## O que entrego
Landing dark, densa, animada, com a mesma "vibe Compozy" mas 100% azul e em português, preenchida com o vocabulário real do Consultas PRO (pipeline, de-para, templates drawer, math(), ledger, white-label, 5 perfis).

## Próximo passo após você ver
Você dá OK ou pede ajustes pontuais. Quando aprovar, abro a fase 2: incorporar o tema globalmente no `frontend/` e portar páginas internas.
