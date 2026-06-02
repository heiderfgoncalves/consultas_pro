import { resolveExpression } from "./resolveExpression";
import { formatValue } from "./formatters";
import type { BindingFormat } from "../schema/template";

export type BindingLog = {
  expression: string;
  reason: "missing" | "ok";
  resolved?: unknown;
};

type ASTNode =
  | { type: "text"; content: string }
  | { type: "val"; expression: string }
  | { type: "if"; expression: string; thenChildren: ASTNode[]; elseChildren: ASTNode[] }
  | { type: "unless"; expression: string; thenChildren: ASTNode[]; elseChildren: ASTNode[] }
  | { type: "each"; expression: string; children: ASTNode[] };

function formatCpfCnpj(value: unknown): string {
  if (value == null) return "";
  const s = String(value).replace(/\D/g, "");
  if (s.length <= 11) {
    const pad = s.padStart(11, "0");
    return pad.replace(/^(\d{3})(\d{3})(\d{3})(\d{2}).*/, "$1.$2.$3-$4");
  } else {
    const pad = s.padStart(14, "0");
    return pad.replace(/^(\d{2})(\d{3})(\d{3})(\d{4})(\d{2}).*/, "$1.$2.$3/$4-$5");
  }
}

function formatBacenCurrency(value: unknown): string {
  if (value == null) return "0,00";
  let s = String(value).trim();
  if (!s) return "0,00";
  if (s.includes(",") && !s.includes(".")) {
    s = s.replace(",", ".");
  }
  const num = Number(s.replace(/[^0-9.-]/g, ""));
  if (Number.isNaN(num)) return s;
  return num.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function evaluateArg(arg: string, data: unknown): unknown {
  const trimmed = arg.trim();
  if ((trimmed.startsWith("'") && trimmed.endsWith("'")) || (trimmed.startsWith('"') && trimmed.endsWith('"'))) {
    return trimmed.slice(1, -1);
  }
  if (trimmed === "true") return true;
  if (trimmed === "false") return false;
  if (trimmed === "null") return null;
  if (trimmed === "undefined") return undefined;
  
  const num = Number(trimmed);
  if (!Number.isNaN(num) && trimmed !== "") {
    return num;
  }
  
  return resolveExpression(trimmed, data);
}

function evaluateCondition(expression: string, data: unknown): boolean {
  const cleanExpr = expression.replace(/\s+/g, " ").trim();
  if (!cleanExpr) return false;
  
  // Tratamento de subexpressão (eq arg1 arg2)
  const eqMatch = cleanExpr.match(/^\(\s*eq\s+(.+?)\s+(.+?)\s*\)$/);
  if (eqMatch) {
    const [, arg1, arg2] = eqMatch;
    const val1 = evaluateArg(arg1, data);
    const val2 = evaluateArg(arg2, data);
    return String(val1) === String(val2);
  }
  
  const val = resolveExpression(cleanExpr, data);
  if (val == null) return false;
  if (Array.isArray(val)) return val.length > 0;
  if (typeof val === "boolean") return val;
  if (typeof val === "number") return val !== 0;
  if (typeof val === "string") return val !== "" && val !== "false";
  return true;
}

function parseAST(parts: string[]): ASTNode[] {
  const root: ASTNode[] = [];
  const stack: { children: ASTNode[]; node: ASTNode & { type: "if" | "unless" | "each" }; currentBranch: "then" | "else" }[] = [];
  
  let currentChildren = root;
  
  for (const part of parts) {
    if (!part) continue;
    
    if (part.startsWith("{{") && part.endsWith("}}")) {
      const content = part.slice(2, -2).trim();
      
      if (content.startsWith("#if")) {
        const expr = content.substring(3).trim();
        const node: ASTNode = { type: "if", expression: expr, thenChildren: [], elseChildren: [] };
        currentChildren.push(node);
        stack.push({ children: currentChildren, node, currentBranch: "then" });
        currentChildren = node.thenChildren;
      } else if (content.startsWith("#unless")) {
        const expr = content.substring(7).trim();
        const node: ASTNode = { type: "unless", expression: expr, thenChildren: [], elseChildren: [] };
        currentChildren.push(node);
        stack.push({ children: currentChildren, node, currentBranch: "then" });
        currentChildren = node.thenChildren;
      } else if (content.startsWith("#each")) {
        const expr = content.substring(5).trim();
        const node: ASTNode = { type: "each", expression: expr, children: [] };
        currentChildren.push(node);
        stack.push({ children: currentChildren, node, currentBranch: "then" });
        currentChildren = node.children;
      } else if (content === "else") {
        const top = stack[stack.length - 1];
        if (top && (top.node.type === "if" || top.node.type === "unless")) {
          top.currentBranch = "else";
          currentChildren = top.node.elseChildren;
        } else {
          currentChildren.push({ type: "text", content: part });
        }
      } else if (content === "/if") {
        const top = stack.pop();
        if (top && top.node.type === "if") {
          currentChildren = top.children;
        } else {
          currentChildren.push({ type: "text", content: part });
        }
      } else if (content === "/unless") {
        const top = stack.pop();
        if (top && top.node.type === "unless") {
          currentChildren = top.children;
        } else {
          currentChildren.push({ type: "text", content: part });
        }
      } else if (content === "/each") {
        const top = stack.pop();
        if (top && top.node.type === "each") {
          currentChildren = top.children;
        } else {
          currentChildren.push({ type: "text", content: part });
        }
      } else {
        currentChildren.push({ type: "val", expression: content });
      }
    } else {
      currentChildren.push({ type: "text", content: part });
    }
  }
  
  return root;
}

function renderAST(
  nodes: ASTNode[],
  data: unknown,
  opts: { fallback?: string; format?: BindingFormat; logs?: BindingLog[] }
): string {
  let result = "";
  
  for (const node of nodes) {
    if (node.type === "text") {
      result += node.content;
    } else if (node.type === "val") {
      result += resolveVal(node.expression, data, opts);
    } else if (node.type === "if") {
      const condition = evaluateCondition(node.expression, data);
      if (condition) {
        result += renderAST(node.thenChildren, data, opts);
      } else {
        result += renderAST(node.elseChildren, data, opts);
      }
    } else if (node.type === "unless") {
      const condition = evaluateCondition(node.expression, data);
      if (!condition) {
        result += renderAST(node.thenChildren, data, opts);
      } else {
        result += renderAST(node.elseChildren, data, opts);
      }
    } else if (node.type === "each") {
      const val = resolveExpression(node.expression, data);
      if (Array.isArray(val)) {
        for (const item of val) {
          result += renderAST(node.children, item, opts);
        }
      }
    }
  }
  
  return result;
}


function parseNumber(value: unknown): number {
  if (value == null) return 0;
  if (typeof value === "number") return value;
  let s = String(value).trim();
  if (!s) return 0;
  
  // Remove símbolos de moeda comuns, espaços e percentuais
  s = s.replace(/[R$s$\s%]/gi, "");
  
  const lastComma = s.lastIndexOf(",");
  const lastDot = s.lastIndexOf(".");
  
  if (lastComma > lastDot) {
    // Padrão brasileiro (ex: 1.500,20). Remove pontos de milhar, substitui vírgula por ponto.
    s = s.replace(/\./g, "").replace(",", ".");
  } else if (lastDot > lastComma) {
    // Padrão internacional (ex: 1,500.20). Remove vírgulas.
    s = s.replace(/,/g, "");
  } else if (lastComma !== -1) {
    // Apenas vírgula existe (ex: 123,45)
    s = s.replace(",", ".");
  }
  
  const num = Number(s);
  return Number.isNaN(num) ? 0 : num;
}

function sumArray(arr: unknown, field?: string): number {
  if (!Array.isArray(arr)) return 0;
  let total = 0;
  for (const item of arr) {
    if (!item) continue;
    if (field) {
      const val = resolveExpression(field, item);
      total += parseNumber(val);
    } else {
      total += parseNumber(item);
    }
  }
  return total;
}

function countArray(arr: unknown): number {
  if (!Array.isArray(arr)) return 0;
  return arr.length;
}

function formatSumResult(value: number, fieldName?: string): string {
  if (!fieldName) {
    return value.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  }
  const fLower = fieldName.toLowerCase();
  const isCurrency = fLower.includes("val") || 
                     fLower.includes("vr") || 
                     fLower.includes("preco") || 
                     fLower.includes("preço") || 
                     fLower.includes("deb") || 
                     fLower.includes("div") || 
                     fLower.includes("dív") || 
                     fLower.includes("sald") || 
                     fLower.includes("lim") || 
                     fLower.includes("total") ||
                     fLower.includes("apontado") ||
                     fLower.includes("deduzido") ||
                     fLower.includes("protesto");
                     
  if (isCurrency) {
    return "R$ " + value.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  } else {
    return value.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  }
}

function preprocessExpression(expr: string, data: unknown): string {
  let s = expr;
  
  // 1. Substituir chamadas a sum(array, 'campo')
  const sumRegex = /\$?sum\s*\(\s*([^,)]+?)\s*,\s*(['"])(.*?)\2\s*\)/g;
  s = s.replace(sumRegex, (match, arrayPath, q, field) => {
    const arr = resolveExpression(arrayPath.trim(), data);
    const total = sumArray(arr, field);
    return String(total);
  });
  
  // 2. Substituir chamadas a sum(array) sem campo
  const sumNoFieldRegex = /\$?sum\s*\(\s*([^,)]+?)\s*\)/g;
  s = s.replace(sumNoFieldRegex, (match, arrayPath) => {
    if (!Number.isNaN(Number(arrayPath.trim()))) return arrayPath;
    const arr = resolveExpression(arrayPath.trim(), data);
    const total = sumArray(arr);
    return String(total);
  });

  // 3. Substituir chamadas a count(array)
  const countRegex = /\$?count\s*\(\s*([^)]+?)\s*\)/g;
  s = s.replace(countRegex, (match, arrayPath) => {
    if (!Number.isNaN(Number(arrayPath.trim()))) return arrayPath;
    const arr = resolveExpression(arrayPath.trim(), data);
    const total = countArray(arr);
    return String(total);
  });

  // 4. Substituir identificadores de variáveis restantes (ex: score, cliente.idade)
  const varRegex = /[a-zA-Z_$][a-zA-Z0-9._$]*/g;
  s = s.replace(varRegex, (match) => {
    const trimmedMatch = match.trim();
    if (trimmedMatch === "true") return "1";
    if (trimmedMatch === "false") return "0";
    if (trimmedMatch === "null" || trimmedMatch === "undefined") return "0";
    
    const val = resolveExpression(trimmedMatch, data);
    const num = parseNumber(val);
    return String(num);
  });

  return s;
}

function parseMath(expr: string): number {
  const tokens: string[] = [];
  let i = 0;
  
  const cleanExpr = expr.replace(/[^0-9.+\-*/() ]/g, "");
  
  while (i < cleanExpr.length) {
    const char = cleanExpr[i];
    if (/\s/.test(char)) {
      i++;
      continue;
    }
    
    if (/[()+\-*/]/.test(char)) {
      tokens.push(char);
      i++;
      continue;
    }
    
    if (/[0-9.]/.test(char)) {
      let numStr = "";
      while (i < cleanExpr.length && /[0-9.]/.test(cleanExpr[i])) {
        numStr += cleanExpr[i];
        i++;
      }
      tokens.push(numStr);
      continue;
    }
    
    i++;
  }
  
  if (tokens.length === 0) return 0;
  
  let tokenIndex = 0;
  
  function peek(): string | undefined {
    return tokens[tokenIndex];
  }
  
  function consume(): string {
    return tokens[tokenIndex++];
  }
  
  function parseExpression(): number {
    let result = parseTerm();
    while (true) {
      const next = peek();
      if (next === "+") {
        consume();
        result += parseTerm();
      } else if (next === "-") {
        consume();
        result -= parseTerm();
      } else {
        break;
      }
    }
    return result;
  }
  
  function parseTerm(): number {
    let result = parseFactor();
    while (true) {
      const next = peek();
      if (next === "*") {
        consume();
        result *= parseFactor();
      } else if (next === "/") {
        consume();
        const divisor = parseFactor();
        result = divisor !== 0 ? result / divisor : 0;
      } else {
        break;
      }
    }
    return result;
  }
  
  function parseFactor(): number {
    const token = peek();
    if (!token) return 0;
    
    if (token === "+") {
      consume();
      return parseFactor();
    }
    
    if (token === "-") {
      consume();
      return -parseFactor();
    }
    
    if (token === "(") {
      consume();
      const result = parseExpression();
      if (peek() === ")") {
        consume();
      }
      return result;
    }
    
    consume();
    const num = Number(token);
    return Number.isNaN(num) ? 0 : num;
  }
  
  try {
    return parseExpression();
  } catch {
    return 0;
  }
}

function resolveVal(
  expression: string,
  data: unknown,
  opts: { fallback?: string; format?: BindingFormat; logs?: BindingLog[] }
): string {
  const trimmed = expression.replace(/\s+/g, " ").trim();
  if (!trimmed) return "";
  
  const helperRegex = /^\$?([a-zA-Z]+)\b/;
  const helperMatch = trimmed.match(helperRegex);
  const firstWord = helperMatch ? helperMatch[1] : "";
  const matchedHelperName = helperMatch ? helperMatch[0] : "";
  const helpers = ["formatCurrency", "formatBacenCurrency", "formatCpfCnpj", "json", "sum", "count", "calc", "math"];
  
  if (helpers.includes(firstWord)) {
    let argsStr = trimmed.slice(matchedHelperName.length).trim();
    if (argsStr.startsWith("(") && argsStr.endsWith(")")) {
      argsStr = argsStr.slice(1, -1).trim();
    }
    
    // Tratamento específico dos novos helpers matemáticos
    if (firstWord === "sum") {
      let arrayPath = "";
      let field = "";
      
      const commaIndex = argsStr.indexOf(",");
      if (commaIndex !== -1) {
        arrayPath = argsStr.substring(0, commaIndex).trim();
        let fieldPart = argsStr.substring(commaIndex + 1).trim();
        if ((fieldPart.startsWith("'") && fieldPart.endsWith("'")) || (fieldPart.startsWith('"') && fieldPart.endsWith('"'))) {
          fieldPart = fieldPart.slice(1, -1);
        }
        field = fieldPart.trim();
      } else {
        const quoteMatch = argsStr.match(/['"](.*?)['"]$/);
        if (quoteMatch) {
          field = quoteMatch[1];
          arrayPath = argsStr.substring(0, argsStr.length - quoteMatch[0].length).trim();
        } else {
          const parts = argsStr.split(/\s+/);
          arrayPath = parts[0];
          field = parts.slice(1).join(" ");
        }
      }
      
      const arr = resolveExpression(arrayPath, data);
      const total = sumArray(arr, field);
      opts.logs?.push({ expression, reason: "ok", resolved: total });
      return formatSumResult(total, field);
    }
    
    if (firstWord === "count") {
      const arr = resolveExpression(argsStr, data);
      const total = countArray(arr);
      opts.logs?.push({ expression, reason: "ok", resolved: total });
      return String(total);
    }
    
    if (firstWord === "calc" || firstWord === "math") {
      let exprPart = argsStr;
      if ((exprPart.startsWith("'") && exprPart.endsWith("'")) || (exprPart.startsWith('"') && exprPart.endsWith('"'))) {
        exprPart = exprPart.slice(1, -1);
      }
      
      const preprocessed = preprocessExpression(exprPart, data);
      const result = parseMath(preprocessed);
      opts.logs?.push({ expression, reason: "ok", resolved: result });
      return result.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    }
    
    // Tratamento dos helpers padrão legados
    const argPath = argsStr;
    const val = resolveExpression(argPath, data);
    
    if (val === undefined) {
      opts.logs?.push({ expression, reason: "missing" });
      return opts.fallback ?? `{{${expression}}}`;
    }
    
    opts.logs?.push({ expression, reason: "ok", resolved: val });
    
    if (firstWord === "formatCurrency") {
      return formatValue(val, "currency");
    } else if (firstWord === "formatBacenCurrency") {
      return formatBacenCurrency(val);
    } else if (firstWord === "formatCpfCnpj") {
      return formatCpfCnpj(val);
    } else if (firstWord === "json") {
      return JSON.stringify(val, null, 2);
    }
  }
  
  const val = resolveExpression(trimmed, data);
  if (val === undefined) {
    opts.logs?.push({ expression: trimmed, reason: "missing" });
    return opts.fallback ?? `{{${expression}}}`;
  }
  
  opts.logs?.push({ expression: trimmed, reason: "ok", resolved: val });
  return formatValue(val, opts.format);
}


/**
 * Replace every `{{ path }}` in `text` with values from `data`.
 * Supports #if, #unless, #each blocks, eq comparisons, and custom helpers.
 */
export function interpolate(
  text: string,
  data: unknown,
  opts: { fallback?: string; format?: BindingFormat; logs?: BindingLog[] } = {},
): string {
  if (!text) return "";
  
  const parts = text.split(/(\{\{[\s\S]*?\}\})/g);
  const ast = parseAST(parts);
  return renderAST(ast, data, opts);
}

export function evaluateExpressionRaw(expression: string, data: unknown): unknown {
  const trimmed = expression.trim();
  // Se for apenas um caminho simples de variável, como "cliente.idade", sem helpers ou math
  const hasHelpers = /\b(sum|count|calc|math|formatCurrency|formatBacenCurrency|formatCpfCnpj|json)\b|\(|\)|\+|-|\*|\//.test(trimmed);
  if (!hasHelpers) {
    return resolveExpression(trimmed, data);
  }
  
  // Caso contrário, avalia com interpolate
  let textToEval = trimmed;
  if (!textToEval.startsWith("{{") || !textToEval.endsWith("}}")) {
    textToEval = `{{${trimmed}}}`;
  }
  const strResult = interpolate(textToEval, data);
  
  // Tenta converter para número se parecer um número puro
  // Remove pontos de milhar e substitui vírgulas por pontos antes de tentar o parse
  const cleanStr = strResult.replace(/\./g, "").replace(",", ".").trim();
  const num = Number(cleanStr);
  if (!Number.isNaN(num) && cleanStr !== "") {
    return num;
  }
  return strResult;
}

export function injectMeasures(data: unknown, measures: { name: string; expression: string }[] = []): unknown {
  if (data == null || typeof data !== "object") return data;
  
  // Crie um clone raso para evitar efeitos colaterais no objeto original
  const context = Array.isArray(data) ? [...data] : { ...(data as Record<string, unknown>) };
  
  const measureObj: Record<string, unknown> = {};
  const activeEvaluations = new Set<string>();
  
  for (const m of measures) {
    Object.defineProperty(measureObj, m.name, {
      get() {
        if (activeEvaluations.has(m.name)) {
          console.warn(`Circular dependency detected in calculated measure: ${m.name}`);
          return "[Erro: Dependência Circular]";
        }
        activeEvaluations.add(m.name);
        try {
          return evaluateExpressionRaw(m.expression, context);
        } catch (err) {
          console.error(`Error evaluating measure ${m.name}:`, err);
          return `[Erro: ${err instanceof Error ? err.message : String(err)}]`;
        } finally {
          activeEvaluations.delete(m.name);
        }
      },
      enumerable: true,
      configurable: true,
    });
  }
  
  // Injeta tanto no singular quanto no plural para conveniência
  (context as Record<string, unknown>).medida = measureObj;
  (context as Record<string, unknown>).medidas = measureObj;
  
  return context;
}