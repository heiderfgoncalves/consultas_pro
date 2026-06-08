import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { FadeUp, SectionHeader } from "./primitives";

const items = [
  {
    q: "Como funciona o modelo de cobrança?",
    a: "A proposta do produto é operar com controle de consumo por consulta, saldo/carteira e rastreabilidade financeira. O valor pode ser estruturado por produto, template, empresa ou parceiro conforme a política comercial.",
  },
  {
    q: "Quais fornecedores estão integrados?",
    a: "A landing comunica o Consultas PRO como catálogo administrável de provedores, produtos, mappings e testes. O mais importante é que o sistema consiga normalizar respostas diferentes para relatórios mais consistentes.",
  },
  {
    q: "Posso operar com minha própria marca?",
    a: "Sim. A proposta white-label envolve widget, token, origem autorizada, identidade visual e rastreamento de consumo por empresa, parceiro ou usuário final.",
  },
  {
    q: "Estou em conformidade com LGPD?",
    a: "A plataforma deve ser operada com governança de dados, trilha de auditoria, controle de acesso e políticas de retenção. A conformidade final depende da configuração da operação, contratos e bases consultadas.",
  },
  {
    q: "Como funciona o motor math() em strings brasileiras?",
    a: 'O motor purifica os valores em runtime: identifica R$, %, separadores de milhar (ponto) e decimais (vírgula), converte em float, executa a operação e devolve o resultado no formato visual esperado. Exemplo: math("R$ 14.877,35" * 0.1) → 1487.735.',
  },
  {
    q: "Como é o melhor caminho para implantação?",
    a: "Comece pela demonstração e mapeamento do fluxo: provedores usados, tipos de consulta, relatório desejado, regras de saldo, perfis de equipe e necessidade de widget/API. Depois disso, a implantação pode ser faseada por módulos.",
  },
];

export function FAQ() {
  return (
    <section className="py-6 border-t border-hairline">
      <div className="mx-auto max-w-3xl px-6">
        <SectionHeader
          eyebrow="08 — FAQ"
          title={
            <>
              Perguntas <span className="brand-text">frequentes.</span>
            </>
          }
          align="center"
        />
        <FadeUp delay={0.1}>
          <Accordion type="single" collapsible className="mt-12 space-y-2">
            {items.map((it, i) => (
              <AccordionItem
                key={i}
                value={`i-${i}`}
                className="rounded-md border border-hairline bg-surface/40 px-5 data-[state=open]:border-brand/30 data-[state=open]:bg-surface/70 transition-colors"
              >
                <AccordionTrigger className="faq-trigger cursor-target text-left text-[15px] font-normal hover:no-underline py-4">
                  <span className="flex items-center gap-3">
                    <span className="mono text-[10px] tracking-[0.18em] text-brand">
                      0{i + 1}
                    </span>
                    {it.q}
                  </span>
                </AccordionTrigger>
                <AccordionContent className="text-[14px] leading-relaxed text-muted-foreground pb-5 pl-9">
                  {it.a}
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </FadeUp>
      </div>
    </section>
  );
}
