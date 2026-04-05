const EXPRESSION_REGEX = /\{\$([^}]+)\}/g;

export function extractExpressions(template: string): string[] {
  const results: string[] = [];
  let match: RegExpExecArray | null;
  const regex = new RegExp(EXPRESSION_REGEX.source, 'g');
  while ((match = regex.exec(template)) !== null) {
    results.push(match[1]!.trim());
  }
  return results;
}

export function validateExpressionSyntax(expression: string): { valid: boolean; error?: string } {
  const trimmed = expression.trim();
  if (!trimmed) return { valid: false, error: 'Expressão vazia' };

  let single = 0;
  let double = 0;
  for (const ch of trimmed) {
    if (ch === "'") single++;
    if (ch === '"') double++;
  }
  if (single % 2 !== 0 || double % 2 !== 0) {
    return { valid: false, error: 'Aspas desbalanceadas' };
  }

  if (!trimmed.startsWith('$')) {
    if (trimmed === 'true' || trimmed === 'false' || trimmed === 'null') return { valid: true };
    if (/^-?\d+(\.\d+)?$/.test(trimmed)) return { valid: true };
    if ((trimmed.startsWith("'") && trimmed.endsWith("'")) || (trimmed.startsWith('"') && trimmed.endsWith('"'))) {
      return { valid: true };
    }
  }

  return { valid: true };
}

export function validateTemplate(template: string): { valid: boolean; errors: string[]; variables: string[] } {
  const expressions = extractExpressions(template);
  const errors: string[] = [];

  for (const expr of expressions) {
    const base = expr.includes('?') ? expr.split('?')[0]!.trim() : expr;
    const cleaned = base.replace(/^!/, '').trim();
    const compOps = ['===', '!==', '>=', '<=', '==', '!=', '>', '<'];
    let leftSide = cleaned;
    for (const op of compOps) {
      const idx = cleaned.indexOf(op);
      if (idx !== -1) {
        leftSide = cleaned.slice(0, idx).trim();
        break;
      }
    }

    const result = validateExpressionSyntax(leftSide);
    if (!result.valid) {
      errors.push(`Expressão inválida: "${expr}" — ${result.error}`);
    }
  }

  return { valid: errors.length === 0, errors, variables: expressions };
}
