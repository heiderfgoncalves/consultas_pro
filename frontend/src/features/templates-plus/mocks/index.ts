import { nanoid } from "@/lib/id";
import type { QueryType, LibraryBlock, SectionNode, FieldNode, FieldTag, TemplateDoc } from "../types";

/** Tag-based visual defaults so the hotbar shows real numbers (not "—"). */
const DEFAULTS: Partial<Record<FieldTag, Partial<FieldNode>>> = {
  text:        { fontSize: 11, fontWeight: "400", spacing: 0, padding: 0, align: "left" },
  value:       { fontSize: 13, fontWeight: "600", spacing: 0, padding: 0, align: "left" },
  label:       { fontSize: 10, fontWeight: "600", spacing: 0, padding: 0, align: "left" },
  image:       { spacing: 0, padding: 0, width: "auto", align: "left" },
  icon:        { fontSize: 16, spacing: 0, padding: 0 },
  divider:     { spacing: 8, padding: 0 },
  table:       { fontSize: 10, spacing: 0, padding: 0 },
  speedometer: { spacing: 0, padding: 0 },
  container:   { layout: "column", gap: 8, padding: 0 },
};

const f = (partial: Omit<FieldNode, "id">): FieldNode => {
  const d = DEFAULTS[partial.tag] ?? {};
  return { id: nanoid(), ...d, ...partial };
};


/* ---------- Section factories (faithful to reference report) ---------- */

export const makeHeader = (): SectionNode => ({
  id: nanoid(), name: "Header", kind: "header", icon: "FileText",
  fields: [
    f({ tag: "image", label: "Logo", value: "{$template.logo}", meta: { slot: "logo" } }),
    f({ tag: "value", label: "Empresa", value: "Consultas Pró" }),
    f({ tag: "text", label: "Subtítulo", value: "Relatório Analítico de Crédito" }),
    f({ tag: "value", label: "Data", value: "{$template.date}" }),
    f({ tag: "value", label: "Protocolo", value: "{$template.protocol}" }),
  ],
});

export const makePersonal = (): SectionNode => ({
  id: nanoid(), name: "Dados do Cliente", kind: "personal", icon: "User",
  fields: [
    f({ tag: "value", label: "Cliente Analisado", value: "{$cliente.nome}", icon: "User" }),
    f({ tag: "value", label: "Documento", value: "{$cliente.documento}", icon: "Hash" }),
    f({ tag: "value", label: "Tipo de Relatório", value: "Premium (Completa)", icon: "Tag" }),
  ],
});

export const makeFinancial = (): SectionNode => ({
  id: nanoid(), name: "Resumo Financeiro", kind: "kpi-row", icon: "DollarSign",
  fields: [
    f({ tag: "value", label: "Total Apontado", value: "{$RESUMO_FINANCEIRO.totalApontado}", color: "var(--color-destructive)", meta: { hint: "Soma bruta de apontamentos" } }),
    f({ tag: "value", label: "Total Deduzido", value: "{$RESUMO_FINANCEIRO.totalDeduzido}", color: "var(--color-success)", meta: { hint: "Sem duplicidades" } }),
    f({ tag: "value", label: "Risco Bacen (Vencido)", value: "{$RESUMO_FINANCEIRO.riscoBacenVencido}", color: "var(--color-warning)", meta: { hint: "Prejuízo + Vencido" } }),
  ],
});

