import { type ReactNode, type RefObject } from 'react';
import { cn } from '@/lib/utils';
import type { TextMatch } from '@/lib/jsonSearchHighlight';

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

export type LineGutterMeta = { barClass: string; title?: string; isDuplicateLine?: boolean };

/** Por linha do JSON formatado: faixa (tipo) + tooltip com o tipo de consulta. */
export function computeJsonLineGutterMeta(
  json: string,
  keyToMeta: Map<string, LineGutterMeta>,
  duplicateFieldKeys?: Set<string>,
): LineGutterMeta[] {
  const lines = json.split('\n');
  let depth = 0;
  let active: LineGutterMeta = { barClass: 'bg-border/20' };
  let activeTypeKey = '';
  const out: LineGutterMeta[] = [];

  for (const line of lines) {
    if (depth === 1) {
      const m = line.match(/^\s*"((?:[^"\\]|\\.)*)"\s*:/);
      if (m) {
        const rawKey = m[1]!.replace(/\\"/g, '"').replace(/\\\\/g, '\\');
        const meta = keyToMeta.get(rawKey);
        if (meta) {
          active = meta;
          activeTypeKey = rawKey;
        }
      }
    }
    let isDuplicateLine = false;
    if (duplicateFieldKeys && depth === 2 && activeTypeKey) {
      const m = line.match(/^\s*"((?:[^"\\]|\\.)*)"\s*:/);
      if (m) {
        const rawField = m[1]!.replace(/\\"/g, '"').replace(/\\\\/g, '\\');
        isDuplicateLine = duplicateFieldKeys.has(`${activeTypeKey}.${rawField}`);
      }
    }
    out.push({ ...active, isDuplicateLine });
    depth += lineDeltaDepth(line);
  }

  return out;
}

type SegKind = 'def' | 'key' | 'str' | 'num' | 'kw' | 'punct';

function kindForPlainChunk(chunk: string): SegKind {
  if (/^[\s{}[\]:,]+$/.test(chunk) && /[{}\]:,[\]]/.test(chunk)) return 'punct';
  return 'def';
}

function segmentBetweenStrings(s: string): { kind: SegKind; text: string }[] {
  if (!s) return [];
  const out: { kind: SegKind; text: string }[] = [];
  const tokRe = /null|true|false|-?\d+(?:\.\d+)?(?:[eE][+-]?\d+)?/g;
  let last = 0;
  let m: RegExpExecArray | null;
  while ((m = tokRe.exec(s)) !== null) {
    if (m.index > last) {
      const plain = s.slice(last, m.index);
      if (plain) out.push({ kind: kindForPlainChunk(plain), text: plain });
    }
    const tok = m[0];
    const kind: SegKind =
      tok === 'null' || tok === 'true' || tok === 'false' ? 'kw' : 'num';
    out.push({ kind, text: tok });
    last = m.index + tok.length;
  }
  if (last < s.length) {
    const plain = s.slice(last);
    if (plain) out.push({ kind: kindForPlainChunk(plain), text: plain });
  }
  return out;
}

/** Destaque: chaves JSON, strings de valor, números e null/true/false. */
function segmentLine(line: string): { kind: SegKind; text: string }[] {
  const out: { kind: SegKind; text: string }[] = [];
  const re = /"((?:[^"\\]|\\.)*)"/g;
  let last = 0;
  let m: RegExpExecArray | null;
  while ((m = re.exec(line)) !== null) {
    if (m.index > last) out.push(...segmentBetweenStrings(line.slice(last, m.index)));
    const quoted = m[0];
    const tail = line.slice(m.index + quoted.length);
    const isKey = /^\s*:/.test(tail);
    out.push({ kind: isKey ? 'key' : 'str', text: quoted });
    last = m.index + quoted.length;
  }
  if (last < line.length) out.push(...segmentBetweenStrings(line.slice(last)));
  return out;
}

