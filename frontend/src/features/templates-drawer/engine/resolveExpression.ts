/**
 * Safely resolve a dotted/bracketed path on a JSON-like value.
 * Examples: "cliente.nome", "dividas[0].credor"
 * Returns undefined when any segment is missing.
 */
export function resolveExpression(path: string, data: unknown, collectAllFallback: boolean = false): unknown {
  if (!path) return undefined;
  
  const trimmed = path.trim();
  
  // Remove prefixo "$" se houver
  let cleanPath = trimmed;
  if (cleanPath.startsWith("$")) {
    cleanPath = cleanPath.slice(1);
  }

  // Se começar com ".", resolve a propriedade em todas as subchaves do objeto de dados
  if (cleanPath.startsWith(".")) {
    const subPath = cleanPath.slice(1);
    if (!subPath) return undefined;
    
    if (data && typeof data === "object") {
      const results: unknown[] = [];
      for (const key of Object.keys(data)) {
        if (key === "medida" || key === "medidas" || key === "template" || key === "this") {
          continue;
        }
        const val = resolveExpression(subPath, (data as Record<string, unknown>)[key], collectAllFallback);
        if (val !== undefined) {
          if (Array.isArray(val)) {
            results.push(...val);
          } else {
            results.push(val);
          }
        }
      }
      return results.length > 0 ? results : undefined;
    }
    return undefined;
  }
  
  // Se for exatamente "this", retorna o próprio contexto atual
  if (cleanPath === "this") {
    return data;
  }
  
  // Remove prefixo "this." ou "this[" se houver
  if (cleanPath.startsWith("this.")) {
    cleanPath = cleanPath.slice(5);
  } else if (cleanPath.startsWith("this[")) {
    cleanPath = cleanPath.slice(4);
    // Se removemos "this[", o fechamento correspondente será removido pelo processamento de colchetes.
    // Mas para garantir, podemos recolocar o colchete de abertura para o loop tratar
    cleanPath = "[" + cleanPath;
  }

  // Divisão inteligente que suporta colchetes [propriedade com espaços]
  // Exemplo: "Bacen.consolidado.CREDITO_AVENCER.VALOR"
  // Exemplo: "[Data Inclusão]"
  // Exemplo: "Bacen.consolidado.[CREDITO_AVENCER].VALOR"
  const segments: string[] = [];
  let currentSeg = "";
  let insideBrackets = false;

  for (let i = 0; i < cleanPath.length; i++) {
    const char = cleanPath[i];
    if (char === "[") {
      insideBrackets = true;
      if (currentSeg) {
        segments.push(currentSeg);
        currentSeg = "";
      }
    } else if (char === "]") {
      insideBrackets = false;
      if (currentSeg) {
        segments.push(currentSeg);
        currentSeg = "";
      }
    } else if (char === "." && !insideBrackets) {
      if (currentSeg) {
        segments.push(currentSeg);
        currentSeg = "";
      }
    } else {
      currentSeg += char;
    }
  }
  if (currentSeg) {
    segments.push(currentSeg);
  }

  let current: unknown = data;
  for (let idx = 0; idx < segments.length; idx++) {
    if (current == null || typeof current !== "object") return undefined;
    const cleanSeg = segments[idx].trim();
    if (!cleanSeg) continue;
    
    // Se o elemento atual for um Array, e o segmento atual NÃO for numérico e nem '*'
    // Mapeia o segmento restante para todos os itens do array de forma transparente
    if (Array.isArray(current) && cleanSeg !== "*" && isNaN(Number(cleanSeg))) {
      const remainingPath = segments.slice(idx).join(".");
      const results: unknown[] = [];
      for (const item of current) {
        const val = resolveExpression(remainingPath, item, collectAllFallback);
        if (val !== undefined) {
          if (Array.isArray(val)) {
            results.push(...val);
          } else {
            results.push(val);
          }
        }
      }
      return results.length > 0 ? results : undefined;
    }
    
    if (cleanSeg === "*") {
      const remainingPath = segments.slice(idx + 1).join(".");
      
      // Caso 1: current é um Array
      if (Array.isArray(current)) {
        if (!remainingPath) {
          return current;
        }
        const results: unknown[] = [];
        for (const item of current) {
          const val = resolveExpression(remainingPath, item, true);
          if (val !== undefined) {
            if (Array.isArray(val)) {
              results.push(...val);
            } else {
              results.push(val);
            }
          }
        }
        return results.length > 0 ? results : undefined;
      }
      
      // Caso 2: current é um Objeto
      if (current && typeof current === "object") {
        const results: unknown[] = [];
        for (const key of Object.keys(current)) {
          if (key === "medida" || key === "medidas" || key === "template" || key === "this") {
            continue;
          }
          const item = (current as Record<string, unknown>)[key];
          if (!remainingPath) {
            results.push(item);
          } else {
            const val = resolveExpression(remainingPath, item, true);
            if (val !== undefined) {
              if (Array.isArray(val)) {
                results.push(...val);
              } else {
                results.push(val);
              }
            }
          }
        }
        return results.length > 0 ? results : undefined;
      }
      
      return undefined;
    }

    let val = (current as Record<string, unknown>)[cleanSeg];
    if (val === undefined) {
      const matchingKey = Object.keys(current as object).find(
        (k) => k.toLowerCase() === cleanSeg.toLowerCase()
      );
      if (matchingKey) {
        val = (current as Record<string, unknown>)[matchingKey];
      }
    }

    // Fallback para buscar dentro de totaisCalculados ou linhas se o segmento for indefinido
    if (val === undefined) {
      const currentObj = current as Record<string, unknown>;
      const collected: unknown[] = [];

      // 1. Tentar encontrar dentro de totaisCalculados
      if (currentObj.totaisCalculados && typeof currentObj.totaisCalculados === "object") {
        const tc = currentObj.totaisCalculados as Record<string, unknown>;
        const matchingK = Object.keys(tc).find(
          (k) => k.toLowerCase() === cleanSeg.toLowerCase()
        );
        if (matchingK) {
          collected.push(tc[matchingK]);
        }
      }

      // 2. Tentar encontrar dentro das linhas do array (linhas)
      if ((collectAllFallback || collected.length === 0) && Array.isArray(currentObj.linhas)) {
        const rows = currentObj.linhas as Record<string, unknown>[];
        const index = parseInt(cleanSeg, 10);
        if (!isNaN(index) && index >= 0 && index < rows.length) {
          collected.push(rows[index]);
        } else {
          const mapped = rows
            .map((row) => {
              if (row && typeof row === "object") {
                const matchingK = Object.keys(row).find(
                  (k) => k.toLowerCase() === cleanSeg.toLowerCase()
                );
                return matchingK ? row[matchingK] : undefined;
              }
              return undefined;
            })
            .filter((v) => v !== undefined);
          
          if (mapped.length > 0) {
            collected.push(...mapped);
          }
        }
      }

      if (collected.length > 0) {
        if (collected.length === 1) {
          val = collected[0];
        } else {
          val = collected;
        }
      }
      // 3. Tentar encontrar por índice nos campos do objeto (aproximação por ordem das tabelas/chaves)
      if (val === undefined && !Array.isArray(currentObj)) {
        const index = parseInt(cleanSeg, 10);
        if (!isNaN(index) && index >= 0) {
          let keys = Object.keys(currentObj).filter((key) => {
            if (["medida", "medidas", "template", "this", "cliente", "params"].includes(key.toLowerCase())) {
              return false;
            }
            const v = currentObj[key];
            if (v == null) return false;
            if (Array.isArray(v)) {
              return v.length === 0 || (typeof v[0] === "object" && v[0] !== null);
            }
            return typeof v === "object" && "linhas" in v && Array.isArray((v as any).linhas);
          });

          const nextSeg = segments[idx + 1]?.trim();
          if (nextSeg) {
            const filteredKeys = keys.filter((key) => hasPropertyCaseInsensitive(currentObj[key], nextSeg));
            if (filteredKeys.length > 0) {
              keys = filteredKeys;
            }
          }

          if (index < keys.length) {
            val = currentObj[keys[index]];
          }
        }
      }
    }

    current = val;
  }

  // Regra especial para o score de simulação híbrido (objeto e valor de pontuação legado)
  if (trimmed === "score" && current && typeof current === "object" && "pontuacao" in current) {
    return (current as Record<string, unknown>).pontuacao;
  }

  return current;
}