export const makeScore = (): SectionNode => ({
  id: nanoid(), name: "Score de Crédito", kind: "score", icon: "Gauge",
  fields: [
    f({ tag: "text", label: "Título", value: "Como o mercado enxerga seu CPF hoje (e o que está travando seu crédito)", fontSize: 14 }),
    f({ tag: "text", label: "Subtítulo", value: "Seu Score é uma estimativa de chance de pagar em dia nos próximos 6 meses. Quanto maior a pontuação, maior tende a ser a facilidade para conseguir crédito e melhores condições.", fontSize: 11, color: "var(--color-muted-foreground)" }),
    f({ tag: "speedometer", label: "Velocímetro", value: "{$SCORE.valor}" }),
    f({ tag: "value", label: "Faixa", icon: "Tag", value: "{$SCORE.faixa}", meta: { desc: "Risco moderado. Valide renda e estabilidade." } }),
    f({ tag: "value", label: "Score", icon: "Gauge", value: "{$SCORE.valor}", meta: { desc: "Quanto maior, melhor a predisposição ao crédito." } }),
    f({ tag: "value", label: "Chance de pagar (6 meses)", icon: "CheckCircle", value: "{$SCORE.chancePagar}%", meta: { desc: "Estimativa de adimplência nos próximos 6 meses." } }),
    f({ tag: "value", label: "Probabilidade de inadimplência", icon: "AlertTriangle", value: "{$SCORE.probabilidadeInadimplencia}%", meta: { desc: "Estimativa de inadimplência — use como apoio à decisão." } }),
    f({ tag: "text", label: "Interpretação", value: "Hoje seu Score está em {$SCORE.faixa} ({$SCORE.valor}) — isso geralmente indica que o mercado enxerga risco moderado. O objetivo aqui é identificar o que mais pesa na sua pontuação e montar o caminho mais rápido para destravar aprovações." }),
    f({ tag: "text", label: "Influência - título", value: "O que mais influencia sua pontuação", fontSize: 12 }),
    f({ tag: "text", label: "Influência - texto", value: "O Serasa Score é calculado por pilares. Os que mais pesam são hábitos de pagamento e experiência/relacionamento com o mercado — e dívidas negativadas também têm impacto alto, considerando inclusive o tempo desde a quitação." }),
    f({ tag: "text", label: "Diagnóstico", value: "O que trava crédito quase sempre é simples: pendência/negativação + histórico recente. A boa notícia é que, com estratégia, dá pra acelerar sua reabilitação e voltar a ser aprovado com mais facilidade." }),
    f({ tag: "text", label: "Plano - título", value: "Plano de Ação — Seu Próximo Passo", fontSize: 12 }),
    f({ tag: "text", label: "Plano - passo 1", value: "Limpar negativações ::: Negocie e quite as dívidas em aberto para remover apontamentos restritivos." }),
    f({ tag: "text", label: "Plano - passo 2", value: "Manter pagamentos em dia ::: Pague cartões e parcelas antes do vencimento — isso reconstrói o histórico positivo." }),
    f({ tag: "text", label: "Plano - passo 3", value: "Reduzir consultas de crédito ::: Evite múltiplas simulações em pouco tempo — o mercado interpreta como risco." }),
    f({ tag: "text", label: "Disclaimer", value: "Score e faixas são indicadores estatísticos e não garantem aprovação de crédito. A decisão final é do credor." }),
  ],
});

export const makeSerasaTable = (): SectionNode => ({
  id: nanoid(), name: "Serasa - Base I", kind: "serasa-table", icon: "AlertTriangle",
  fields: [
    f({ tag: "label", label: "Inclusão",          value: "dtInclusao" }),
    f({ tag: "label", label: "Vencimento",        value: "dtVencimento" }),
    f({ tag: "label", label: "Origem / Credor",   value: "origem" }),
    f({ tag: "label", label: "Contrato",          value: "contrato" }),
    f({ tag: "label", label: "Valor (R$)",        value: "valor" }),
  ],
});

export const makeSpcTable = (): SectionNode => ({
  id: nanoid(), name: "SPC - SCPC", kind: "spc-table", icon: "AlertTriangle",
  fields: [
    f({ tag: "label", label: "Dt Ocorr.",   value: "dtOcorr" }),
    f({ tag: "label", label: "Inclusão",    value: "dtInclusao" }),
    f({ tag: "label", label: "Origem",      value: "origem" }),
    f({ tag: "label", label: "Contrato",    value: "contrato" }),
    f({ tag: "label", label: "Valor (R$)",  value: "valor" }),
  ],
});

