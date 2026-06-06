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


export function toNumber(value: unknown): number {
  if (value == null) return 0;
  if (typeof value === "number") return value;
  if (value instanceof Date) return value.getTime();

  let s = String(value).trim();
  if (!s) return 0;

  // 1. Verificar se é percentual (ex: "15%", "0.15%")
  if (s.endsWith("%")) {
    const cleanPercent = s.replace(/%/g, "").trim();
    return toNumber(cleanPercent) / 100;
  }

  // 2. Verificar se é data
  // Formato brasileiro: DD/MM/YYYY ou DD/MM/YYYY HH:mm:ss
  const brDateMatch = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})(?:\s+(\d{1,2}):(\d{1,2}):(\d{1,2}))?$/);
  if (brDateMatch) {
    const day = Number(brDateMatch[1]);
    const month = Number(brDateMatch[2]) - 1; // 0-indexed
    const year = Number(brDateMatch[3]);
    const hour = brDateMatch[4] ? Number(brDateMatch[4]) : 0;
    const min = brDateMatch[5] ? Number(brDateMatch[5]) : 0;
    const sec = brDateMatch[6] ? Number(brDateMatch[6]) : 0;
    const d = new Date(year, month, day, hour, min, sec);
    if (!isNaN(d.getTime())) return d.getTime();
  }

  // Formato ISO: YYYY-MM-DD ou YYYY-MM-DDTHH:mm:ss...
  const isoDateMatch = s.match(/^(\d{4})-(\d{2})-(\d{2})(?:T(\d{2}):(\d{2}):(\d{2})(?:\.\d+)?(?:Z|[+-]\d{2}:?\d{2})?)?$/);
  if (isoDateMatch) {
    const d = new Date(s);
    if (!isNaN(d.getTime())) return d.getTime();
  }

  // 3. Remover símbolos monetários (R$, $, etc.)
  s = s.replace(/[R$s$\s]/gi, "");

  // 4. Analisar e converter pontuação de milhar e decimal
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

export function toPercent(value: unknown): number {
  if (value == null) return 0;
  if (typeof value === "number") {
    return value > 1 ? value / 100 : value;
  }
  let s = String(value).trim();
  if (s.endsWith("%")) {
    return toNumber(s.slice(0, -1).trim()) / 100;
  }
  const num = toNumber(s);
  return num > 1 ? num / 100 : num;
}

export function toCurrency(value: unknown): string {
  const num = toNumber(value);
  return "R$ " + num.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export function toDate(value: unknown): number {
  if (value instanceof Date) return value.getTime();
  
  let s = String(value).trim();
  if (!s) return 0;

  const brDateMatch = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})(?:\s+(\d{1,2}):(\d{1,2}):(\d{1,2}))?$/);
  if (brDateMatch) {
    const day = Number(brDateMatch[1]);
    const month = Number(brDateMatch[2]) - 1;
    const year = Number(brDateMatch[3]);
    const hour = brDateMatch[4] ? Number(brDateMatch[4]) : 0;
    const min = brDateMatch[5] ? Number(brDateMatch[5]) : 0;
    const sec = brDateMatch[6] ? Number(brDateMatch[6]) : 0;
    const d = new Date(year, month, day, hour, min, sec);
    if (!isNaN(d.getTime())) return d.getTime();
  }

  const isoDateMatch = s.match(/^(\d{4})-(\d{2})-(\d{2})(?:T(\d{2}):(\d{2}):(\d{2})(?:\.\d+)?(?:Z|[+-]\d{2}:?\d{2})?)?$/);
  if (isoDateMatch) {
    const d = new Date(s);
    if (!isNaN(d.getTime())) return d.getTime();
  }

  const num = toNumber(s);
  if (num > 1000000000) {
    return num;
  }
  return 0;
}

export function toText(value: unknown): string {
  if (value == null) return "";
  if (typeof value === "object") return JSON.stringify(value);
  return String(value);
}

export const parseNumber = toNumber;

