/**
 * Safely resolve a dotted/bracketed path on a JSON-like value.
 * Examples: "cliente.nome", "dividas[0].credor"
 * Returns undefined when any segment is missing.
 */
export function resolveExpression(path: string, data: unknown): unknown {
  if (!path) return undefined;
  
  const trimmed = path.trim();
  
  // Remove prefixo "$" se houver
  let cleanPath = trimmed;
  if (cleanPath.startsWith("$")) {
    cleanPath = cleanPath.slice(1);
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
  for (const seg of segments) {
    if (current == null || typeof current !== "object") return undefined;
    const cleanSeg = seg.trim();
    if (!cleanSeg) continue;
    
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
      // 1. Tentar encontrar dentro de totaisCalculados
      if (currentObj.totaisCalculados && typeof currentObj.totaisCalculados === "object") {
        const tc = currentObj.totaisCalculados as Record<string, unknown>;
        const matchingK = Object.keys(tc).find(
          (k) => k.toLowerCase() === cleanSeg.toLowerCase()
        );
        if (matchingK) {
          val = tc[matchingK];
        }
      }
      // 2. Tentar encontrar dentro das linhas do array (linhas)
      if (val === undefined && Array.isArray(currentObj.linhas)) {
        const rows = currentObj.linhas as Record<string, unknown>[];
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
          val = mapped;
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