function escapeSearchRe(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

const SEARCH_MARK_PREVIEW = 'rounded-[1px] bg-yellow-300/90 text-foreground dark:bg-yellow-500/45';
const SEARCH_MARK_PREVIEW_ACTIVE =
  'rounded-[1px] bg-amber-400/95 text-foreground ring-1 ring-amber-600 dark:bg-amber-500/80 dark:ring-amber-200';

function renderPreviewLineWithMatches(
  line: string,
  lineIndex: number,
  matches: TextMatch[],
  activeGlobalIndex: number,
): ReactNode {
  const lineMatches = matches.filter((m) => m.line === lineIndex).sort((a, b) => a.startInLine - b.startInLine);
  if (lineMatches.length === 0) return line.length > 0 ? line : '\u00a0';
  let pos = 0;
  const parts: ReactNode[] = [];
  let k = 0;
  for (const m of lineMatches) {
    if (m.startInLine > pos) parts.push(line.slice(pos, m.startInLine));
    const cls = m.globalIndex === activeGlobalIndex ? SEARCH_MARK_PREVIEW_ACTIVE : SEARCH_MARK_PREVIEW;
    parts.push(
      <mark key={`${m.globalIndex}-${k++}`} className={cls}>
        {line.slice(m.startInLine, m.endInLine)}
      </mark>,
    );
    pos = m.endInLine;
  }
  if (pos < line.length) parts.push(line.slice(pos));
  return <>{parts}</>;
}

function renderTextWithSearchMarks(text: string, searchQuery: string | undefined): React.ReactNode {
  const q = searchQuery?.trim();
  if (!q) return text;
  const re = new RegExp(escapeSearchRe(q), 'gi');
  const out: React.ReactNode[] = [];
  let last = 0;
  let k = 0;
  let m: RegExpExecArray | null;
  const rx = new RegExp(re.source, re.flags.includes('g') ? re.flags : `${re.flags}g`);
  while ((m = rx.exec(text)) !== null) {
    if (m.index > last) out.push(text.slice(last, m.index));
    out.push(
      <mark key={k++} className={SEARCH_MARK_PREVIEW}>
        {m[0]}
      </mark>,
    );
    last = m.index + m[0].length;
  }
  if (last < text.length) out.push(text.slice(last));
  return out.length > 0 ? out : text;
}

function segClass(kind: SegKind): string {
  switch (kind) {
    case 'key':
      return 'text-violet-600 dark:text-violet-300';
    case 'str':
      return 'text-emerald-600 dark:text-emerald-400';
    case 'num':
      return 'text-sky-600 dark:text-sky-300';
    case 'kw':
      return 'text-amber-600 dark:text-amber-400';
    case 'punct':
      return 'text-muted-foreground/80';
    default:
      return 'text-foreground/90';
  }
}

function HighlightedJsonLine({ line, searchQuery }: { line: string; searchQuery?: string }) {
  const segs = segmentLine(line);
  if (segs.length === 0) return <span className="text-foreground/70">{'\u00a0'}</span>;
  return (
    <>
      {segs.map((s, idx) => (
        <span key={idx} className={segClass(s.kind)}>
          {renderTextWithSearchMarks(s.text, searchQuery)}
        </span>
      ))}
    </>
  );
}

export function MappedJsonPreviewCanvas({
  jsonText,
  lineMeta,
  footer,
  highlightQuery,
  highlightNavigation,
  scrollBodyRef,
}: {
  jsonText: string;
  lineMeta: LineGutterMeta[];
  /** Legenda minimalista (ex.: cores por tipo) */
  footer?: ReactNode;
  /** Destaca ocorrências (fundo amarelo) em cada linha */
  highlightQuery?: string;
  /** Com índice ativo: realça a ocorrência atual (âmbar) e permite scroll externo */
  highlightNavigation?: { matches: TextMatch[]; activeIndex: number };
  scrollBodyRef?: RefObject<HTMLDivElement | null>;
}) {
  const lines = jsonText.length ? jsonText.split('\n') : ['{}'];

  return (
    <div
      className={cn(
        'flex min-h-[11rem] flex-1 flex-col overflow-hidden rounded-lg border border-border/80',
        'bg-card bg-[radial-gradient(ellipse_120%_80%_at_50%_-20%,hsl(var(--muted)/0.35),transparent)]',
        'shadow-[inset_0_1px_0_0_hsl(var(--border)/0.45)]',
      )}
      role="region"
      aria-label="Preview JSON com dados tratados e filtros"
    >
      <div
        ref={scrollBodyRef}
        className="min-h-0 flex-1 overflow-auto [scrollbar-width:thin]"
      >
        <div className="min-w-max py-1.5 pr-2">
          {lines.map((line, i) => {
            const meta = lineMeta[i] ?? { barClass: 'bg-border/20' };
            const useNav =
              highlightNavigation &&
              highlightQuery?.trim() &&
              highlightNavigation.matches.length > 0;
            return (
              <div
                key={i}
                className={cn(
                  'group flex min-h-[1.5rem] items-stretch',
                  meta.isDuplicateLine && 'bg-destructive/8',
                )}
              >
                <span
                  className={cn(
                    'w-[2px] shrink-0 rounded-[1px] transition-opacity group-hover:opacity-100',
                    meta.isDuplicateLine ? 'bg-destructive' : meta.barClass,
                  )}
                  title={meta.title}
                />
                <code className="block flex-1 whitespace-pre pl-2 font-mono text-[11px] leading-[1.55] text-foreground/90">
                  {line.length > 0 ? (
                    useNav ? (
                      renderPreviewLineWithMatches(
                        line,
                        i,
                        highlightNavigation.matches,
                        highlightNavigation.activeIndex,
                      )
                    ) : (
                      <HighlightedJsonLine line={line} searchQuery={highlightQuery} />
                    )
                  ) : (
                    '\u00a0'
                  )}
                </code>
              </div>
            );
          })}
        </div>
      </div>

      {footer ? (
        <div className="shrink-0 border-t border-border/50 bg-muted/15 px-2 py-1.5">{footer}</div>
      ) : null}
    </div>
  );
}
