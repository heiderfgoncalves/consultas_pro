export type ExpressionContext = {
  $json: Record<string, unknown>;
  $template: { protocol: string; date: string; company: string };
  $block: { id: string; name: string; type: string };
  $params?: Record<string, unknown>;
};

function resolvePath(obj: unknown, path: string): unknown {
  const parts = path.split('.');
  let current: unknown = obj;
  for (const part of parts) {
    if (current == null || typeof current !== 'object') return undefined;
    current = (current as Record<string, unknown>)[part];
  }
  return current;
}

function resolveIdentifier(identifier: string, context: ExpressionContext): unknown {
  const trimmed = identifier.trim();

  if (trimmed.startsWith('template.')) {
    return resolvePath(context.$template, trimmed.slice(9));
  }
  if (trimmed.startsWith('block.')) {
    return resolvePath(context.$block, trimmed.slice(6));
  }
  if (trimmed.startsWith('params.')) {
    return resolvePath(context.$params, trimmed.slice(7));
  }
  if (trimmed === 'template') return context.$template;
  if (trimmed === 'block') return context.$block;
  if (trimmed === 'params') return context.$params;

  const globalVal = resolvePath(context.$json, trimmed);
  if (globalVal !== undefined) return globalVal;

  if (context.$params) {
    return resolvePath(context.$params, trimmed);
  }

  return undefined;
}

function parseLiteral(token: string): { value: unknown; consumed: boolean } {
  const trimmed = token.trim();
  if (trimmed === 'true') return { value: true, consumed: true };
  if (trimmed === 'false') return { value: false, consumed: true };
  if (trimmed === 'null') return { value: null, consumed: true };
  if (trimmed === 'undefined') return { value: undefined, consumed: true };

  if ((trimmed.startsWith("'") && trimmed.endsWith("'")) || (trimmed.startsWith('"') && trimmed.endsWith('"'))) {
    return { value: trimmed.slice(1, -1), consumed: true };
  }

  const num = Number(trimmed);
  if (!isNaN(num) && trimmed !== '') return { value: num, consumed: true };

  return { value: undefined, consumed: false };
}

function evaluateValue(token: string, context: ExpressionContext): unknown {
  const trimmed = token.trim();

  if (trimmed.startsWith('!')) {
    const inner = evaluateValue(trimmed.slice(1), context);
    return !inner;
  }

  const literal = parseLiteral(trimmed);
  if (literal.consumed) return literal.value;

  return resolveIdentifier(trimmed, context);
}

function compare(left: unknown, op: string, right: unknown): boolean {
  switch (op) {
    case '===': return left === right;
    case '!==': return left !== right;
    case '==': return left == right;
    case '!=': return left != right;
    case '>': return Number(left) > Number(right);
    case '<': return Number(left) < Number(right);
    case '>=': return Number(left) >= Number(right);
    case '<=': return Number(left) <= Number(right);
    default: return false;
  }
}

function evaluateCondition(expr: string, context: ExpressionContext): unknown {
  const compOps = ['===', '!==', '>=', '<=', '==', '!=', '>', '<'];
  for (const op of compOps) {
    const idx = expr.indexOf(op);
    if (idx !== -1) {
      const left = evaluateValue(expr.slice(0, idx), context);
      const right = evaluateValue(expr.slice(idx + op.length), context);
      return compare(left, op, right);
    }
  }
  return evaluateValue(expr, context);
}

function evaluateTernary(expr: string, context: ExpressionContext): unknown {
  const questionIdx = expr.indexOf('?');
  if (questionIdx === -1) {
    const andParts = expr.split('&&');
    if (andParts.length > 1) {
      let result: unknown = true;
      for (const part of andParts) {
        result = evaluateCondition(part.trim(), context);
        if (!result) return result;
      }
      return result;
    }

    const orParts = expr.split('||');
    if (orParts.length > 1) {
      for (const part of orParts) {
        const result = evaluateCondition(part.trim(), context);
        if (result) return result;
      }
      return false;
    }

    return evaluateCondition(expr, context);
  }

  const condition = expr.slice(0, questionIdx).trim();
  const rest = expr.slice(questionIdx + 1);
  const colonIdx = rest.indexOf(':');

  if (colonIdx === -1) {
    const condResult = evaluateCondition(condition, context);
    return condResult ? evaluateValue(rest.trim(), context) : undefined;
  }

  const trueBranch = rest.slice(0, colonIdx).trim();
  const falseBranch = rest.slice(colonIdx + 1).trim();
  const condResult = evaluateCondition(condition, context);

  return condResult
    ? evaluateValue(trueBranch, context)
    : evaluateValue(falseBranch, context);
}

function evaluateSingleExpression(expr: string, context: ExpressionContext): string {
  try {
    const result = evaluateTernary(expr.trim(), context);
    if (result === undefined || result === null) return '';
    return String(result);
  } catch {
    return `[erro: ${expr}]`;
  }
}

const EXPRESSION_REGEX = /\{\$([^}]+)\}/g;

export function evaluateExpression(template: string, context: ExpressionContext): string {
  return template.replace(EXPRESSION_REGEX, (_, expr) => evaluateSingleExpression(expr, context));
}

export function extractExpressions(template: string): string[] {
  const results: string[] = [];
  let match: RegExpExecArray | null;
  const regex = new RegExp(EXPRESSION_REGEX.source, 'g');
  while ((match = regex.exec(template)) !== null) {
    results.push(match[1]!.trim());
  }
  return results;
}

export function validateExpression(expression: string): { valid: boolean; error?: string } {
  try {
    const trimmed = expression.trim();
    if (!trimmed) return { valid: false, error: 'Expressão vazia' };

    const hasBalancedQuotes = (s: string) => {
      let single = 0, double = 0;
      for (const ch of s) {
        if (ch === "'") single++;
        if (ch === '"') double++;
      }
      return single % 2 === 0 && double % 2 === 0;
    };

    if (!hasBalancedQuotes(trimmed)) {
      return { valid: false, error: 'Aspas desbalanceadas' };
    }

    const questionIdx = trimmed.indexOf('?');
    if (questionIdx !== -1) {
      const rest = trimmed.slice(questionIdx + 1);
      if (!rest.includes(':')) {
        return { valid: false, error: 'Ternário sem ramificação falsa (:)' };
      }
    }

    return { valid: true };
  } catch (err) {
    return { valid: false, error: String(err) };
  }
}

export function evaluateExpressionSafe(expression: string, context: ExpressionContext): { result: string; error?: string } {
  try {
    const result = evaluateSingleExpression(expression, context);
    return { result };
  } catch (err) {
    return { result: '', error: String(err) };
  }
}

export function formatExpression(path: string): string {
  return `{$${path}}`;
}
