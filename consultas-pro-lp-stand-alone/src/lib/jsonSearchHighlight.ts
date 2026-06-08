export function escapeSearchRe(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

export type TextMatch = {
  line: number;
  startInLine: number;
  endInLine: number;
  globalIndex: number;
};

/** Intervalos [start, end) no string completo — mesmo layout que um `<textarea>`. */
export type AbsoluteTextMatch = { start: number; end: number; globalIndex: number };

/** Converte ocorrências por linha em offsets absolutos para destacar sem `<span>` por linha (alinhamento com textarea). */
export function toAbsoluteMatchRanges(text: string, matches: TextMatch[]): AbsoluteTextMatch[] {
  const lineStarts: number[] = [0];
  for (let i = 0; i < text.length; i++) {
    if (text[i] === '\n') lineStarts.push(i + 1);
  }
  const nLines = lineStarts.length;
  const out: AbsoluteTextMatch[] = [];
  for (const m of matches) {
    if (m.line < 0 || m.line >= nLines) continue;
    const ls = lineStarts[m.line]!;
    const start = ls + m.startInLine;
    const end = ls + m.endInLine;
    if (start < 0 || end > text.length || start >= end) continue;
    out.push({ start, end, globalIndex: m.globalIndex });
  }
  return out.sort((a, b) => a.start - b.start || a.globalIndex - b.globalIndex);
}

/** Ocorrências case-insensitive; `line` e colunas baseadas em 0. */
export function findTextMatches(text: string, query: string): TextMatch[] {
  const q = query.trim();
  if (!q) return [];
  const re = new RegExp(escapeSearchRe(q), 'gi');
  const out: TextMatch[] = [];
  let m: RegExpExecArray | null;
  const rx = new RegExp(re.source, re.flags.includes('g') ? re.flags : `${re.flags}g`);
  let gi = 0;
  while ((m = rx.exec(text)) !== null) {
    const start = m.index;
    const before = text.slice(0, start);
    const line = before.split('\n').length - 1;
    const lastNl = before.lastIndexOf('\n');
    const startInLine = lastNl === -1 ? start : start - lastNl - 1;
    out.push({
      line,
      startInLine,
      endInLine: startInLine + m[0].length,
      globalIndex: gi++,
    });
  }
  return out;
}
