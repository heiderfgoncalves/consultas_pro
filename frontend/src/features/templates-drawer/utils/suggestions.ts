import { SAMPLE_DATA } from "./sample-data";

function extractPaths(obj: any, currentPath = ""): string[] {
  if (obj === null || typeof obj !== "object") {
    return currentPath ? [currentPath] : [];
  }
  if (Array.isArray(obj)) {
    const paths = [currentPath];
    if (obj.length > 0 && typeof obj[0] === "object" && obj[0] !== null) {
      paths.push(...extractPaths(obj[0], currentPath ? `${currentPath}[0]` : ""));
    }
    return paths;
  }
  const paths: string[] = [];
  if (currentPath) {
    paths.push(currentPath);
  }
  for (const key of Object.keys(obj)) {
    paths.push(...extractPaths(obj[key], currentPath ? `${currentPath}.${key}` : key));
  }
  return paths;
}

const FALLBACK_VARS = extractPaths(SAMPLE_DATA).sort();

const MATH_FUNCTIONS = ["sum(", "count(", "avg(", "min(", "max("];
const HELPERS = ["formatCurrency(", "formatBacenCurrency(", "formatCpfCnpj(", "math(", "calc(", "dedup("];
const SYSTEM_VARS = ["template.protocol", "template.date", "template.company"];

export type SuggestionResult = {
  suggestions: string[];
  query: string;
  matchStart: number;
  matchEnd: number;
  isOpen: boolean;
};

/**
 * Retorna as sugestões disponíveis com base no texto de entrada, posição do cursor e contexto.
 */
export function getSuggestions(
  inputText: string,
  cursorPos: number,
  isConsole: boolean,
  availableVariables: string[]
): SuggestionResult {
  const activeVars = availableVariables && availableVariables.length > 0
    ? availableVariables
    : FALLBACK_VARS;

  const textBeforeCursor = inputText.substring(0, cursorPos);

  let isActive = false;
  let expressionText = "";
  let lastTokenStart = -1;

  if (isConsole) {
    isActive = true;
    expressionText = textBeforeCursor;
  } else {
    // Verifica se o cursor está dentro de um bloco {{ ... }}
    const lastDoubleCurly = textBeforeCursor.lastIndexOf("{{");
    if (lastDoubleCurly !== -1) {
      const textAfterCurly = textBeforeCursor.slice(lastDoubleCurly + 2);
      if (!textAfterCurly.includes("}}")) {
        isActive = true;
        expressionText = textAfterCurly;
        lastTokenStart = lastDoubleCurly + 2;
      }
    }
  }

  if (!isActive) {
    return { suggestions: [], query: "", matchStart: cursorPos, matchEnd: cursorPos, isOpen: false };
  }

  // Extrai o último token válido que está sendo digitado (caracteres de caminhos de dados)
  const tokenMatch = expressionText.match(/[\$a-zA-Z0-9_$.*\[\]]*$/);
  const query = tokenMatch ? tokenMatch[0] : "";

  // Calcula a posição exata de início e fim no texto completo
  const matchStart = isConsole
    ? cursorPos - query.length
    : lastTokenStart + expressionText.length - query.length;
  const matchEnd = cursorPos;

  // Lista base de variáveis
  const systemPaths = SYSTEM_VARS.map(v => `$${v}`);
  const dataPaths = activeVars.map(v => `$${v}`);
  const variables = Array.from(new Set([...systemPaths, ...dataPaths]));

  // Combinado total de sugestões
  const allSuggestions = [...variables, ...MATH_FUNCTIONS, ...HELPERS];

  if (!query) {
    // Se não há token, mostra as primeiras sugestões padrão para guiar o usuário
    const defaultSuggestions = isConsole
      ? variables.slice(0, 10)
      : [...variables.slice(0, 10), ...MATH_FUNCTIONS];
    return {
      suggestions: defaultSuggestions,
      query,
      matchStart,
      matchEnd,
      isOpen: isConsole ? false : defaultSuggestions.length > 0,
    };
  }

  const lowercaseQuery = query.toLowerCase();
  const startsWithQuery: string[] = [];
  const containsQuery: string[] = [];

  for (const item of allSuggestions) {
    const lowercaseItem = item.toLowerCase();

    // Permite buscar variáveis mesmo que o usuário não tenha digitado o caractere '$' ainda
    const matchesItem = lowercaseItem.includes(lowercaseQuery) ||
      (item.startsWith("$") && item.substring(1).toLowerCase().includes(lowercaseQuery));

    if (matchesItem) {
      if (lowercaseItem.startsWith(lowercaseQuery) ||
          (item.startsWith("$") && item.substring(1).toLowerCase().startsWith(lowercaseQuery))) {
        startsWithQuery.push(item);
      } else {
        containsQuery.push(item);
      }
    }
  }

  const filtered = Array.from(new Set([...startsWithQuery, ...containsQuery])).slice(0, 15);

  return {
    suggestions: filtered,
    query,
    matchStart,
    matchEnd,
    isOpen: filtered.length > 0,
  };
}

/**
 * Substitui o token na posição especificada pela sugestão selecionada.
 */
export function insertSuggestionAt(
  inputText: string,
  suggestion: string,
  matchStart: number,
  matchEnd: number
): { newValue: string; newCursorPos: number } {
  const before = inputText.substring(0, matchStart);
  const after = inputText.substring(matchEnd);

  const newValue = before + suggestion + after;
  const newCursorPos = matchStart + suggestion.length;

  return { newValue, newCursorPos };
}
