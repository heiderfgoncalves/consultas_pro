/** Saldo aproximado de `{` `[` vs `}` `]` na linha, ignorando strings JSON. */
export function lineDeltaDepth(line: string): number {
  let delta = 0;
  let inStr = false;
  let esc = false;
  for (let i = 0; i < line.length; i += 1) {
    const c = line[i];
    if (inStr) {
      if (esc) esc = false;
      else if (c === '\\') esc = true;
      else if (c === '"') inStr = false;
      continue;
    }
    if (c === '"') {
      inStr = true;
      continue;
    }
    if (c === '{' || c === '[') delta += 1;
    else if (c === '}' || c === ']') delta -= 1;
  }
  return delta;
}

export type LineGutterMeta = {
  barClass: string;
  title?: string;
  /** Linha faz parte de um objeto-linha duplicado (mesmo fingerprint dos campos deduplicar). */
  isDuplicateLine?: boolean;
  /** Tonalidade leve só na linha de cabeçalho do tipo (`"chave": [`); não confundir com duplicidade. */
  sessionWashClass?: string;
  sectionBadgeLabel?: string;
  sectionBadgeIcon?: string;
  isSectionHeaderLine?: boolean;
};

/** Por linha do JSON formatado: faixa (tipo), wash só no cabeçalho da sessão, duplicidade só nas linhas da ocorrência. */
export function computeJsonLineGutterMeta(
  json: string,
  keyToMeta: Map<string, LineGutterMeta>,
  duplicateRowsByType?: Map<string, Set<number>>,
): LineGutterMeta[] {
  const lines = json.split('\n');
  let depth = 0;
  let active: LineGutterMeta = { barClass: 'bg-border/20' };
  let activeTypeKey = '';
  let rowIndex = -1;
  const out: LineGutterMeta[] = [];

  for (const line of lines) {
    const depthBefore = depth;

    if (depth === 1) {
      const m = line.match(/^\s*"((?:[^"\\]|\\.)*)"\s*:/);
      if (m) {
        const rawKey = m[1]!.replace(/\\"/g, '"').replace(/\\\\/g, '\\');
        const meta = keyToMeta.get(rawKey);
        if (meta) {
          active = { barClass: meta.barClass, title: meta.title };
          activeTypeKey = rawKey;
        }
      }
    }

    if (duplicateRowsByType && activeTypeKey && depthBefore === 2 && line.trim().startsWith(']')) {
      rowIndex = -1;
    }

    if (duplicateRowsByType && activeTypeKey && depthBefore === 2) {
      const trimmed = line.trim();
      if (trimmed.startsWith('{')) {
        rowIndex += 1;
      }
    }

    let isDuplicateLine = false;
    if (duplicateRowsByType && activeTypeKey && rowIndex >= 0) {
      const dupSet = duplicateRowsByType.get(activeTypeKey);
      if (dupSet?.has(rowIndex)) {
        if (depthBefore >= 3) isDuplicateLine = true;
        if (depthBefore === 2 && line.trim().startsWith('{')) isDuplicateLine = true;
      }
    }

    let sectionBadgeLabel: string | undefined;
    let sectionBadgeIcon: string | undefined;
    let sessionWashClass: string | undefined;
    let isSectionHeaderLine = false;
    if (depthBefore === 1) {
      const m = line.match(/^\s*"((?:[^"\\]|\\.)*)"\s*:/);
      if (m) {
        const rawKey = m[1]!.replace(/\\"/g, '"').replace(/\\\\/g, '\\');
        const meta = keyToMeta.get(rawKey);
        if (meta?.sectionBadgeLabel) {
          const colon = line.indexOf(':');
          const afterColon = colon >= 0 ? line.slice(colon + 1).trimStart() : '';
          if (afterColon.startsWith('[') || afterColon.startsWith('{')) {
            sectionBadgeLabel = meta.sectionBadgeLabel;
            sectionBadgeIcon = meta.sectionBadgeIcon;
            sessionWashClass = meta.sessionWashClass;
            isSectionHeaderLine = true;
          }
        }
      }
    }

    out.push({
      ...active,
      isDuplicateLine,
      ...(sessionWashClass ? { sessionWashClass } : {}),
      ...(sectionBadgeLabel
        ? { sectionBadgeLabel, sectionBadgeIcon, isSectionHeaderLine }
        : {}),
    });

    depth += lineDeltaDepth(line);
  }

  return out;
}