function resolveMultipleArgs(argsStr: string, data: unknown): unknown[] {
  const args: string[] = [];
  let current = "";
  let inDoubleQuote = false;
  let inSingleQuote = false;
  let parenDepth = 0;
  
  for (let i = 0; i < argsStr.length; i++) {
    const char = argsStr[i];
    if (char === '"' && !inSingleQuote) {
      inDoubleQuote = !inDoubleQuote;
    } else if (char === "'" && !inDoubleQuote) {
      inSingleQuote = !inSingleQuote;
    } else if (char === '(' && !inDoubleQuote && !inSingleQuote) {
      parenDepth++;
    } else if (char === ')' && !inDoubleQuote && !inSingleQuote) {
      parenDepth--;
    }
    
    if (char === ',' && !inDoubleQuote && !inSingleQuote && parenDepth === 0) {
      args.push(current.trim());
      current = "";
    } else {
      current += char;
    }
  }
  if (current.trim()) {
    args.push(current.trim());
  }
  
  const results: unknown[] = [];
  for (const arg of args) {
    if (!arg) continue;
    if ((arg.startsWith("'") && arg.endsWith("'")) || (arg.startsWith('"') && arg.endsWith('"'))) {
      results.push(arg.slice(1, -1));
      continue;
    }
    const num = Number(arg);
    if (!Number.isNaN(num) && arg !== "") {
      results.push(num);
      continue;
    }
    const val = resolveExpression(arg, data);
    if (val !== undefined) {
      if (Array.isArray(val)) {
        results.push(...val);
      } else {
        results.push(val);
      }
    }
  }
  return results;
}

