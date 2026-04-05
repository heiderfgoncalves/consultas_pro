import type { ConsultationFieldType } from '@/types/integrations';

export type TemplateVariableItem = {
  key: string;
  label: string;
  expression: string;
  category: 'system' | 'type-field';
  typeKey?: string;
};

export const SYSTEM_TEMPLATE_VARIABLES: TemplateVariableItem[] = [
  { key: 'protocol_id', label: 'Protocolo', expression: '${protocol_id}', category: 'system' },
  { key: 'now', label: 'Data/Hora atual', expression: '${now}', category: 'system' },
  { key: 'company_name', label: 'Empresa', expression: '${company_name}', category: 'system' },
];

export function buildTypeFieldVariables(fieldTypes: ConsultationFieldType[]): TemplateVariableItem[] {
  const items: TemplateVariableItem[] = [];

  for (const typeItem of fieldTypes) {
    const fields = typeItem.reportFieldConfig?.fields ?? [];
    for (const field of fields) {
      items.push({
        key: `${typeItem.key}.${field.key}`,
        label: `${typeItem.label} - ${field.label}`,
        expression: `\${"${typeItem.key}"."${field.key}"}`,
        category: 'type-field',
        typeKey: typeItem.key,
      });
    }
  }

  return items;
}

export function isSystemTemplateVariableExpression(value: string): boolean {
  return SYSTEM_TEMPLATE_VARIABLES.some((variable) => variable.expression === value);
}
