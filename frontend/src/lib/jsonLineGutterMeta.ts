import { MAPPED_PREVIEW_ROWS_KEY } from '@/lib/mappedPreviewZipWrapper';

const LINHAS_ARRAY_LINE_RE = new RegExp(`^\\s*"${MAPPED_PREVIEW_ROWS_KEY}"\\s*:`);

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
  /** Tonalidade leve em toda a sessão ativa do tipo; não confundir com duplicidade. */
  sessionWashClass?: string;
  sectionBadgeLabel?: string;
  sectionBadgeIcon?: string;
  /** Chave do tipo no JSON de preview (reordenação / DnD). */
  sectionTypeKey?: string;
  /** Tipo da sessão ativa em qualquer linha do bloco (drop vertical no preview). */
  sectionHitTypeKey?: string;
  /** Ordem global 1…n entre tipos mapeados (badge numerado). */
  sectionBadgeOrdinal?: number;
  /** z-index do badge para empilhar sobre faixas/linhas vizinhas. */
  sectionBadgeStackZ?: number;
  /** z-index da lavagem da sessão (sobreposição entre tipos). */
  sessionWashStackZ?: number;
  isSectionHeaderLine?: boolean;
};

/** Por linha do JSON formatado: faixa (tipo), wash em toda sessão ativa e duplicidade nas linhas da ocorrência. */
export function computeJsonLineGutterMeta(
  json: string,
  keyToMeta: Map<string, LineGutterMeta>,
  duplicateRowsByType?: Map<string, Set<number>>,
  dedupFieldKeysByType?: Map<string, Set<string>>,
): LineGutterMeta[] {
  const lines = json.split('\n');
  let depth = 0;
  let active: LineGutterMeta = { barClass: 'bg-border/20' };
  let activeTypeKey = '';
  let activeSessionWashClass: string | undefined;
  let activeSessionWashStackZ: number | undefined;
  let rowIndex = -1;
  /** Depth do primeiro `{` de cada linha do array `linhas` (preview com agregados); -1 = formato legado (array direto no tipo). */
  let linhasRowObjectDepth = -1;
  const out: LineGutterMeta[] = [];

  for (const line of lines) {
    const depthBefore = depth;

    if (depthBefore === 1) {
      const m = line.match(/^\s*"((?:[^"\\]|\\.)*)"\s*:/);
      if (m) {
        const rawKey = m[1]!.replace(/\\"/g, '"').replace(/\\\\/g, '\\');
        const meta = keyToMeta.get(rawKey);
        if (meta) {
          active = { barClass: meta.barClass, title: meta.title };
          activeTypeKey = rawKey;
          activeSessionWashClass = meta.sessionWashClass;
          activeSessionWashStackZ = meta.sessionWashStackZ;
        } else {
          /* Evita usar o tipo da sessão anterior em chaves do JSON que não são blocos de tipo (meta stale). */
          activeTypeKey = '';
          active = { barClass: 'bg-border/20' };
          activeSessionWashClass = undefined;
          activeSessionWashStackZ = undefined;
        }
        const colon = line.indexOf(':');
        const afterColon = colon >= 0 ? line.slice(colon + 1).trimStart() : '';
        if (duplicateRowsByType && keyToMeta.has(rawKey)) {
          if (afterColon.startsWith('[')) {
            rowIndex = -1;
            linhasRowObjectDepth = -1;
          } else if (afterColon.startsWith('{')) {
            rowIndex = -1;
            linhasRowObjectDepth = -1;
          }
        }
      }
    }

    if (duplicateRowsByType && activeTypeKey && LINHAS_ARRAY_LINE_RE.test(line)) {
      const colon = line.indexOf(':');
      const afterColon = colon >= 0 ? line.slice(colon + 1).trimStart() : '';
      if (afterColon.startsWith('[')) {
        rowIndex = -1;
        linhasRowObjectDepth = depthBefore + lineDeltaDepth(line);
      }
    }

    if (depthBefore === 1 && line.trim().startsWith('}')) {
      activeTypeKey = '';
      active = { barClass: 'bg-border/20' };
      activeSessionWashClass = undefined;
      activeSessionWashStackZ = undefined;
      linhasRowObjectDepth = -1;
    }

    const rowCloseBracketDepth = linhasRowObjectDepth >= 0 ? linhasRowObjectDepth : 2;
    if (duplicateRowsByType && activeTypeKey && depthBefore === rowCloseBracketDepth && line.trim().startsWith(']')) {
      rowIndex = -1;
      linhasRowObjectDepth = -1;
    }

    const rowOpenDepth = linhasRowObjectDepth >= 0 ? linhasRowObjectDepth : 2;
    if (duplicateRowsByType && activeTypeKey && depthBefore === rowOpenDepth) {
      const trimmed = line.trim();
      if (trimmed.startsWith('{')) {
        rowIndex += 1;
      }
    }

    const minFieldKeyDepth = linhasRowObjectDepth >= 0 ? linhasRowObjectDepth + 1 : 3;

    let isDuplicateLine = false;
    if (duplicateRowsByType && activeTypeKey && rowIndex >= 0) {
      const dupSet = duplicateRowsByType.get(activeTypeKey);
      if (dupSet && dupSet.size > 0 && dupSet.has(rowIndex)) {
        const dedupKeySet = dedupFieldKeysByType?.get(activeTypeKey);
        const fieldKeyMatch = line.match(/^\s*"((?:[^"\\]|\\.)*)"\s*:/);
        if (depthBefore >= minFieldKeyDepth && fieldKeyMatch && dedupKeySet && dedupKeySet.size > 0) {
          const rawFieldKey = fieldKeyMatch[1]!.replace(/\\"/g, '"').replace(/\\\\/g, '\\');
          isDuplicateLine = dedupKeySet.has(rawFieldKey);
        }
      }
    }

    let sectionBadgeLabel: string | undefined;
    let sectionBadgeIcon: string | undefined;
    let sectionTypeKey: string | undefined;
    let sectionBadgeOrdinal: number | undefined;
    let sectionBadgeStackZ: number | undefined;
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
            isSectionHeaderLine = true;
            if (meta.sectionTypeKey !== undefined) sectionTypeKey = meta.sectionTypeKey;
            if (meta.sectionBadgeOrdinal !== undefined) sectionBadgeOrdinal = meta.sectionBadgeOrdinal;
            if (meta.sectionBadgeStackZ !== undefined) sectionBadgeStackZ = meta.sectionBadgeStackZ;
          }
        }
      }
    }
    if (activeSessionWashClass && (isSectionHeaderLine || depthBefore >= 2)) {
      sessionWashClass = activeSessionWashClass;
    }

    out.push({
      ...active,
      isDuplicateLine,
      ...(activeTypeKey ? { sectionHitTypeKey: activeTypeKey } : {}),
      ...(sessionWashClass
        ? {
            sessionWashClass,
            ...(activeSessionWashStackZ !== undefined ? { sessionWashStackZ: activeSessionWashStackZ } : {}),
          }
        : {}),
      ...(sectionBadgeLabel
        ? {
            sectionBadgeLabel,
            sectionBadgeIcon,
            isSectionHeaderLine,
            ...(sectionTypeKey !== undefined ? { sectionTypeKey } : {}),
            ...(sectionBadgeOrdinal !== undefined ? { sectionBadgeOrdinal } : {}),
            ...(sectionBadgeStackZ !== undefined ? { sectionBadgeStackZ } : {}),
          }
        : {}),
    });

    depth += lineDeltaDepth(line);
  }

  return out;
}