export const makeBacen = (): SectionNode => ({
  id: nanoid(), name: "Relatório Banco Central (SCR) - Bacen", kind: "bacen", icon: "Building2",
  fields: [
    f({ tag: "text", label: "Resumo", value: "Visão consolidada do relacionamento com o sistema financeiro nacional (SCR)." }),
    f({ tag: "value", label: "Relacionamento", value: "29/07/2019" }),
    f({ tag: "value", label: "Instituições", value: "5" }),
    f({ tag: "value", label: "Operações", value: "9" }),
  ],
});

export const makeProtestos = (): SectionNode => ({
  id: nanoid(), name: "Protestos", kind: "protestos", icon: "FileWarning",
  fields: [
    f({ tag: "text", label: "Mensagem", value: "Nenhum protesto em cartório localizado." }),
  ],
});

export const makeDebtTable = (): SectionNode => ({
  id: nanoid(), name: "Tabela de Dívidas (genérica)", kind: "debt-table", icon: "Table",
  fields: [
    f({ tag: "label", label: "Tipo",     value: "tipo" }),
    f({ tag: "label", label: "Credor",   value: "credor" }),
    f({ tag: "label", label: "Contrato", value: "contrato" }),
    f({ tag: "label", label: "Valor",    value: "valor" }),
  ],
});

export const makeFooter = (): SectionNode => ({
  id: nanoid(), name: "Rodapé", kind: "footer", icon: "FileText",
  fields: [
    f({ tag: "text", label: "Texto", value: "Relatório gerado por Consultas Pró. Dados estatísticos para apoio à decisão de crédito." }),
  ],
});

/* ---------- Library catalog ---------- */

export const fixedBlocks: LibraryBlock[] = [
  { id: "blk-header",    name: "Header",            description: "Cabeçalho com logo, empresa, data e protocolo", icon: "LayoutTemplate", category: "fixo", system: true, make: makeHeader },
  { id: "blk-personal",  name: "Dados do Cliente",  description: "Card com nome, documento e tipo de relatório",  icon: "User",           category: "fixo", system: true, make: makePersonal },
  { id: "blk-financial", name: "Resumo Financeiro", description: "Linha de KPIs financeiros com cores semânticas", icon: "DollarSign",     category: "fixo", system: true, make: makeFinancial },
  { id: "blk-score",     name: "Score de Crédito",  description: "Velocímetro, faixas, plano de ação e disclaimer", icon: "Gauge",         category: "fixo", system: true, make: makeScore },
  { id: "blk-serasa",    name: "Serasa - Base I",   description: "Tabela de apontamentos Serasa",                   icon: "AlertTriangle", category: "fixo", system: true, make: makeSerasaTable },
  { id: "blk-spc",       name: "SPC - SCPC",        description: "Tabela de apontamentos SPC/SCPC",                 icon: "AlertTriangle", category: "fixo", system: true, make: makeSpcTable },
  { id: "blk-bacen",     name: "Bacen (SCR)",       description: "Consolidado financeiro do Banco Central",         icon: "Building2",     category: "fixo", system: true, make: makeBacen },
  { id: "blk-protestos", name: "Protestos",         description: "Bloco de protestos em cartório",                  icon: "FileWarning",   category: "fixo", system: true, make: makeProtestos },
  { id: "blk-footer",    name: "Rodapé",            description: "Rodapé de assinatura do relatório",               icon: "FileText",      category: "fixo", system: true, make: makeFooter },
];

export const customBlocks: LibraryBlock[] = [
  {
    id: "blk-kpi", name: "Card KPI", description: "Card com ícone, label e valor", icon: "Square", category: "custom",
    make: () => ({ id: nanoid(), name: "KPI", kind: "kpi-row", icon: "Square", fields: [
      f({ tag: "value", label: "Métrica", value: "0", icon: "TrendingUp" }),
    ]}),
  },
  {
    id: "blk-debts", name: "Tabela de Dívidas", description: "Tabela genérica de dívidas", icon: "Table", category: "custom",
    make: makeDebtTable,
  },
  {
    id: "blk-text", name: "Texto Livre", description: "Parágrafo com expressões dinâmicas", icon: "Type", category: "custom",
    make: () => ({ id: nanoid(), name: "Texto", kind: "free", icon: "Type", fields: [
      f({ tag: "text", label: "Texto", value: "Digite aqui…", fontSize: 12 }),
    ]}),
  },
  {
    id: "blk-divider", name: "Divisória", description: "Separador horizontal", icon: "Minus", category: "custom",
    make: () => ({ id: nanoid(), name: "Divisória", kind: "free", icon: "Minus", fields: [
      f({ tag: "divider", label: "Linha" }),
    ]}),
  },
  {
    id: "blk-image", name: "Imagem", description: "Placeholder ou imagem configurada", icon: "Image", category: "custom",
    make: () => ({ id: nanoid(), name: "Imagem", kind: "free", icon: "Image", fields: [
      f({ tag: "image", label: "Imagem", value: "" }),
    ]}),
  },
];