function sumArray(arr: unknown, field?: string): number {
  const items = Array.isArray(arr) ? arr : (arr != null ? [arr] : []);
  let total = 0;
  for (const item of items) {
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
  if (arr == null) return 0;
  if (!Array.isArray(arr)) return 1;
  return arr.length;
}

function avgArray(arr: unknown, field?: string): number {
  const items = Array.isArray(arr) ? arr : (arr != null ? [arr] : []);
  if (items.length === 0) return 0;
  const total = sumArray(arr, field);
  return total / items.length;
}

function minArray(arr: unknown, field?: string): number {
  const items = Array.isArray(arr) ? arr : (arr != null ? [arr] : []);
  if (items.length === 0) return 0;
  const nums = items.map(item => {
    if (field && item && typeof item === "object") {
      return parseNumber(resolveExpression(field, item));
    }
    return parseNumber(item);
  });
  return Math.min(...nums);
}

function maxArray(arr: unknown, field?: string): number {
  const items = Array.isArray(arr) ? arr : (arr != null ? [arr] : []);
  if (items.length === 0) return 0;
  const nums = items.map(item => {
    if (field && item && typeof item === "object") {
      return parseNumber(resolveExpression(field, item));
    }
    return parseNumber(item);
  });
  return Math.max(...nums);
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
  
  // 1. Substituir chamadas a dedup (ex: dedup(sum($[*].valor), 'data_ocorrencia', 'valor'))
  s = s.replace(/\$?(dedup)\s*\(\s*(sum|avg|min|max|count)\s*\(\s*([^)]+?)\s*\)\s*,\s*(.+?)\s*\)/g, (match, fnName, aggFn, aggArgsStr, dedupKeysStr) => {
    let baseArrayPath = "";
    let aggField = "";
    const commaIndex = aggArgsStr.indexOf(",");
    if (commaIndex !== -1) {
      baseArrayPath = aggArgsStr.substring(0, commaIndex).trim();
      aggField = aggArgsStr.substring(commaIndex + 1).trim().replace(/['"]/g, '');
    } else {
      const lastDot = aggArgsStr.lastIndexOf(".");
      if (lastDot !== -1 && !aggArgsStr.endsWith(']')) {
        baseArrayPath = aggArgsStr.substring(0, lastDot).trim();
        aggField = aggArgsStr.substring(lastDot + 1).trim();
      } else {
        baseArrayPath = aggArgsStr.trim();
      }
    }

    const rawArray = resolveExpression(baseArrayPath, data);
    const arr = Array.isArray(rawArray) ? rawArray : (rawArray != null ? [rawArray] : []);

    const keys = dedupKeysStr.split(',').map(k => k.trim().replace(/['"]/g, ''));
    
    const seen = new Set<string>();
    const dedupedArr = [];
    for (const item of arr) {
      if (!item || typeof item !== 'object') {
        dedupedArr.push(item);
        continue;
      }
      const keyValues = keys.map(k => String(resolveExpression(k, item)));
      const hash = keyValues.join('|~|');
      if (!seen.has(hash)) {
        seen.add(hash);
        dedupedArr.push(item);
      }
    }

    let total = 0;
    if (aggFn === "sum") total = sumArray(dedupedArr, aggField);
    else if (aggFn === "avg") total = avgArray(dedupedArr, aggField);
    else if (aggFn === "min") total = minArray(dedupedArr, aggField);
    else if (aggFn === "max") total = maxArray(dedupedArr, aggField);
    else if (aggFn === "count") total = countArray(dedupedArr);

    return String(total);
  });
  
  // Substituir chamadas a sum, avg, min, max
  s = s.replace(/\$?(sum|avg|min|max)\s*\(\s*([^)]+?)\s*\)/g, (match, fn, argsStr) => {
    let isClassic = false;
    const commaIndex = argsStr.indexOf(",");
    if (commaIndex !== -1) {
      const parts = argsStr.split(",");
      if (parts.length === 2) {
        const second = parts[1].trim();
        if ((second.startsWith("'") && second.endsWith("'")) || (second.startsWith('"') && second.endsWith('"'))) {
          isClassic = true;
        }
      }
    }
    
    if (isClassic) {
      const arrayPath = argsStr.substring(0, commaIndex).trim();
      const fieldPart = argsStr.substring(commaIndex + 1).trim();
      const field = fieldPart.slice(1, -1).trim();
      const arr = resolveExpression(arrayPath, data);
      
      let total = 0;
      if (fn === "sum") total = sumArray(arr, field);
      else if (fn === "avg") total = avgArray(arr, field);
      else if (fn === "min") total = minArray(arr, field);
      else if (fn === "max") total = maxArray(arr, field);
      return String(total);
    } else {
      const resolvedArgs = resolveMultipleArgs(argsStr, data);
      let total = 0;
      if (fn === "sum") {
        total = resolvedArgs.reduce<number>((acc, v) => acc + parseNumber(v), 0);
      } else if (fn === "avg") {
        const sumVal = resolvedArgs.reduce<number>((acc, v) => acc + parseNumber(v), 0);
        total = resolvedArgs.length > 0 ? sumVal / resolvedArgs.length : 0;
      } else if (fn === "min") {
        const nums = resolvedArgs.map(v => parseNumber(v));
        total = nums.length > 0 ? Math.min(...nums) : 0;
      } else if (fn === "max") {
        const nums = resolvedArgs.map(v => parseNumber(v));
        total = nums.length > 0 ? Math.max(...nums) : 0;
      }
      return String(total);
    }
  });

  // 3. Substituir chamadas a count(array)
  const countRegex = /\$?count\s*\(\s*([^)]+?)\s*\)/g;
  s = s.replace(countRegex, (match, arrayPath) => {
    if (!Number.isNaN(Number(arrayPath.trim()))) return arrayPath;
    const arr = resolveExpression(arrayPath.trim(), data);
    const total = countArray(arr);
    return String(total);
  });

  // 3.5 Substituir chamadas de helpers de conversão explícita
  const toNumberRegex = /\$?(?:toNumber|asNumber)\s*\(\s*([^)]+?)\s*\)/g;
  s = s.replace(toNumberRegex, (match, path) => {
    const val = resolveExpression(path.trim(), data);
    return String(toNumber(val));
  });

  const toPercentRegex = /\$?(?:toPercent|asPercent)\s*\(\s*([^)]+?)\s*\)/g;
  s = s.replace(toPercentRegex, (match, path) => {
    const val = resolveExpression(path.trim(), data);
    return String(toPercent(val));
  });

  const toCurrencyRegex = /\$?(?:toCurrency|asCurrency)\s*\(\s*([^)]+?)\s*\)/g;
  s = s.replace(toCurrencyRegex, (match, path) => {
    const val = resolveExpression(path.trim(), data);
    return String(toNumber(val)); // no calc, precisamos do valor numérico puro
  });

  const toDateRegex = /\$?(?:toDate|asDate)\s*\(\s*([^)]+?)\s*\)/g;
  s = s.replace(toDateRegex, (match, path) => {
    const val = resolveExpression(path.trim(), data);
    return String(toDate(val));
  });

  const toTextRegex = /\$?(?:toText|asText)\s*\(\s*([^)]+?)\s*\)/g;
  s = s.replace(toTextRegex, (match, path) => {
    const val = resolveExpression(path.trim(), data);
    const txt = toText(val);
    const num = Number(txt);
    return String(Number.isNaN(num) ? 0 : num); // no calc, precisa de número
  });

  // 4. Substituir identificadores de variáveis restantes (ex: score, cliente.idade)
  const varRegex = /[a-zA-Z_$][a-zA-Z0-9._$]*/g;
  s = s.replace(varRegex, (match) => {
    const trimmedMatch = match.trim();
    if (trimmedMatch === "true") return "1";
    if (trimmedMatch === "false") return "0";
    if (trimmedMatch === "null" || trimmedMatch === "undefined") return "0";

    const helpers = [
      "sum", "avg", "min", "max", "count", "calc", "math", 
      "formatCurrency", "formatBacenCurrency", "formatCpfCnpj", "json",
      "toNumber", "asNumber", "toPercent", "asPercent", "toCurrency", "asCurrency", "toDate", "asDate", "toText", "asText"
    ];
    if (helpers.includes(trimmedMatch)) return match;
    
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
  const helpers = [
    "formatCurrency", "formatBacenCurrency", "formatCpfCnpj", "json", 
    "sum", "avg", "min", "max", "count", "calc", "math", "dedup",
    "toNumber", "asNumber", "toPercent", "asPercent", "toCurrency", "asCurrency", "toDate", "asDate", "toText", "asText"
  ];
  
  if (helpers.includes(firstWord)) {
    let argsStr = trimmed.slice(matchedHelperName.length).trim();
    if (argsStr.startsWith("(") && argsStr.endsWith(")")) {
      argsStr = argsStr.slice(1, -1).trim();
    }
    
    // Tratamento de agregação deduplicada: dedup(sum($[*].valor), 'data_ocorrencia', 'valor')
    if (firstWord === "dedup") {
      const dedupMatch = argsStr.match(/^(sum|avg|min|max|count)\s*\(\s*([^)]+?)\s*\)\s*,\s*(.+)$/);
      if (dedupMatch) {
        const [, aggFn, aggArgsStr, dedupKeysStr] = dedupMatch;
        let baseArrayPath = "";
        let aggField = "";
        let displayField = aggArgsStr;
        
        const commaIndex = aggArgsStr.indexOf(",");
        if (commaIndex !== -1) {
          baseArrayPath = aggArgsStr.substring(0, commaIndex).trim();
          aggField = aggArgsStr.substring(commaIndex + 1).trim().replace(/['"]/g, '');
          displayField = aggField;
        } else {
          const lastDot = aggArgsStr.lastIndexOf(".");
          if (lastDot !== -1 && !aggArgsStr.endsWith(']')) {
            baseArrayPath = aggArgsStr.substring(0, lastDot).trim();
            aggField = aggArgsStr.substring(lastDot + 1).trim();
            displayField = aggField;
          } else {
            baseArrayPath = aggArgsStr.trim();
          }
        }

        const rawArray = resolveExpression(baseArrayPath, data);
        const arr = Array.isArray(rawArray) ? rawArray : (rawArray != null ? [rawArray] : []);

        const keys = dedupKeysStr.split(',').map(k => k.trim().replace(/['"]/g, ''));
        
        const seen = new Set<string>();
        const dedupedArr = [];
        for (const item of arr) {
          if (!item || typeof item !== 'object') {
            dedupedArr.push(item);
            continue;
          }
          const keyValues = keys.map(k => String(resolveExpression(k, item)));
          const hash = keyValues.join('|~|');
          if (!seen.has(hash)) {
            seen.add(hash);
            dedupedArr.push(item);
          }
        }

        let total = 0;
        if (aggFn === "sum") total = sumArray(dedupedArr, aggField);
        else if (aggFn === "avg") total = avgArray(dedupedArr, aggField);
        else if (aggFn === "min") total = minArray(dedupedArr, aggField);
        else if (aggFn === "max") total = maxArray(dedupedArr, aggField);
        else if (aggFn === "count") {
          total = countArray(dedupedArr);
          opts.logs?.push({ expression, reason: "ok", resolved: total });
          return String(total);
        }

        opts.logs?.push({ expression, reason: "ok", resolved: total });
        return formatSumResult(total, displayField);
      }
      return "";
    }
    
    // Tratamento específico dos novos helpers matemáticos
    if (firstWord === "sum" || firstWord === "avg" || firstWord === "min" || firstWord === "max") {
      let isClassic = false;
      const commaIndex = argsStr.indexOf(",");
      if (commaIndex !== -1) {
        const parts = argsStr.split(",");
        if (parts.length === 2) {
          const second = parts[1].trim();
          if ((second.startsWith("'") && second.endsWith("'")) || (second.startsWith('"') && second.endsWith('"'))) {
            isClassic = true;
          }
        }
      }
      
      let total = 0;
      let displayField = argsStr;
      
      if (isClassic) {
        const arrayPath = argsStr.substring(0, commaIndex).trim();
        const fieldPart = argsStr.substring(commaIndex + 1).trim();
        const field = fieldPart.slice(1, -1).trim();
        displayField = field;
        const arr = resolveExpression(arrayPath, data);
        
        if (firstWord === "sum") {
          total = sumArray(arr, field);
        } else if (firstWord === "avg") {
          total = avgArray(arr, field);
        } else if (firstWord === "min") {
          total = minArray(arr, field);
        } else if (firstWord === "max") {
          total = maxArray(arr, field);
        }
      } else {
        const resolvedArgs = resolveMultipleArgs(argsStr, data);
        if (firstWord === "sum") {
          total = resolvedArgs.reduce<number>((acc, v) => acc + parseNumber(v), 0);
        } else if (firstWord === "avg") {
          const sumVal = resolvedArgs.reduce<number>((acc, v) => acc + parseNumber(v), 0);
          total = resolvedArgs.length > 0 ? sumVal / resolvedArgs.length : 0;
        } else if (firstWord === "min") {
          const nums = resolvedArgs.map(v => parseNumber(v));
          total = nums.length > 0 ? Math.min(...nums) : 0;
        } else if (firstWord === "max") {
          const nums = resolvedArgs.map(v => parseNumber(v));
          total = nums.length > 0 ? Math.max(...nums) : 0;
        }
      }
      
      opts.logs?.push({ expression, reason: "ok", resolved: total });
      return formatSumResult(total, displayField);
    }
    
    if (firstWord === "count") {
      const arr = resolveExpression(argsStr, data);
      const total = countArray(arr);
      opts.logs?.push({ expression, reason: "ok", resolved: total });
      return String(total);
    }

    if (firstWord === "toNumber" || firstWord === "asNumber") {
      const val = resolveExpression(argsStr, data);
      const res = toNumber(val);
      opts.logs?.push({ expression, reason: "ok", resolved: res });
      return String(res);
    }

    if (firstWord === "toPercent" || firstWord === "asPercent") {
      const val = resolveExpression(argsStr, data);
      const res = toPercent(val);
      opts.logs?.push({ expression, reason: "ok", resolved: res });
      return `${(res * 100).toFixed(2)}%`;
    }

    if (firstWord === "toCurrency" || firstWord === "asCurrency") {
      const val = resolveExpression(argsStr, data);
      const res = toCurrency(val);
      opts.logs?.push({ expression, reason: "ok", resolved: res });
      return res;
    }

    if (firstWord === "toDate" || firstWord === "asDate") {
      const val = resolveExpression(argsStr, data);
      const res = toDate(val);
      opts.logs?.push({ expression, reason: "ok", resolved: res });
      if (res === 0) return "";
      return new Date(res).toLocaleDateString("pt-BR");
    }

    if (firstWord === "toText" || firstWord === "asText") {
      const val = resolveExpression(argsStr, data);
      const res = toText(val);
      opts.logs?.push({ expression, reason: "ok", resolved: res });
      return res;
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

  let formattedResult: string | undefined;
  let measureName: string | undefined;
  if (trimmed.startsWith("medida.")) {
    measureName = trimmed.slice(7);
  } else if (trimmed.startsWith("medidas.")) {
    measureName = trimmed.slice(8);
  }

  if (measureName) {
    const measuresList = (data && typeof data === "object" && (data as any).medida && (data as any).medida.__measures__) || [];
    if (Array.isArray(measuresList)) {
      const measure = measuresList.find((m: any) => m.name === measureName);
      if (measure && measure.dataType) {
        if (measure.dataType === "currency") {
          formattedResult = formatValue(val, "currency");
        } else if (measure.dataType === "percent") {
          formattedResult = formatValue(val, "percent");
        } else if (measure.dataType === "integer") {
          const num = Math.round(Number(val));
          formattedResult = isNaN(num) ? String(val) : String(num);
        } else if (measure.dataType === "decimal") {
          const num = Number(val);
          formattedResult = isNaN(num) ? String(val) : num.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
        } else if (measure.dataType === "text") {
          formattedResult = String(val);
        }
      }
    }
  }

  if (formattedResult !== undefined) {
    return formattedResult;
  }
  
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

export function injectMeasures(data: unknown, measures: { name: string; expression: string; dataType?: string }[] = []): unknown {
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

  // Anexa as definições das medidas como propriedade não enumerável
  Object.defineProperty(measureObj, "__measures__", {
    value: measures,
    enumerable: false,
    configurable: true,
    writable: false
  });
  
  // Injeta tanto no singular quanto no plural para conveniência
  (context as Record<string, unknown>).medida = measureObj;
  (context as Record<string, unknown>).medidas = measureObj;
  
  return context;
}