function hasPropertyCaseInsensitive(obj: unknown, prop: string): boolean {
  if (obj == null || typeof obj !== "object") return false;

  const propLower = prop.toLowerCase();

  // 1. Chave direta no objeto
  const directKeys = Object.keys(obj);
  const foundDirect = directKeys.find((k) => k.toLowerCase() === propLower);
  if (foundDirect) return true;

  // 2. Dentro de totaisCalculados
  const objRecord = obj as Record<string, unknown>;
  if (objRecord.totaisCalculados && typeof objRecord.totaisCalculados === "object") {
    const tcKeys = Object.keys(objRecord.totaisCalculados);
    if (tcKeys.find((k) => k.toLowerCase() === propLower)) {
      return true;
    }
  }

  // 3. Dentro de linhas do array
  if (Array.isArray(objRecord.linhas)) {
    const firstRow = objRecord.linhas[0];
    if (firstRow && typeof firstRow === "object") {
      const rowKeys = Object.keys(firstRow);
      if (rowKeys.find((k) => k.toLowerCase() === propLower)) {
        return true;
      }
    }
  }

  // 4. Se o próprio objeto for um Array
  if (Array.isArray(obj)) {
    const firstItem = obj[0];
    if (firstItem && typeof firstItem === "object") {
      const itemKeys = Object.keys(firstItem);
      if (itemKeys.find((k) => k.toLowerCase() === propLower)) {
        return true;
      }
    }
  }

  return false;
}