/* ---------- Shared mock data tables (reference report) ---------- */

export const mockSpcData = [
  { dtOcorr: "09/11/2025", dtInclusao: "19/12/2025", dtVencimento: "09/11/2025", contrato: "FAT37521061",          origem: "CDL - SÃO PAULO / SP", credor: "MOGI GUACU/SP", valor: 942.07 },
  { dtOcorr: "01/09/2025", dtInclusao: "15/10/2025", dtVencimento: "01/09/2025", contrato: "00000000000000018330", origem: "SÃO PAULO / SP",       credor: "BRASILIA/DF",   valor: 116.66 },
  { dtOcorr: "02/07/2025", dtInclusao: "10/08/2025", dtVencimento: "02/07/2025", contrato: "6505699953889900",     origem: "SÃO PAULO / SP",       credor: "SÃO PAULO/SP",  valor: 302.70 },
  { dtOcorr: "20/04/2025", dtInclusao: "12/07/2025", dtVencimento: "20/04/2025", contrato: "F104071978",           origem: "SÃO PAULO / SP",       credor: "CURITIBA/PR",   valor: 825.24 },
];

export const mockSerasaData = [
  { dtInclusao: "19/12/2025", dtVencimento: "09/11/2025", contrato: "FAT37521061",          origem: "- MOGI GUACU/SP", valor:   942.07 },
  { dtInclusao: "15/10/2025", dtVencimento: "01/09/2025", contrato: "00000000000000018330", origem: "- BRASILIA/DF",   valor:   116.66 },
  { dtInclusao: "10/08/2025", dtVencimento: "02/07/2025", contrato: "6505699953889900",     origem: "- SÃO PAULO/SP",  valor:   302.70 },
  { dtInclusao: "12/07/2025", dtVencimento: "20/04/2025", contrato: "F104071978",           origem: "- CURITIBA/PR",   valor:   825.24 },
  { dtInclusao: "14/05/2025", dtVencimento: "01/04/2025", contrato: "00000000000120714137", origem: "- BRASILIA/DF",   valor:  4033.15 },
  { dtInclusao: "06/04/2025", dtVencimento: "21/02/2025", contrato: "12205000138708",       origem: "- SÃO PAULO/SP",  valor: 84702.00 },
  { dtInclusao: "01/04/2025", dtVencimento: "20/02/2025", contrato: "147759188",            origem: "- BARUERI/SP",    valor:  1135.54 },
];

export const mockBacenConsolidado = [
  { cat: "Carteira Ativa (A Vencer)",    valor: "44.139,00", pct: "65,97%", type: "success" as const },
  { cat: "Vencido (Inadimplência)",      valor: "20.347,00", pct: "30,41%", type: "danger"  as const },
  { cat: "Prejuízo (Perda)",             valor: "0,00",      pct: "0,00%",  type: "warning" as const },
  { cat: "Limite de Crédito",            valor: "2.420,00",  pct: "3,62%",  type: "neutral" as const },
];

