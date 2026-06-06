import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { FadeUp, SectionHeader } from "./primitives";

const items = [
  {
    q: "Como funciona o modelo de cobrança?",
    a: "Você só paga pelos blocos de dados que escolheu incluir no template — o valor final é calculado antes da emissão. O débito acontece na carteira no momento da confirmação, com locking pessimista para garantir integridade. Falhas parciais são estornadas automaticamente.",
  },
  {
    q: "Quais fornecedores estão integrados?",
    a: "Mais de 40 — incluindo SOLLOS, Serasa, Boa Vista, SCPC, SPC e gateways verticais de cadastro e veículos. Todos consumidos via SDK unificado com de-para flat, então trocar de fornecedor não quebra seus templates.",
  },
  {
    q: "Posso operar com minha própria marca?",
    a: "Sim. White-label completo: domínio customizado via CNAME com SSL automático, tema (cores, logo, favicon) por tenant, tabela de preços própria e isolamento total de dados, carteira e usuários.",
  },
  {
    q: "Estou em conformidade com LGPD?",
    a: "Sim. Ledger transacional imutável, hash do payload por emissão, trilha de auditoria completa por usuário, rotinas configuráveis de retenção e expurgo, e nenhum dado pessoal é processado fora do escopo da consulta solicitada.",
  },
  {
    q: "Como funciona o motor math() em strings brasileiras?",
    a: 'O motor purifica os valores em runtime: identifica R$, %, separadores de milhar (ponto) e decimais (vírgula), converte em float, executa a operação e devolve o resultado no formato visual esperado. Exemplo: math("R$ 14.877,35" * 0.1) → 1487.735.',
  },
  {
    q: "Quanto tempo leva para subir em produção?",
    a: "Conta individual: instantâneo. Conta company com equipe: minutos. White-label com domínio customizado e tema: 1 dia útil após validação comercial.",
  },
];

export function FAQ() {
  return (
    <section className="py-6 border-t border-hairline">
      <div className="mx-auto max-w-3xl px-6">
        <SectionHeader
          eyebrow="08 — FAQ"
          title={<>Perguntas <span className="brand-text">frequentes.</span></>}
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
                <AccordionTrigger className="text-left text-[15px] font-normal hover:no-underline py-4">
                  <span className="flex items-center gap-3">
                    <span className="mono text-[10px] tracking-[0.18em] text-brand">0{i + 1}</span>
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
