export type TemplateField = {
  id: string;
  label: string;
  expression: string;
  icon?: string;
};

export type TemplateSection = {
  id: string;
  title: string;
  fields: TemplateField[];
};

let _nextId = 1;
function uid() {
  return `f_${Date.now()}_${_nextId++}`;
}

export const DEFAULT_SECTIONS: TemplateSection[] = [
  {
    id: 'header',
    title: 'Header',
    fields: [
      { id: uid(), label: 'Empresa', expression: '{$template.company}' },
      { id: uid(), label: 'Título do relatório', expression: 'Relatório Analítico de Crédito' },
      { id: uid(), label: 'Data', expression: '{$template.date}' },
      { id: uid(), label: 'Protocolo', expression: '{$template.protocol}' },
    ],
  },
  {
    id: 'client-info',
    title: 'Dados Pessoais',
    fields: [
      { id: uid(), label: 'Cliente Analisado', expression: '{$cliente.nome}', icon: 'User' },
      { id: uid(), label: 'Documento', expression: '{$cliente.documento}', icon: 'Hash' },
      { id: uid(), label: 'Tipo de Relatório', expression: 'Padrão', icon: 'Tag' },
    ],
  },
  {
    id: 'financial-summary',
    title: 'Resumo Financeiro',
    fields: [
      { id: uid(), label: 'Total Apontado', expression: '{$RESUMO_FINANCEIRO.totalApontado}' },
      { id: uid(), label: 'Total Deduzido', expression: '{$RESUMO_FINANCEIRO.totalDeduzido}' },
      { id: uid(), label: 'Risco Bacen (Vencido)', expression: '{$RESUMO_FINANCEIRO.riscoBacenVencido}' },
    ],
  },
  {
    id: 'score',
    title: 'Score de Crédito',
    fields: [
      { id: uid(), label: 'Score', expression: '{$SCORE.valor}' },
      { id: uid(), label: 'Faixa', expression: '{$SCORE.faixa}' },
      { id: uid(), label: 'Chance de pagar', expression: '{$SCORE.chancePagar}%' },
      { id: uid(), label: 'Inadimplência', expression: '{$SCORE.probabilidadeInadimplencia}%' },
    ],
  },
];

export function sectionToXml(section: TemplateSection): string {
  const fieldsXml = section.fields
    .map((f) => `  <field label="${f.label}" icon="${f.icon ?? ''}">${f.expression}</field>`)
    .join('\n');
  return `<section name="${section.title}">\n${fieldsXml}\n</section>`;
}

export function xmlToFields(xml: string): TemplateField[] {
  const fields: TemplateField[] = [];
  const fieldRegex = /<field\s+label="([^"]*)"(?:\s+icon="([^"]*)")?>([^<]*)<\/field>/g;
  let match: RegExpExecArray | null;
  while ((match = fieldRegex.exec(xml)) !== null) {
    fields.push({
      id: uid(),
      label: match[1] ?? '',
      icon: match[2] || undefined,
      expression: match[3] ?? '',
    });
  }
  return fields;
}

export function createSection(title: string, fields?: TemplateField[]): TemplateSection {
  return {
    id: `section_${Date.now()}_${_nextId++}`,
    title,
    fields: fields ?? [],
  };
}

export function createField(label: string, expression: string, icon?: string): TemplateField {
  return { id: uid(), label, expression, icon };
}