export const mockBacenOperacoes = [
  { grupo: "EMPRÉSTIMOS / CRÉDITO PESSOAL - COM CONSIGNAÇÃO EM FOLHA", items: [
    { desc: "Créditos a vencer de 31 a 60 dias",   valor: "894,00",   pct: "1,34%", vencido: false },
    { desc: "Créditos a vencer de 91 a 180 dias",  valor: "1.154,00", pct: "1,72%", vencido: false },
    { desc: "Créditos a vencer de 181 a 360 dias", valor: "1.759,00", pct: "2,63%", vencido: false },
  ]},
  { grupo: "EMPRÉSTIMOS / CRÉDITO ROTATIVO VINCULADO A CARTÃO", items: [
    { desc: "Créditos a vencer até 30 dias", valor: "99,00", pct: "0,15%", vencido: false },
  ]},
  { grupo: "FINANCIAMENTOS / AQUISIÇÃO DE BENS – VEÍCULOS", items: [
    { desc: "Créditos a vencer até 30 dias",      valor: "2.560,00", pct: "3,83%", vencido: false },
    { desc: "Créditos a vencer de 31 a 60 dias",  valor: "1.242,00", pct: "1,86%", vencido: false },
    { desc: "Créditos vencidos de 31 a 60 dias",  valor: "1.319,00", pct: "1,97%", vencido: true  },
    { desc: "Créditos vencidos de 61 a 90 dias",  valor: "1.346,00", pct: "2,01%", vencido: true  },
    { desc: "Créditos vencidos de 181 a 240 dias",valor: "2.947,00", pct: "4,40%", vencido: true  },
  ]},
];

/* ---------- Query types ---------- */

export const queryTypes: QueryType[] = [
  {
    id: "q-score-rest", name: "Score + Restrições", description: "Produto real do provedor", price: 12.00,
    icon: "Gauge", category: "score",
    sample: {
      cliente: { nome: "JULIANO CAMPOS PEREIRA", documento: "403.406.588-51" },
      SCORE: { valor: 596, faixa: "Regular", chancePagar: 59.6, probabilidadeInadimplencia: 40.4 },
      RESUMO_FINANCEIRO: { totalApontado: "R$ 190.828,59", totalDeduzido: "R$ 98.654,57", riscoBacenVencido: "R$ 20.347,00" },
      DIVIDAS_SERASA: mockSerasaData,
      DIVIDAS_SPC: mockSpcData,
    },
  },
  {
    id: "q-completa-cpf", name: "COMPLETA BRASIL + SCORE CPF", description: "Produto real do provedor", price: 5.90,
    icon: "FileSearch", category: "cadastral",
    sample: {
      cliente: { nome: "MARIA APARECIDA SOUZA", documento: "210.555.999-12" },
      SCORE: { valor: 412, faixa: "Regular", chancePagar: 41.2, probabilidadeInadimplencia: 58.8 },
      RESUMO_FINANCEIRO: { totalApontado: "R$ 22.100,00", totalDeduzido: "R$ 8.450,00", riscoBacenVencido: "R$ 1.200,00" },
      DIVIDAS_SERASA: [], DIVIDAS_SPC: [],
    },
  },
  {
    id: "q-completa-pf", name: "Consulta Completa PF", description: "Produto real do provedor", price: 18.90,
    icon: "UserSearch", category: "analise",
    sample: {
      cliente: { nome: "CARLOS EDUARDO LIMA", documento: "888.111.222-04" },
      SCORE: { valor: 781, faixa: "Bom", chancePagar: 78.1, probabilidadeInadimplencia: 21.9 },
      RESUMO_FINANCEIRO: { totalApontado: "R$ 5.300,00", totalDeduzido: "R$ 0,00", riscoBacenVencido: "R$ 0,00" },
      DIVIDAS_SERASA: mockSerasaData.slice(0, 1), DIVIDAS_SPC: [],
    },
  },
];

/* ---------- Default templates ---------- */

export const defaultTemplates: TemplateDoc[] = [
  {
    id: "tpl-basic", name: "Template básico score",
    sections: [makeHeader(), makePersonal(), makeFinancial(), makeScore(), makeFooter()],
    selectedQueryBlocks: ["q-score-rest"],
  },
  {
    id: "tpl-completo", name: "Análise Completa",
    sections: [makeHeader(), makePersonal(), makeFinancial(), makeScore(), makeSerasaTable(), makeSpcTable(), makeBacen(), makeProtestos(), makeFooter()],
    selectedQueryBlocks: ["q-score-rest"],
  },
];
